import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If headers already sent, delegate to default express handler
  if (res.headersSent) {
    return next(err);
  }

  console.error(`[Error] ${req.method} ${req.url}:`, err);

  // 1. Check if custom AppError
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // 2. Check Prisma specific database errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint failed
    if (err.code === 'P2002') {
      const targets = (err.meta?.target as string[]) || [];
      return res.status(409).json({
        success: false,
        message: `Conflict: A record with this ${targets.join(', ')} already exists.`,
      });
    }

    // P2025: Record to update/delete not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or does not exist.',
      });
    }
  }

  // 3. Fallback for unexpected exceptions
  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    success: false,
    message: isProduction ? 'An unexpected internal server error occurred' : err.message,
    stack: isProduction ? undefined : err.stack,
  });
};
