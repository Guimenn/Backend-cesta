import { Response, Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  CreateInventoryItemDto, 
  UpdateInventoryItemDto, 
  InventoryItem, 
  PaginatedResponse,
  FilterQuery,
  AuthenticatedRequest 
} from '../types';
import prisma from '../lib/prisma';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

export class InventoryController {
  // Criar novo item de estoque
  static async create(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      console.log('=== INVENTORY CREATE DEBUG ===');
      console.log('Request body:', req.body);
      console.log('User:', req.user);
      
      const {
        nome,
        categoria,
        quantidade = 0,
        quantidade_minima = 10,
        quantidade_maxima = 1000,
        preco_custo = 0,
        preco_venda = 0,
        unidade = 'un',
        localizacao,
        fornecedor,
        codigo_barras,
        observacoes,
        ativo = true
      } = req.body;
      
      const { organizationId, id: userId } = req.user!;
      
      console.log('Extracted data:', {
        nome, categoria, quantidade, quantidade_minima, quantidade_maxima,
        preco_custo, preco_venda, unidade, localizacao, fornecedor,
        codigo_barras, observacoes, ativo, organizationId, userId
      });

      if (!organizationId) {
        res.status(400).json({
          success: false,
          error: 'Organização não especificada'
        });
        return;
      }

      const inventoryItem = await prisma.estoque.create({
        data: {
          nome,
          categoria,
          quantidade,
          quantidadeMinima: quantidade_minima,
          quantidadeMaxima: quantidade_maxima,
          precoCusto: preco_custo,
          precoVenda: preco_venda,
          unidade,
          localizacao,
          fornecedor,
          codigoBarras: codigo_barras,
          observacoes,
          ativo,
          organizationId,
          createdBy: userId
        }
      });

      res.status(201).json({
        success: true,
        data: inventoryItem,
        message: 'Item de estoque criado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao criar item de estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar todos os itens de estoque da organização
  static async getAll(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;
      const { page = 1, limit = 50, search, productId, sortBy = 'updatedAt', sortOrder = 'desc', includeInactive } = req.query as FilterQuery & { includeInactive?: string };

      const skip = (page - 1) * limit;

      // Construir filtros
      const where: any = {
        organizationId
      };

      // Filtrar por status ativo apenas se não incluir inativos
      if (includeInactive !== 'true') {
        where.ativo = true;
      }

      if (search) {
        where.OR = [
          { nome: { contains: search, mode: 'insensitive' } },
          { localizacao: { contains: search, mode: 'insensitive' } }
        ];
      }

      // Buscar itens de estoque com paginação
      const [inventoryItems, total] = await Promise.all([
        prisma.estoque.findMany({
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
        prisma.estoque.count({ where })
      ]);

      const totalPages = Math.ceil(total / limit);


      const response: PaginatedResponse<any> = {
        data: inventoryItems,
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
      console.error('Erro ao buscar itens de estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar item de estoque por ID
  static async getById(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      const inventoryItem = await prisma.estoque.findFirst({
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

      if (!inventoryItem) {
        res.status(404).json({
          success: false,
          error: 'Item de estoque não encontrado'
        });
        return;
      }

      res.json({
        success: true,
        data: inventoryItem
      });
    } catch (error) {
      console.error('Erro ao buscar item de estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Atualizar item de estoque
  static async update(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      
      const { id } = req.params;
      const {
        nome,
        categoria,
        quantidade,
        quantidade_minima,
        quantidade_maxima,
        preco_custo,
        preco_venda,
        unidade,
        localizacao,
        fornecedor,
        codigo_barras,
        observacoes,
        ativo
      } = req.body;
      
      const { organizationId } = req.user!;

      // Verificar se item existe e pertence à organização
      const existingItem = await prisma.estoque.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingItem) {
        res.status(404).json({
          success: false,
          error: 'Item de estoque não encontrado'
        });
        return;
      }

      // Construir objeto de atualização apenas com campos fornecidos
      const updateData: any = {};
      if (nome !== undefined) updateData.nome = nome;
      if (categoria !== undefined) updateData.categoria = categoria;
      if (quantidade !== undefined) updateData.quantidade = quantidade;
      if (quantidade_minima !== undefined) updateData.quantidadeMinima = quantidade_minima;
      if (quantidade_maxima !== undefined) updateData.quantidadeMaxima = quantidade_maxima;
      if (preco_custo !== undefined) updateData.precoCusto = preco_custo;
      if (preco_venda !== undefined) updateData.precoVenda = preco_venda;
      if (unidade !== undefined) updateData.unidade = unidade;
      if (localizacao !== undefined) updateData.localizacao = localizacao;
      if (fornecedor !== undefined) updateData.fornecedor = fornecedor;
      if (codigo_barras !== undefined) updateData.codigoBarras = codigo_barras;
      if (observacoes !== undefined) updateData.observacoes = observacoes;
      if (ativo !== undefined) updateData.ativo = ativo;

      const inventoryItem = await prisma.estoque.update({
        where: { id },
        data: updateData
      });

      res.json({
        success: true,
        data: inventoryItem,
        message: 'Item de estoque atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar item de estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Deletar item de estoque (soft delete)
  static async delete(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { organizationId } = req.user!;

      // Verificar se item existe e pertence à organização
      const existingItem = await prisma.estoque.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingItem) {
        res.status(404).json({
          success: false,
          error: 'Item de estoque não encontrado'
        });
        return;
      }

      // Verificar se o item está sendo usado em vendas
      const vendasItens = await prisma.vendaItem.findMany({
        where: {
          produtoId: id
        }
      });

      if (vendasItens.length > 0) {
        // Se está sendo usado em vendas, fazer soft delete (marcar como inativo)
        await prisma.estoque.update({
          where: { id },
          data: { 
            ativo: false,
            updatedAt: new Date()
          }
        });

        res.json({
          success: true,
          message: 'Item de estoque desativado com sucesso (está sendo usado em vendas)'
        });
      } else {
        // Se não está sendo usado, fazer exclusão física
        await prisma.estoque.delete({
          where: { id }
        });

        res.json({
          success: true,
          message: 'Item de estoque deletado com sucesso'
        });
      }
    } catch (error) {
      console.error('Erro ao deletar item de estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Buscar itens de estoque por produto
  static async getByProduct(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { productId } = req.params;
      const { organizationId } = req.user!;

      const inventoryItems = await prisma.estoque.findMany({
        where: {
          id: productId,
          organizationId
        },
        orderBy: { updatedAt: 'desc' }
      });

      res.json({
        success: true,
        data: inventoryItems
      });
    } catch (error) {
      console.error('Erro ao buscar itens de estoque por produto:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Estatísticas do estoque
  static async getStats(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.user!;

      const [
        totalItems,
        lowStockItems,
        outOfStockItems
      ] = await Promise.all([
        prisma.estoque.count({ where: { organizationId } }),
        prisma.estoque.count({
          where: {
            organizationId,
            quantidade: { lte: 10 }
          }
        }),
        prisma.estoque.count({
          where: {
            organizationId,
            quantidade: { lte: 0 }
          }
        })
      ]);

      res.json({
        success: true,
        data: {
          totalItems,
          lowStockItems,
          outOfStockItems
        }
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas do estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  // Movimentar estoque (entrada/saída)
  static async movimentar(req: AuthenticatedRequest & Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { tipo, quantidade, observacoes, valorUnitario } = req.body;
      const { organizationId, id: userId } = req.user!;

      // Verificar se item existe e pertence à organização
      const existingItem = await prisma.estoque.findFirst({
        where: {
          id,
          organizationId
        }
      });

      if (!existingItem) {
        res.status(404).json({
          success: false,
          error: 'Item de estoque não encontrado'
        });
        return;
      }

      // Validar quantidade
      if (!quantidade || quantidade <= 0) {
        res.status(400).json({
          success: false,
          error: 'Quantidade deve ser maior que zero'
        });
        return;
      }

      // Calcular nova quantidade
      let novaQuantidade = existingItem.quantidade;
      if (tipo === 'entrada') {
        novaQuantidade += quantidade;
      } else if (tipo === 'saida') {
        novaQuantidade -= quantidade;
        
        // Verificar se não ficará negativo
        if (novaQuantidade < 0) {
          res.status(400).json({
            success: false,
            error: 'Quantidade insuficiente em estoque'
          });
          return;
        }
      } else {
        res.status(400).json({
          success: false,
          error: 'Tipo de movimentação inválido (deve ser "entrada" ou "saida")'
        });
        return;
      }

      // Atualizar quantidade no estoque
      const updatedItem = await prisma.estoque.update({
        where: { id },
        data: {
          quantidade: novaQuantidade,
          updatedAt: new Date()
        }
      });

      // Registrar movimentação financeira se for entrada com valor
      if (tipo === 'entrada' && valorUnitario && valorUnitario > 0) {
        const valorTotal = quantidade * valorUnitario;
        
        // Registrar como movimentação financeira de saída (compra)
        await prisma.movimentacaoFinanceira.create({
          data: {
            id: uuidv4(),
            organizationId,
            tipo: 'saida',
            valor: valorTotal,
            descricao: `Compra de ${quantidade} ${existingItem.unidade} de ${existingItem.nome}`,
            categoria: 'estoque',
            data: new Date(),
            createdBy: userId
          }
        });
      }

      res.json({
        success: true,
        data: {
          item: updatedItem,
          movimentacao: {
            tipo,
            quantidade,
            quantidadeAnterior: existingItem.quantidade,
            quantidadeNova: novaQuantidade,
            observacoes,
            valorUnitario,
            data: new Date()
          }
        },
        message: 'Movimentação realizada com sucesso'
      });
    } catch (error) {
      console.error('Erro ao movimentar estoque:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}
