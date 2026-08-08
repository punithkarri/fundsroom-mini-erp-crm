import { Router } from 'express';
import {
  getCustomers,
  createCustomer,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  createFollowUp,
} from '../controllers/customerController';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Retrieve customers - Admin, Sales, Accounts
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  getCustomers
);

// Create customer - Admin, Sales
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  createCustomer
);

// Get specific customer detail - Admin, Sales, Accounts
router.get(
  '/:id',
  authenticate,
  authorize(Role.ADMIN, Role.SALES, Role.ACCOUNTS),
  getCustomerById
);

// Update customer - Admin, Sales
router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  updateCustomer
);

// Delete customer - Admin only
router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  deleteCustomer
);

// Log CRM follow-up - Admin, Sales
router.post(
  '/:id/follow-ups',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  createFollowUp
);

export default router;
