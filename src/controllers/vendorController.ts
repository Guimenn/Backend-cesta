import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { 
  CreateVendorDto, 
  UpdateVendorDto, 
  Vendor, 
  PaginatedResponse,
  FilterQuery,
  AuthenticatedRequest 
} from '../types';
import prisma from '../lib/prisma';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

export class VendorController {
  // Criar novo vendedor
  static async create(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Criando vendedor...');
      const vendorData: CreateVendorDto = req.body;
      const { organizationId } = req.user!;

      console.log('📝 Dados recebidos:', vendorData);
      console.log('🏢 Organization ID:', organizationId);

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organização não especificada'
        });
        return;
      }

      const vendor = await prisma.vendor.create({
        data: {
          id: uuidv4(),
          ...vendorData,
          dataContratacao: vendorData.dataContratacao ? new Date(vendorData.dataContratacao) : null,
          organizationId,
          createdBy: req.user!.id
        }
      });

      console.log('✅ Vendedor criado:', vendor.id);
      res.status(201).json({
        success: true,
        data: vendor,
        message: 'Vendedor criado com sucesso'
      });
    } catch (error: any) {
      console.error('❌ Erro ao criar vendedor:', error);
      
      // Verificar se é erro de constraint única
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'campo';
        res.status(400).json({
          success: false,
          error: `Já existe um vendedor com este ${field === 'name' ? 'nome' : field} na organização`
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todos os vendedores da organização (substitui get_vendedores_secure)
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
          { email: { contains: search, mode: 'insensitive' } },
          { position: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Buscar vendedores com paginação
      const [vendors, total] = await Promise.all([
        prisma.vendor.findMany({
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
        prisma.vendor.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);

      const response: PaginatedResponse<Vendor> = {
        data: vendors,
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
      console.error('Erro ao buscar vendedores:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todos os vendedores (versão simples)
  static async getAllSimple(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Buscando vendedores (versão simples)...');
      const { organizationId } = req.user!;
      
      console.log('🏢 Organization ID:', organizationId);

      const vendors = await prisma.vendor.findMany({
        where: {
          organizationId
        },
        orderBy: { name: 'asc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      console.log('✅ Vendedores encontrados:', vendors.length);

      res.json({
        success: true,
        data: vendors,
        total: vendors.length
      });
    } catch (error) {
      console.error('❌ Erro ao buscar vendedores:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar vendedor por ID
  static async getById(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const vendor = await prisma.vendor.findFirst({
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

      if (!vendor) {
        res.status(404).json({
          success: false,
          error: 'Vendedor não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: vendor
      });
    } catch (error) {
      console.error('Erro ao buscar vendedor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar vendedor
  static async update(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateVendorDto = req.body;
      const { organizationId } = req.user!;

      console.log('🔄 Atualizando vendedor:', { id, updateData, organizationId });

      // Verificar se vendedor existe e pertence à organização
      const existingVendor = await prisma.vendor.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingVendor) {
        res.status(404).json({
          success: false,
          error: 'Vendedor não encontrado'
        });
        return;
      }

      // Mapear campos do DTO para o schema do banco
      const mappedData: any = {};
      
      if (updateData.name !== undefined) mappedData.name = updateData.name;
      if (updateData.email !== undefined) mappedData.email = updateData.email;
      if (updateData.phone !== undefined) mappedData.phone = updateData.phone;
      if (updateData.cpf !== undefined) mappedData.cpf = updateData.cpf;
      // address não existe no modelo Vendor, removido
      if (updateData.position !== undefined) mappedData.cargo = updateData.position;
      if (updateData.baseSalary !== undefined) mappedData.salarioBase = updateData.baseSalary;
      if (updateData.commissionPercentage !== undefined) mappedData.comissaoPercentual = updateData.commissionPercentage;
      if (updateData.hireDate !== undefined) mappedData.dataContratacao = updateData.hireDate;
      if (updateData.active !== undefined) mappedData.active = updateData.active;
      if (updateData.deactivationReason !== undefined) mappedData.motivoInativacao = updateData.deactivationReason;

      console.log('📝 Dados mapeados para atualização:', mappedData);

      const vendor = await prisma.vendor.update({
        where: { id },
        data: {
          ...mappedData,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        data: vendor,
        message: 'Vendedor atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar vendedor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar vendedor
  static async delete(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Verificar se vendedor existe e pertence à organização
      const existingVendor = await prisma.vendor.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingVendor) {
        res.status(404).json({
          success: false,
          error: 'Vendedor não encontrado'
        });
        return;
      }

      // Verificar se vendedor tem vendas ou recebimentos
      const [salesCount, receiptsCount] = await Promise.all([
        prisma.sale.count({ where: { vendorId: id } }),
        prisma.sale.count({ where: { vendorId: id } })
      ]);

      if (salesCount > 0 || receiptsCount > 0) {
        res.status(400).json({
          success: false,
          error: 'Não é possível deletar vendedor com vendas ou recebimentos associados'
        });
        return;
      }

      await prisma.vendor.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Vendedor deletado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar vendedor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar vendedores ativos
  static async getActive(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;

      const vendors = await prisma.vendor.findMany({
        where: {
          organizationId,
          active: true
        },
        orderBy: { name: 'asc' }
      });

      res.json({
        success: true,
        data: vendors
      });
    } catch (error) {
      console.error('Erro ao buscar vendedores ativos:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar vendedores por período de contratação
  static async getByHirePeriod(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Data inicial e final são obrigatórias'
        });
        return;
      }

      const vendors = await prisma.vendor.findMany({
        where: {
          organizationId,
          hireDate: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        orderBy: { hireDate: 'asc' }
      });

      res.json({
        success: true,
        data: vendors
      });
    } catch (error) {
      console.error('Erro ao buscar vendedores por período de contratação:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar vendedores por comissão
  static async getByCommission(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { minCommission, maxCommission } = req.query as { 
        minCommission?: string; 
        maxCommission?: string 
      };

      const where: any = {
        organizationId,
        comissao_percentual: { not: null }
      };

      if (minCommission && maxCommission) {
        where.comissao_percentual = {
          gte: parseFloat(minCommission),
          lte: parseFloat(maxCommission)
        };
      } else if (minCommission) {
        where.comissao_percentual = {
          gte: parseFloat(minCommission)
        };
      } else if (maxCommission) {
        where.comissao_percentual = {
          lte: parseFloat(maxCommission)
        };
      }

      const vendors = await prisma.vendor.findMany({
        where,
        orderBy: { comissao_percentual: 'desc' }
      });

      res.json({
        success: true,
        data: vendors
      });
    } catch (error) {
      console.error('Erro ao buscar vendedores por comissão:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas dos vendedores
  static async getStats(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

      const where: any = { organizationId };

      if (startDate && endDate) {
        where.hireDate = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const [
        totalVendors,
        activeVendors,
        vendorsByPosition,
        totalSales,
        totalReceipts,
        averageCommission
      ] = await Promise.all([
        prisma.vendor.count({ where }),
        prisma.vendor.count({ 
          where: { ...where, active: true } 
        }),
        prisma.vendor.groupBy({
          by: ['position'],
          where,
          _count: { id: true }
        }),
        prisma.sale.aggregate({
          where: { organizationId },
          _sum: { total: true },
          _count: { id: true }
        }),
        prisma.sale.aggregate({
          where: { organizationId },
          _sum: { amount: true },
          _count: { id: true }
        }),
        prisma.vendor.aggregate({
          where: { ...where, comissao_percentual: { not: null } },
          _avg: { comissao_percentual: true }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalVendors,
          activeVendors,
          inactiveVendors: totalVendors - activeVendors,
          vendorsByPosition,
          totalSales: totalSales._sum.total || 0,
          salesCount: totalSales._count.id,
          totalReceipts: totalReceipts._sum.amount || 0,
          receiptsCount: totalReceipts._count.id,
          averageCommission: averageCommission._avg.comissao_percentual || 0
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas dos vendedores:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Performance do vendedor
  static async getPerformance(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { vendorId } = req.params;
      const { organizationId } = req.user!;
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

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

              const [
          sales,
          vendor
        ] = await Promise.all([
          prisma.sale.findMany({
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
            orderBy: { createdAt: 'desc' }
          }),
          prisma.vendor.findFirst({
            where: { id: vendorId, organizationId }
          })
        ]);

      if (!vendor) {
        res.status(404).json({
          success: false,
          error: 'Vendedor não encontrado'
        });
        return;
      }

      // Calcular métricas de performance
      const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
      const salesCount = sales.length;
      const averageSaleValue = salesCount > 0 ? totalSales / salesCount : 0;
      
      // Calcular comissões
      const commissionPercentage = vendor.comissaoPercentual || 0;
      const totalCommission = (totalSales * commissionPercentage) / 100;
      
      // Calcular vendas por período (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentSales = sales.filter(sale => 
        new Date(sale.createdAt) >= thirtyDaysAgo
      );
      const recentTotalSales = recentSales.reduce((sum, sale) => sum + sale.total, 0);
      const recentCommission = (recentTotalSales * commissionPercentage) / 100;
      
      // Calcular vendas por mês atual
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      const monthlySales = sales.filter(sale => 
        new Date(sale.createdAt) >= currentMonth
      );
      const monthlyTotalSales = monthlySales.reduce((sum, sale) => sum + sale.total, 0);
      const monthlyCommission = (monthlyTotalSales * commissionPercentage) / 100;

      res.json({
        success: true,
        data: {
          vendor,
          performance: {
            totalSales,
            salesCount,
            averageSaleValue,
            totalCommission,
            commissionPercentage,
            recentSales: {
              count: recentSales.length,
              total: recentTotalSales,
              commission: recentCommission
            },
            monthlySales: {
              count: monthlySales.length,
              total: monthlyTotalSales,
              commission: monthlyCommission
            }
          },
          sales
        }
      });
    } catch (error) {
      console.error('Erro ao buscar performance do vendedor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Confirmar vendedor (vincular conta)
  static async confirm(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      console.log('🔄 Confirmando vendedor...');
      const { id } = req.params;
      const { organizationId } = req.user!;

      console.log('📝 Vendedor ID:', id);
      console.log('🏢 Organization ID:', organizationId);

      // Buscar o vendedor
      const vendor = await prisma.vendor.findFirst({
        where: { 
          id, 
          organizationId 
        }
      });

      if (!vendor) {
        res.status(404).json({
          success: false,
          error: 'Vendedor não encontrado'
        });
        return;
      }

      // Verificar se já está confirmado
      if (vendor.userId) {
        res.status(400).json({
          success: false,
          error: 'Vendedor já está confirmado'
        });
        return;
      }

      // Buscar usuário com o mesmo email
      let user = await prisma.user.findFirst({
        where: {
          email: vendor.email,
          organizationId
        }
      });

      // Se não existe usuário, criar um automaticamente
      if (!user) {
        console.log('👤 Criando usuário automaticamente para o vendedor...');
        
        // Gerar senha temporária (o vendedor deve alterar no primeiro login)
        const tempPassword = 'temp123456';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        user = await prisma.user.create({
          data: {
            id: uuidv4(),
            email: vendor.email,
            password: hashedPassword,
            role: 'VENDEDOR',
            organizationId,
            active: true,
            name: vendor.name,
            phone: vendor.phone
          }
        });
        
        console.log('✅ Usuário criado automaticamente:', user.id);
      }

      // Atualizar o vendedor com o userId
      const updatedVendor = await prisma.vendor.update({
        where: { id },
        data: {
          userId: user.id,
          updatedAt: new Date()
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

      console.log('✅ Vendedor confirmado:', updatedVendor.name);

      res.json({
        success: true,
        data: updatedVendor,
        message: 'Vendedor confirmado com sucesso. Usuário criado automaticamente com senha temporária: temp123456'
      });
    } catch (error: any) {
      console.error('❌ Erro ao confirmar vendedor:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}
