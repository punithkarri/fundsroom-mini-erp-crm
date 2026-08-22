import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import {
  inventorySchema,
  workOrderSchema,
  workOrderStatusSchema,
  transferSchema,
  customerOrderSchema,
} from '../validators';
import { BusinessRuleError, NotFoundError, ValidationError } from '../utils/errors';
import { CustomerOrderStatus, InventoryMovementType, Role, WorkOrderStatus } from '@prisma/client';

const itemInclude = { category: true, location: true } as const;
const withAvailability = <T extends { physicalQuantity: number; reservedQuantity: number }>(item: T) => ({
  ...item,
  availableQuantity: item.physicalQuantity - item.reservedQuantity,
});

const parse = <T>(schema: { safeParse: (value: unknown) => any }, body: unknown): T => {
  const result = schema.safeParse(body);
  if (!result.success) throw new ValidationError('Validation failed', result.error.errors);
  return result.data as T;
};

export const getInventory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await prisma.item.findMany({
      where: {
        locationId: typeof req.query.locationId === 'string' ? req.query.locationId : undefined,
        OR: typeof req.query.search === 'string' ? [
          { name: { contains: req.query.search, mode: 'insensitive' } },
          { sku: { contains: req.query.search, mode: 'insensitive' } },
        ] : undefined,
      },
      include: itemInclude,
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: items.map(withAvailability) });
  } catch (err) { next(err); }
};

export const getInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params.id }, include: itemInclude });
    if (!item) throw new NotFoundError('Inventory item not found');
    return res.json({ success: true, data: withAvailability(item) });
  } catch (err) { next(err); }
};

export const createInventoryItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = parse<any>(inventorySchema, req.body);
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.item.create({ data, include: itemInclude });
      if (data.physicalQuantity > 0) {
        await tx.inventoryMovement.create({ data: {
          itemId: created.id, locationId: created.locationId, quantity: data.physicalQuantity,
          movementType: InventoryMovementType.IN, reason: 'Initial inventory balance', createdById: req.user!.id,
        }});
      }
      return created;
    });
    return res.status(201).json({ success: true, data: withAvailability(item) });
  } catch (err) { next(err); }
};

export const getInventoryMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await prisma.item.findUnique({ where: { id: req.params.id } });
    if (!item) throw new NotFoundError('Inventory item not found');
    const movements = await prisma.inventoryMovement.findMany({ where: { itemId: item.id }, orderBy: { createdAt: 'desc' }, include: { createdBy: { select: { id: true, name: true, role: true } }, location: true } });
    return res.json({ success: true, data: movements });
  } catch (err) { next(err); }
};

export const createWorkOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = parse<any>(workOrderSchema, req.body);
    const [item, assignee] = await Promise.all([
      prisma.item.findUnique({ where: { id: data.itemId } }),
      prisma.user.findUnique({ where: { id: data.assignedUserId } }),
    ]);
    if (!item) throw new NotFoundError('Inventory item not found');
    if (!assignee) throw new NotFoundError('Assigned user not found');
    if (assignee.role !== Role.OPERATIONS && assignee.role !== Role.ADMIN) throw new BusinessRuleError('Work orders may only be assigned to Operations or Admin users');
    const order = await prisma.workOrder.create({ data, include: { item: { include: itemInclude }, location: true, assignedUser: { select: { id: true, name: true, role: true } } } });
    return res.status(201).json({ success: true, data: order });
  } catch (err) { next(err); }
};

export const getWorkOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orders = await prisma.workOrder.findMany({ include: { item: { include: itemInclude }, location: true, assignedUser: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: orders.map((order) => ({ ...order, availableQuantity: order.item.physicalQuantity - order.item.reservedQuantity, shortage: Math.max(order.requiredQuantity - (order.item.physicalQuantity - order.item.reservedQuantity), 0) })) });
  } catch (err) { next(err); }
};

export const updateWorkOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = parse<any>(workOrderStatusSchema, req.body);
    const order = await prisma.workOrder.findUnique({ where: { id: req.params.id } });
    if (!order) throw new NotFoundError('Work order not found');
    const valid = (order.status === WorkOrderStatus.ASSIGNED && status === WorkOrderStatus.IN_PROGRESS) || (order.status === WorkOrderStatus.IN_PROGRESS && status === WorkOrderStatus.COMPLETED);
    if (!valid) throw new BusinessRuleError(`Invalid work order transition: ${order.status} to ${status}`);
    const updated = await prisma.workOrder.update({ where: { id: order.id }, data: { status } });
    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
};

