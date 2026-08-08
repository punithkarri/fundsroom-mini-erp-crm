import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { challanSchema } from '../validators';
import { ValidationError, NotFoundError, BusinessRuleError } from '../utils/errors';
import { ChallanStatus, MovementType } from '@prisma/client';

export const getChallans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as any;
    const customerId = req.query.customerId as string;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (customerId) {
      where.customerId = customerId;
    }

    const [total, challans] = await prisma.$transaction([
      prisma.salesChallan.count({ where }),
      prisma.salesChallan.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              customerName: true,
              businessName: true,
            },
          },
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        challans,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const createChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ValidationError('User session required');
    }

    const parseResult = challanSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', parseResult.error.errors);
    }

    const { customerId, items, status } = parseResult.data;

    // Enforce that a newly created challan is either DRAFT or CONFIRMED.
    // However, if creating directly as CONFIRMED, we would need to run the confirmation transaction.
    // To keep the codebase clean and match the step-by-step business flow (Draft -> Confirm),
    // let's force new challans to be DRAFT. If user wants to confirm, they trigger the /confirm endpoint.
    
    // Check if customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Generate unique sequential Challan Number
    const year = new Date().getFullYear();
    
    // We run a small transaction to count and create so we have a consistent challan number.
    const challan = await prisma.$transaction(async (tx) => {
      // Find count of challans created this year
      const count = await tx.salesChallan.count({
        where: {
          challanNumber: {
            startsWith: `CH-${year}-`,
          },
        },
      });

      const nextSeq = String(count + 1).padStart(6, '0');
      const challanNumber = `CH-${year}-${nextSeq}`;

      // Resolve items and compile prices
      let totalQty = 0;
      const challanItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new NotFoundError(`Product not found: ${item.productId}`);
        }

        totalQty += item.quantity;
        challanItemsData.push({
          productId: item.productId,
          productNameSnapshot: product.productName,
          skuSnapshot: product.sku,
          unitPriceSnapshot: product.unitPrice,
          quantity: item.quantity,
          totalPrice: Number(product.unitPrice) * item.quantity,
        });
      }

      // Create Sales Challan (forced to DRAFT status initially)
      const newChallan = await tx.salesChallan.create({
        data: {
          challanNumber,
          customerId,
          totalQuantity: totalQty,
          status: ChallanStatus.DRAFT,
          createdBy: req.user!.id,
          items: {
            create: challanItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return newChallan;
    });

    return res.status(201).json({
      success: true,
      message: 'Draft Sales Challan created successfully',
      data: challan,
    });
  } catch (err) {
    next(err);
  }
};

export const getChallanById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const challan = await prisma.salesChallan.findUnique({
      where: { id },
      include: {
        customer: true,
        creator: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                productName: true,
                sku: true,
                unitPrice: true,
              },
            },
          },
        },
      },
    });

    if (!challan) {
      throw new NotFoundError('Sales challan not found');
    }

    return res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (err) {
    next(err);
  }
};

export const updateChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const parseResult = challanSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', parseResult.error.errors);
    }

    const { customerId, items } = parseResult.data;

    // Check if Challan exists and is in DRAFT state
    const existingChallan = await prisma.salesChallan.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!existingChallan) {
      throw new NotFoundError('Sales challan not found');
    }

    if (existingChallan.status !== ChallanStatus.DRAFT) {
      throw new BusinessRuleError('Only DRAFT challans can be modified');
    }

    // Update in transaction
    const updatedChallan = await prisma.$transaction(async (tx) => {
      // 1. Delete previous items
      await tx.salesChallanItem.deleteMany({ where: { challanId: id } });

      // 2. Insert new items and re-calculate
      let totalQty = 0;
      const challanItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new NotFoundError(`Product not found: ${item.productId}`);
        }

        totalQty += item.quantity;
        challanItemsData.push({
          productId: item.productId,
          productNameSnapshot: product.productName,
          skuSnapshot: product.sku,
          unitPriceSnapshot: product.unitPrice,
          quantity: item.quantity,
          totalPrice: Number(product.unitPrice) * item.quantity,
        });
      }

      // 3. Update main challan metadata
      const updated = await tx.salesChallan.update({
        where: { id },
        data: {
          customerId,
          totalQuantity: totalQty,
          items: {
            create: challanItemsData,
          },
        },
        include: {
          items: true,
        },
      });

      return updated;
    });

    return res.status(200).json({
      success: true,
      message: 'Draft challan updated successfully',
      data: updatedChallan,
    });
  } catch (err) {
    next(err);
  }
};

