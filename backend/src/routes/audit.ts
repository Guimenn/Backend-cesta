import { Router } from 'express';
import { AuditController } from '../controllers/auditController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Buscar todos os logs de auditoria
router.get('/', AuditController.getAll);

// Buscar logs por usuário
router.get('/user/:userId', AuditController.getByUser);

// Buscar estatísticas dos logs
router.get('/stats', AuditController.getStats);

export default router;

