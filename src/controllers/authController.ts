import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { 
  LoginDto, 
  RegisterDto, 
  AuthResponse, 
  ApiResponse, 
  UserRole,
  CreateOrganizationDto,
  AuthenticatedRequest
} from '../types';
import prisma from '../lib/prisma';
import { auditLogin } from '../middleware/audit';

export class AuthController {
  // Login de usuário
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginDto = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email e senha são obrigatórios'
        });
        return;
      }

      // Buscar usuário por email
      const user = await prisma.user.findUnique({
        where: { email }
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
        return;
      }

      // Verificar se o usuário está ativo
      if (!user.active) {
        res.status(401).json({
          success: false,
          error: 'Usuário inativo'
        });
        return;
      }

      // Verificar senha
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Credenciais inválidas'
        });
        return;
      }

      // Buscar organização
      const organization = await prisma.organization.findUnique({
        where: { id: user.organizationId }
      });

      // Gerar token JWT
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const response: AuthResponse = {
        user: {
          id: user.id,
          email: user.email,
          role: user.role as UserRole,
          organizationId: user.organizationId
        },
        token,
        organization: organization || undefined
      };

      res.json({
        success: true,
        data: response,
        message: 'Login realizado com sucesso'
      });

      // Registrar auditoria
      await auditLogin()(req as any, res, () => {});
    } catch (error) {
      console.error('Erro no login:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Registro de novo usuário
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, organizationName, organizationSlug }: RegisterDto = req.body;

      if (!email || !password || !name) {
        res.status(400).json({
          success: false,
          error: 'Email, senha e nome são obrigatórios'
        });
        return;
      }

      // Verificar se usuário já existe
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'Usuário já existe'
        });
        return;
      }

      // Hash da senha
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Criar organização primeiro se fornecida
      let organizationId: string;

      if (organizationName && organizationSlug) {
        const organization = await prisma.organization.create({
          data: {
            id: uuidv4(),
            name: organizationName,
            slug: organizationSlug,
            description: 'Organização criada durante o registro'
          }
        });

        organizationId = organization.id;
      } else {
        // Usar organização padrão se não fornecida
        const defaultOrg = await prisma.organization.findFirst({
          where: { slug: 'freelancer-cesta-default' }
        });
        
        if (!defaultOrg) {
          res.status(500).json({
            success: false,
            error: 'Organização padrão não encontrada'
          });
          return;
        }
        
        organizationId = defaultOrg.id;
      }

      // Criar usuário com role e organização
      const user = await prisma.user.create({
        data: {
          id: uuidv4(),
          email,
          password: hashedPassword,
          name,
          role: 'ADMIN',
          organizationId
        }
      });

      // Gerar token JWT
      const token = jwt.sign(
        {
          userId: user.id,
          email,
          role: UserRole.ADMIN,
          organizationId
        },
        process.env.JWT_SECRET!,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      const response: AuthResponse = {
        user: {
          id: user.id,
          email,
          role: UserRole.ADMIN,
          organizationId
        },
        token
      };

      res.status(201).json({
        success: true,
        data: response,
        message: 'Usuário registrado com sucesso'
      });
    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Verificar se precisa de setup admin
  static async needsAdminSetup(req: Request, res: Response): Promise<void> {
    try {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });

      res.json({
        success: true,
        data: { needsSetup: adminCount === 0 },
        message: adminCount === 0 ? 'Setup admin necessário' : 'Setup admin já realizado'
      });
    } catch (error) {
      console.error('Erro ao verificar setup admin:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Habilitar setup admin
  static async enableAdminSetup(req: Request, res: Response): Promise<void> {
    try {
      const { email, userId }: { email: string; userId: string } = req.body;

      if (!email || !userId) {
        res.status(400).json({
          success: false,
          error: 'Email e userId são obrigatórios'
        });
        return;
      }

      // Verificar se já existe admin
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' }
      });

      if (adminCount > 0) {
        res.status(400).json({
          success: false,
          error: 'Setup admin já foi realizado'
        });
        return;
      }

      // Atualizar usuário para admin
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'ADMIN' }
      });

      res.json({
        success: true,
        message: 'Setup admin habilitado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao habilitar setup admin:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atribuir role a usuário
  static async assignRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId, role }: { userId: string; role: UserRole } = req.body;

      if (!userId || !role) {
        res.status(400).json({
          success: false,
          error: 'UserId e role são obrigatórios'
        });
        return;
      }

      // Verificar se usuário existe
      const existingUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
        return;
      }

      // Atualizar role do usuário
      await prisma.user.update({
        where: { id: userId },
        data: { role }
      });

      res.json({
        success: true,
        message: `Role ${role} atribuída com sucesso ao usuário`
      });
    } catch (error) {
      console.error('Erro ao atribuir role:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Verificar perfil do usuário atual
  static async getCurrentProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // O userId vem do middleware de autenticação
      const userId = req.user.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Token inválido'
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
        return;
      }

      // Buscar organização
      const organization = await prisma.organization.findUnique({
        where: { id: user.organizationId }
      });

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          active: user.active,
          organizationId: user.organizationId,
          organization
        }
      });
    } catch (error) {
      console.error('Erro ao buscar perfil atual:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Verificar perfil do usuário
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.params.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
        return;
      }

      // Buscar organização
      const organization = await prisma.organization.findUnique({
        where: { id: user.organizationId }
      });

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          active: user.active,
          organization
        }
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Logout (opcional, pois JWT é stateless)
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      // Em uma implementação real, você poderia adicionar o token a uma blacklist
      // Por enquanto, apenas retornamos sucesso
      res.json({
        success: true,
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      console.error('Erro no logout:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}
