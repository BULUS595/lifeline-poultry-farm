import { createClient } from '@supabase/supabase-js';
import { type StockItem, type RetailSale, type MortalityLog, type StockActivityLog } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth service used by AuthContext
export const supabaseAuthService = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('No user returned from sign in');
    const profile = await supabaseAuthService.getUserProfile(data.user.id);
    if (!profile) throw new Error('User profile not found. Please contact your administrator.');
    return { user: profile, session: data.session };
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return null;
      return await supabaseAuthService.getUserProfile(session.user.id);
    } catch {
      return null;
    }
  },

  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) throw error;
      return {
        id: data.id,
        name: data.name || data.full_name || 'User',
        email: data.email,
        role: data.role || 'staff',
        farmIds: data.farm_ids || ['1'],
        farmId: data.farm_id || '1',
        phone: data.phone,
        avatar: data.avatar_url,
      };
    } catch {
      return null;
    }
  },
};


export const supabaseDataService = {
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

  async getStockItems(): Promise<StockItem[]> {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .eq('status', 'APPROVED')
        .gt('quantity', 0)
        .order('name');
      if (error) throw error;
      return (data || []).map(d => this._mapStockItem(d));
    } catch (err) {
      console.error('Fetch error:', err);
      return [];
    }
  },

  async getAllStockItems(): Promise<StockItem[]> {
      return this.getAdminStockItems();
  },

  async getAdminStockItems(): Promise<StockItem[]> {
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('last_updated', { ascending: false });
      if (error) throw error;
      return (data || []).map(d => this._mapStockItem(d));
    } catch (err) {
      console.error('Admin fetch error:', err);
      return [];
    }
  },

  async getRetailSales(user: { id: string; role: string }) {
      try {
          let query = supabase.from('retail_sales').select('*').order('created_at', { ascending: false });
          if (user.role === 'sales' || user.role === 'sales_staff') {
              query = query.eq('salesperson_id', user.id);
          }
          const { data, error } = await query;
          if (error) throw error;
          return { success: true, data: data as RetailSale[] };
      } catch (err: any) {
          return { success: false, data: [], message: err.message };
      }
  },

  async getRecentSales(limit = 50): Promise<RetailSale[]> {
    try {
      const { data, error } = await supabase
        .from('retail_sales')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []).map(d => ({
        id: d.id,
        receiptNumber: d.receipt_number,
        items: d.items,
        totalPrice: d.total_price,
        paymentMethod: d.payment_method,
        customerName: d.customer_name,
        salespersonId: d.salesperson_id,
        createdAt: d.created_at,
        farmId: d.farm_id,
      }));
    } catch (err) {
      console.error('Fetch sales error:', err);
      return [];
    }
  },

  async recordRetailSale(sale: Omit<RetailSale, 'id' | 'createdAt'>) {
     try {
         const { data, error } = await supabase.rpc('process_retail_sale', {
             p_receipt_number: sale.receiptNumber,
             p_items: sale.items,
             p_total_price: sale.totalPrice,
             p_payment_method: sale.paymentMethod,
             p_customer_name: sale.customerName,
             p_salesperson_id: sale.salespersonId,
             p_farm_id: sale.farmId
         });
         if (error) throw error;
         return data as RetailSale;
     } catch (err) {
         console.error('Transaction failure:', err);
         throw err;
     }
  },

  async uploadStockImage(file: File): Promise<string | null> {
    try {
      const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
      const { error } = await supabase.storage.from('stock-images').upload(fileName, file);
      if (error) throw error;
      const { data } = supabase.storage.from('stock-images').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    }
  },

  async approveStockItem(id: string, admin: { id: string; name: string; role: string }) {
      try {
          const { data, error } = await supabase.from('stock_items').update({
              status: 'APPROVED',
              last_updated: new Date().toISOString()
          }).eq('id', id).select().single();
          if (error) throw error;
          await this._logActivity({
              stockId: id,
              stockName: data.name,
              actionType: 'APPROVE',
              performedBy: admin.id,
              performedByName: admin.name,
              performedByRole: admin.role,
              message: `Authorized by ${admin.role.toUpperCase()}`,
              price: data.unit_price,
              quantity: data.quantity,
              imageUrl: data.image_url,
          });
          return true;
      } catch (err) {
          console.error('Approval error:', err);
          return false;
      }
  },

  async rejectStockItem(id: string, comment: string, admin: { id: string; name: string; role: string }) {
      try {
          const { data, error } = await supabase.from('stock_items').update({
              status: 'REJECTED',
              rejection_comment: comment,
              last_updated: new Date().toISOString()
          }).eq('id', id).select().single();
          if (error) throw error;
          await this._logActivity({
              stockId: id,
              stockName: data.name,
              actionType: 'REJECT',
              performedBy: admin.id,
              performedByName: admin.name,
              performedByRole: admin.role,
              message: `Rejected: ${comment}`,
              price: data.unit_price,
              quantity: data.quantity,
              imageUrl: data.image_url,
          });
          return true;
      } catch (err) {
          console.error('Rejection error:', err);
          return false;
      }
  },

  async addStockItem(item: Omit<StockItem, 'id' | 'lastUpdated'>) {
      try {
          const { data, error } = await supabase.from('stock_items').insert([{
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              unit: item.unit,
              category: item.category,
              description: item.description,
              image_url: item.imageUrl,
              status: item.status,
              submitted_by: item.submittedBy,
              submitted_by_name: item.submittedByName,
              farm_id: item.farmId,
              last_updated: new Date().toISOString()
          }]).select().single();
          if (error) throw error;
          await this._logActivity({
              stockId: data.id,
              stockName: item.name,
              actionType: 'CREATE',
              performedBy: item.submittedBy,
              performedByName: item.submittedByName || 'Staff',
              performedByRole: 'staff',
              message: `Initial entry: ${item.quantity} ${item.unit}`,
              price: item.unitPrice,
              quantity: item.quantity,
              imageUrl: item.imageUrl,
          });
          return true;
      } catch (err) {
          console.error('Add stock error:', err);
          throw err;
      }
  },

  async updateStockItem(id: string, item: Partial<StockItem>) {
      try {
          const { error } = await supabase.from('stock_items').update({
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              unit: item.unit,
              category: item.category,
              description: item.description,
              image_url: item.imageUrl,
              status: item.status,
              last_updated: new Date().toISOString()
          }).eq('id', id);
          if (error) throw error;
          return true;
      } catch (err) {
          console.error('Update stock error:', err);
          return false;
      }
  },

  async _logActivity(log: Omit<StockActivityLog, 'id' | 'timestamp'>) {
      try {
          await supabase.from('stock_activity_logs').insert([{
              stock_id: log.stockId,
              action_type: log.actionType,
              performed_by: log.performedBy,
              performed_by_name: log.performedByName,
              performed_by_role: log.performedByRole,
              stock_name: log.stockName,
              message: log.message,
              price: log.price,
              quantity: log.quantity,
              image_url: log.imageUrl,
              farm_id: '1'
          }]);
      } catch (err) {
          console.error('Log error:', err);
      }
  },

  async addMortalityLog(log: Omit<MortalityLog, 'id' | 'createdAt' | 'synced'>): Promise<MortalityLog | null> {
      try {
          const { data, error } = await supabase.from('mortality_logs').insert([{
              farm_id: log.farmId,
              worker_id: log.workerId,
              worker_name: log.workerName,
              date: log.date,
              count: log.count,
              cause: log.cause,
              batch_id: log.batchId,
              notes: log.notes,
              image_url: log.imageUrl
          }]).select().single();
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
              synced: true
          };
      } catch (err) {
          console.error('Mortality log error:', err);
          return null;
      }
  },

  async clearOperationalData(): Promise<{success: boolean; message?: string}> {
      try {
          // Delete operations on existing tables
          const results = await Promise.all([
              supabase.from('retail_sales').delete().not('id', 'is', null),
              supabase.from('expenses').delete().not('id', 'is', null),
              supabase.from('stock_activity_logs').delete().not('id', 'is', null),
              supabase.from('mortality_logs').delete().not('id', 'is', null)
          ]);
          
          const errors = results.map(r => r.error).filter(Boolean);
          if (errors.length > 0) {
              console.error('Delete errors:', errors);
              throw new Error(errors[0]?.message || 'Database error during deletion');
          }
          
          return { success: true };
      } catch (err: any) {
          console.error('Clear operational data error:', err);
          return { success: false, message: err.message };
      }
  },

  async clearAllInventory(): Promise<{success: boolean; message?: string}> {
      try {
          const { error } = await supabase.from('stock_items').delete().not('id', 'is', null);
          if (error) throw new Error(error.message);
          return { success: true };
      } catch (err: any) {
          console.error('Clear inventory error:', err);
          return { success: false, message: err.message };
      }
  }
};

