import { Router } from 'express';
import authRoutes from './auth';
import clientRoutes from './clients';
import saleRoutes from './sales';
import receiptRoutes from './receipts';
import vendorRoutes from './vendors';
import categoryRoutes from './categories';
import productRoutes from './products';
import inventoryRoutes from './inventory';
import paymentRoutes from './payments';
import cestaRoutes from './cestas';
import movimentacaoFinanceiraRoutes from './movimentacoesFinanceiras';
import auditRoutes from './audit';

const router = Router();

// Prefixos das rotas
router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/sales', saleRoutes);
router.use('/receipts', receiptRoutes);
router.use('/vendors', vendorRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/payments', paymentRoutes);
router.use('/cestas', cestaRoutes);
router.use('/movimentacoes-financeiras', movimentacaoFinanceiraRoutes);
router.use('/audit', auditRoutes);

// Rota de health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando normalmente',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Rota padrão
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Whisper Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      clients: '/clients',
      sales: '/sales',
      receipts: '/receipts',
      vendors: '/vendors',
      categories: '/categories',
      products: '/products',
      inventory: '/inventory',
      payments: '/payments',
      cestas: '/cestas',
      movimentacoesFinanceiras: '/movimentacoes-financeiras',
      audit: '/audit'
    }
  });
});

export default router;