export const getWorkOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await prisma.workOrder.findUnique({ where: { id: req.params.id }, include: { item: { include: itemInclude }, location: true, assignedUser: { select: { id: true, name: true, role: true } } } });
    if (!order) throw new NotFoundError('Work order not found');
    const availableQuantity = order.item.physicalQuantity - order.item.reservedQuantity;
    return res.json({ success: true, data: { ...order, availableQuantity, shortage: Math.max(order.requiredQuantity - availableQuantity, 0) } });
  } catch (err) { next(err); }
};

export const checkWorkOrderMaterial = getWorkOrder;

export const createTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = parse<any>(transferSchema, req.body);
    const item = await prisma.item.findUnique({ where: { id: data.itemId } });
    if (!item || item.locationId !== data.sourceLocationId) throw new ValidationError('Item must belong to the source location');
    const transfer = await prisma.internalTransfer.create({ data: { ...data, requestedById: req.user!.id }, include: { item: true, sourceLocation: true, destinationLocation: true, requestedBy: { select: { id: true, name: true, role: true } } } });
    return res.status(201).json({ success: true, data: transfer });
  } catch (err) { next(err); }
};

export const getTransfers = async (req: Request, res: Response, next: NextFunction) => {
  try { const transfers = await prisma.internalTransfer.findMany({ include: { item: true, sourceLocation: true, destinationLocation: true, requestedBy: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' } }); return res.json({ success: true, data: transfers }); } catch (err) { next(err); }
};

export const getTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try { const transfer = await prisma.internalTransfer.findUnique({ where: { id: req.params.id }, include: { item: true, sourceLocation: true, destinationLocation: true, requestedBy: { select: { id: true, name: true, role: true } } } }); if (!transfer) throw new NotFoundError('Transfer not found'); return res.json({ success: true, data: transfer }); } catch (err) { next(err); }
};

const lockTransfer = async (tx: any, id: string) => {
  await tx.$queryRaw`SELECT id FROM "InternalTransfer" WHERE id = ${id} FOR UPDATE`;
  return tx.internalTransfer.findUnique({ where: { id }, include: { item: { include: itemInclude } } });
};

export const dispatchTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await lockTransfer(tx, req.params.id);
      if (!transfer) throw new NotFoundError('Transfer not found');
      if (transfer.status !== 'REQUESTED') throw new BusinessRuleError('Only requested transfers can be dispatched');
      const source = await tx.item.findUnique({ where: { id: transfer.itemId } });
      if (!source) throw new NotFoundError('Source inventory item not found');
      const available = source.physicalQuantity - source.reservedQuantity;
      if (available < transfer.quantity) throw new BusinessRuleError(`Insufficient source stock. Available: ${available}, requested: ${transfer.quantity}`);
      const updatedSource = await tx.item.update({ where: { id: source.id }, data: { physicalQuantity: { decrement: transfer.quantity } } });
      await tx.inventoryMovement.create({ data: { itemId: source.id, locationId: source.locationId, quantity: transfer.quantity, movementType: InventoryMovementType.TRANSFER_OUT, reason: `Transfer ${transfer.transferNumber} dispatched`, referenceType: 'InternalTransfer', referenceId: transfer.id, createdById: req.user!.id } });
      return tx.internalTransfer.update({ where: { id: transfer.id }, data: { status: 'DISPATCHED', dispatchedAt: new Date() }, include: { item: true } }).then((updated) => ({ transfer: updated, source: withAvailability(updatedSource) }));
    });
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const receiveTransfer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const transfer = await lockTransfer(tx, req.params.id);
      if (!transfer) throw new NotFoundError('Transfer not found');
      if (transfer.status !== 'DISPATCHED') throw new BusinessRuleError('Only dispatched transfers can be received');
      let destination = await tx.item.findFirst({ where: { sku: transfer.item.sku, locationId: transfer.destinationLocationId } });
      if (!destination) destination = await tx.item.create({ data: { sku: transfer.item.sku, name: transfer.item.name, categoryId: transfer.item.categoryId, unit: transfer.item.unit, batch: transfer.item.batch, minimumStock: transfer.item.minimumStock, locationId: transfer.destinationLocationId }, include: itemInclude });
      const updatedDestination = await tx.item.update({ where: { id: destination.id }, data: { physicalQuantity: { increment: transfer.quantity } } });
      await tx.inventoryMovement.create({ data: { itemId: destination.id, locationId: destination.locationId, quantity: transfer.quantity, movementType: InventoryMovementType.TRANSFER_IN, reason: `Transfer ${transfer.transferNumber} received`, referenceType: 'InternalTransfer', referenceId: transfer.id, createdById: req.user!.id } });
      const updated = await tx.internalTransfer.update({ where: { id: transfer.id }, data: { status: 'RECEIVED', receivedAt: new Date() }, include: { item: true } });
      return { transfer: updated, destination: withAvailability(updatedDestination) };
    });
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const createCustomerOrder = async (req: Request, res: Response, next: NextFunction) => {
  try { const data = parse<any>(customerOrderSchema, req.body); const order = await prisma.customerOrder.create({ data: { orderNumber: data.orderNumber, customerId: data.customerId, createdById: req.user!.id, items: { create: data.items } }, include: { customer: true, items: { include: { item: { include: itemInclude } } } } }); return res.status(201).json({ success: true, data: order }); } catch (err) { next(err); }
};

