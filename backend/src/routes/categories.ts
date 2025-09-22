import { Router } from 'express';
import { CategoryController } from '../controllers/categoryController';
import { authenticateToken, requireOrganization, requireAdmin } from '../middleware/auth';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

const router = Router();

// Todas as rotas requerem autenticação e organização
router.use(authenticateToken);
router.use(requireOrganization);

// CRUD básico
router.post('/', auditCreate('category'), CategoryController.create);
router.get('/', CategoryController.getAll);
router.get('/:id', CategoryController.getById);
router.put('/:id', auditUpdate('category'), CategoryController.update);
router.delete('/:id', auditDelete('category'), CategoryController.delete);

// Rotas específicas
router.get('/stats/all', CategoryController.getStats);

export default router;
