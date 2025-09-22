import { Router } from 'express';
import { ReceiptController } from '../controllers/receiptController';
import { authenticateToken, requireOrganization, requireFinance } from '../middleware/auth';
import { auditCreate, auditUpdate, auditDelete, auditReceipt } from '../middleware/audit';

const router = Router();

// Todas as rotas requerem autenticação e organização
router.use(authenticateToken);
router.use(requireOrganization);

// CRUD básico
router.post('/', auditReceipt(), ReceiptController.create);
router.get('/', ReceiptController.getAll);
router.get('/:id', ReceiptController.getById);
router.put('/:id', auditReceipt(), ReceiptController.update);
router.delete('/:id', auditDelete('receipt'), ReceiptController.delete);

// Rotas específicas
router.post('/fiado/register', auditReceipt(), ReceiptController.registerFiadoReceipt);
router.get('/period/search', ReceiptController.getByPeriod);
router.get('/vendor/search', ReceiptController.getByVendor);
router.get('/stats/all', ReceiptController.getStats);

export default router;
