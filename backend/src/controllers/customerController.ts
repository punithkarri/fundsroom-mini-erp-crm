import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { customerSchema, followUpSchema } from '../validators';
import { ValidationError, NotFoundError } from '../utils/errors';

export const getCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const status = req.query.status as string;
    const type = req.query.type as any;
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '10', 10);
    const skip = (page - 1) * limit;

    // Build filter conditions
    const where: any = {};

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
        { mobileNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.customerType = type;
    }

    // Execute query with total count
    const [total, customers] = await prisma.$transaction([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        customers,
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

export const createCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = customerSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', parseResult.error.errors);
    }

    const customer = await prisma.customer.create({
      data: parseResult.data,
    });

    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (err) {
    next(err);
  }
};

export const getCustomerById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        followUps: {
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
        },
      },
    });

    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    return res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const parseResult = customerSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', parseResult.error.errors);
    }

    // Check customer existence
    const existingCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      throw new NotFoundError('Customer not found');
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: parseResult.data,
    });

    return res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check customer existence
    const existingCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      throw new NotFoundError('Customer not found');
    }

    await prisma.customer.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Customer deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// CRM Follow ups
export const createFollowUp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: customerId } = req.params;
    if (!req.user) {
      throw new ValidationError('User session is required');
    }

    const parseResult = followUpSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new ValidationError('Validation failed', parseResult.error.errors);
    }

    const { note, followUpDate } = parseResult.data;

    // Check if customer exists
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }

    // Create follow-up and update customer's next follow-up date in a transaction
    const [followUp] = await prisma.$transaction([
      prisma.customerFollowUp.create({
        data: {
          customerId,
          note,
          followUpDate,
          createdBy: req.user.id,
        },
      }),
      prisma.customer.update({
        where: { id: customerId },
        data: {
          followUpDate,
        },
      }),
    ]);

    return res.status(201).json({
      success: true,
      message: 'Follow-up logged successfully',
      data: followUp,
    });
  } catch (err) {
    next(err);
  }
};
