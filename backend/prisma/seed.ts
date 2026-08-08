import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType, ChallanStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clean existing data
  await prisma.salesChallanItem.deleteMany();
  await prisma.salesChallan.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.customerFollowUp.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  console.log('Cleared existing data.');

  // 2. Create Users
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('Admin@123', saltRounds);
  const salesPasswordHash = await bcrypt.hash('Sales@123', saltRounds);
  const warehousePasswordHash = await bcrypt.hash('Warehouse@123', saltRounds);
  const accountsPasswordHash = await bcrypt.hash('Accounts@123', saltRounds);

  const adminUser = await prisma.user.create({
    data: {
      name: 'Aditya Sharma',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const salesUser = await prisma.user.create({
    data: {
      name: 'Rohan Verma',
      email: 'sales@example.com',
      passwordHash: salesPasswordHash,
      role: Role.SALES,
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      name: 'Baldev Singh',
      email: 'warehouse@example.com',
      passwordHash: warehousePasswordHash,
      role: Role.WAREHOUSE,
    },
  });

  const accountsUser = await prisma.user.create({
    data: {
      name: 'Suresh Iyer',
      email: 'accounts@example.com',
      passwordHash: accountsPasswordHash,
      role: Role.ACCOUNTS,
    },
  });

  console.log('Created Users.');

  // 3. Create Customers (10+)
  const customersData = [
    {
      customerName: 'Rajesh Gupta',
      mobileNumber: '9876543210',
      email: 'rajesh@guptaplastics.com',
      businessName: 'Gupta Plastics Enterprise',
      gstNumber: '27AAAAA1111A1Z1',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Plot 42, MIDC Industrial Area, Andheri East, Mumbai, Maharashtra - 400093',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date('2026-08-15T10:00:00Z'),
      notes: 'Key distributor in Mumbai. Prefers bulk deliveries on weekends.',
    },
    {
      customerName: 'Anil Mehta',
      mobileNumber: '9123456789',
      email: 'anil@mehtatraders.in',
      businessName: 'Mehta Traders',
      gstNumber: '24BBBBB2222B2Z2',
      customerType: CustomerType.WHOLESALE,
      address: '102, GIDC, Vatva, Ahmedabad, Gujarat - 382440',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date('2026-08-12T11:30:00Z'),
      notes: 'Prompt payment history. Interested in new product category launch.',
    },
    {
      customerName: 'Priya Nair',
      mobileNumber: '9345678901',
      email: 'priya@nairretail.com',
      businessName: 'Nair Retail Stores',
      gstNumber: '32CCCCC3333C3Z3',
      customerType: CustomerType.RETAIL,
      address: 'Building No. 5, MG Road, Ernakulam, Kochi, Kerala - 682016',
      status: CustomerStatus.ACTIVE,
      followUpDate: null,
      notes: 'Small retailer. Demands frequent small-batch shipments.',
    },
    {
      customerName: 'Vikram Singh',
      mobileNumber: '9456789012',
      email: 'vikram@singhdistributors.com',
      businessName: 'Singh & Sons Distributors',
      gstNumber: '03DDDDD4444D4Z4',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Industrial Area Phase 1, Chandigarh - 160002',
      status: CustomerStatus.LEAD,
      followUpDate: new Date('2026-08-10T15:00:00Z'),
      notes: 'Potential lead from North India trade expo. Awaiting sample approval.',
    },
    {
      customerName: 'Sanjay Dutt',
      mobileNumber: '9567890123',
      email: 'sanjay@duttelectricals.com',
      businessName: 'Dutt Electricals & Hardware',
      gstNumber: null,
      customerType: CustomerType.RETAIL,
      address: 'Shop No. 12, Sadar Bazar, Delhi - 110006',
      status: CustomerStatus.ACTIVE,
      followUpDate: null,
      notes: 'Unregistered retailer (No GST). Cash on delivery transactions only.',
    },
    {
      customerName: 'Harish Patel',
      mobileNumber: '9678901234',
      email: 'harish@patelwholesalers.in',
      businessName: 'Patel Wholesalers',
      gstNumber: '24EEEEE5555E5Z5',
      customerType: CustomerType.WHOLESALE,
      address: 'Ring Road, Surat, Gujarat - 395002',
      status: CustomerStatus.INACTIVE,
      followUpDate: null,
      notes: 'No order in last 6 months. High credit outstanding.',
    },
    {
      customerName: 'Amit Banerjee',
      mobileNumber: '9789012345',
      email: 'amit@eastindiadist.com',
      businessName: 'East India Distributors',
      gstNumber: '19FFFFF6666F6Z6',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Salt Lake Sector V, Kolkata, West Bengal - 700091',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date('2026-08-20T09:30:00Z'),
      notes: 'Demands 45-day credit period. Strong distribution reach in Bengal.',
    },
    {
      customerName: 'Karan Johar',
      mobileNumber: '9890123456',
      email: 'karan@dharmawholesalers.com',
      businessName: 'Dharma Wholesale Mart',
      gstNumber: '27GGGGG7777G7Z7',
      customerType: CustomerType.WHOLESALE,
      address: 'Linking Road, Bandra West, Mumbai, Maharashtra - 400050',
      status: CustomerStatus.LEAD,
      followUpDate: new Date('2026-08-11T12:00:00Z'),
      notes: 'Enquired about bulk prices for kitchen appliances.',
    },
    {
      customerName: 'Meera Deshmukh',
      mobileNumber: '9901234567',
      email: 'meera@deshmukhstores.in',
      businessName: 'Deshmukh Retail Outlet',
      gstNumber: '27HHHHH8888H8Z8',
      customerType: CustomerType.RETAIL,
      address: 'Deccan Gymkhana, Pune, Maharashtra - 411004',
      status: CustomerStatus.ACTIVE,
      followUpDate: null,
      notes: 'Steady client. Monthly billing cycle.',
    },
    {
      customerName: 'Ravi Teja',
      mobileNumber: '9012345678',
      email: 'ravi@tejatrading.co',
      businessName: 'Teja Trading Company',
      gstNumber: '36IIIII9999I9Z9',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Secunderabad, Hyderabad, Telangana - 500003',
      status: CustomerStatus.ACTIVE,
      followUpDate: new Date('2026-08-18T16:00:00Z'),
      notes: 'Key client for South Indian operations. Payment is always on time.',
    },
  ];

  const createdCustomers = [];
  for (const cust of customersData) {
    const c = await prisma.customer.create({ data: cust });
    createdCustomers.push(c);
  }
  console.log('Created Customers.');

  // 4. Create Products (15+)
  const productsData = [
    { productName: 'Industrial Steel Pipe 1 inch', sku: 'PIP-STL-001', category: 'Pipes', unitPrice: 350.00, currentStock: 120, minimumStock: 20, warehouseLocation: 'Rack A1' },
    { productName: 'Industrial Steel Pipe 2 inch', sku: 'PIP-STL-002', category: 'Pipes', unitPrice: 580.00, currentStock: 80, minimumStock: 15, warehouseLocation: 'Rack A2' },
    { productName: 'PVC Conduit Pipe 10ft', sku: 'PIP-PVC-001', category: 'Pipes', unitPrice: 90.00, currentStock: 500, minimumStock: 50, warehouseLocation: 'Rack B1' },
    { productName: 'Brass Fitting Connector M10', sku: 'FIT-BRS-001', category: 'Fittings', unitPrice: 45.00, currentStock: 1500, minimumStock: 200, warehouseLocation: 'Bin C1' },
    { productName: 'Copper Joint Elbow 90 Deg', sku: 'FIT-COP-002', category: 'Fittings', unitPrice: 120.00, currentStock: 300, minimumStock: 40, warehouseLocation: 'Bin C2' },
    { productName: 'High Tensile Bolt M12 x 50', sku: 'FAS-BLT-001', category: 'Fasteners', unitPrice: 12.50, currentStock: 5000, minimumStock: 500, warehouseLocation: 'Bin D1' },
    { productName: 'Stainless Steel Nut M12', sku: 'FAS-NUT-001', category: 'Fasteners', unitPrice: 3.20, currentStock: 8000, minimumStock: 500, warehouseLocation: 'Bin D2' },
    { productName: 'Heavy Duty Cable Tie 12 inch', sku: 'ELE-TIE-001', category: 'Electrical', unitPrice: 1.50, currentStock: 10000, minimumStock: 1000, warehouseLocation: 'Rack E1' },
    { productName: 'Submersible Water Pump 1HP', sku: 'PMP-SUB-001', category: 'Pumps', unitPrice: 4800.00, currentStock: 12, minimumStock: 5, warehouseLocation: 'Floor Section F1' },
    { productName: 'Centrifugal Pump 2HP', sku: 'PMP-CEN-002', category: 'Pumps', unitPrice: 7500.00, currentStock: 3, minimumStock: 5, warehouseLocation: 'Floor Section F2' }, // Low stock
    { productName: 'Rotary Vane Vacuum Pump', sku: 'PMP-VAC-003', category: 'Pumps', unitPrice: 12500.00, currentStock: 2, minimumStock: 2, warehouseLocation: 'Floor Section F2' },
    { productName: 'Ball Valve 1/2 inch', sku: 'VAL-BAL-001', category: 'Valves', unitPrice: 180.00, currentStock: 400, minimumStock: 50, warehouseLocation: 'Bin G1' },
    { productName: 'Gate Valve 1 inch', sku: 'VAL-GAT-002', category: 'Valves', unitPrice: 320.00, currentStock: 180, minimumStock: 30, warehouseLocation: 'Bin G2' },
    { productName: 'Butterfly Valve 4 inch', sku: 'VAL-BUT-003', category: 'Valves', unitPrice: 1450.00, currentStock: 15, minimumStock: 5, warehouseLocation: 'Rack A3' },
    { productName: 'Teflon Sealing Tape', sku: 'CON-TEF-001', category: 'Consumables', unitPrice: 8.00, currentStock: 2500, minimumStock: 200, warehouseLocation: 'Bin H1' },
  ];

  const createdProducts = [];
  for (const prod of productsData) {
    const p = await prisma.product.create({ data: prod });
    createdProducts.push(p);
  }
  console.log('Created Products.');

  // 5. Create Initial Stock Movements (IN) for seeded stock levels
  for (const prod of createdProducts) {
    await prisma.stockMovement.create({
      data: {
        productId: prod.id,
        quantityChanged: prod.currentStock,
        movementType: MovementType.IN,
        reason: 'Initial Seeding Balance Entry',
        createdBy: warehouseUser.id,
        createdAt: new Date('2026-08-01T08:00:00Z'),
      },
    });
  }
  console.log('Created Initial Stock Movements.');

  // 6. Create Customer Follow-ups (CRM)
  const followUps = [
    {
      customerId: createdCustomers[0].id,
      note: 'Discussed wholesale discounts for their upcoming construction contract. Rajesh requested quotation by Tuesday.',
      followUpDate: new Date('2026-08-15T10:00:00Z'),
      createdBy: salesUser.id,
      createdAt: new Date('2026-08-05T14:30:00Z'),
    },
    {
      customerId: createdCustomers[1].id,
      note: 'Called to check about the pending payment for last invoice. Anil promised to clear it by Monday afternoon.',
      followUpDate: new Date('2026-08-12T11:30:00Z'),
      createdBy: salesUser.id,
      createdAt: new Date('2026-08-07T10:15:00Z'),
    },
    {
      customerId: createdCustomers[3].id,
      note: 'First cold call. Vikram represents Singh & Sons. Interested in distribution rights. Needs brochures.',
      followUpDate: new Date('2026-08-10T15:00:00Z'),
      createdBy: salesUser.id,
      createdAt: new Date('2026-08-08T11:00:00Z'),
    },
  ];

  for (const fu of followUps) {
    await prisma.customerFollowUp.create({ data: fu });
  }
  console.log('Created Customer Follow-ups.');

  // 7. Create Sales Challans (DRAFT, CONFIRMED, CANCELLED examples)

  // A. Draft Challan (No stock change)
  const draftChallan = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-000001',
      customerId: createdCustomers[0].id,
      totalQuantity: 15,
      status: ChallanStatus.DRAFT,
      createdBy: salesUser.id,
      createdAt: new Date('2026-08-08T10:00:00Z'),
    },
  });

  await prisma.salesChallanItem.createMany({
    data: [
      {
        challanId: draftChallan.id,
        productId: createdProducts[0].id, // PIP-STL-001
        productNameSnapshot: createdProducts[0].productName,
        skuSnapshot: createdProducts[0].sku,
        unitPriceSnapshot: createdProducts[0].unitPrice,
        quantity: 5,
        totalPrice: Number(createdProducts[0].unitPrice) * 5,
      },
      {
        challanId: draftChallan.id,
        productId: createdProducts[11].id, // VAL-BAL-001
        productNameSnapshot: createdProducts[11].productName,
        skuSnapshot: createdProducts[11].sku,
        unitPriceSnapshot: createdProducts[11].unitPrice,
        quantity: 10,
        totalPrice: Number(createdProducts[11].unitPrice) * 10,
      },
    ],
  });

  // B. Confirmed Challan (Requires stock reduction and snapshots)
  // Let's create the challan and manually update stock & add stock movements to simulate the transaction
  const confirmedChallan = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-000002',
      customerId: createdCustomers[1].id,
      totalQuantity: 20,
      status: ChallanStatus.CONFIRMED,
      createdBy: salesUser.id,
      createdAt: new Date('2026-08-08T12:00:00Z'),
    },
  });

  // Items
  const item1Qty = 8;
  const item2Qty = 12;

  await prisma.salesChallanItem.createMany({
    data: [
      {
        challanId: confirmedChallan.id,
        productId: createdProducts[1].id, // PIP-STL-002
        productNameSnapshot: createdProducts[1].productName,
        skuSnapshot: createdProducts[1].sku,
        unitPriceSnapshot: createdProducts[1].unitPrice,
        quantity: item1Qty,
        totalPrice: Number(createdProducts[1].unitPrice) * item1Qty,
      },
      {
        challanId: confirmedChallan.id,
        productId: createdProducts[2].id, // PIP-PVC-001
        productNameSnapshot: createdProducts[2].productName,
        skuSnapshot: createdProducts[2].sku,
        unitPriceSnapshot: createdProducts[2].unitPrice,
        quantity: item2Qty,
        totalPrice: Number(createdProducts[2].unitPrice) * item2Qty,
      },
    ],
  });

  // Deduct stock and record stock movements
  await prisma.product.update({
    where: { id: createdProducts[1].id },
    data: { currentStock: { decrement: item1Qty } },
  });
  await prisma.stockMovement.create({
    data: {
      productId: createdProducts[1].id,
      quantityChanged: item1Qty,
      movementType: MovementType.OUT,
      reason: 'Sales Challan Confirmation CH-2026-000002',
      createdBy: salesUser.id,
      createdAt: new Date('2026-08-08T12:00:00Z'),
    },
  });

  await prisma.product.update({
    where: { id: createdProducts[2].id },
    data: { currentStock: { decrement: item2Qty } },
  });
  await prisma.stockMovement.create({
    data: {
      productId: createdProducts[2].id,
      quantityChanged: item2Qty,
      movementType: MovementType.OUT,
      reason: 'Sales Challan Confirmation CH-2026-000002',
      createdBy: salesUser.id,
      createdAt: new Date('2026-08-08T12:00:00Z'),
    },
  });

  // C. Cancelled Challan
  const cancelledChallan = await prisma.salesChallan.create({
    data: {
      challanNumber: 'CH-2026-000003',
      customerId: createdCustomers[2].id,
      totalQuantity: 2,
      status: ChallanStatus.CANCELLED,
      createdBy: salesUser.id,
      createdAt: new Date('2026-08-07T15:00:00Z'),
    },
  });

  await prisma.salesChallanItem.create({
    data: {
      challanId: cancelledChallan.id,
      productId: createdProducts[8].id, // PMP-SUB-001
      productNameSnapshot: createdProducts[8].productName,
      skuSnapshot: createdProducts[8].sku,
      unitPriceSnapshot: createdProducts[8].unitPrice,
      quantity: 2,
      totalPrice: Number(createdProducts[8].unitPrice) * 2,
    },
  });

  console.log('Created Sales Challans.');
  console.log('Database seeding complete successfully!');
}

main()
  .catch((e) => {
    console.error('Error in database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
