import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticatedRequest } from '../types';
import prisma from '../lib/prisma';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

export class MovimentacaoFinanceiraController {
  // Criar nova movimentação financeira
  static async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        tipo,
        valor,
        descricao,
        categoria,
        data,
        observacoes,
        formaPagamento
      } = req.body;

      const { organizationId, id: userId } = req.user!;

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organização não especificada'
        });
        return;
      }

      // Validar dados obrigatórios
      if (!tipo || !valor || !descricao || !categoria || !data) {
        res.status(400).json({
          success: false,
          error: 'Tipo, valor, descrição, categoria e data são obrigatórios'
        });
        return;
      }

      const movimentacao = await prisma.movimentacaoFinanceira.create({
        data: {
          id: uuidv4(),
          organizationId,
          tipo,
          valor: parseFloat(valor),
          descricao,
          categoria,
          data: new Date(data),
          observacoes,
          formaPagamento
        }
      });

      // Registrar auditoria
      await auditCreate(req, 'MovimentacaoFinanceira', movimentacao.id, {
        tipo,
        valor: parseFloat(valor),
        descricao,
        categoria
      });

      res.status(201).json({
        success: true,
        data: movimentacao,
        message: 'Movimentação financeira criada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar movimentação financeira:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todas as movimentações financeiras da organização
  static async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { page = 1, limit = 50, tipo, categoria, startDate, endDate } = req.query;

      const skip = (Number(page) - 1) * Number(limit);

      // Construir filtros
      const where: any = {
        organizationId
      };

      if (tipo) {
        where.tipo = tipo;
      }

      if (categoria) {
        where.categoria = categoria;
      }

      if (startDate && endDate) {
        where.data = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      const [movimentacoes, total] = await Promise.all([
        prisma.movimentacaoFinanceira.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit)
        }),
        prisma.movimentacaoFinanceira.count({ where })
      ]);

      res.json({
        success: true,
        data: movimentacoes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Erro ao buscar movimentações financeiras:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar movimentação por ID
  static async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const movimentacao = await prisma.movimentacaoFinanceira.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!movimentacao) {
        res.status(404).json({
          success: false,
          error: 'Movimentação financeira não encontrada'
        });
        return;
      }

      res.json({
        success: true,
        data: movimentacao
      });
    } catch (error) {
      console.error('Erro ao buscar movimentação financeira:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar movimentação financeira
  static async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        tipo,
        valor,
        descricao,
        categoria,
        data,
        observacoes,
        formaPagamento
      } = req.body;

      const { organizationId } = req.user!;

      // Verificar se a movimentação existe
      const existingMovimentacao = await prisma.movimentacaoFinanceira.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingMovimentacao) {
        res.status(404).json({
          success: false,
          error: 'Movimentação financeira não encontrada'
        });
        return;
      }

      const movimentacao = await prisma.movimentacaoFinanceira.update({
        where: { id },
        data: {
          tipo,
          valor: valor ? parseFloat(valor) : undefined,
          descricao,
          categoria,
          data: data ? new Date(data) : undefined,
          observacoes,
          formaPagamento
        }
      });

      // Registrar auditoria
      await auditUpdate(req, 'MovimentacaoFinanceira', id, {
        tipo,
        valor: valor ? parseFloat(valor) : undefined,
        descricao,
        categoria
      });

      res.json({
        success: true,
        data: movimentacao,
        message: 'Movimentação financeira atualizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar movimentação financeira:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar movimentação financeira
  static async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Verificar se a movimentação existe
      const existingMovimentacao = await prisma.movimentacaoFinanceira.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingMovimentacao) {
        res.status(404).json({
          success: false,
          error: 'Movimentação financeira não encontrada'
        });
        return;
      }

      await prisma.movimentacaoFinanceira.delete({
        where: { id }
      });

      // Registrar auditoria
      await auditDelete(req, 'MovimentacaoFinanceira', id);

      res.json({
        success: true,
        message: 'Movimentação financeira deletada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao deletar movimentação financeira:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Função auxiliar para criar movimentação financeira automaticamente
  static async createAutomatic(
    organizationId: string,
    tipo: string,
    valor: number,
    descricao: string,
    categoria: string,
    formaPagamento?: string,
    observacoes?: string
  ): Promise<void> {
    try {
      await prisma.movimentacaoFinanceira.create({
        data: {
          id: uuidv4(),
          organizationId,
          tipo,
          valor,
          descricao,
          categoria,
          data: new Date(),
          observacoes,
          formaPagamento
        }
      });
    } catch (error) {
      console.error('Erro ao criar movimentação financeira automática:', error);
      // Não lançar erro para não quebrar o fluxo principal
    }
  }
}
