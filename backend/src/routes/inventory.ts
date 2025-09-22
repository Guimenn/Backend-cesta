import { Router } from 'express';
import { InventoryController } from '../controllers/inventoryController';
import { authenticateToken, requireOrganization, requireAdmin } from '../middleware/auth';
import { auditCreate, auditUpdate, auditDelete } from '../middleware/audit';

const router = Router();

// Todas as rotas requerem autenticação e organização
router.use(authenticateToken);
router.use(requireOrganization);

// CRUD básico
router.post('/create', InventoryController.create as any);
router.get('/', InventoryController.getAll as any);
router.get('/:id', InventoryController.getById as any);
router.put('/:id', (InventoryController.update as any));
router.delete('/:id', (InventoryController.delete as any));

// Rotas específicas
router.get('/product/:productId', InventoryController.getByProduct as any);
router.get('/stats/all', InventoryController.getStats as any);
router.post('/:id/movimentar', InventoryController.movimentar as any);

export default router;
