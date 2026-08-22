import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { getUsers } from '../controllers/userController';

const router = Router();
router.get('/', authenticate, authorize(Role.ADMIN), getUsers);
export default router;
