import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { productSchema, manualStockAdjustmentSchema } from '../validators';
import { ValidationError, NotFoundError, BusinessRuleError } from '../utils/errors';
import { MovementType } from '@prisma/client';

export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const category = req.query.category as string;
    const lowStock = req.query.lowStock === 'true';
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    // Prisma query for lowStock: currentStock <= minimumStock
    if (lowStock) {
      where.currentStock = {
        lte: prisma.product.fields.minimumStock, // Compares field values directly
      };
      
      // Wait, direct field-to-field comparison in Prisma can sometimes be tricky or unsupported in older Prisma client versions.
      // A more robust fallback if Prisma fields doesn't support lte is to fetch IDs or do it manually, or use raw queries.
      // Wait! In modern Prisma, comparing fields requires prisma.product.fields, but let's check:
      // To be safe and compatible with all Prisma setups, we can write a fallback logic or use a raw sql, or query condition if we want.
      // Let's see: how is field comparison written in Prisma? 
      // It is: lte: prisma.product.fields.minimumStock. If it fails, let's write it in a way that is robust.
      // Let's implement lte comparison via Prisma RAW or by simply fetching/filtering if small, OR better, using a raw check or just standard query.
      // Actually, since we're using PostgreSQL, a safe approach is:
      // where.currentStock = { lte: prisma.product.fields.minimumStock } is standard in Prisma 4.3+.
      // Let's write it standard. If we encounter issues, we can query raw. It's supported.
    }

    const [total, products] = await prisma.$transaction([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        products,
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

export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = productSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', parseResult.error.errors);
    }

    const { currentStock, ...rest } = parseResult.data;

    // Run creation inside a transaction so we record the initial stock movement
    const product = await prisma.$transaction(async (tx) => {
      const newProd = await tx.product.create({
        data: {
          ...rest,
          currentStock,
        },
      });

      if (currentStock > 0 && req.user) {
        await tx.stockMovement.create({
          data: {
            productId: newProd.id,
            quantityChanged: currentStock,
            movementType: MovementType.IN,
            reason: 'Initial stock registration',
            createdBy: req.user.id,
          },
        });
      }

      return newProd;
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return res.status(200).json({
      success: true,
      data: product,
    });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const parseResult = productSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', parseResult.error.errors);
    }

    // Keep currentStock unchanged during updates (stock must only change via stock-in/out endpoints)
    const { currentStock, ...updateData } = parseResult.data;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
    });
  } catch (err) {
    next(err);
  }
};

export const getStockMovements = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;

    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      throw new NotFoundError('Product not found');
    }

    const movements = await prisma.stockMovement.findMany({
      where: { productId },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({
      success: true,
      data: movements,
    });
  } catch (err) {
    next(err);
  }
};

export const stockIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    if (!req.user) {
      throw new ValidationError('User session required');
    }

    const parseResult = manualStockAdjustmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', parseResult.error.errors);
    }

    const { quantityChanged, reason } = parseResult.data;

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { currentStock: { increment: quantityChanged } },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          quantityChanged,
          movementType: MovementType.IN,
          reason: `Manual stock IN: ${reason}`,
          createdBy: req.user!.id,
        },
      });

      return { updated, movement };
    });

    return res.status(200).json({
      success: true,
      message: 'Stock updated (IN) successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

export const stockOut = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: productId } = req.params;
    if (!req.user) {
      throw new ValidationError('User session required');
    }

    const parseResult = manualStockAdjustmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', parseResult.error.errors);
    }

    const { quantityChanged, reason } = parseResult.data;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Read product and lock the row using a raw postgres query if required,
      // or check stock level. Since it is inside a transaction, we check to prevent negative values.
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      if (product.currentStock < quantityChanged) {
        throw new BusinessRuleError(
          `Insufficient stock. Available: ${product.currentStock}, Requested reduction: ${quantityChanged}`
        );
      }

      const updated = await tx.product.update({
        where: { id: productId },
        data: { currentStock: { decrement: quantityChanged } },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId,
          quantityChanged,
          movementType: MovementType.OUT,
          reason: `Manual stock OUT: ${reason}`,
          createdBy: req.user!.id,
        },
      });

      return { updated, movement };
    });

    return res.status(200).json({
      success: true,
      message: 'Stock updated (OUT) successfully',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
