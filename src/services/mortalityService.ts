import { supabase } from './supabaseService';
import type { MortalityRecord } from '../types';

export const mortalityService = {
  async getRecords(farmId: string): Promise<MortalityRecord[]> {
    try {
      const { data, error } = await supabase
        .from('mortality_records')
        .select('*')
        .eq('farm_id', farmId)
        .order('date', { ascending: false });

      if (error) {
        // Fallback to mortality_logs if mortality_records doesn't exist
        const fb = await supabase.from('mortality_logs').select('*').eq('farm_id', farmId).order('date', { ascending: false });
        if (fb.error) throw fb.error;
        return (fb.data || []).map(d => this._mapFromLog(d));
      }
      return (data || []).map(d => this._mapFromRecord(d));
    } catch (err) {
      console.error('Fetch mortality error:', err);
      return [];
    }
  },

  async createRecord(record: Omit<MortalityRecord, 'id' | 'createdAt' | 'status'>) {
    try {
      const payload = {
        farm_id: record.farmId,
        date: record.date,
        batch: record.batch,
        death_count: record.deathCount,
        cause: record.cause,
        recorded_by: record.recordedBy,
        recorded_by_name: record.recordedByName,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase.from('mortality_records').insert([payload]).select().single();
      if (error) {
          // Fallback to mortality_logs
          const fb = await supabase.from('mortality_logs').insert([{
              farm_id: record.farmId,
              date: record.date,
              batch_id: record.batch,
              count: record.deathCount,
              cause: record.cause,
              worker_id: record.recordedBy,
              worker_name: record.recordedByName,
              status: 'pending' // Note: original schema might not have status, but we try
          }]).select().single();
          if (fb.error) throw fb.error;
          return this._mapFromLog(fb.data);
      }
      return this._mapFromRecord(data);
    } catch (err) {
      console.error('Create record error:', err);
      throw err;
    }
  },

  async updateRecord(id: string, updates: Partial<MortalityRecord>) {
    try {
      const dbUpdates: any = {};
      if (updates.date) dbUpdates.date = updates.date;
      if (updates.batch) dbUpdates.batch = updates.batch;
      if (updates.deathCount !== undefined) dbUpdates.death_count = updates.deathCount;
      if (updates.cause !== undefined) dbUpdates.cause = updates.cause;
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;

      const { data, error } = await supabase.from('mortality_records').update(dbUpdates).eq('id', id).select().single();
      if (error) {
          // Fallback to mortality_logs
          const fb = await supabase.from('mortality_logs').update({
              date: updates.date,
              batch_id: updates.batch,
              count: updates.deathCount,
              cause: updates.cause
          }).eq('id', id).select().single();
          if (fb.error) throw fb.error;
          return this._mapFromLog(fb.data);
      }
      return this._mapFromRecord(data);
    } catch (err) {
      console.error('Update record error:', err);
      throw err;
    }
  },

  _mapFromRecord(d: any): MortalityRecord {
    return {
      id: d.id,
      date: d.date,
      batch: d.batch,
      deathCount: d.death_count,
      cause: d.cause || '',
      recordedBy: d.recorded_by,
      recordedByName: d.recorded_by_name,
      status: d.status || 'pending',
      rejectionReason: d.rejection_reason,
      createdAt: d.created_at,
      farmId: d.farm_id,
    };
  },

  _mapFromLog(d: any): MortalityRecord {
    return {
      id: d.id,
      date: d.date,
      batch: d.batch_id || d.batch || 'DEFAULT-NODE',
      deathCount: d.count || d.death_count || 0,
      cause: d.cause || d.notes || '',
      recordedBy: d.worker_id || d.recorded_by,
      recordedByName: d.worker_name || d.recorded_by_name,
      status: d.status || 'pending',
      createdAt: d.created_at,
      farmId: d.farm_id,
    };
  }
};
