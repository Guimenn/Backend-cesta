import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  CreateSaleDto, 
  UpdateSaleDto, 
  Sale, 
  PaginatedResponse,
  FilterQuery,
  AuthenticatedRequest 
} from '../types';
import prisma from '../lib/prisma';
import { auditCreate, auditUpdate, auditDelete, auditSale } from '../middleware/audit';
import { MovimentacaoFinanceiraController } from './movimentacaoFinanceiraController';

export class SaleController {
  // Criar nova venda
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        clientId,
        vendorId,
        total,
        discount = 0,
        observacoes,
        tipo_pagamento = 'dinheiro',
        data_entrega,
        metodo_entrega = 'retirada',
        items = []
      } = req.body;
      
      const { organizationId, id: userId } = req.user!;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organização não especificada'
        });
        return;
      }

      // Validar dados da venda
      if (!items || items.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Venda deve ter pelo menos um item'
        });
        return;
      }

      // Criar venda e itens em uma transação
      const result = await prisma.$transaction(async (tx) => {
        // Criar venda
        const sale = await tx.sale.create({
          data: {
            clientId,
            vendorId,
            organizationId,
            userId,
            discount,
            total,
            status: 'PENDENTE',
            notes: observacoes,
            tipoPagamento: tipo_pagamento,
            dataEntrega: data_entrega ? new Date(data_entrega) : null,
            metodoEntrega: metodo_entrega,
            createdBy: userId,
            dataVenda: new Date(),
            pagamentos: []
          }
        });

        // Separar itens normais de cestas
        const itensNormais = items.filter(item => !item.produto_id.startsWith('cesta-'));
        const cestas = items.filter(item => item.produto_id.startsWith('cesta-'));

        // Criar itens normais da venda
        const saleItems = await Promise.all(
          itensNormais.map(item => 
            tx.vendaItem.create({
              data: {
                vendaId: sale.id,
                produtoId: item.produto_id,
                quantidade: item.quantidade,
                precoUnitario: item.preco_unitario,
                subtotal: item.subtotal,
                organizationId
              }
            })
          )
        );

        // Adicionar informações das cestas ao campo pagamentos (JSON)
        const cestasInfo = cestas.map(cesta => ({
          tipo: 'cesta',
          cestaId: cesta.produto_id.replace('cesta-', ''),
          nome: cesta.produto_nome,
          quantidade: cesta.quantidade,
          precoUnitario: cesta.preco_unitario,
          subtotal: cesta.subtotal
        }));

        // Atualizar a venda com informações das cestas
        if (cestasInfo.length > 0) {
          const pagamentosAtuais = Array.isArray(sale.pagamentos) ? sale.pagamentos : [];
          await tx.sale.update({
            where: { id: sale.id },
            data: {
              pagamentos: [...pagamentosAtuais, ...cestasInfo]
            }
          });
        }

        return { sale, items: saleItems };
      });

      // Registrar movimentação financeira automaticamente
      // Só registrar se não for fiado (fiado será registrado quando receber pagamento)
      if (tipo_pagamento !== 'fiado' && tipo_pagamento !== 'a prazo' && tipo_pagamento !== 'parcelado') {
        await MovimentacaoFinanceiraController.createAutomatic(
          organizationId,
          'entrada',
          total,
          `Venda - Cliente: ${result.sale.clientId ? 'ID: ' + result.sale.clientId : 'N/A'}`,
          'Vendas',
          tipo_pagamento,
          `Venda ID: ${result.sale.id} - ${observacoes || ''}`
        );
      }

      res.status(201).json({
        success: true,
        data: result,
        message: 'Venda criada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar venda:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar vendas fiado (vendas com pagamento a prazo)
  static async getFiado(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;

      // Buscar vendas com tipo de pagamento "fiado" ou "a prazo" (excluir vendas canceladas)
      const sales = await prisma.sale.findMany({
        where: {
          organizationId,
          status: {
            not: 'CANCELADA'
          },
          OR: [
            { tipoPagamento: 'fiado' },
            { tipoPagamento: 'a prazo' },
            { tipoPagamento: 'parcelado' }
          ]
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              phone: true,
              address: true,
              neighborhood: true
            }
          },
          vendor: {
            select: {
              id: true,
              name: true
            }
          },
          payments: {
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // Processar vendas para calcular saldo pendente
      const vendasFiado = sales.map(sale => {
        const totalRecebido = sale.payments
          .filter(p => p.status === 'PAGO')
          .reduce((sum, p) => sum + p.amount, 0);
        
        const saldoPendente = sale.total - totalRecebido;
        // Buscar próximo pagamento nos pagamentos já realizados que têm proximoPagamento definido
        const proximoPagamento = sale.payments
          .filter(p => p.status === 'PAGO' && p.proximoPagamento)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.proximoPagamento;

        return {
          id: sale.id,
          cliente_id: sale.clientId,
          cliente_nome: sale.client?.name || 'Cliente não encontrado',
          cliente_telefone: sale.client?.phone || '',
          cliente_endereco: sale.client?.address || '',
          cliente_bairro: sale.client?.neighborhood || '',
          vendedor_nome: sale.vendor?.name || 'Admin',
          total: sale.total,
          saldo_pendente: saldoPendente,
          proximo_pagamento: proximoPagamento,
          data_venda: sale.dataVenda,
          observacoes: sale.notes,
          status: saldoPendente <= 0 ? 'CONCLUIDA' : sale.status
        };
      }).filter(venda => venda.saldo_pendente > 0); // Filtrar apenas vendas com saldo pendente > 0

      res.json({
        success: true,
        data: vendasFiado
      });
    } catch (error) {
      console.error('Erro ao buscar vendas fiado:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todas as vendas da organização (substitui get_vendas_secure)
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { page = 1, limit = 50, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query as FilterQuery;

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

      // Buscar vendas com paginação
      const [sales, total] = await Promise.all([
        prisma.sale.findMany({
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
            items: {
              include: {
                estoque: {
                  select: {
                    id: true,
                    nome: true,
                    precoVenda: true,
                    precoCusto: true
                  }
                }
              }
            }
          }
        }),
        prisma.sale.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      // Processar vendas para incluir informações das cestas
      const processedSales = sales.map(sale => {
        // Extrair cestas do campo pagamentos (JSON)
        const cestas = Array.isArray(sale.pagamentos) 
          ? sale.pagamentos.filter((p: any) => p.tipo === 'cesta')
          : [];

        // Combinar itens normais com cestas
        const allItems = [
          ...sale.items.map(item => ({
            id: item.id,
            tipo: 'item',
            produto_id: item.produtoId,
            produto_nome: item.estoque?.nome || 'Produto não encontrado',
            quantidade: item.quantidade,
            preco_unitario: item.precoUnitario,
            subtotal: item.subtotal
          })),
          ...cestas.map((cesta: any) => ({
            id: `cesta-${cesta.cestaId}`,
            tipo: 'cesta',
            produto_id: `cesta-${cesta.cestaId}`,
            produto_nome: cesta.nome,
            quantidade: cesta.quantidade,
            preco_unitario: cesta.precoUnitario,
            subtotal: cesta.subtotal
          }))
        ];

        return {
          ...sale,
          allItems // Adicionar campo com todos os itens (normais + cestas)
        };
      });

      const response: PaginatedResponse<Sale> = {
        data: processedSales,
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
      console.error('Erro ao buscar vendas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar venda por ID
  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const sale = await prisma.sale.findFirst({
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
          items: {
            include: {
              estoque: {
                select: {
                  id: true,
                  nome: true,
                  precoVenda: true,
                  precoCusto: true,
                  unidade: true
                }
              }
            }
          },

        }
      });

      if (!sale) {
        res.status(404).json({
          success: false,
          error: 'Venda não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: sale
      });
    } catch (error) {
      console.error('Erro ao buscar venda:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar venda
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateSaleDto = req.body;
      const { organizationId } = req.user!;

      // Verificar se venda existe e pertence à organização
      const existingSale = await prisma.sale.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingSale) {
        res.status(404).json({
          success: false,
          error: 'Venda não encontrada'
        });
        return;
      }

      const sale = await prisma.sale.update({
        where: { id },
        data: {
          ...updateData,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        data: sale,
        message: 'Venda atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar venda:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar venda
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Verificar se venda existe e pertence à organização
      const existingSale = await prisma.sale.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingSale) {
        res.status(404).json({
          success: false,
          error: 'Venda não encontrada'
        });
        return;
      }

      // Verificar se venda tem pagamentos
      const paymentsCount = await prisma.payment.count({
        where: { saleId: id }
      });

      if (paymentsCount > 0) {
        res.status(400).json({
          success: false,
          error: 'Não é possível deletar venda com pagamentos associados'
        });
        return;
      }

      // Deletar em transação
      await prisma.$transaction(async (tx) => {
        // Deletar itens da venda
        await tx.vendaItem.deleteMany({
          where: { vendaId: id }
        });

        // Deletar venda
        await tx.sale.delete({
          where: { id }
        });
      });

      res.json({
        success: true,
        message: 'Venda deletada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar venda:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar vendas por período
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
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      };

      if (status) {
        where.status = status;
      }

      const sales = await prisma.sale.findMany({
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
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: sales
      });
    } catch (error) {
      console.error('Erro ao buscar vendas por período:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar vendas por vendedor
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
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const sales = await prisma.sale.findMany({
        where,
        include: {
          client: {
            select: {
              id: true,
              name: true,
              neighborhood: true
            }
          },
          items: {
            include: {
              estoque: {
                select: {
                  id: true,
                  nome: true,
                  precoVenda: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: sales
      });
    } catch (error) {
      console.error('Erro ao buscar vendas por vendedor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas das vendas
  static async getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
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
        totalSales,
        totalAmount,
        salesByStatus,
        salesByVendor,
        salesByClient,
        dailySales
      ] = await Promise.all([
        prisma.sale.count({ where }),
        prisma.sale.aggregate({
          where,
          _sum: { total: true },
          _avg: { total: true }
        }),
        prisma.sale.groupBy({
          by: ['status'],
          where,
          _count: { id: true },
          _sum: { total: true }
        }),
        prisma.sale.groupBy({
          by: ['vendorId'],
          where,
          _count: { id: true },
          _sum: { total: true }
        }),
        prisma.sale.groupBy({
          by: ['clientId'],
          where,
          _count: { id: true },
          _sum: { total: true }
        }),
        prisma.sale.groupBy({
          by: ['createdAt'],
          where,
          _count: { id: true },
          _sum: { total: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalSales,
          totalAmount: totalAmount._sum.total || 0,
          averageAmount: totalAmount._avg.total || 0,
          salesByStatus,
          salesByVendor,
          salesByClient,
          dailySales
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas das vendas:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}
