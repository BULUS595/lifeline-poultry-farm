// Define all TypeScript types for the application

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'sales_staff'
  | 'sales'
  | 'inventory_staff'
  | 'inventory_officer'
  | 'accountant'
  | 'auditor'
  | 'worker';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  farmIds: string[];
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface Farm {
  id: string;
  name: string;
  location: string;
  totalBirds: number;
  birdType: string;
  createdAt: Date;
  managedBy: string; // User ID of manager
  staffIds: string[];
}

export interface MortalityLog {
  id: string;
  farmId: string;
  workerId: string;
  date: string; // ISO date format
  count: number;
  cause?: string;
  notes?: string;
  createdAt: string;
  synced: boolean;
}

export interface FeedingLog {
  id: string;
  farmId: string;
  workerId: string;
  date: string; // ISO date format
  quantity: number;
  unit: 'kg' | 'lbs' | 'bags' | 'liters';
  feedType: string;
  time: string;
  notes?: string;
  createdAt: string;
  synced: boolean;
}

export interface MedicineSchedule {
  id: string;
  farmId: string;
  medicineType: string;
  description: string;
  scheduledDate: Date;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  endDate?: Date;
  dosage?: string;
  assignedTo: string[]; // Worker IDs
  createdBy: string; // Admin ID
  createdAt: Date;
}

export interface MedicineCompletion {
  id: string;
  scheduleId: string;
  workerId: string;
  farmId: string;
  completedAt: Date;
  notes?: string;
  synced: boolean;
}

export interface Expense {
  id: string;
  farmId: string;
  date: string;
  category: 'feed' | 'chicks' | 'salaries' | 'medicine' | 'maintenance' | 'utilities' | 'transport' | 'other' | 'equipment' | 'labor';
  amount: number;
  vendor?: string;
  description: string;
  recordedBy: string;
  recordedByName: string;
  status: 'pending' | 'approved';
  approvedBy?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  total: number;
}

export interface Sale {
  id: string;
  farmId: string;
  date: string;
  items: SaleItem[];
  totalAmount: number;
  customerName?: string;
  notes?: string;
  receiptNumber: string;
  salespersonId: string;
  salespersonName: string;
  paymentMethod: 'cash' | 'transfer' | 'pos' | 'credit';
  status: 'completed' | 'pending' | 'cancelled';
  createdAt: string;
}

export interface StorageItem {
  id: string;
  farmId: string;
  name: string; // e.g., "Feed", "Eggs", "Birds"
  category: 'feed' | 'eggs' | 'birds' | 'equipment' | 'other';
  currentStock: number;
  unit: string;
  minStockThreshold: number; // For alerts
  price?: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface InventoryLog {
  id: string;
  farmId: string;
  itemId: string;
  itemName: string;
  action: 'add' | 'remove' | 'adjustment';
  quantity: number;
  previousStock: number;
  newStock: number;
  userId: string;
  userName: string;
  notes?: string;
  timestamp: string;
}

export interface FinancialSummary {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  date: Date;
  farmId: string;
  totalExpenses: number;
  totalSales: number;
  profit: number;
  birdCount: number;
  birdsSold: number;
  mortalityCount: number;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  minThreshold: number;
  imageUrl?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'DELETED' | 'OUT_OF_STOCK';
  submittedBy: string;
  submittedByName?: string;
  rejectionComment?: string;
  lastUpdated: string;
  farmId: string;
  deletedBy?: string;
  deletedAt?: string;
}

export interface StockActivityLog {
  id: string;
  actionType: 'CREATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'EDIT';
  performedBy: string;
  performedByRole: string;
  performedByName: string;
  stockId: string;
  stockName: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  message: string;
  timestamp: string;
}


export interface RetailSale {
  id: string;
  receiptNumber: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  totalPrice: number;
  paymentMethod: 'cash' | 'transfer' | 'pos';
  customerName?: string;
  salespersonId: string;
  createdAt: string;
  farmId: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName?: string;
  farmId: string;
  action: string;
  dataType: 'mortality' | 'feeding' | 'medicine' | 'expense' | 'sale' | 'user' | 'farm' | 'storage';
  dataId: string;
  details?: string;
  previousState?: any;
  isDeleted?: boolean;
  timestamp: string;
}

export interface Task {
  id: string;
  farmId: string;
  title: string;
  description: string;
  assignedTo: string[]; // Worker IDs
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  createdBy: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error?: string;
}

export interface SyncQueue {
  id: string;
  dataType: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: Date;
  farmId: string;
  userId: string;
  synced: boolean;
}
