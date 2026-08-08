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
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
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
  authorize(Role.ADMIN, Role.SALES, Role.WAREHOUSE, Role.ACCOUNTS),
  getProductById
);

// Update product data - Admin only
router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  updateProduct
);

// Read stock movements - Admin, Warehouse
router.get(
  '/:id/stock-movements',
  authenticate,
  authorize(Role.ADMIN, Role.WAREHOUSE),
  getStockMovements
);

// Stock entry manual IN - Admin, Warehouse
router.post(
  '/:id/stock-in',
  authenticate,
  authorize(Role.ADMIN, Role.WAREHOUSE),
  stockIn
);

// Stock entry manual OUT - Admin, Warehouse
router.post(
  '/:id/stock-out',
  authenticate,
  authorize(Role.ADMIN, Role.WAREHOUSE),
  stockOut
);

export default router;
