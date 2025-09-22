import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  CreatePaymentDto, 
  UpdatePaymentDto, 
  Payment, 
  PaginatedResponse,
  FilterQuery,
  AuthenticatedRequest 
} from '../types';
import prisma from '../lib/prisma';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

export class PaymentController {
  // Criar novo pagamento
  static async create(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const paymentData: CreatePaymentDto = req.body;
      const { organizationId } = req.user!;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organização não especificada'
        });
        return;
      }

      const payment = await prisma.payment.create({
        data: {
          id: uuidv4(),
          ...paymentData,
          organizationId,
          createdBy: req.user!.id
        }
      });

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Pagamento criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todos os pagamentos da organização
  static async getAll(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { page = 1, limit = 50, search, status, method, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as FilterQuery;

      const skip = (page - 1) * limit;

      // Construir filtros
      const where: any = {
        organizationId
      };

      if (search) {
        where.OR = [
          { notes: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
          { sale: { id: { contains: search, mode: 'insensitive' } } }
        ];
      }

      if (status) {
        where.status = status;
      }

      if (method) {
        where.method = method;
      }

      // Buscar pagamentos com paginação
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
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
            client: {
              select: {
                id: true,
                name: true,
                neighborhood: true
              }
            },
            sale: {
              select: {
                id: true,
                total: true,
                status: true
              }
            },
            createdByUser: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }),
        prisma.payment.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<Payment> = {
        data: payments,
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
      console.error('Erro ao buscar pagamentos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar pagamento por ID
  static async getById(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const payment = await prisma.payment.findFirst({
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
          client: {
            select: {
              id: true,
              name: true,
              neighborhood: true,
              phone: true
            }
          },
          sale: {
            select: {
              id: true,
              total: true,
              status: true,
              createdAt: true
            }
          },
          createdByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!payment) {
        res.status(404).json({
          success: false,
          error: 'Pagamento não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      console.error('Erro ao buscar pagamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar pagamento
  static async update(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdatePaymentDto = req.body;
      const { organizationId } = req.user!;

      // Verificar se pagamento existe e pertence à organização
      const existingPayment = await prisma.payment.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingPayment) {
        res.status(404).json({
          success: false,
          error: 'Pagamento não encontrado'
        });
        return;
      }

      const payment = await prisma.payment.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        data: payment,
        message: 'Pagamento atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar pagamento
  static async delete(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Verificar se pagamento existe e pertence à organização
      const existingPayment = await prisma.payment.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingPayment) {
        res.status(404).json({
          success: false,
          error: 'Pagamento não encontrado'
        });
        return;
      }

      await prisma.payment.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Pagamento deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar pagamento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar pagamentos por cliente
  static async getByClient(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { clientId } = req.params;
      const { organizationId } = req.user!;

      const payments = await prisma.payment.findMany({
        where: {
          clientId,
          organizationId
        },
        include: {
          sale: {
            select: {
              id: true,
              total: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      console.error('Erro ao buscar pagamentos por cliente:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar pagamentos por venda
  static async getBySale(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { saleId } = req.params;
      const { organizationId } = req.user!;

      const payments = await prisma.payment.findMany({
        where: {
          saleId,
          organizationId
        },
        include: {
          client: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: payments
      });
    } catch (error) {
      console.error('Erro ao buscar pagamentos por venda:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas dos pagamentos
  static async getStats(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const where: any = { organizationId };

      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const [
        totalPayments,
        totalAmount,
        paymentsByStatus,
        paymentsByMethod,
        paymentsByDate
      ] = await Promise.all([
        prisma.payment.count({ where }),
        prisma.payment.aggregate({
          where,
          _sum: { amount: true },
          _avg: { amount: true }
        }),
        prisma.payment.groupBy({
          by: ['status'],
          where,
          _count: { id: true },
          _sum: { amount: true }
        }),
        prisma.payment.groupBy({
          by: ['method'],
          where,
          _count: { id: true },
          _sum: { amount: true }
        }),
        prisma.payment.groupBy({
          by: ['createdAt'],
          where,
          _count: { id: true },
          _sum: { amount: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalPayments,
          totalAmount: totalAmount._sum.amount || 0,
          averageAmount: totalAmount._avg.amount || 0,
          paymentsByStatus,
          paymentsByMethod,
          paymentsByDate
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas dos pagamentos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}