export const getCustomerOrders = async (req: Request, res: Response, next: NextFunction) => {
  try { const orders = await prisma.customerOrder.findMany({ include: { customer: true, items: { include: { item: { include: itemInclude } } } }, orderBy: { createdAt: 'desc' } }); return res.json({ success: true, data: orders }); } catch (err) { next(err); }
};

export const getCustomerOrder = async (req: Request, res: Response, next: NextFunction) => {
  try { const order = await prisma.customerOrder.findUnique({ where: { id: req.params.id }, include: { customer: true, items: { include: { item: { include: itemInclude } } } } }); if (!order) throw new NotFoundError('Customer order not found'); return res.json({ success: true, data: order }); } catch (err) { next(err); }
};

export const reserveCustomerOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!order) throw new NotFoundError('Customer order not found');
      if (order.status !== CustomerOrderStatus.PENDING) throw new BusinessRuleError('Only pending orders can be reserved');
      for (const orderItem of order.items) {
        await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ${orderItem.itemId} FOR UPDATE`;
        const item = await tx.item.findUnique({ where: { id: orderItem.itemId } });
        if (!item) throw new NotFoundError('Inventory item not found');
        const available = item.physicalQuantity - item.reservedQuantity;
        if (available < orderItem.quantity) throw new BusinessRuleError(`Insufficient available stock for ${item.sku}. Available: ${available}, requested: ${orderItem.quantity}`);
        await tx.item.update({ where: { id: item.id }, data: { reservedQuantity: { increment: orderItem.quantity } } });
        await tx.customerOrderItem.update({ where: { id: orderItem.id }, data: { reservedQuantity: orderItem.quantity } });
        await tx.inventoryMovement.create({ data: { itemId: item.id, locationId: item.locationId, quantity: orderItem.quantity, movementType: InventoryMovementType.RESERVATION, reason: `Order ${order.orderNumber} reserved`, referenceType: 'CustomerOrder', referenceId: order.id, createdById: req.user!.id } });
      }
      return tx.customerOrder.update({ where: { id: order.id }, data: { status: CustomerOrderStatus.RESERVED }, include: { items: true } });
    });
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const cancelCustomerOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.customerOrder.findUnique({ where: { id: req.params.id }, include: { items: true } });
      if (!order) throw new NotFoundError('Customer order not found');
      if (order.status === CustomerOrderStatus.CANCELLED) throw new BusinessRuleError('Customer order is already cancelled');
      for (const orderItem of order.items) if (orderItem.reservedQuantity > 0) {
        await tx.$queryRaw`SELECT id FROM "Item" WHERE id = ${orderItem.itemId} FOR UPDATE`;
        const item = await tx.item.findUnique({ where: { id: orderItem.itemId } });
        if (!item || item.reservedQuantity < orderItem.reservedQuantity) throw new BusinessRuleError('Inventory reservation is inconsistent');
        await tx.item.update({ where: { id: item.id }, data: { reservedQuantity: { decrement: orderItem.reservedQuantity } } });
        await tx.inventoryMovement.create({ data: { itemId: item.id, locationId: item.locationId, quantity: orderItem.reservedQuantity, movementType: InventoryMovementType.RELEASE, reason: `Order ${order.orderNumber} cancelled`, referenceType: 'CustomerOrder', referenceId: order.id, createdById: req.user!.id } });
      }
      return tx.customerOrder.update({ where: { id: order.id }, data: { status: CustomerOrderStatus.CANCELLED }, include: { items: true } });
    });
    return res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
