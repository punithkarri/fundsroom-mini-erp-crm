export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';

export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export type MovementType = 'IN' | 'OUT';

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Customer {
  id: string;
  customerName: string;
  mobileNumber: string;
  email: string;
  businessName: string;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  followUps?: CustomerFollowUp[];
}

export interface CustomerFollowUp {
  id: string;
  customerId: string;
  note: string;
  followUpDate: string;
  createdBy: string;
  createdAt: string;
  creator?: {
    id: string;
    name: string;
    role: Role;
  };
}

export interface Product {
  id: string;
  productName: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minimumStock: number;
  warehouseLocation: string;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  quantityChanged: number;
  movementType: MovementType;
  reason: string;
  createdBy: string;
  createdAt: string;
  product?: {
    productName: string;
    sku: string;
  };
  creator?: {
    name: string;
  };
}

export interface SalesChallan {
  id: string;
  challanNumber: string;
  customerId: string;
  totalQuantity: number;
  status: ChallanStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  creator?: {
    id: string;
    name: string;
  };
  items?: SalesChallanItem[];
}

export interface SalesChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productNameSnapshot: string;
  skuSnapshot: string;
  unitPriceSnapshot: number;
  quantity: number;
  totalPrice: number;
  product?: Product;
}

export interface DashboardStats {
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    totalProducts: number;
    lowStockProductsCount: number;
    totalChallans: number;
    draftChallans: number;
    confirmedChallans: number;
    upcomingFollowUpsCount: number;
  };
  recentChallans: SalesChallan[];
  recentStockMovements: StockMovement[];
  lowStockProducts: Array<{
    id: string;
    productName: string;
    sku: string;
    category: string;
    currentStock: number;
    minimumStock: number;
    warehouseLocation: string;
  }>;
  upcomingFollowUps: Array<{
    id: string;
    customerName: string;
    businessName: string;
    followUpDate: string;
    notes: string | null;
  }>;
}
