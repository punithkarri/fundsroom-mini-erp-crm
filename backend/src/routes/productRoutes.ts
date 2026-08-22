import { Router } from 'express';
import {
  getProducts,
  createProduct,
  getProductById,
  updateProduct,
  getStockMovements,
  stockIn,
  stockOut,
} from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Read products - All authenticated roles
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN, Role.SALES, Role.OPERATIONS),
  getProducts
);

// Create product - Admin only
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  createProduct
);

// Get specific product details - All roles
router.get(
  '/:id',
  authenticate,
  authorize(Role.ADMIN, Role.SALES, Role.OPERATIONS),
  getProductById
);

// Update product data - Admin only
router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  updateProduct
);

// Read stock movements - Admin, Operations
router.get(
  '/:id/stock-movements',
  authenticate,
  authorize(Role.ADMIN, Role.OPERATIONS),
  getStockMovements
);

// Stock entry manual IN - Admin, Operations
router.post(
  '/:id/stock-in',
  authenticate,
  authorize(Role.ADMIN, Role.OPERATIONS),
  stockIn
);

// Stock entry manual OUT - Admin, Operations
router.post(
  '/:id/stock-out',
  authenticate,
  authorize(Role.ADMIN, Role.OPERATIONS),
  stockOut
);

export default router;
