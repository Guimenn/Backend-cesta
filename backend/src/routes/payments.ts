import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken, requireOrganization, requireAdmin } from '../middleware/auth';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

const router = Router();

// Todas as rotas requerem autenticação e organização
router.use(authenticateToken);
router.use(requireOrganization);

// CRUD básico
router.post('/', auditCreate('payment'), PaymentController.create);
router.get('/', PaymentController.getAll);
router.get('/:id', PaymentController.getById);
router.put('/:id', auditUpdate('payment'), PaymentController.update);
router.delete('/:id', auditDelete('payment'), PaymentController.delete);

// Rotas específicas
router.get('/client/:clientId', PaymentController.getByClient);
router.get('/sale/:saleId', PaymentController.getBySale);
router.get('/stats/all', PaymentController.getStats);

export default router;
