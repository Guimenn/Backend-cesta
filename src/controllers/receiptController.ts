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
import { auditCreate, auditUpdate, auditDelete, auditReceipt } from '../middleware/audit';
import { MovimentacaoFinanceiraController } from './movimentacaoFinanceiraController';

export class ReceiptController {
  // Criar novo recebimento
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
        message: 'Recebimento criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar recebimento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todos os recebimentos da organização (substitui get_recebimentos_secure)
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { page = 1, limit = 50, search, sortBy = 'dueDate', sortOrder = 'desc' } = req.query as FilterQuery;

      const skip = (page - 1) * limit;

      // Construir filtros
      const where: any = {
        organizationId
      };

      if (search) {
        where.OR = [
          { client: { name: { contains: search, mode: 'insensitive' } } },
          { vendor: { name: { contains: search, mode: 'insensitive' } } },
          { status: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Buscar recebimentos com paginação
      const [receipts, total] = await Promise.all([
        prisma.receipt.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            client: {
              select: {
                id: true,
                name: true,
                neighborhood: true
              }
            },
            vendor: {
              select: {
                id: true,
                name: true
              }
            },
            sale: {
              select: {
                id: true,
                total: true,
                saleDate: true
              }
            }
          }
        }),
        prisma.receipt.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<Receipt> = {
        data: receipts,
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
      console.error('Erro ao buscar recebimentos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar recebimento por ID
  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const receipt = await prisma.receipt.findFirst({
        where: {
          id,
          organizationId
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              neighborhood: true,
              phone: true
            }
          },
          vendor: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          },
          sale: {
            select: {
              id: true,
              total: true,
              saleDate: true,
              items: {
                include: {
                  product: {
                    select: {
                      id: true,
                      name: true,
                      price: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!receipt) {
        res.status(404).json({
          success: false,
          error: 'Recebimento não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: receipt
      });
    } catch (error) {
      console.error('Erro ao buscar recebimento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar recebimento
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateReceiptDto = req.body;
      const { organizationId } = req.user!;

      // Verificar se recebimento existe e pertence à organização
      const existingReceipt = await prisma.receipt.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingReceipt) {
        res.status(404).json({
          success: false,
          error: 'Recebimento não encontrado'
        });
        return;
      }

      const receipt = await prisma.receipt.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        data: receipt,
        message: 'Recebimento atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar recebimento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar recebimento
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Verificar se recebimento existe e pertence à organização
      const existingReceipt = await prisma.receipt.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingReceipt) {
        res.status(404).json({
          success: false,
          error: 'Recebimento não encontrado'
        });
        return;
      }

      await prisma.receipt.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Recebimento deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar recebimento:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Registrar recebimento de venda fiado (substitui registrar_recebimento_fiado)
  static async registerFiadoReceipt(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { 
        saleId, 
        amount, 
        paymentMethod, 
        observations, 
        vendorResponsibleId,
        nextPayment 
      } = req.body;

      const { organizationId } = req.user!;

      if (!saleId || !amount) {
        res.status(400).json({
          success: false,
          error: 'ID da venda e valor são obrigatórios'
        });
        return;
      }

      // Verificar se a venda existe e pertence à organização
      const sale = await prisma.sale.findFirst({
        where: {
          id: saleId,
          organizationId
        },
        include: {
          client: true,
          payments: true
        }
      });

      if (!sale) {
        res.status(404).json({
          success: false,
          error: 'Venda não encontrada'
        });
        return;
      }

      // Calcular saldo pendente
      const totalReceived = sale.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const pendingBalance = sale.total - totalReceived;

      // Verificar se há saldo pendente
      if (pendingBalance <= 0) {
        res.status(400).json({
          success: false,
          error: 'Esta venda já está totalmente paga'
        });
        return;
      }

      if (amount > pendingBalance) {
        res.status(400).json({
          success: false,
          error: 'Valor recebido é maior que o saldo pendente'
        });
        return;
      }

      // Mapear método de pagamento para o enum correto
      const methodMap: { [key: string]: string } = {
        'dinheiro': 'DINHEIRO',
        'pix': 'PIX',
        'cartao': 'CARTAO_CREDITO',
        'cartão': 'CARTAO_CREDITO',
        'cartao_credito': 'CARTAO_CREDITO',
        'cartao_debito': 'CARTAO_DEBITO',
        'transferencia': 'TRANSFERENCIA',
        'fiado': 'FIADO'
      };

      const mappedMethod = methodMap[paymentMethod.toLowerCase()] || 'DINHEIRO';

      // Criar recebimento
      const payment = await prisma.payment.create({
        data: {
          id: uuidv4(),
          clientId: sale.clientId,
          saleId,
          vendedorId: vendorResponsibleId,
          organizationId,
          amount,
          dueDate: new Date(),
          paidAt: new Date(),
          proximoPagamento: nextPayment ? new Date(nextPayment) : null,
          method: mappedMethod as any,
          status: 'PAGO',
          notes: observations,
          createdBy: req.user!.id
        }
      });

      // Verificar se a venda foi totalmente paga
      const newTotalReceived = totalReceived + amount;
      const isFullyPaid = newTotalReceived >= sale.total;

      if (isFullyPaid) {
        // Atualizar status da venda para paga
        await prisma.sale.update({
          where: { id: saleId },
          data: { status: 'CONCLUIDA' }
        });
      }

      // Registrar movimentação financeira automaticamente
      await MovimentacaoFinanceiraController.createAutomatic(
        organizationId,
        'entrada',
        amount,
        `Recebimento fiado - Cliente: ${sale.client?.name || 'N/A'}`,
        'Recebimento Fiado',
        mappedMethod,
        observations || `Pagamento via ${mappedMethod} - Venda ID: ${saleId}`
      );

      res.json({
        success: true,
        data: {
          payment,
          pendingBalance: pendingBalance - amount,
          isFullyPaid
        },
        message: 'Recebimento registrado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao registrar recebimento fiado:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar recebimentos por período
  static async getByPeriod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { startDate, endDate, status } = req.query as { 
        startDate?: string; 
        endDate?: string; 
        status?: string 
      };

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Data inicial e final são obrigatórias'
        });
        return;
      }

      const where: any = {
        organizationId,
        dueDate: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };

      if (status) {
        where.status = status;
      }

      const receipts = await prisma.receipt.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              neighborhood: true
            }
          },
          vendor: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      res.json({
        success: true,
        data: receipts
      });
    } catch (error) {
      console.error('Erro ao buscar recebimentos por período:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar recebimentos por vendedor
  static async getByVendor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { vendorId, startDate, endDate } = req.query as { 
        vendorId: string; 
        startDate?: string; 
        endDate?: string 
      };

      if (!vendorId) {
        res.status(400).json({
          success: false,
          error: 'ID do vendedor é obrigatório'
        });
        return;
      }

      const where: any = {
        organizationId,
        vendorId
      };

      if (startDate && endDate) {
        where.dueDate = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const receipts = await prisma.receipt.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              neighborhood: true
            }
          }
        },
        orderBy: { dueDate: 'asc' }
      });

      res.json({
        success: true,
        data: receipts
      });
    } catch (error) {
      console.error('Erro ao buscar recebimentos por vendedor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas dos recebimentos
  static async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const where: any = { organizationId };

      if (startDate && endDate) {
        where.dueDate = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const [
        totalReceipts,
        totalAmount,
        receiptsByStatus,
        receiptsByVendor,
        receiptsByClient,
        dailyReceipts,
        overdueAmount
      ] = await Promise.all([
        prisma.receipt.count({ where }),
        prisma.receipt.aggregate({
          where,
          _sum: { amount: true },
          _avg: { amount: true }
        }),
        prisma.receipt.groupBy({
          by: ['status'],
          where,
          _count: { id: true },
          _sum: { amount: true }
        }),
        prisma.receipt.groupBy({
          by: ['vendorId'],
          where,
          _count: { id: true },
          _sum: { amount: true }
        }),
        prisma.receipt.groupBy({
          by: ['clientId'],
          where,
          _count: { id: true },
          _sum: { amount: true }
        }),
        prisma.receipt.groupBy({
          by: ['dueDate'],
          where,
          _count: { id: true },
          _sum: { amount: true }
        }),
        prisma.receipt.aggregate({
          where: {
            ...where,
            dueDate: { lt: new Date() },
            status: { not: 'confirmado' }
          },
          _sum: { amount: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalReceipts,
          totalAmount: totalAmount._sum.amount || 0,
          averageAmount: totalAmount._avg.amount || 0,
          receiptsByStatus,
          receiptsByVendor,
          receiptsByClient,
          dailyReceipts,
          overdueAmount: overdueAmount._sum.amount || 0
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas dos recebimentos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}
