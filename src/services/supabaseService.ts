import { createClient } from '@supabase/supabase-js';
import type {
  User,
  Farm,
  MortalityLog,
  FeedingLog,
  Expense,
  Sale,
  StockItem,
  RetailSale,
  StockActivityLog
} from '../types';


// Initialize Supabase client
// TODO: Add your Supabase URL and Anon Key from https://app.supabase.com
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Authentication Service using Supabase
 */
export const supabaseAuthService = {
  /**
   * Sign in user with email and password
   */
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Get user profile from database
      const userProfile = await this.getUserProfile(data.user?.id || '');

      if (!userProfile) {
        throw new Error('Access denied. No personnel record found for this identity in the Lifeline directory.');
      }

      return {
        user: userProfile,
        token: data.session?.access_token,
      };
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  /**
   * Sign out current user
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      return await this.getUserProfile(user.id);
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  /**
   * Get user profile from database
   */
  async getUserProfile(userId: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        farmIds: data.farm_ids || [],
        isActive: data.is_active,
        createdAt: data.created_at,
        lastLogin: data.last_login || undefined,
      } as User;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  },

  /**
   * Check if user has permission for action
   */
  async hasPermission(userId: string, action: string, farmId?: string): Promise<boolean> {
    try {
      const user = await this.getUserProfile(userId);
      if (!user) return false;

      if (user.role === 'super_admin') return true;

      if (farmId && !user.farmIds.includes(farmId)) return false;

      // Role-based permissions
      const permissions: Record<string, string[]> = {
        super_admin: ['create', 'read', 'update', 'delete', 'manage_users', 'view_reports'],
        manager: ['create', 'read', 'update', 'view_reports'],
        accountant: ['read', 'view_reports'],
        auditor: ['read', 'view_reports'],
        sales_staff: ['create', 'read'],
        inventory_staff: ['create', 'read'],
        worker: ['create', 'read'],
      };

      return permissions[user.role]?.includes(action) || false;
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  },
};

/**
 * Data Service using Supabase
 */
