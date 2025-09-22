import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  CreateCestaDto, 
  UpdateCestaDto, 
  Cesta, 
  PaginatedResponse,
  FilterQuery,
  AuthenticatedRequest 
} from '../types';
import prisma from '../lib/prisma';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

export class CestaController {
  // Criar nova cesta
  static async create(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const cestaData: CreateCestaDto = req.body;
      const { organizationId } = req.user!;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organização não especificada'
        });
        return;
      }

      const cesta = await prisma.cesta.create({
        data: {
          id: uuidv4(),
          ...cestaData,
          organizationId,
          createdBy: req.user!.id
        }
      });

      res.status(201).json({
        success: true,
        data: cesta,
        message: 'Cesta criada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar cesta:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todas as cestas da organização
  static async getAll(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { page = 1, limit = 50, search, sortBy = 'nome', sortOrder = 'asc' } = req.query as FilterQuery;

      const skip = (page - 1) * limit;

      // Construir filtros
      const where: any = {
        organizationId
      };

      if (search) {
        where.OR = [
          { nome: { contains: search, mode: 'insensitive' } },
          { categoria: { contains: search, mode: 'insensitive' } },
          { descricao: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Buscar cestas com paginação
      const [cestas, total] = await Promise.all([
        prisma.cesta.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        prisma.cesta.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<Cesta> = {
        data: cestas as Cesta[],
        total,
        page,
        limit,
        totalPages
      };

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Erro ao buscar cestas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar cesta por ID
  static async getById(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const cesta = await prisma.cesta.findFirst({
        where: {
          id,
          organizationId
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      if (!cesta) {
        res.status(404).json({
          success: false,
          error: 'Cesta não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: cesta
      });
    } catch (error) {
      console.error('Erro ao buscar cesta:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar cesta
  static async update(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateCestaDto = req.body;
      const { organizationId } = req.user!;

      // Verificar se cesta existe e pertence à organização
      const existingCesta = await prisma.cesta.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingCesta) {
        res.status(404).json({
          success: false,
          error: 'Cesta não encontrada'
        });
        return;
      }

      const cesta = await prisma.cesta.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        data: cesta,
        message: 'Cesta atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar cesta:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar cesta
  static async delete(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Verificar se cesta existe e pertence à organização
      const existingCesta = await prisma.cesta.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingCesta) {
        res.status(404).json({
          success: false,
          error: 'Cesta não encontrada'
        });
        return;
      }

      await prisma.cesta.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Cesta deletada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar cesta:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar cestas ativas
  static async getActive(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;

      const cestas = await prisma.cesta.findMany({
        where: {
          organizationId,
          ativo: true
        },
        orderBy: { nome: 'asc' }
      });

      res.json({
        success: true,
        data: cestas
      });
    } catch (error) {
      console.error('Erro ao buscar cestas ativas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Calcular cestas possíveis baseado no estoque
  static async calculatePossible(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;

      // Buscar todas as cestas ativas
      const cestas = await prisma.cesta.findMany({
        where: {
          organizationId,
          ativo: true
        }
      });

      // Buscar estoque atual
      const estoque = await prisma.estoque.findMany({
        where: {
          organizationId,
          ativo: true
        }
      });

      const cestasPossiveis: Record<string, number> = {};

      for (const cesta of cestas) {
        const itens = cesta.itens as any[];
        let quantidadeMaxima = Infinity;

        for (const item of itens) {
          const itemEstoque = estoque.find(e => e.id === item.itemId);
          if (!itemEstoque || itemEstoque.quantidade < item.quantidade) {
            quantidadeMaxima = 0;
            break;
          }
          
          const quantidadePossivel = Math.floor(itemEstoque.quantidade / item.quantidade);
          quantidadeMaxima = Math.min(quantidadeMaxima, quantidadePossivel);
        }

        cestasPossiveis[cesta.id] = quantidadeMaxima === Infinity ? 0 : quantidadeMaxima;
      }

      res.json({
        success: true,
        data: cestasPossiveis
      });
    } catch (error) {
      console.error('Erro ao calcular cestas possíveis:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}
