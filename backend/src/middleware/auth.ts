import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, UserRole } from '../types';
import prisma from '../lib/prisma';

// Estender Request para incluir usuário autenticado
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        organizationId: string;
      };
    }
  }
}

// Middleware de autenticação
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    // Buscar usuário no banco para verificar se ainda existe
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não encontrado'
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

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role as UserRole,
      organizationId: user.organizationId
    };

    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(401).json({
      success: false,
      error: 'Token inválido'
    });
  }
};

// Middleware para verificar role específico
export const requireRole = (role: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
      return;
    }

    if (req.user.role !== role) {
      res.status(403).json({
        success: false,
        error: 'Acesso negado: role insuficiente'
      });
      return;
    }

    next();
  };
};

// Middleware para verificar se tem organização
export const requireOrganization = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.organizationId) {
    res.status(400).json({
      success: false,
      error: 'Contexto de organização é obrigatório'
    });
    return;
  }

  next();
};

// Middlewares específicos por role
export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireManager = requireRole(UserRole.MANAGER);
export const requireVendedor = requireRole(UserRole.VENDEDOR);
export const requireRH = requireRole(UserRole.RH);
export const requireFinanceiro = requireRole(UserRole.FINANCEIRO);
export const requireInventario = requireRole(UserRole.INVENTARIO);

// Middleware para verificar se é admin ou manager
export const requireAdminOrManager = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Usuário não autenticado'
    });
    return;
  }

  if (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.MANAGER) {
    res.status(403).json({
      success: false,
      error: 'Acesso negado: role insuficiente'
    });
    return;
  }

  next();
};
