import { Router } from 'express';
import { ClientController } from '../controllers/clientController';
import { authenticateToken, requireOrganization } from '../middleware/auth';
import { auditCreate, auditUpdate, auditDelete, auditClientEdit } from '../middleware/audit';

const router = Router();

// Todas as rotas requerem autenticação e organização
router.use(authenticateToken);
router.use(requireOrganization);

// CRUD básico
router.post('/', auditCreate('client'), ClientController.create);
router.get('/', ClientController.getAll);
router.get('/:id', ClientController.getById);
router.put('/:id', auditClientEdit(), ClientController.update);
router.delete('/:id', auditDelete('client'), ClientController.delete);

// Rotas específicas
router.get('/neighborhood/:neighborhood', ClientController.getByNeighborhood);
router.get('/overdue/all', ClientController.getOverdueClients);
router.get('/rescheduled/all', ClientController.getRescheduledClients);
router.get('/stats/all', ClientController.getStats);

export default router;
