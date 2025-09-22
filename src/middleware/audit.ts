import { Response, NextFunction, Request } from 'express';
import { AuthenticatedRequest, AuditAction } from '../types';
import prisma from '../lib/prisma';

export const auditLog = (
  action: AuditAction,
  entity?: string,
  getEntityId?: (req: AuthenticatedRequest & Request) => string | undefined,
  getDetails?: (req: AuthenticatedRequest & Request) => any,
  getAmount?: (req: AuthenticatedRequest & Request) => number | undefined
) => {
  return async (req: AuthenticatedRequest & Request, res: Response, next: NextFunction): Promise<void> => {
    const originalSend = res.send;
    
    res.send = function(data: any) {
      // Restaurar função original
      res.send = originalSend;
      
      // Registrar auditoria após resposta bem-sucedida
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAuditAction(req, action, entity, getEntityId, getDetails, getAmount);
      }
      
      // Chamar função original
      return originalSend.call(this, data);
    };
    
    next();
  };
};

export const logAuditAction = async (
  req: AuthenticatedRequest & Request,
  action: AuditAction,
  entity?: string,
  getEntityId?: (req: AuthenticatedRequest & Request) => string | undefined,
  getDetails?: (req: AuthenticatedRequest & Request) => any,
  getAmount?: (req: AuthenticatedRequest & Request) => number | undefined
): Promise<void> => {
  try {
    if (!req.user?.organizationId) {
      console.warn('Tentativa de registrar auditoria sem organização');
      return;
    }

    // Gerar descrição em português
    const getDescription = (action: string, entity?: string, details?: any) => {
      const entityNames: { [key: string]: string } = {
        'vendor': 'vendedor',
        'client': 'cliente',
        'sale': 'venda',
        'product': 'produto',
        'category': 'categoria',
        'payment': 'pagamento',
        'receipt': 'recebimento',
        'inventory': 'estoque',
        'user': 'usuário',
        'cesta': 'cesta'
      };

      const actionNames: { [key: string]: string } = {
        'CREATE': 'Criou',
        'UPDATE': 'Atualizou',
        'DELETE': 'Excluiu',
        'LOGIN': 'Fez login',
        'LOGOUT': 'Fez logout',
        'VIEW': 'Visualizou',
        'EXPORT': 'Exportou',
        'IMPORT': 'Importou',
        'APPROVE': 'Aprovou',
        'REJECT': 'Rejeitou',
        'PAYMENT': 'Processou pagamento'
      };

      const entityName = entity ? entityNames[entity.toLowerCase()] || entity : 'registro';
      const actionName = actionNames[action] || action;

      // Descrições específicas baseadas na ação e entidade
      if (action === 'CREATE' && entity === 'vendor') {
        return `Criou novo vendedor: ${details?.name || 'Nome não informado'}`;
      }
      if (action === 'UPDATE' && entity === 'vendor') {
        return `Atualizou dados do vendedor: ${details?.name || 'ID: ' + (getEntityId ? getEntityId(req) : 'N/A')}`;
      }
      if (action === 'DELETE' && entity === 'vendor') {
        return `Excluiu vendedor: ${details?.name || 'ID: ' + (getEntityId ? getEntityId(req) : 'N/A')}`;
      }
      if (action === 'PAYMENT' && entity === 'receipt') {
        return `Processou recebimento de R$ ${details?.amount || '0,00'}`;
      }
      if (action === 'CREATE' && entity === 'sale') {
        return `Realizou venda de R$ ${details?.total || '0,00'}`;
      }
      if (action === 'CREATE' && entity === 'client') {
        return `Cadastrou novo cliente: ${details?.name || 'Nome não informado'}`;
      }

      return `${actionName} ${entityName}`;
    };

    const auditData = {
      action,
      description: getDescription(action, entity, getDetails ? getDetails(req) : undefined),
      entity: entity,
      entityId: getEntityId ? getEntityId(req) : undefined,
      amount: getAmount ? getAmount(req) : undefined,
      details: getDetails ? getDetails(req) : {
        method: req.method,
        path: req.path,
        body: req.body,
        params: req.params,
        query: req.query
      },
      userId: req.user.id,
      organizationId: req.user.organizationId,
      ipAddress: req.ip || req.connection?.remoteAddress,
      deviceInfo: req.headers['user-agent']
    };

    await prisma.auditLog.create({
      data: auditData
    });
  } catch (error) {
    console.error('Erro ao registrar auditoria:', error);
    // Não falhar a requisição por erro de auditoria
  }
};

// Middlewares específicos para ações comuns
export const auditCreate = (entity: string) => auditLog(AuditAction.CREATE, entity);
export const auditUpdate = (entity: string) => auditLog(AuditAction.UPDATE, entity);
export const auditDelete = (entity: string) => auditLog(AuditAction.DELETE, entity);
export const auditLogin = () => auditLog(AuditAction.LOGIN, 'auth');
export const auditLogout = () => auditLog(AuditAction.LOGOUT, 'auth');

// Middleware para auditoria de vendas
export const auditSale = () => auditLog(
  AuditAction.SALE,
  'sale',
  (req: AuthenticatedRequest & Request) => (req as any).body?.id || (req as any).params?.id,
  (req: AuthenticatedRequest & Request) => ({
    clientId: (req as any).body?.clientId,
    total: (req as any).body?.total,
    paymentType: (req as any).body?.paymentType,
    vendorId: (req as any).body?.vendorId
  }),
  (req: AuthenticatedRequest & Request) => (req as any).body?.total
 );

// Middleware para auditoria de recebimentos
export const auditReceipt = () => auditLog(
  AuditAction.PAYMENT,
  'receipt',
  (req: AuthenticatedRequest & Request) => (req as any).body?.id || (req as any).params?.id,
  (req: AuthenticatedRequest & Request) => ({
    clientId: (req as any).body?.clientId,
    amount: (req as any).body?.amount,
    paymentMethod: (req as any).body?.paymentMethod,
    vendorId: (req as any).body?.vendorId
  }),
  (req: AuthenticatedRequest & Request) => (req as any).body?.amount
 );

// Middleware para auditoria de edição de clientes
export const auditClientEdit = () => auditLog(
  AuditAction.UPDATE,
  'client',
  (req: AuthenticatedRequest & Request) => (req as any).params?.id || (req as any).body?.id,
  (req: AuthenticatedRequest & Request) => ({
    clientName: (req as any).body?.name,
    changes: Object.keys((req as any).body || {}).filter(key => key !== 'id')
  })
 );
