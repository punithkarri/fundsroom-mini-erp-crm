import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, createdAt: true }, orderBy: { name: 'asc' } });
    return res.json({ success: true, data: users });
  } catch (err) { next(err); }
};
