import { Router } from 'express';
import { SaleController } from '../controllers/saleController';
import { authenticateToken, requireOrganization } from '../middleware/auth';
import { auditCreate, auditUpdate, auditDelete, auditSale } from '../middleware/audit';

const router = Router();

// Todas as rotas requerem autenticação e organização
router.use(authenticateToken);
router.use(requireOrganization);

// Rotas específicas (devem vir antes das rotas paramétricas)
router.get('/fiado', SaleController.getFiado);

// CRUD básico
router.post('/', SaleController.create);
router.get('/', SaleController.getAll);
router.get('/:id', SaleController.getById);
router.put('/:id', SaleController.update);
router.delete('/:id', SaleController.delete);
router.get('/period/search', SaleController.getByPeriod);
router.get('/vendor/search', SaleController.getByVendor);
router.get('/stats/all', SaleController.getStats);

export default router;
