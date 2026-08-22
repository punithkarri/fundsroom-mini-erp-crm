import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import {
  createInventoryItem, getInventory, getInventoryItem, getInventoryMovements,
  createWorkOrder, getWorkOrders, getWorkOrder, updateWorkOrderStatus, checkWorkOrderMaterial,
  createTransfer, getTransfers, getTransfer, dispatchTransfer, receiveTransfer,
  createCustomerOrder, getCustomerOrders, getCustomerOrder, reserveCustomerOrder, cancelCustomerOrder,
} from '../controllers/operationsController';

const router = Router();
const all = authorize(Role.ADMIN, Role.OPERATIONS, Role.SALES);
const operations = authorize(Role.ADMIN, Role.OPERATIONS);
const sales = authorize(Role.ADMIN, Role.SALES);

router.get('/inventory', authenticate, all, getInventory);
router.post('/inventory', authenticate, operations, createInventoryItem);
router.get('/inventory/:id', authenticate, all, getInventoryItem);
router.get('/inventory/:id/movements', authenticate, all, getInventoryMovements);

router.get('/work-orders', authenticate, authorize(Role.ADMIN, Role.OPERATIONS), getWorkOrders);
router.post('/work-orders', authenticate, operations, createWorkOrder);
router.get('/work-orders/:id', authenticate, authorize(Role.ADMIN, Role.OPERATIONS), getWorkOrder);
router.patch('/work-orders/:id/status', authenticate, operations, updateWorkOrderStatus);
router.put('/work-orders/:id/status', authenticate, operations, updateWorkOrderStatus);
router.get('/work-orders/:id/material-check', authenticate, authorize(Role.ADMIN, Role.OPERATIONS), checkWorkOrderMaterial);

router.get('/transfers', authenticate, authorize(Role.ADMIN, Role.OPERATIONS), getTransfers);
router.post('/transfers', authenticate, operations, createTransfer);
router.get('/transfers/:id', authenticate, authorize(Role.ADMIN, Role.OPERATIONS), getTransfer);
router.post('/transfers/:id/dispatch', authenticate, operations, dispatchTransfer);
router.post('/transfers/:id/receive', authenticate, operations, receiveTransfer);

router.get('/customer-orders', authenticate, sales, getCustomerOrders);
router.post('/customer-orders', authenticate, sales, createCustomerOrder);
router.get('/customer-orders/:id', authenticate, sales, getCustomerOrder);
router.post('/customer-orders/:id/reserve', authenticate, sales, reserveCustomerOrder);
router.post('/customer-orders/:id/cancel', authenticate, sales, cancelCustomerOrder);

export default router;
