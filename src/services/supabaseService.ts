import { createClient } from '@supabase/supabase-js';
import { type StockItem, type RetailSale, type MortalityLog, type StockActivityLog } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseDataService = {
  /**
   * Universal Image Upload Utility (Optimized for Telemetry)
   */
  async uploadStockImage(file: File): Promise<string | null> {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `stock-visuals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
      return null;
    }
  },

  /**
   * Inventory Normalization Engine
   * Maps DB snake_case to Frontend camelCase and normalizes status strings
   */
  _mapStockItem(item: any): StockItem {
    const rawStatus = (item.status || 'PENDING_APPROVAL').toUpperCase();
    const finalStatus = (rawStatus === 'PENDING') ? 'PENDING_APPROVAL' : rawStatus;
    
    return {
      id: item.id || '',
      name: item.name || 'Unnamed Product',
      quantity: item.quantity || 0,
      unitPrice: item.unit_price || 0,
      unit: item.unit || 'units',
      category: item.category || 'other',
      description: item.description || '',
      minThreshold: item.min_threshold || 0,
      imageUrl: item.image_url,
      status: finalStatus as any,
      submittedBy: item.submitted_by || '',
      submittedByName: item.submitted_by_name || 'System',
      rejectionComment: item.rejection_comment,
      lastUpdated: item.last_updated || new Date().toISOString(),
      farmId: item.farm_id || '1',
      deletedBy: item.deleted_by,
      deletedAt: item.deleted_at,
    };
  },

  /** Fetch live stock — For Sales terminal (Only Approved & Available) */
  async getStockItems(_farmId?: string): Promise<StockItem[]> {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .or('status.eq.APPROVED,status.eq.approved')
        .gt('quantity', 0)
        .order('name', { ascending: true });

      if (error) throw error;
      return (data || []).map((item: any) => this._mapStockItem(item));
    } catch (error) {
      console.error('Get stock items error:', error);
      return [];
    }
  },

  /** Fetch all items — For Admin Sector and Inventory HUB */
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

  /** Submit new stock for verification */
  async submitStockItem(item: Partial<StockItem>, userId: string, userName: string, userRole: string): Promise<StockItem | null> {
    try {
       const payload = {
          name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          unit: item.unit,
          category: item.category,
          image_url: item.imageUrl,
          status: 'PENDING_APPROVAL',
          submitted_by: userId,
          submitted_by_name: userName,
          last_updated: new Date().toISOString(),
          farm_id: '1'
       };

       const { data, error } = await supabase
         .from('stock_items')
         .insert([payload])
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
         performedBy: userId,
         performedByName: userName,
         performedByRole: userRole,
         message: `New stock submitted for approval: ${data.name}`,
         timestamp: new Date().toISOString()
       });

       return this._mapStockItem(data);
    } catch (error) {
      console.error('Submit stock error:', error);
      return null;
    }
  },

  /** Approve stock item — Launches it to Sales Terminal */
  async approveStockItem(id: string, admin: { id: string, name: string, role: string }): Promise<boolean> {
    try {
      const { data: item } = await supabase.from('stock_items').select('*').eq('id', id).single();
      const { error } = await supabase
        .from('stock_items')
        .update({ status: 'APPROVED', last_updated: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      await this.logStockActivity({
        actionType: 'APPROVE',
        stockId: id,
        stockName: item.name,
        price: item.unit_price,
        quantity: item.quantity,
        imageUrl: item.image_url,
        performedBy: admin.id,
        performedByName: admin.name,
        performedByRole: admin.role,
        message: `Admin approved stock: ${item.name}`,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Approve error:', error);
      return false;
    }
  },

  /** Reject stock item — Blocks it from Sales Terminal */
  async rejectStockItem(id: string, comment: string, admin: { id: string, name: string, role: string }): Promise<boolean> {
    try {
      const { data: item } = await supabase.from('stock_items').select('*').eq('id', id).single();
      const { error } = await supabase
        .from('stock_items')
        .update({ status: 'REJECTED', rejection_comment: comment, last_updated: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

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
        message: `Admin rejected stock: ${item.name} (${comment})`,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Reject error:', error);
      return false;
    }
  },

  /** Update stock item details */
  async updateStockItem(id: string, updates: Partial<StockItem>, admin: { id: string, name: string, role: string }): Promise<boolean> {
    try {
      const payload: any = { last_updated: new Date().toISOString() };
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.quantity !== undefined) payload.quantity = updates.quantity;
      if (updates.unitPrice !== undefined) payload.unit_price = updates.unitPrice;
      if (updates.imageUrl !== undefined) payload.image_url = updates.imageUrl;

      const { error } = await supabase.from('stock_items').update(payload).eq('id', id);
      if (error) throw error;

      await this.logStockActivity({
        actionType: 'EDIT',
        stockId: id,
        stockName: updates.name || 'Stock Item',
        price: updates.unitPrice || 0,
        quantity: updates.quantity || 0,
        performedBy: admin.id,
        performedByName: admin.name,
        performedByRole: admin.role,
        message: `Admin updated stock details: ${updates.name || id}`,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Update item error:', error);
      return false;
    }
  },

  /** Delete stock item logically */
  async deleteStockItem(id: string, admin: { id: string, name: string, role: string }): Promise<boolean> {
    try {
      const { data: item } = await supabase.from('stock_items').select('*').eq('id', id).single();
      const { error } = await supabase
        .from('stock_items')
        .update({ status: 'DELETED', last_updated: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      await this.logStockActivity({
        actionType: 'DELETE',
        stockId: id,
        stockName: item.name,
        performedBy: admin.id,
        performedByName: admin.name,
        performedByRole: admin.role,
        message: `Admin deleted item: ${item.name}`,
        timestamp: new Date().toISOString(),
        price: item.unit_price,
        quantity: item.quantity
      });
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      return false;
    }
  },

  /** Log activity record */
  async logStockActivity(log: Omit<StockActivityLog, 'id' | 'createdAt'>): Promise<void> {
    try {
      const payload = {
        action_type: log.actionType,
        stock_id: log.stockId,
        stock_name: log.stockName,
        price: log.price,
        quantity: log.quantity,
        image_url: log.imageUrl,
        performed_by: log.performedBy,
        performed_by_name: log.performedByName,
        performed_by_role: log.performedByRole,
        message: log.message,
        farm_id: '1',
        timestamp: log.timestamp
      };
      await supabase.from('stock_activity_logs').insert([payload]);
    } catch (err) {
      console.error('Activity log error:', err);
    }
  },

  /** Fetch all retail sales */
  async getRetailSales(userProfile?: { id: string; role: string }): Promise<{ success: boolean; data: RetailSale[]; message: string }> {
    try {
      let query = supabase.from('retail_sales').select('*').order('created_at', { ascending: false }).limit(300);
      if (userProfile && (userProfile.role === 'sales' || userProfile.role === 'sales_staff')) {
         query = query.eq('salesperson_id', userProfile.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      const parsed = (data || []).map((d: any) => ({
        id: d.id || '',
        receiptNumber: d.receipt_number || 'N/A',
        items: d.items || [],
        totalPrice: d.total_price || 0,
        paymentMethod: d.payment_method || 'cash',
        customerName: d.customer_name || 'Direct Client',
        salespersonId: d.salesperson_id || '',
        createdAt: d.created_at || new Date().toISOString(),
        farmId: d.farm_id || '1',
      }));
      return { success: true, data: parsed, message: 'Retrieved' };
    } catch (error: any) {
      return { success: false, data: [], message: error?.message || 'DB Error' };
    }
  },

  /** Record sale via RPC (Atomic check & decrement) */
  async recordRetailSale(sale: Omit<RetailSale, 'id' | 'createdAt'>): Promise<RetailSale | null> {
    try {
      const { data, error } = await supabase.rpc('process_retail_sale', { payload: sale });
      if (error) throw new Error(error.message);
      return {
        id: data.id || '',
        receiptNumber: data.receiptNumber || 'N/A',
        items: data.items || [],
        totalPrice: data.totalPrice || 0,
        paymentMethod: data.paymentMethod || 'cash',
        customerName: data.customerName || 'Direct Client',
        salespersonId: data.salespersonId || '',
        createdAt: data.createdAt || new Date().toISOString(),
        farmId: data.farmId || '1'
      };
    } catch (error: any) {
      console.error('Retail sale error:', error);
      throw error;
    }
  },

  /** Mortality Log Operations (Typed for Batch/Farm Mortality) */
  async addMortalityLog(log: Omit<MortalityLog, 'id' | 'createdAt' | 'synced'>): Promise<MortalityLog | null> {
    try {
      const payload = {
        farm_id: log.farmId || '1',
        worker_id: log.workerId,
        worker_name: log.workerName,
        date: log.date || new Date().toISOString(),
        count: log.count || 0,
        cause: log.cause,
        batch_id: log.batchId,
        notes: log.notes,
        image_url: log.imageUrl,
        created_at: new Date().toISOString(),
        synced: true
      };
      const { data, error } = await supabase.from('mortality_logs').insert([payload]).select().single();
      if (error) throw error;
      return {
        id: data.id,
        farmId: data.farm_id,
        workerId: data.worker_id,
        workerName: data.worker_name,
        date: data.date,
        count: data.count,
        cause: data.cause,
        batchId: data.batch_id,
        notes: data.notes,
        imageUrl: data.image_url,
        createdAt: data.created_at,
        synced: data.synced
      };
    } catch (err) {
      console.error('Mortality error:', err);
      return null;
    }
  }
};

export default supabase;
