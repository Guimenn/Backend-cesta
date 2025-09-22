import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// Rotas públicas
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.get('/needs-admin-setup', AuthController.needsAdminSetup);
router.post('/enable-admin-setup', AuthController.enableAdminSetup);

// Rotas protegidas
router.use(authenticateToken);

router.get('/profile', AuthController.getCurrentProfile); // Perfil do usuário atual
router.get('/profile/:userId', AuthController.getProfile); // Perfil de outro usuário
router.post('/logout', AuthController.logout);

// Rotas apenas para admin
router.post('/assign-role', requireAdmin, AuthController.assignRole);

export default router;
