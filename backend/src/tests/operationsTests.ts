import 'dotenv/config';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import http from 'http';
import app from '../app';
import prisma from '../config/db';
import { Role } from '@prisma/client';

const basePayload = { password: 'OperationsTest@123' };
let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) { console.log(`[PASS] - ${message}`); passed++; }
  else { console.error(`[FAIL] - ${message}`); failed++; }
}

async function request(baseUrl: string, path: string, token: string | undefined, method = 'GET', body?: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: any = null;
  try { data = await response.json(); } catch { /* empty response */ }
  return { status: response.status, data };
}

async function main() {
  const suffix = Date.now().toString();
  const passwordHash = await bcrypt.hash(basePayload.password, 10);
  const admin = await prisma.user.create({ data: { name: 'Operations Test Admin', email: `ops-admin-${suffix}@example.com`, passwordHash, role: Role.ADMIN } });
  const operations = await prisma.user.create({ data: { name: 'Operations Test User', email: `ops-user-${suffix}@example.com`, passwordHash, role: Role.OPERATIONS } });
  const sales = await prisma.user.create({ data: { name: 'Operations Test Sales', email: `ops-sales-${suffix}@example.com`, passwordHash, role: Role.SALES } });
  const category = await prisma.category.create({ data: { name: `Test Category ${suffix}` } });
  const sourceLocation = await prisma.location.create({ data: { name: `Test Source ${suffix}`, code: `TS-${suffix}` } });
  const destinationLocation = await prisma.location.create({ data: { name: `Test Destination ${suffix}`, code: `TD-${suffix}` } });
  const customer = await prisma.customer.create({ data: { customerName: 'Operations Test Customer', mobileNumber: '9876543210', email: `ops-customer-${suffix}@example.com`, businessName: 'Operations Test Business', customerType: 'RETAIL', address: 'Test Address 123' } });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  let sourceItemId = '';
  let concurrentItemId = '';
  let transferId = '';
  const createdTransferIds: string[] = [];
  const createdOrderIds: string[] = [];

  try {
    const adminLogin = await request(baseUrl, '/api/auth/login', undefined, 'POST', { email: admin.email, password: basePayload.password });
    const operationsLogin = await request(baseUrl, '/api/auth/login', undefined, 'POST', { email: operations.email, password: basePayload.password });
    const salesLogin = await request(baseUrl, '/api/auth/login', undefined, 'POST', { email: sales.email, password: basePayload.password });
    const invalidLogin = await request(baseUrl, '/api/auth/login', undefined, 'POST', { email: sales.email, password: 'wrong-password' });
    assert(adminLogin.status === 200, 'Admin login succeeds');
    assert(operationsLogin.status === 200, 'Operations login succeeds');
    assert(salesLogin.status === 200, 'Sales login succeeds');
    assert(invalidLogin.status === 401, 'Invalid login is rejected');
    const adminToken = adminLogin.data.data.token as string;
    const operationsToken = operationsLogin.data.data.token as string;
    const salesToken = salesLogin.data.data.token as string;
    assert((await request(baseUrl, '/api/auth/me', adminToken)).status === 200, 'Authenticated user profile succeeds');
    const dashboard = await request(baseUrl, '/api/dashboard/stats', adminToken);
    assert(dashboard.status === 200 && typeof dashboard.data.data.operations?.totalInventory === 'number', 'Dashboard exposes Operations ERP metrics');

    const denied = await request(baseUrl, '/api/inventory', salesToken, 'POST', { sku: 'DENIED', name: 'Denied', categoryId: category.id, locationId: sourceLocation.id, physicalQuantity: 1 });
    assert(denied.status === 403, 'Sales cannot create inventory');

    const created = await request(baseUrl, '/api/inventory', operationsToken, 'POST', { sku: `OPS-${suffix}`, name: 'Test Transfer Item', categoryId: category.id, locationId: sourceLocation.id, physicalQuantity: 100, reservedQuantity: 80, minimumStock: 5 });
    sourceItemId = created.data.data.id;
    const concurrentItem = await request(baseUrl, '/api/inventory', operationsToken, 'POST', { sku: `OPS-CON-${suffix}`, name: 'Concurrent Reservation Item', categoryId: category.id, locationId: sourceLocation.id, physicalQuantity: 100, reservedQuantity: 80, minimumStock: 5 });
    concurrentItemId = concurrentItem.data.data.id;
    assert(created.status === 201, 'Inventory item creation succeeds');
    assert(created.data.data.availableQuantity === 20, 'Available inventory equals physical minus reserved');

    const inventory = await request(baseUrl, '/api/inventory', operationsToken);
    assert(inventory.status === 200 && inventory.data.data.some((item: any) => item.id === sourceItemId), 'Inventory list returns location-aware item');

    const workOrder = await request(baseUrl, '/api/work-orders', operationsToken, 'POST', { workOrderNumber: `WO-${suffix}`, locationId: sourceLocation.id, itemId: sourceItemId, requiredQuantity: 35, assignedUserId: operations.id });
    assert(workOrder.status === 201, 'Work order creation succeeds');
    const material = await request(baseUrl, `/api/work-orders/${workOrder.data.data.id}/material-check`, operationsToken);
    assert(material.status === 200 && material.data.data.availableQuantity === 20 && material.data.data.shortage === 15, 'Material check calculates shortage without changing inventory');
    assert((await request(baseUrl, `/api/work-orders/${workOrder.data.data.id}/status`, operationsToken, 'PATCH', { status: 'IN_PROGRESS' })).status === 200, 'Work order transitions to in progress');
    assert((await request(baseUrl, `/api/work-orders/${workOrder.data.data.id}/status`, operationsToken, 'PATCH', { status: 'COMPLETED' })).status === 200, 'Work order transitions to completed');

    const transfer = await request(baseUrl, '/api/transfers', operationsToken, 'POST', { transferNumber: `TR-${suffix}`, sourceLocationId: sourceLocation.id, destinationLocationId: destinationLocation.id, itemId: sourceItemId, quantity: 15 });
    transferId = transfer.data.data.id;
    createdTransferIds.push(transferId);
    assert(transfer.status === 201, 'Transfer creation succeeds');
    const overTransfer = await request(baseUrl, '/api/transfers', operationsToken, 'POST', { transferNumber: `TR-OVER-${suffix}`, sourceLocationId: sourceLocation.id, destinationLocationId: destinationLocation.id, itemId: sourceItemId, quantity: 21 });
    createdTransferIds.push(overTransfer.data.data.id);
    assert((await request(baseUrl, `/api/transfers/${overTransfer.data.data.id}/dispatch`, operationsToken, 'POST')).status === 422, 'Transfer dispatch rejects insufficient available stock');
    const dispatch = await request(baseUrl, `/api/transfers/${transferId}/dispatch`, operationsToken, 'POST');
    assert(dispatch.status === 200 && dispatch.data.data.source.physicalQuantity === 85, 'Dispatch decreases source physical stock');
    assert((await request(baseUrl, `/api/transfers/${transferId}/dispatch`, operationsToken, 'POST')).status === 422, 'Transfer cannot be dispatched twice');
    const receive = await request(baseUrl, `/api/transfers/${transferId}/receive`, operationsToken, 'POST');
    assert(receive.status === 200 && receive.data.data.destination.physicalQuantity === 15, 'Receipt increases destination physical stock');
    assert((await request(baseUrl, `/api/transfers/${transferId}/receive`, operationsToken, 'POST')).status === 422, 'Transfer cannot be received twice');
    const pendingTransfer = await request(baseUrl, '/api/transfers', operationsToken, 'POST', { transferNumber: `TR-PENDING-${suffix}`, sourceLocationId: sourceLocation.id, destinationLocationId: destinationLocation.id, itemId: sourceItemId, quantity: 1 });
    createdTransferIds.push(pendingTransfer.data.data.id);
    assert((await request(baseUrl, `/api/transfers/${pendingTransfer.data.data.id}/receive`, operationsToken, 'POST')).status === 422, 'Transfer cannot be received before dispatch');

    const order = await request(baseUrl, '/api/customer-orders', salesToken, 'POST', { orderNumber: `ORD-${suffix}`, customerId: customer.id, items: [{ itemId: sourceItemId, quantity: 5 }] });
    createdOrderIds.push(order.data.data.id);
    assert(order.status === 201, 'Customer order creation succeeds');
    const reservation = await request(baseUrl, `/api/customer-orders/${order.data.data.id}/reserve`, salesToken, 'POST');
    assert(reservation.status === 200, 'Reservation succeeds when stock is available');
    const afterReservation = await request(baseUrl, `/api/inventory/${sourceItemId}`, operationsToken);
    assert(afterReservation.data.data.reservedQuantity === 85 && afterReservation.data.data.availableQuantity === 0, 'Reservation increases reserved and decreases available without reducing physical');
    const failedOrder = await request(baseUrl, '/api/customer-orders', salesToken, 'POST', { orderNumber: `ORD-FAIL-${suffix}`, customerId: customer.id, items: [{ itemId: sourceItemId, quantity: 1 }] });
    createdOrderIds.push(failedOrder.data.data.id);
    assert((await request(baseUrl, `/api/customer-orders/${failedOrder.data.data.id}/reserve`, salesToken, 'POST')).status === 422, 'Reservation rejects more than available inventory');
    assert((await request(baseUrl, `/api/customer-orders/${order.data.data.id}/cancel`, salesToken, 'POST')).status === 200, 'Order cancellation releases reservation');

    const concurrentA = await request(baseUrl, '/api/customer-orders', salesToken, 'POST', { orderNumber: `ORD-CON-A-${suffix}`, customerId: customer.id, items: [{ itemId: concurrentItemId, quantity: 15 }] });
    const concurrentB = await request(baseUrl, '/api/customer-orders', salesToken, 'POST', { orderNumber: `ORD-CON-B-${suffix}`, customerId: customer.id, items: [{ itemId: concurrentItemId, quantity: 15 }] });
    createdOrderIds.push(concurrentA.data.data.id, concurrentB.data.data.id);
    const concurrentResults = await Promise.all([request(baseUrl, `/api/customer-orders/${concurrentA.data.data.id}/reserve`, salesToken, 'POST'), request(baseUrl, `/api/customer-orders/${concurrentB.data.data.id}/reserve`, salesToken, 'POST')]);
    assert(concurrentResults.filter((result) => result.status === 200).length === 1 && concurrentResults.filter((result) => result.status === 422).length === 1, 'Concurrent reservations allow exactly one request to succeed');
    const finalItem = await request(baseUrl, `/api/inventory/${sourceItemId}`, operationsToken);
    const concurrentFinal = await request(baseUrl, `/api/inventory/${concurrentItemId}`, operationsToken);
    assert(concurrentFinal.data.data.reservedQuantity === 95 && concurrentFinal.data.data.availableQuantity === 5, 'Concurrent reservation leaves reserved quantity at physical stock');
    assert((await request(baseUrl, '/api/work-orders', salesToken)).status === 403, 'Sales cannot access restricted work orders');
    void adminToken;
  } finally {
    const categoryItems = await prisma.item.findMany({ where: { categoryId: category.id }, select: { id: true } });
    const itemIds = categoryItems.map((item) => item.id);
    if (itemIds.length) await prisma.inventoryMovement.deleteMany({ where: { itemId: { in: itemIds } } });
    if (createdOrderIds.length) await prisma.customerOrderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
    await prisma.customerOrder.deleteMany({ where: { id: { in: createdOrderIds } } });
    if (createdTransferIds.length) await prisma.internalTransfer.deleteMany({ where: { id: { in: createdTransferIds } } });
    await prisma.workOrder.deleteMany({ where: { workOrderNumber: { startsWith: `WO-${suffix}` } } });
    await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
    await prisma.customer.deleteMany({ where: { id: customer.id } });
    await prisma.category.deleteMany({ where: { id: category.id } });
    await prisma.location.deleteMany({ where: { id: { in: [sourceLocation.id, destinationLocation.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [admin.id, operations.id, sales.id] } } });
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }

  console.log(`OPERATIONS TEST SUMMARY: PASSED: ${passed}, FAILED: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch(async (error) => { console.error('Fatal operations test error:', error); await prisma.$disconnect(); process.exitCode = 1; });
