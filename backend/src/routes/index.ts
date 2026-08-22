import { Router } from 'express';
import authRoutes from './authRoutes';
import customerRoutes from './customerRoutes';
import productRoutes from './productRoutes';
import challanRoutes from './challanRoutes';
import dashboardRoutes from './dashboardRoutes';
import operationsRoutes from './operationsRoutes';
import userRoutes from './userRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/customers', customerRoutes);
router.use('/products', productRoutes);
router.use('/challans', challanRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/', operationsRoutes);
router.use('/users', userRoutes);

export default router;
