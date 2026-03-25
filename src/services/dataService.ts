// Data Service - Handles CRUD operations with offline support
import {
  type MortalityLog,
  type FeedingLog,
  type MedicineSchedule,
  type MedicineCompletion,
  type Expense,
  type Sale
} from '../types';
import {
  addRecord,
  updateRecord,
  deleteRecord,
  getRecord,
  getRecordsByIndex,
  getUnsyncedRecords
} from '../db';

const API_BASE = 'http://localhost:3000/api';

// Generate unique ID
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const dataService = {
  // Mortality Logs
  async addMortalityLog(
    farmId: string,
    workerId: string,
    data: Omit<MortalityLog, 'id' | 'createdAt' | 'synced'>
  ): Promise<MortalityLog> {
    const mortalityLog: MortalityLog = {
      ...data,
      id: generateId(),
      farmId,
      workerId,
      createdAt: new Date().toISOString(),
      synced: false
    };

    try {
      // Try to sync to server
      const response = await fetch(`${API_BASE}/mortality-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(mortalityLog)
      });

      if (response.ok) {
        const syncedData = await response.json();
        mortalityLog.synced = true;
        mortalityLog.id = syncedData.id;
      }
    } catch (error) {
      console.warn('Could not sync mortality log to server:', error);
      // Will sync later when online
    }

    // Always save to local DB
    await addRecord('mortality_logs', mortalityLog);

    // Add to sync queue if not synced
    if (!mortalityLog.synced) {
      await this.addToSyncQueue('mortality_logs', 'create', mortalityLog, farmId, workerId);
    }

    return mortalityLog;
  },

  async getMortalityLogs(farmId: string): Promise<MortalityLog[]> {
    return getRecordsByIndex('mortality_logs', 'by-farmId', farmId);
  },

  async updateMortalityLog(id: string, updates: Partial<MortalityLog>): Promise<void> {
    const existing = await getRecord<MortalityLog>('mortality_logs', id);
    if (!existing) {
      throw new Error(`Mortality log ${id} not found`);
    }
    const updated = { ...existing, ...updates, synced: false };
    await updateRecord('mortality_logs', updated);

    try {
      await fetch(`${API_BASE}/mortality-logs/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(updated)
      });
      updated.synced = true;
      await updateRecord('mortality_logs', updated);
    } catch (error) {
      console.warn('Could not sync update:', error);
    }
  },

  async deleteMortalityLog(id: string, farmId: string, workerId: string): Promise<void> {
    await deleteRecord('mortality_logs', id);
    await this.addToSyncQueue('mortality_logs', 'delete', { id }, farmId, workerId);

    try {
      await fetch(`${API_BASE}/mortality-logs/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
    } catch (error) {
      console.warn('Could not sync deletion:', error);
    }
  },

  // Feeding Logs
  async addFeedingLog(
    farmId: string,
    workerId: string,
    data: Omit<FeedingLog, 'id' | 'createdAt' | 'synced'>
  ): Promise<FeedingLog> {
    const feedingLog: FeedingLog = {
      ...data,
      id: generateId(),
      farmId,
      workerId,
      createdAt: new Date().toISOString(),
      synced: false
    };

    try {
      const response = await fetch(`${API_BASE}/feeding-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(feedingLog)
      });

      if (response.ok) {
        const syncedData = await response.json();
        feedingLog.synced = true;
        feedingLog.id = syncedData.id;
      }
    } catch (error) {
      console.warn('Could not sync feeding log:', error);
    }

    await addRecord('feeding_logs', feedingLog);

    if (!feedingLog.synced) {
      await this.addToSyncQueue('feeding_logs', 'create', feedingLog, farmId, workerId);
    }

    return feedingLog;
  },

  async getFeedingLogs(farmId: string): Promise<FeedingLog[]> {
    return getRecordsByIndex('feeding_logs', 'by-farmId', farmId);
  },

  // Medicine Schedules
  async addMedicineSchedule(
    _farmId: string,
    adminId: string,
    data: Omit<MedicineSchedule, 'id' | 'createdAt' | 'createdBy'>
  ): Promise<MedicineSchedule> {
    const schedule: MedicineSchedule = {
      ...data,
      id: generateId(),
      createdBy: adminId,
      createdAt: new Date()
    };

    try {
      const response = await fetch(`${API_BASE}/medicine-schedules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(schedule)
      });

      if (response.ok) {
        const syncedData = await response.json();
        schedule.id = syncedData.id;
      }
    } catch (error) {
      console.warn('Could not sync medicine schedule:', error);
    }

    await addRecord('medicine_schedules', schedule);
    return schedule;
  },

  async getMedicineSchedules(farmId: string): Promise<MedicineSchedule[]> {
    return getRecordsByIndex('medicine_schedules', 'by-farmId', farmId);
  },

  // Medicine Completions
  async markMedicineComplete(
    scheduleId: string,
    farmId: string,
    workerId: string,
    notes?: string
  ): Promise<MedicineCompletion> {
    const completion: MedicineCompletion = {
      id: generateId(),
      scheduleId,
      workerId,
      farmId,
      completedAt: new Date(),
      notes,
      synced: false
    };

    try {
      const response = await fetch(`${API_BASE}/medicine-completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(completion)
      });

      if (response.ok) {
        const syncedData = await response.json();
        completion.synced = true;
        completion.id = syncedData.id;
      }
    } catch (error) {
      console.warn('Could not sync medicine completion:', error);
    }

    await addRecord('medicine_completions', completion);

    if (!completion.synced) {
      await this.addToSyncQueue('medicine_completions', 'create', completion, farmId, workerId);
    }

    return completion;
  },

  // Expenses
  async addExpense(
    _farmId: string,
    adminId: string,
    data: Omit<Expense, 'id' | 'recordedBy'>
  ): Promise<Expense> {
    const expense: Expense = {
      ...data,
      id: generateId(),
      recordedBy: adminId,
    };

    try {
      const response = await fetch(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(expense)
      });

      if (response.ok) {
        const syncedData = await response.json();
        expense.id = syncedData.id;
      }
    } catch (error) {
      console.warn('Could not sync expense:', error);
    }

    await addRecord('expenses', expense);
    return expense;
  },

  async getExpenses(farmId: string): Promise<Expense[]> {
    return getRecordsByIndex('expenses', 'by-farmId', farmId);
  },

  // Sales
  async addSale(
    _farmId: string,
    _userId: string,
    data: Omit<Sale, 'id' | 'createdAt'>
  ): Promise<Sale> {
    const sale: Sale = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch(`${API_BASE}/sales`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(sale)
      });

      if (response.ok) {
        const syncedData = await response.json();
        sale.id = syncedData.id;
      }
    } catch (error) {
      console.warn('Could not sync sale:', error);
    }

    await addRecord('sales', sale);
    return sale;
  },

  async getSales(farmId: string): Promise<Sale[]> {
    return getRecordsByIndex('sales', 'by-farmId', farmId);
  },

  // Sync Queue Operations
  async addToSyncQueue<T>(
    dataType: string,
    action: 'create' | 'update' | 'delete',
    data: T,
    farmId: string,
    userId: string
  ): Promise<void> {
    const syncItem = {
      id: generateId(),
      dataType,
      action,
      data,
      timestamp: new Date(),
      farmId,
      userId,
      synced: false
    };

    await addRecord('sync_queue', syncItem);
  },

  // Get all unsynced records
  async getUnsyncedItems(): Promise<Array<{
    id: string;
    dataType: string;
    action: 'create' | 'update' | 'delete';
    data: unknown;
    timestamp: Date;
    farmId: string;
    userId: string;
    synced: boolean;
  }>> {
    return getUnsyncedRecords('sync_queue');
  },

  // Sync queued items to server
  async syncPendingData(): Promise<{ synced: number; failed: number }> {
    const pendingItems = await this.getUnsyncedItems();
    let synced = 0;
    let failed = 0;

    for (const item of pendingItems) {
      try {
        const endpoint = `/api/${item.dataType}`;
        const response = await fetch(endpoint, {
          method: item.action === 'delete' ? 'DELETE' : item.action === 'create' ? 'POST' : 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(item.data)
        });

        if (response.ok) {
          item.synced = true;
          await updateRecord('sync_queue', item);
          synced++;
        } else {
          console.warn(`Sync failed for ${item.dataType}:`, response.statusText);
          failed++;
        }
      } catch (error) {
        console.error('Sync error:', error);
        failed++;
      }
    }

    return { synced, failed };
  }
};
