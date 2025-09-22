import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  CreateProductDto, 
  UpdateProductDto, 
  Product, 
  PaginatedResponse,
  FilterQuery,
  AuthenticatedRequest 
} from '../types';
import prisma from '../lib/prisma';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

export class ProductController {
  // Criar novo produto
  static async create(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const productData: CreateProductDto = req.body;
      const { organizationId } = req.user!;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organização não especificada'
        });
        return;
      }

      const product = await prisma.product.create({
        data: {
          id: uuidv4(),
          ...productData,
          organizationId,
          createdBy: req.user!.id
        }
      });

      res.status(201).json({
        success: true,
        data: product,
        message: 'Produto criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todos os produtos da organização
  static async getAll(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { page = 1, limit = 50, search, categoryId, sortBy = 'name', sortOrder = 'asc' } = req.query as FilterQuery;

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

      if (categoryId) {
        where.categoryId = categoryId;
      }

      // Buscar produtos com paginação
      const [products, total] = await Promise.all([
        prisma.product.findMany({
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
            category: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        }),
        prisma.product.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<Product> = {
        data: products,
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
      console.error('Erro ao buscar produtos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar produto por ID
  static async getById(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const product = await prisma.product.findFirst({
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
          category: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        }
      });

      if (!product) {
        res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      console.error('Erro ao buscar produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar produto
  static async update(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateProductDto = req.body;
      const { organizationId } = req.user!;

      // Verificar se produto existe e pertence à organização
      const existingProduct = await prisma.product.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingProduct) {
        res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
        return;
      }

      const product = await prisma.product.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        data: product,
        message: 'Produto atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar produto
  static async delete(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Verificar se produto existe e pertence à organização
      const existingProduct = await prisma.product.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingProduct) {
        res.status(404).json({
          success: false,
          error: 'Produto não encontrado'
        });
        return;
      }

      await prisma.product.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Produto deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar produtos por categoria
  static async getByCategory(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { categoryId } = req.params;
      const { organizationId } = req.user!;

      const products = await prisma.product.findMany({
        where: {
          categoryId,
          organizationId,
          active: true
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        },
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Erro ao buscar produtos por categoria:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas dos produtos
  static async getStats(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;

      const [
        totalProducts,
        activeProducts,
        productsByCategory,
        totalValue
      ] = await Promise.all([
        prisma.product.count({ where: { organizationId } }),
        prisma.product.count({ where: { organizationId, active: true } }),
        prisma.product.groupBy({
          by: ['categoryId'],
          where: { organizationId },
          _count: { id: true },
          _sum: { price: true }
        }),
        prisma.product.aggregate({
          where: { organizationId },
          _sum: { price: true },
          _avg: { price: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalProducts,
          activeProducts,
          inactiveProducts: totalProducts - activeProducts,
          productsByCategory,
          totalValue: totalValue._sum.price || 0,
          averagePrice: totalValue._avg.price || 0
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas dos produtos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}
