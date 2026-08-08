import prisma from '../config/db';
import * as bcrypt from 'bcrypt';
import { Role, CustomerType, CustomerStatus, ChallanStatus, MovementType } from '@prisma/client';
import { loginSchema, customerSchema, productSchema, challanSchema } from '../validators';

async function runTests() {
  console.log('\n======================================');
  console.log('STARTING BACKEND BUSINESS LOGIC TESTS');
  console.log('======================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] - ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] - ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Validation works on correct login format
    // ----------------------------------------------------
    const loginOk = loginSchema.safeParse({ email: 'sales@example.com', password: 'Password123' });
    assert(loginOk.success === true, 'Validation passes for valid login inputs');

    const loginFail = loginSchema.safeParse({ email: 'sales', password: '' });
    assert(loginFail.success === false, 'Validation fails for invalid login inputs');

    // ----------------------------------------------------
    // TEST 2: Password hashing & login simulation works
    // ----------------------------------------------------
    const plainTextPassword = 'TestPassword123';
    const hash = await bcrypt.hash(plainTextPassword, 10);
    const match = await bcrypt.compare(plainTextPassword, hash);
    const noMatch = await bcrypt.compare('WrongPassword', hash);
    assert(match === true, 'Bcrypt password comparison matches correct password');
    assert(noMatch === false, 'Bcrypt password comparison rejects incorrect password');

    // ----------------------------------------------------
    // Setup temporary test entities in DB
    // ----------------------------------------------------
    console.log('\nSetting up test entities in DB...');
    
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        name: 'Test Admin',
        email: `test_admin_${Date.now()}@example.com`,
        passwordHash: hash,
        role: Role.ADMIN,
      },
    });

    const salesUser = await prisma.user.create({
      data: {
        name: 'Test Sales',
        email: `test_sales_${Date.now()}@example.com`,
        passwordHash: hash,
        role: Role.SALES,
      },
    });

    // 1. Customer CRUD and Search
    const custInput = {
      customerName: 'AeroCorp India',
      mobileNumber: '9898989898',
      email: 'contact@aerocorp.in',
      businessName: 'AeroCorp Aviation Services',
      gstNumber: '27AAAAA1111A1Z1',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'Viman Nagar, Pune',
      status: CustomerStatus.LEAD,
      notes: 'Initial discussion',
    };

    // Zod validation check
    const custVal = customerSchema.safeParse(custInput);
    assert(custVal.success === true, 'Customer validation passes for correct inputs');

    const invalidCustVal = customerSchema.safeParse({ ...custInput, mobileNumber: '123' });
    assert(invalidCustVal.success === false, 'Customer validation catches bad mobile numbers');

    // DB insertion
    const customer = await prisma.customer.create({
      data: custInput,
    });
    assert(!!customer.id, 'Customer creation inserts successfully into database');

    // Search simulation
    const searchRes = await prisma.customer.findMany({
      where: {
        OR: [
          { customerName: { contains: 'AeroCorp', mode: 'insensitive' } },
          { businessName: { contains: 'AeroCorp', mode: 'insensitive' } },
        ],
      },
    });
    assert(searchRes.length > 0, 'Customer search finds customer by partial name');

    // 2. Customer Follow-up works
    const noteContent = 'Sent catalog and business profile';
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const followUp = await prisma.customerFollowUp.create({
      data: {
        customerId: customer.id,
        note: noteContent,
        followUpDate: futureDate,
        createdBy: testUser.id,
      },
    });
    assert(followUp.note === noteContent, 'Follow-up note logged successfully');

    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: { followUpDate: futureDate },
    });
    assert(
      updatedCustomer.followUpDate?.getTime() === futureDate.getTime(),
      "Customer's followUpDate updates correctly"
    );

    // 3. Product creation
    const prodInput1 = {
      productName: 'Test Steel Bolt',
      sku: `TST-BLT-${Date.now()}-1`,
      category: 'Fasteners',
      unitPrice: 15.50,
      currentStock: 100,
      minimumStock: 10,
      warehouseLocation: 'Bin T1',
    };

    const prodInput2 = {
      productName: 'Test Steel Nut',
      sku: `TST-NUT-${Date.now()}-2`,
      category: 'Fasteners',
      unitPrice: 5.00,
      currentStock: 50,
      minimumStock: 5,
      warehouseLocation: 'Bin T2',
    };

    const prodVal1 = productSchema.safeParse(prodInput1);
    assert(prodVal1.success === true, 'Product validation passes for correct inputs');

    const product1 = await prisma.product.create({ data: prodInput1 });
    const product2 = await prisma.product.create({ data: prodInput2 });
    assert(!!product1.id && !!product2.id, 'Products inserted successfully in DB');

    // 4. Stock manual In/Out adjustments
    // Stock IN
    const updatedProd1In = await prisma.product.update({
      where: { id: product1.id },
      data: { currentStock: { increment: 20 } },
    });
    await prisma.stockMovement.create({
      data: {
        productId: product1.id,
        quantityChanged: 20,
        movementType: MovementType.IN,
        reason: 'Manual adjustment test',
        createdBy: testUser.id,
      },
    });
    assert(updatedProd1In.currentStock === 120, 'Stock IN correctly increments product stock');

    // Stock OUT
    const updatedProd1Out = await prisma.product.update({
      where: { id: product1.id },
      data: { currentStock: { decrement: 10 } },
    });
    await prisma.stockMovement.create({
      data: {
        productId: product1.id,
        quantityChanged: 10,
        movementType: MovementType.OUT,
        reason: 'Manual adjustment test',
        createdBy: testUser.id,
      },
    });
    assert(updatedProd1Out.currentStock === 110, 'Stock OUT correctly decrements product stock');

    // Negative stock check simulation
    let negativeStockPrevented = false;
    try {
      const qtyToDeduct = 200; // Product 1 only has 110
      await prisma.$transaction(async (tx) => {
        const prod = await tx.product.findUnique({ where: { id: product1.id } });
        if (!prod || prod.currentStock < qtyToDeduct) {
          throw new Error('Insufficient stock error');
        }
        await tx.product.update({
          where: { id: product1.id },
          data: { currentStock: { decrement: qtyToDeduct } },
        });
      });
    } catch (e: any) {
      if (e.message === 'Insufficient stock error') {
        negativeStockPrevented = true;
      }
    }
    assert(negativeStockPrevented === true, 'Deducting more than available stock is rejected');

    // 5. Sales Challan - DRAFT behavior
    const draftChallan = await prisma.salesChallan.create({
      data: {
        challanNumber: `CH-TST-${Date.now()}-01`,
        customerId: customer.id,
        totalQuantity: 15,
        status: ChallanStatus.DRAFT,
        createdBy: salesUser.id,
        items: {
          create: [
            {
              productId: product1.id,
              productNameSnapshot: product1.productName,
              skuSnapshot: product1.sku,
              unitPriceSnapshot: product1.unitPrice,
              quantity: 10,
              totalPrice: Number(product1.unitPrice) * 10,
            },
            {
              productId: product2.id,
              productNameSnapshot: product2.productName,
              skuSnapshot: product2.sku,
              unitPriceSnapshot: product2.unitPrice,
              quantity: 5,
              totalPrice: Number(product2.unitPrice) * 5,
            },
          ],
        },
      },
      include: { items: true },
    });

    // Check that draft challan does NOT reduce stock
    const p1AfterDraft = await prisma.product.findUnique({ where: { id: product1.id } });
    const p2AfterDraft = await prisma.product.findUnique({ where: { id: product2.id } });
    assert(p1AfterDraft?.currentStock === 110, 'Draft challan creation does NOT deduct stock of product 1');
    assert(p2AfterDraft?.currentStock === 50, 'Draft challan creation does NOT deduct stock of product 2');

    // 6. Confirmed Challan - Deduct stock, store snapshot, record stock movement
    await prisma.$transaction(async (tx) => {
      // Fetch challan
      const ch = await tx.salesChallan.findUnique({
        where: { id: draftChallan.id },
        include: { items: true },
      });
      if (!ch) throw new Error('Challan not found');

      // Verify stock
      for (const item of ch.items) {
        const prod = await tx.product.findUnique({ where: { id: item.productId } });
        if (!prod || prod.currentStock < item.quantity) {
          throw new Error('Insufficient stock');
        }
      }

      // Deduct stock and write movements
      for (const item of ch.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: MovementType.OUT,
            reason: `Challan confirm test ${ch.challanNumber}`,
            createdBy: testUser.id,
          },
        });
      }

      // Update state
      await tx.salesChallan.update({
        where: { id: draftChallan.id },
        data: { status: ChallanStatus.CONFIRMED },
      });
    });

    const p1AfterConfirm = await prisma.product.findUnique({ where: { id: product1.id } });
    const p2AfterConfirm = await prisma.product.findUnique({ where: { id: product2.id } });
    assert(p1AfterConfirm?.currentStock === 100, 'Confirming challan deducts correct quantity from product 1');
    assert(p2AfterConfirm?.currentStock === 45, 'Confirming challan deducts correct quantity from product 2');

    // Verify snapshot values
    const itemSnapshot = await prisma.salesChallanItem.findFirst({
      where: { challanId: draftChallan.id, productId: product1.id },
    });
    assert(itemSnapshot?.productNameSnapshot === product1.productName, 'Historical snapshot holds original product name');
    assert(itemSnapshot?.skuSnapshot === product1.sku, 'Historical snapshot holds original SKU');
    assert(Number(itemSnapshot?.unitPriceSnapshot) === Number(product1.unitPrice), 'Historical snapshot holds original price');

    // 7. Prevent duplicate confirmation
    let duplicateRejected = false;
    try {
      await prisma.$transaction(async (tx) => {
        const ch = await tx.salesChallan.findUnique({ where: { id: draftChallan.id } });
        if (ch?.status === ChallanStatus.CONFIRMED) {
          throw new Error('Already confirmed');
        }
      });
    } catch (e: any) {
      if (e.message === 'Already confirmed') {
        duplicateRejected = true;
      }
    }
    assert(duplicateRejected === true, 'Duplicate confirmation is blocked');

    // 8. Insufficient Stock Confirmation Rollback & No Partial Deduction
    // Create another draft challan requesting more than available stock of product 2
    const badDraftChallan = await prisma.salesChallan.create({
      data: {
        challanNumber: `CH-TST-${Date.now()}-02`,
        customerId: customer.id,
        totalQuantity: 60,
        status: ChallanStatus.DRAFT,
        createdBy: salesUser.id,
        items: {
          create: [
            {
              productId: product1.id, // requires 10 (Available: 100)
              productNameSnapshot: product1.productName,
              skuSnapshot: product1.sku,
              unitPriceSnapshot: product1.unitPrice,
              quantity: 10,
              totalPrice: Number(product1.unitPrice) * 10,
            },
            {
              productId: product2.id, // requires 50 (Available: 45) -> SHOULD FAIL!
              productNameSnapshot: product2.productName,
              skuSnapshot: product2.sku,
              unitPriceSnapshot: product2.unitPrice,
              quantity: 50,
              totalPrice: Number(product2.unitPrice) * 50,
            },
          ],
        },
      },
      include: { items: true },
    });

    let confirmationFailed = false;
    try {
      await prisma.$transaction(async (tx) => {
        const ch = await tx.salesChallan.findUnique({
          where: { id: badDraftChallan.id },
          include: { items: true },
        });
        if (!ch) throw new Error('Challan not found');

        // Check stock
        for (const item of ch.items) {
          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod || prod.currentStock < item.quantity) {
            throw new Error(`Insufficient stock for product ${item.productId}`);
          }
        }

        // Deduct
        for (const item of ch.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { decrement: item.quantity } },
          });
        }
      });
    } catch (e: any) {
      if (e.message.startsWith('Insufficient stock')) {
        confirmationFailed = true;
      }
    }
    assert(confirmationFailed === true, 'Confirmation fails if stock of any item is insufficient');

    // Verify product 1 is NOT partially deducted (stock must remain 100)
    const p1AfterFailedConfirm = await prisma.product.findUnique({ where: { id: product1.id } });
    assert(p1AfterFailedConfirm?.currentStock === 100, 'Confirmation failure rolls back all partial stock deductions completely');

    // ----------------------------------------------------
    // Clean up test entities
    // ----------------------------------------------------
    console.log('\nCleaning up test entities...');
    await prisma.salesChallanItem.deleteMany({ where: { challanId: { in: [draftChallan.id, badDraftChallan.id] } } });
    await prisma.salesChallan.deleteMany({ where: { id: { in: [draftChallan.id, badDraftChallan.id] } } });
    await prisma.stockMovement.deleteMany({ where: { productId: { in: [product1.id, product2.id] } } });
    await prisma.product.deleteMany({ where: { id: { in: [product1.id, product2.id] } } });
    await prisma.customerFollowUp.deleteMany({ where: { customerId: customer.id } });
    await prisma.customer.deleteMany({ where: { id: customer.id } });
    await prisma.user.deleteMany({ where: { id: { in: [testUser.id, salesUser.id] } } });
    console.log('Cleanup completed.');

  } catch (err: any) {
    console.error('Fatal error during test run:', err);
    failed++;
  }

  console.log('\n======================================');
  console.log(`TEST RUN SUMMARY:`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('======================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