export const confirmChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      throw new ValidationError('User session required');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch the Challan
      const challan = await tx.salesChallan.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!challan) {
        throw new NotFoundError('Sales challan not found');
      }

      // 2. Validate challan state (Must be DRAFT)
      if (challan.status === ChallanStatus.CONFIRMED) {
        throw new BusinessRuleError('Challan is already CONFIRMED');
      }
      if (challan.status === ChallanStatus.CANCELLED) {
        throw new BusinessRuleError('Cannot confirm a CANCELLED challan');
      }

      // 3. Lock products FOR UPDATE to ensure serializable stock safety and prevent race conditions.
      const productIds = challan.items.map((it) => it.productId);
      if (productIds.length > 0) {
        // Build raw lock query to avoid race conditions
        const placeholderString = productIds.map((_, idx) => `$${idx + 1}`).join(', ');
        await tx.$executeRawUnsafe(
          `SELECT id FROM "Product" WHERE id IN (${placeholderString}) FOR UPDATE`,
          ...productIds
        );
      }

      // 4. Validate Stock levels for every product
      for (const item of challan.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundError(`Product not found: ${item.productNameSnapshot}`);
        }

        if (product.currentStock < item.quantity) {
          throw new BusinessRuleError(
            `Insufficient stock for "${product.productName}" (SKU: ${product.sku}). Available: ${product.currentStock}, Required: ${item.quantity}.`
          );
        }
      }

      // 5. Deduct Stock, Create OUT movements, and Update Challan Item snapshot values
      for (const item of challan.items) {
        // Deduct
        await tx.product.update({
          where: { id: item.productId },
          data: { currentStock: { decrement: item.quantity } },
        });

        // Create OUT stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChanged: item.quantity,
            movementType: MovementType.OUT,
            reason: `Sales Challan Confirmation ${challan.challanNumber}`,
            createdBy: req.user!.id,
          },
        });

        // Get the latest product details (to refresh snapshot at the exact moment of confirmation)
        const currentProduct = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (currentProduct) {
          await tx.salesChallanItem.update({
            where: { id: item.id },
            data: {
              productNameSnapshot: currentProduct.productName,
              skuSnapshot: currentProduct.sku,
              unitPriceSnapshot: currentProduct.unitPrice,
              totalPrice: Number(currentProduct.unitPrice) * item.quantity,
            },
          });
        }
      }

      // 6. Update Challan Status to CONFIRMED
      const confirmed = await tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.CONFIRMED },
        include: { items: true },
      });

      return confirmed;
    });

    return res.status(200).json({
      success: true,
      message: 'Sales Challan confirmed and stock deducted successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const cancelChallan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!req.user) {
      throw new ValidationError('User session required');
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Challan
      const challan = await tx.salesChallan.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!challan) {
        throw new NotFoundError('Sales challan not found');
      }

      // 2. Validate state (Already cancelled checks)
      if (challan.status === ChallanStatus.CANCELLED) {
        throw new BusinessRuleError('Challan is already CANCELLED');
      }

      const prevStatus = challan.status;

      // 3. If CONFIRMED, we must RESTOCK the items back in a safe transaction
      if (prevStatus === ChallanStatus.CONFIRMED) {
        const productIds = challan.items.map((it) => it.productId);
        if (productIds.length > 0) {
          // Lock product rows first
          const placeholderString = productIds.map((_, idx) => `$${idx + 1}`).join(', ');
          await tx.$executeRawUnsafe(
            `SELECT id FROM "Product" WHERE id IN (${placeholderString}) FOR UPDATE`,
            ...productIds
          );
        }

        // Restock items
        for (const item of challan.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { currentStock: { increment: item.quantity } },
          });

          // Create IN stock movement for restocking
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChanged: item.quantity,
              movementType: MovementType.IN,
              reason: `Sales Challan Cancellation Restock ${challan.challanNumber}`,
              createdBy: req.user!.id,
            },
          });
        }
      }

      // 4. Update Challan status to CANCELLED
      const cancelled = await tx.salesChallan.update({
        where: { id },
        data: { status: ChallanStatus.CANCELLED },
        include: { items: true },
      });

      return {
        cancelled,
        restocked: prevStatus === ChallanStatus.CONFIRMED,
      };
    });

    return res.status(200).json({
      success: true,
      message: result.restocked
        ? 'Sales Challan cancelled and products returned to inventory'
        : 'Draft Sales Challan cancelled successfully',
      data: result.cancelled,
    });
  } catch (err) {
    next(err);
  }
};
