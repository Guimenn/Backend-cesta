import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  CreateCategoryDto, 
  UpdateCategoryDto, 
  Category, 
  PaginatedResponse,
  FilterQuery,
  AuthenticatedRequest 
} from '../types';
import prisma from '../lib/prisma';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

export class CategoryController {
  // Criar nova categoria
  static async create(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const categoryData: CreateCategoryDto = req.body;
      const { organizationId } = req.user!;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organização não especificada'
        });
        return;
      }

      const category = await prisma.category.create({
        data: {
          id: uuidv4(),
          ...categoryData,
          organizationId,
          createdBy: req.user!.id
        }
      });

      res.status(201).json({
        success: true,
        data: category,
        message: 'Categoria criada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todas as categorias da organização
  static async getAll(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { page = 1, limit = 50, search, sortBy = 'name', sortOrder = 'asc' } = req.query as FilterQuery;

      const skip = (page - 1) * limit;

      // Construir filtros
      const where: any = {
        organizationId
      };

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Buscar categorias com paginação
      const [categories, total] = await Promise.all([
        prisma.category.findMany({
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
            },
            _count: {
              select: {
                products: true
              }
            }
          }
        }),
        prisma.category.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<Category> = {
        data: categories,
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
      console.error('Erro ao buscar categorias:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar categoria por ID
  static async getById(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const category = await prisma.category.findFirst({
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
          },
          products: {
            select: {
              id: true,
              name: true,
              price: true,
              active: true
            },
            take: 10
          },
          _count: {
            select: {
              products: true
            }
          }
        }
      });

      if (!category) {
        res.status(404).json({
          success: false,
          error: 'Categoria não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar categoria
  static async update(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateCategoryDto = req.body;
      const { organizationId } = req.user!;

      // Verificar se categoria existe e pertence à organização
      const existingCategory = await prisma.category.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingCategory) {
        res.status(404).json({
          success: false,
          error: 'Categoria não encontrada'
        });
        return;
      }

      const category = await prisma.category.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        data: category,
        message: 'Categoria atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar categoria
  static async delete(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Verificar se categoria existe e pertence à organização
      const existingCategory = await prisma.category.findFirst({
        where: {
          id,
          organizationId
        },
        include: {
          _count: {
            select: {
              products: true
            }
          }
        }
      });

      if (!existingCategory) {
        res.status(404).json({
          success: false,
          error: 'Categoria não encontrada'
        });
        return;
      }

      // Verificar se há produtos associados
      if (existingCategory._count.products > 0) {
        res.status(400).json({
          success: false,
          error: 'Não é possível deletar categoria com produtos associados'
        });
        return;
      }

      await prisma.category.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Categoria deletada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas das categorias
  static async getStats(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;

      const [
        totalCategories,
        totalProducts
      ] = await Promise.all([
        prisma.category.count({ where: { organizationId } }),
        prisma.product.count({ where: { organizationId } })
      ]);

      res.json({
        success: true,
        data: {
          totalCategories,
          totalProducts
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas das categorias:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}
