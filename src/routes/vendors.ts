import { Router } from 'express';
import { VendorController } from '../controllers/vendorController';
import { authenticateToken, requireOrganization, requireAdmin } from '../middleware/auth';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

const router = Router();

// Todas as rotas requerem autenticação e organização
router.use(authenticateToken);
router.use(requireOrganization);

// CRUD básico
router.post('/', VendorController.create);
router.get('/', VendorController.getAll);
router.get('/simple', VendorController.getAllSimple);
router.get('/:id', VendorController.getById);
router.put('/:id', auditUpdate('vendor'), VendorController.update);
router.delete('/:id', auditDelete('vendor'), VendorController.delete);

// Confirmação de vendedor
router.post('/:id/confirm', VendorController.confirm);

// Rotas específicas
router.get('/active/all', VendorController.getActive);
router.get('/hire-period/search', VendorController.getByHirePeriod);
router.get('/commission/search', VendorController.getByCommission);
// router.get('/stats/all', VendorController.getStats);
router.get('/:vendorId/performance', VendorController.getPerformance);

export default router;
