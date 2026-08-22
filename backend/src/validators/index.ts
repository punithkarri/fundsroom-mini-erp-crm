import { z } from 'zod';
import { CustomerType, CustomerStatus, Role, ChallanStatus, WorkOrderStatus } from '@prisma/client';

// Helper: Indian GST Validation (15 alphanumeric characters)
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Helper: 10-digit Indian Mobile Validation
const mobileRegex = /^[6-9]\d{9}$/;

// 1. Auth Validation
export const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

// 2. Customer Validation
export const customerSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobileNumber: z.string().refine((val) => mobileRegex.test(val), {
    message: 'Mobile number must be a valid 10-digit Indian number starting with 6-9',
  }),
  email: z.string().email('Invalid email format'),
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  gstNumber: z
    .string()
    .trim()
    .toUpperCase()
    .nullable()
    .optional()
    .refine((val) => !val || gstRegex.test(val), {
      message: 'Invalid Indian GSTIN format (e.g. 27AAAAA1111A1Z1)',
    }),
  customerType: z.nativeEnum(CustomerType, {
    errorMap: () => ({ message: 'Customer type must be RETAIL, WHOLESALE, or DISTRIBUTOR' }),
  }),
  address: z.string().min(5, 'Address must be at least 5 characters long'),
  status: z.nativeEnum(CustomerStatus).optional().default(CustomerStatus.LEAD),
  notes: z.string().optional().nullable(),
});

// 3. Customer Follow-up Validation
export const followUpSchema = z.object({
  note: z.string().min(5, 'Follow-up note must be at least 5 characters long'),
  followUpDate: z.string().transform((val) => new Date(val)).refine((date) => date > new Date(), {
    message: 'Follow-up date must be in the future',
  }),
});

// 4. Product Validation
export const productSchema = z.object({
  productName: z.string().min(2, 'Product name must be at least 2 characters'),
  sku: z.string().min(3, 'SKU must be at least 3 characters').toUpperCase(),
  category: z.string().min(2, 'Category must be at least 2 characters'),
  unitPrice: z.number().positive('Unit price must be a positive number'),
  currentStock: z.number().int().nonnegative('Stock cannot be negative').optional().default(0),
  minimumStock: z.number().int().nonnegative('Minimum stock alert cannot be negative').default(5),
  warehouseLocation: z.string().min(2, 'Warehouse location must be at least 2 characters'),
});

// 5. Stock Manual Adjustments
export const manualStockAdjustmentSchema = z.object({
  quantityChanged: z.number().int().positive('Quantity must be a positive integer'),
  reason: z.string().min(3, 'Reason must be at least 3 characters long'),
});

// 6. Sales Challan Item Validation
export const challanItemSchema = z.object({
  productId: z.string().uuid('Invalid Product ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

// 7. Sales Challan Validation
export const challanSchema = z.object({
  customerId: z.string().uuid('Invalid Customer ID'),
  items: z.array(challanItemSchema).min(1, 'Challan must contain at least one item'),
  status: z.nativeEnum(ChallanStatus).optional().default(ChallanStatus.DRAFT),
});

const positiveInt = z.number().int().positive('Quantity must be a positive integer');

export const inventorySchema = z.object({
  sku: z.string().min(1).toUpperCase(),
  name: z.string().min(2),
  categoryId: z.string().uuid(),
  locationId: z.string().uuid(),
  unit: z.string().min(1).default('units'),
  batch: z.string().optional().nullable(),
  physicalQuantity: z.number().int().nonnegative(),
  reservedQuantity: z.number().int().nonnegative().default(0),
  minimumStock: z.number().int().nonnegative().default(0),
}).refine((value) => value.reservedQuantity <= value.physicalQuantity, {
  message: 'Reserved quantity cannot exceed physical quantity',
  path: ['reservedQuantity'],
});

export const workOrderSchema = z.object({
  workOrderNumber: z.string().min(2),
  locationId: z.string().uuid(),
  itemId: z.string().uuid(),
  requiredQuantity: positiveInt,
  assignedUserId: z.string().uuid(),
});

export const workOrderStatusSchema = z.object({
  status: z.nativeEnum(WorkOrderStatus),
});

export const transferSchema = z.object({
  transferNumber: z.string().min(2),
  sourceLocationId: z.string().uuid(),
  destinationLocationId: z.string().uuid(),
  itemId: z.string().uuid(),
  quantity: positiveInt,
}).refine((value) => value.sourceLocationId !== value.destinationLocationId, {
  message: 'Source and destination locations must be different',
  path: ['destinationLocationId'],
});

export const customerOrderSchema = z.object({
  orderNumber: z.string().min(2),
  customerId: z.string().uuid(),
  items: z.array(z.object({
    itemId: z.string().uuid(),
    quantity: positiveInt,
    unitPrice: z.number().nonnegative().optional(),
  })).min(1),
});
