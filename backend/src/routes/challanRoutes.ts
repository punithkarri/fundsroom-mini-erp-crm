import { Router } from 'express';
import {
  getChallans,
  createChallan,
  getChallanById,
  updateChallan,
  confirmChallan,
  cancelChallan,
} from '../controllers/challanController';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

// Read all challans - All roles
router.get(
  '/',
  authenticate,
  authorize(Role.ADMIN, Role.SALES, Role.OPERATIONS),
  getChallans
);

// Create challan (Draft) - Admin, Sales
router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  createChallan
);

// Get specific challan details - All roles
router.get(
  '/:id',
  authenticate,
  authorize(Role.ADMIN, Role.SALES, Role.OPERATIONS),
  getChallanById
);

// Update draft challan - Admin, Sales
router.put(
  '/:id',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  updateChallan
);

// Confirm draft challan - Admin, Sales
router.post(
  '/:id/confirm',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  confirmChallan
);

// Cancel draft or confirmed challan - Admin, Sales
router.post(
  '/:id/cancel',
  authenticate,
  authorize(Role.ADMIN, Role.SALES),
  cancelChallan
);

export default router;
