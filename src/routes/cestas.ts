import { Router } from 'express';
import { CestaController } from '../controllers/cestaController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

// Rotas CRUD para cestas
router.post('/', CestaController.create);
router.get('/', CestaController.getAll);
router.get('/active', CestaController.getActive);
router.get('/possible', CestaController.calculatePossible);
router.get('/:id', CestaController.getById);
router.put('/:id', CestaController.update);
router.delete('/:id', CestaController.delete);

export default router;