export const supabaseDataService = {

  /**
   * Upload image to Supabase Storage
   */
  async uploadStockImage(file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `stock/${fileName}`;

      const { error } = await supabase.storage.from('stock-images').upload(filePath, file);
      
      if (error) {
        // Fallback to 'public' bucket if 'stock-images' doesn't exist
        const fb = await supabase.storage.from('public').upload(filePath, file);
        if (fb.error) throw fb.error;
        const { data } = supabase.storage.from('public').getPublicUrl(filePath);
        return data.publicUrl;
      }

      const { data } = supabase.storage.from('stock-images').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Image upload error:', error);
      throw error;
    }
  },

  /**
   * Add mortality log
   */
  async addMortalityLog(log: Omit<MortalityLog, 'id' | 'createdAt' | 'synced'>) {
    try {
      const { data, error } = await supabase
        .from('mortality_logs')
        .insert([{ ...log, synced: true }])
        .select()
        .single();

      if (error) throw error;
      return data as MortalityLog;
    } catch (error) {
      console.error('Add mortality log error:', error);
      throw error;
    }
  },

  /**
   * Get mortality logs for a farm
   */
  async getMortalityLogs(farmId: string, filters?: {
    startDate?: string;
    endDate?: string;
    workerId?: string;
  }) {
    try {
      let query = supabase
        .from('mortality_logs')
        .select('*')
        .eq('farm_id', farmId)
        .order('date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters?.workerId) {
        query = query.eq('worker_id', filters.workerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as MortalityLog[];
    } catch (error) {
      console.error('Get mortality logs error:', error);
      return [];
    }
  },

  /**
   * Update mortality log
   */
  async updateMortalityLog(id: string, updates: Partial<MortalityLog>) {
    try {
      const { data, error } = await supabase
        .from('mortality_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as MortalityLog;
    } catch (error) {
      console.error('Update mortality log error:', error);
      throw error;
    }
  },

  /**
   * Delete mortality log
   */
  async deleteMortalityLog(id: string) {
    try {
      const { error } = await supabase.from('mortality_logs').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Delete mortality log error:', error);
      throw error;
    }
  },

  /**
   * Add feeding log
   */
  async addFeedingLog(log: Omit<FeedingLog, 'id' | 'createdAt' | 'synced'>) {
    try {
      const { data, error } = await supabase
        .from('feeding_logs')
        .insert([{ ...log, synced: true }])
        .select()
        .single();

      if (error) throw error;
      return data as FeedingLog;
    } catch (error) {
      console.error('Add feeding log error:', error);
      throw error;
    }
  },

  /**
   * Get feeding logs for a farm
   */
  async getFeedingLogs(farmId: string, filters?: {
    startDate?: string;
    endDate?: string;
  }) {
    try {
      let query = supabase
        .from('feeding_logs')
        .select('*')
        .eq('farm_id', farmId)
        .order('date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FeedingLog[];
    } catch (error) {
      console.error('Get feeding logs error:', error);
      return [];
    }
  },

  /**
   * Add expense
   */
  async addExpense(expense: Omit<Expense, 'id' | 'createdAt'>) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert([expense])
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    } catch (error) {
      console.error('Add expense error:', error);
      throw error;
    }
  },

  /**
   * Get expenses for a farm
   */
  async getExpenses(farmId: string, filters?: {
    startDate?: string;
    endDate?: string;
    category?: string;
  }) {
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('farm_id', farmId)
        .order('date', { ascending: false });

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    } catch (error) {
      console.error('Get expenses error:', error);
      return [];
    }
  },

  /**
   * Add sale
   */
  async addSale(sale: Omit<Sale, 'id' | 'createdAt'>) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .insert([sale])
        .select()
        .single();

      if (error) throw error;
      return data as Sale;
    } catch (error) {
      console.error('Add sale error:', error);
      throw error;
    }
  },

  /**
   * Get sales for a farm
   */
  async getSales(farmId: string) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('farm_id', farmId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Sale[];
    } catch (error) {
      console.error('Get sales error:', error);
      return [];
    }
  },

  /**
   * Stock Management Operations (Approval Workflow)
   */

  _mapStockItem(item: any): StockItem {
    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      unit: item.unit,
      minThreshold: item.min_threshold,
      imageUrl: item.image_url,
      status: item.status || 'PENDING_APPROVAL',
      submittedBy: item.submitted_by,
      submittedByName: item.submitted_by_name,
      rejectionComment: item.rejection_comment,
      lastUpdated: item.last_updated,
      farmId: item.farm_id,
      deletedBy: item.deleted_by,
      deletedAt: item.deleted_at,
    };
  },

  _mapActivityLog(log: any): StockActivityLog {
    return {
      id: log.id,
      actionType: log.action_type,
      performedBy: log.performed_by,
      performedByRole: log.performed_by_role,
      performedByName: log.performed_by_name,
      stockId: log.stock_id,
      stockName: log.stock_name,
      price: log.price,
      quantity: log.quantity,
      imageUrl: log.image_url,
      message: log.message,
      timestamp: log.timestamp,
    };
  },

  /** Private helper for activity logging */
  async logStockActivity(activity: Omit<StockActivityLog, 'id' | 'timestamp'>) {
    try {
      await supabase.from('stock_activity_logs').insert([{
        action_type: activity.actionType,
        performed_by: activity.performedBy,
        performed_by_role: activity.performedByRole,
        performed_by_name: activity.performedByName,
        stock_id: activity.stockId,
        stock_name: activity.stockName,
        price: activity.price,
        quantity: activity.quantity,
        image_url: activity.imageUrl,
        message: activity.message
      }]);
    } catch (err) {
      console.error('Logging error:', err);
    }
  },


  /** APPROVED items only — Sales Staff view */
  async getStockItems(_farmId?: string): Promise<StockItem[]> {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('status', 'APPROVED')
        .gt('quantity', 0)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []).map((item: any) => this._mapStockItem(item));
    } catch (error) {
      console.error('Get stock items error:', error);
      return [];
    }
  },

  /** All items (excluding DELETED) — Stock management view */
  async getAllStockItems(_farmId?: string): Promise<StockItem[]> {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .neq('status', 'DELETED')
        .order('last_updated', { ascending: false });

      if (error) throw error;
      return (data || []).map((item: any) => this._mapStockItem(item));
    } catch (error) {
      console.error('Get all stock items error:', error);
      return [];
    }
  },

  /** ONLY DELETED logs — for Admin Log View */
  async getDeletedStockLogs(): Promise<StockActivityLog[]> {
    try {
      const { data, error } = await supabase
        .from('stock_activity_logs')
        .select('*')
        .eq('action_type', 'DELETE')
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return (data || []).map((log: any) => this._mapActivityLog(log));
    } catch (error) {
      console.error('Get deleted stock logs error:', error);
      return [];
    }
  },


  /** Inventory Staff submits for admin approval */
  async submitStockItem(
    item: Pick<StockItem, 'name' | 'quantity' | 'unitPrice' | 'unit' | 'minThreshold' | 'imageUrl' | 'farmId'>,
    submittedBy: string,
    submittedByName: string,
    userRole: string
  ): Promise<StockItem | null> {
    try {
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.farmId || '');
      const { data, error } = await supabase
        .from('stock_items')
        .insert([{
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          unit: item.unit,
          min_threshold: item.minThreshold,
          image_url: item.imageUrl || null,
          farm_id: isValidUUID ? item.farmId : null,
          status: 'PENDING_APPROVAL',
          submitted_by: submittedBy,
          submitted_by_name: submittedByName,
          last_updated: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      // Activity Log
      await this.logStockActivity({
        actionType: 'CREATE',
        stockId: data.id,
        stockName: data.name,
        price: data.unit_price,
        quantity: data.quantity,
        imageUrl: data.image_url,
        performedBy: submittedBy,
        performedByName: submittedByName,
        performedByRole: userRole,
        message: `Inventory added new stock: ${data.name}`
      });

      // Admin Notifications
      await supabase.from('stock_notifications').insert([
        { stock_item_id: data.id, recipient_role: 'super_admin', message: 'New stock submitted for approval' },
        { stock_item_id: data.id, recipient_role: 'manager', message: 'New stock submitted for approval' }
      ]);

      return this._mapStockItem(data);
    } catch (error) {
      console.error('Submit stock item error:', error);
      return null;
    }
  },


  /** Admin edits any pending or approved item */
  /** Update stock values natively (Restocking/Admin logic) */
  async updateStockItem(id: string, updates: Partial<StockItem>, user: { id: string, name: string, role: string }): Promise<boolean> {
    try {
      // Get current item first to check its status
      const { data: current } = await supabase.from('stock_items').select('status, quantity').eq('id', id).single();
      
      const dbUpdates: any = { last_updated: new Date().toISOString() };
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.quantity !== undefined) {
         dbUpdates.quantity = updates.quantity;
         // Automatically lift 'OUT_OF_STOCK' restriction if restocked
         if (current && current.status === 'OUT_OF_STOCK' && updates.quantity > 0) {
             dbUpdates.status = 'APPROVED';
         }
      }
      if (updates.unitPrice !== undefined) dbUpdates.unit_price = updates.unitPrice;
      if (updates.minThreshold !== undefined) dbUpdates.min_threshold = updates.minThreshold;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;

      const { data, error } = await supabase
        .from('stock_items')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Activity Log
      await this.logStockActivity({
        actionType: 'EDIT',
        stockId: id,
        stockName: data.name,
        price: data.unit_price,
        quantity: data.quantity,
        imageUrl: data.image_url,
        performedBy: user.id,
        performedByName: user.name,
        performedByRole: user.role,
        message: `Admin/Manager edited stock: ${data.name}`
      });

      return true;
    } catch (error) {
      console.error('Update stock item error:', error);
      return false;
    }
  },

  /** Soft Delete logic with tracking — Inventory deletes their own, Admin deletes any */
  async deleteStockItem(id: string, user: { id: string, name: string, role: string }): Promise<boolean> {
    try {
      // Get current item details for logging
      const { data: item } = await supabase.from('stock_items').select('*').eq('id', id).single();
      if (!item) return false;

      const { error } = await supabase
        .from('stock_items')
        .update({
          status: 'DELETED',
          deleted_by: user.id,
          deleted_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Activity Log
      await this.logStockActivity({
        actionType: 'DELETE',
        stockId: id,
        stockName: item.name,
        price: item.unit_price,
        quantity: item.quantity,
        imageUrl: item.image_url,
        performedBy: user.id,
        performedByName: user.name,
        performedByRole: user.role,
        message: user.role === 'inventory_staff'
          ? `Inventory deleted a stock: ${item.name}`
          : `Admin deleted a stock: ${item.name}`
      });

      // Notify Admin on deletion if not done by an admin themselves
      if (user.role === 'inventory_staff') {
        await supabase.from('stock_notifications').insert([
          { stock_item_id: id, recipient_role: 'super_admin', message: 'Inventory deleted a stock' },
          { stock_item_id: id, recipient_role: 'manager', message: 'Inventory deleted a stock' }
        ]);
      }

      return true;
    } catch (error) {
      console.error('Delete stock item error:', error);
      return false;
    }
  },


  /** Admin approves a pending submission */
  async approveStockItem(id: string, admin: { id: string, name: string, role: string }): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .update({ status: 'APPROVED', rejection_comment: null, last_updated: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Approve stock DB error:', JSON.stringify(error));
        throw error;
      }

      // Activity Log (best-effort)
      try {
        await this.logStockActivity({
          actionType: 'APPROVE',
          stockId: id,
          stockName: data.name,
          price: data.unit_price,
          quantity: data.quantity,
          imageUrl: data.image_url,
          performedBy: admin.id,
          performedByName: admin.name,
          performedByRole: admin.role,
          message: `Admin approved stock: ${data.name}`
        });
        await supabase.from('stock_notifications').insert([
          { stock_item_id: id, recipient_role: 'inventory_staff', message: 'Stock approved' },
          { stock_item_id: id, recipient_role: 'sales_staff', message: 'New stock available' }
        ]);
      } catch (_) { /* log failures shouldn't block the approval */ }

      return true;
    } catch (error) {
      console.error('Approve error:', error);
      return false;
    }
  },

  /** Admin rejects with a comment */
  async rejectStockItem(id: string, comment: string, admin: { id: string, name: string, role: string }): Promise<boolean> {
    try {
      const { data: item } = await supabase.from('stock_items').select('*').eq('id', id).single();
      const { error } = await supabase
        .from('stock_items')
        .update({ status: 'REJECTED', rejection_comment: comment, last_updated: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      // Activity Log
      await this.logStockActivity({
        actionType: 'REJECT',
        stockId: id,
        stockName: item.name,
        price: item.unit_price,
        quantity: item.quantity,
        imageUrl: item.image_url,
        performedBy: admin.id,
        performedByName: admin.name,
        performedByRole: admin.role,
        message: `Admin rejected stock: ${item.name} (${comment})`
      });

      // Inventory Feedback Notification
      await supabase.from('stock_notifications').insert([{
        stock_item_id: id,
        recipient_role: 'inventory_staff',
        message: 'Stock rejected'
      }]);

      return true;
    } catch (error) {
      console.error('Reject error:', error);
      return false;
    }
  },


  /**
   * Retail Sales Operations
   */

  /** Fetch all retail sales — for Admin Sales History view */
  async getRetailSales(): Promise<RetailSale[]> {
    try {
      const { data, error } = await supabase
        .from('retail_sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        receiptNumber: d.receipt_number,
        items: d.items || [],
        totalPrice: d.total_price,
        paymentMethod: d.payment_method,
        customerName: d.customer_name,
        salespersonId: d.salesperson_id,
        createdAt: d.created_at,
        farmId: d.farm_id,
      }));
    } catch (error) {
      console.error('Get retail sales error:', error);
      return [];
    }
  },

  async recordRetailSale(sale: Omit<RetailSale, 'id' | 'createdAt'>): Promise<RetailSale | null> {
    try {
      // Step 1: Use the atomic RPC transaction function
      // This locks rows, reduces quantities, stops overselling, triggers alerts, and inserts the sale.
      const { data, error } = await supabase.rpc('process_retail_sale', { payload: sale });

      if (error) {
         // Supabase pg_raise exception surfaces here, allowing us to parse the message
         throw new Error(error.message);
      }

      // Step 2: Return formatted representation
      return {
        id: data.id,
        receiptNumber: data.receiptNumber,
        items: data.items,
        totalPrice: data.totalPrice,
        paymentMethod: data.paymentMethod,
        customerName: data.customerName,
        salespersonId: data.salespersonId,
        createdAt: data.createdAt,
        farmId: data.farmId
      };
    } catch (error: any) {
      console.error('Record retail sale transaction error:', error);
      throw error; // Let the UI catch and display specific constraint messages
    }
  },

  /**
   * Subscribe to real-time updates
   */
  subscribeToTable(
    table: string,
    callback: (event: any) => void,
    filter?: string
  ) {
    const channel = supabase
      .channel(`public:${table} `)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: filter,
        },
        payload => callback(payload)
      )
      .subscribe();

    return channel;
  },
};

/**
 * Get farms for current user
 */
export async function getUserFarms(userId: string): Promise<Farm[]> {
  try {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .or(`managed_by.eq.${userId}, staff_ids.cs.{${userId} } `);

    if (error) throw error;
    return data as Farm[];
  } catch (error) {
    console.error('Get user farms error:', error);
    return [];
  }
}

/**
 * Get farm details
 */
export async function getFarmDetails(farmId: string): Promise<Farm | null> {
  try {
    const { data, error } = await supabase
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .single();

    if (error) throw error;
    return data as Farm;
  } catch (error) {
    console.error('Get farm details error:', error);
    return null;
  }
}

export default supabase;
