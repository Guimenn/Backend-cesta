import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  CreateClientDto, 
  UpdateClientDto, 
  Client, 
  PaginatedResponse,
  FilterQuery,
  AuthenticatedRequest 
} from '../types';
import prisma from '../lib/prisma';
import { auditCreate, auditUpdate, auditDelete, auditClientEdit } from '../middleware/audit';

export class ClientController {
  // Criar novo cliente
  static async create(req: AuthenticatedRequest & Request & Request, res: Response): Promise<void> {
    try {
      const clientData: CreateClientDto = req.body;
      const { organizationId } = req.user!;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organização não especificada'
        });
        return;
      }

      const client = await prisma.client.create({
        data: {
          id: uuidv4(),
          ...clientData,
          organizationId,
          createdBy: req.user!.id
        }
      });

      res.status(201).json({
        success: true,
        data: client,
        message: 'Cliente criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todos os clientes da organização (substitui get_clientes_secure)
  static async getAll(req: AuthenticatedRequest & Request & Request, res: Response): Promise<void> {
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
          { neighborhood: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Buscar clientes com paginação
      const [clients, total] = await Promise.all([
        prisma.client.findMany({
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
        prisma.client.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<Client> = {
        data: clients as Client[],
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
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar cliente por ID
  static async getById(req: AuthenticatedRequest & Request & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const client = await prisma.client.findFirst({
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
          sales: {
            select: {
              id: true,
              total: true,
              status: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      if (!client) {
        res.status(404).json({
          success: false,
          error: 'Cliente não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: client
      });
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar cliente
  static async update(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateClientDto = req.body;
      const { organizationId } = req.user!;

      // Verificar se cliente existe e pertence à organização
      const existingClient = await prisma.client.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingClient) {
        res.status(404).json({
          success: false,
          error: 'Cliente não encontrado'
        });
        return;
      }

      const client = await prisma.client.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        data: client,
        message: 'Cliente atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar cliente
  static async delete(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Verificar se cliente existe e pertence à organização
      const existingClient = await prisma.client.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingClient) {
        res.status(404).json({
          success: false,
          error: 'Cliente não encontrado'
        });
        return;
      }

      // Verificar se cliente tem vendas ou recebimentos
      const [salesCount, receiptsCount] = await Promise.all([
        prisma.sale.count({ where: { clientId: id } }),
        prisma.sale.count({ where: { clientId: id } })
      ]);

      if (salesCount > 0 || receiptsCount > 0) {
        res.status(400).json({
          success: false,
          error: 'Não é possível deletar cliente com vendas ou recebimentos associados'
        });
        return;
      }

      await prisma.client.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Cliente deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar clientes por bairro
  static async getByNeighborhood(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { neighborhood } = req.params;
      const { organizationId } = req.user!;

      const clients = await prisma.client.findMany({
        where: {
          neighborhood,
          organizationId
        },
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: clients
      });
    } catch (error) {
      console.error('Erro ao buscar clientes por bairro:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar clientes em atraso
  static async getOverdueClients(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const today = new Date();

      const overdueReceipts = await prisma.sale.findMany({
        where: {
          organizationId,
          createdAt: { lt: today },
          status: { not: 'CONCLUIDA' }
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              neighborhood: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      res.json({
        success: true,
        data: overdueReceipts
      });
    } catch (error) {
      console.error('Erro ao buscar clientes em atraso:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar clientes reagendados
  static async getRescheduledClients(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const where: any = {
        organizationId,
        nextPayment: { not: null }
      };

      if (startDate && endDate) {
        where.nextPayment = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const rescheduledReceipts = await prisma.sale.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              neighborhood: true,
              phone: true
            }
          }
        },
        orderBy: { nextPayment: 'asc' }
      });

      res.json({
        success: true,
        data: rescheduledReceipts
      });
    } catch (error) {
      console.error('Erro ao buscar clientes reagendados:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas dos clientes
  static async getStats(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;

      const [
        totalClients,
        clientsByNeighborhood,
        totalSales,
        totalReceipts,
        overdueAmount
      ] = await Promise.all([
        prisma.client.count({ where: { organizationId } }),
        prisma.client.groupBy({
          by: ['neighborhood'],
          where: { organizationId },
          _count: { id: true }
        }),
        prisma.sale.aggregate({
          where: { organizationId },
          _sum: { total: true },
          _count: { id: true }
        }),
        prisma.sale.aggregate({
          where: { organizationId },
          _sum: { total: true },
          _count: { id: true }
        }),
        prisma.sale.aggregate({
          where: {
            organizationId,
            createdAt: { lt: new Date() },
            status: { not: 'CONCLUIDA' }
          },
          _sum: { total: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalClients,
          clientsByNeighborhood,
          totalSales: totalSales._sum.total || 0,
          salesCount: totalSales._count.id,
          totalReceipts: totalReceipts._sum.total || 0,
          receiptsCount: totalReceipts._count.id,
          overdueAmount: overdueAmount._sum.total || 0
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas dos clientes:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}
