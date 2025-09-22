import { Router } from 'express';
import { MovimentacaoFinanceiraController } from '../controllers/movimentacaoFinanceiraController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// CRUD básico
router.post('/', MovimentacaoFinanceiraController.create);
router.get('/', MovimentacaoFinanceiraController.getAll);
router.get('/:id', MovimentacaoFinanceiraController.getById);
router.put('/:id', MovimentacaoFinanceiraController.update);
router.delete('/:id', MovimentacaoFinanceiraController.delete);

export default router;
