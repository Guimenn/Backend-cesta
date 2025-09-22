import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../lib/prisma';

export class AuditController {
  // Buscar todos os logs de auditoria
  static async getAll(req: AuthenticatedRequest & any, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { page = 1, limit = 100, search, action, entity, startDate, endDate } = req.query;

      const pageNumber = parseInt(page as string);
      const limitNumber = parseInt(limit as string);
      const offset = (pageNumber - 1) * limitNumber;

      // Construir filtros
      const where: any = {
        organizationId
      };

      if (search) {
        where.OR = [
          { description: { contains: search as string, mode: 'insensitive' } },
          { entity: { contains: search as string, mode: 'insensitive' } },
          { entityId: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      if (action) {
        where.action = action;
      }

      if (entity) {
        where.entity = entity;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }

      // Buscar logs com paginação
      const [auditLogs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          skip: offset,
          take: limitNumber
        }),
        prisma.auditLog.count({ where })
      ]);

      // Formatar resposta
      const formattedLogs = auditLogs.map(log => ({
        id: log.id,
        userId: log.userId,
        userName: log.user?.name || 'Sistema',
        userEmail: log.user?.email || '',
        action: log.action,
        description: log.description,
        entity: log.entity,
        entityId: log.entityId,
        amount: log.amount,
        details: log.details,
        ipAddress: log.ipAddress,
        deviceInfo: log.deviceInfo,
        timestamp: log.createdAt,
        organizationId: log.organizationId
      }));

      res.json({
        success: true,
        data: formattedLogs,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber)
        }
      });
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar logs por usuário
  static async getByUser(req: AuthenticatedRequest & any, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { userId } = req.params;
      const { limit = 50 } = req.query;

      const limitNumber = parseInt(limit as string);

      const auditLogs = await prisma.auditLog.findMany({
        where: {
          organizationId,
          userId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limitNumber
      });

      const formattedLogs = auditLogs.map(log => ({
        id: log.id,
        userId: log.userId,
        userName: log.user?.name || 'Sistema',
        userEmail: log.user?.email || '',
        action: log.action,
        description: log.description,
        entity: log.entity,
        entityId: log.entityId,
        amount: log.amount,
        details: log.details,
        ipAddress: log.ipAddress,
        deviceInfo: log.deviceInfo,
        timestamp: log.createdAt,
        organizationId: log.organizationId
      }));

      res.json({
        success: true,
        data: formattedLogs
      });
    } catch (error) {
      console.error('Erro ao buscar logs do usuário:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar estatísticas dos logs
  static async getStats(req: AuthenticatedRequest & any, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { startDate, endDate } = req.query;

      const where: any = { organizationId };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate as string);
        }
      }

      // Estatísticas gerais
      const [
        totalLogs,
        totalUsers,
        actionStats,
        entityStats,
        recentLogs
      ] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.groupBy({
          by: ['userId'],
          where,
          _count: { userId: true }
        }),
        prisma.auditLog.groupBy({
          by: ['action'],
          where,
          _count: { action: true }
        }),
        prisma.auditLog.groupBy({
          by: ['entity'],
          where,
          _count: { entity: true }
        }),
        prisma.auditLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        })
      ]);

      res.json({
        success: true,
        data: {
          totalLogs,
          totalUsers: totalUsers.length,
          actionStats: actionStats.map(stat => ({
            action: stat.action,
            count: stat._count.action
          })),
          entityStats: entityStats.map(stat => ({
            entity: stat.entity,
            count: stat._count.entity
          })),
          recentLogs: recentLogs.map(log => ({
            id: log.id,
            userId: log.userId,
            userName: log.user?.name || 'Sistema',
            action: log.action,
            description: log.description,
            entity: log.entity,
            timestamp: log.createdAt
          }))
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas dos logs:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}

