import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { authenticateToken, requireOrganization, requireAdmin } from '../middleware/auth';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

const router = Router();

// Todas as rotas requerem autenticação e organização
router.use(authenticateToken);
router.use(requireOrganization);

// CRUD básico
router.post('/', auditCreate('product'), ProductController.create);
router.get('/', ProductController.getAll);
router.get('/:id', ProductController.getById);
router.put('/:id', auditUpdate('product'), ProductController.update);
router.delete('/:id', auditDelete('product'), ProductController.delete);

// Rotas específicas
router.get('/category/:categoryId', ProductController.getByCategory);
router.get('/stats/all', ProductController.getStats);

export default router;
