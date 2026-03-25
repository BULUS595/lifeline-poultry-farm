// IndexedDB Database Layer for Life-Line Poultry Solutions
import { openDB, type IDBPDatabase } from 'idb';

// Simplified database schema
let db: IDBPDatabase | null = null;

export const initDB = async (): Promise<IDBPDatabase> => {
  if (db) return db;

  db = await openDB('LifeLinePoultry', 1, {
    upgrade(db) {
      // Users table
      if (!db.objectStoreNames.contains('users')) {
        const userStore = db.createObjectStore('users', { keyPath: 'id' });
        userStore.createIndex('by-email', 'email', { unique: true });
        userStore.createIndex('by-role', 'role');
      }

      // Farms table
      if (!db.objectStoreNames.contains('farms')) {
        const farmStore = db.createObjectStore('farms', { keyPath: 'id' });
        farmStore.createIndex('by-managedBy', 'managedBy');
      }

      // Mortality logs
      if (!db.objectStoreNames.contains('mortality_logs')) {
        const mortalityStore = db.createObjectStore('mortality_logs', { keyPath: 'id' });
        mortalityStore.createIndex('by-farmId', 'farmId');
        mortalityStore.createIndex('by-date', 'date');
        mortalityStore.createIndex('by-synced', 'synced');
      }

      // Feeding logs
      if (!db.objectStoreNames.contains('feeding_logs')) {
        const feedingStore = db.createObjectStore('feeding_logs', { keyPath: 'id' });
        feedingStore.createIndex('by-farmId', 'farmId');
        feedingStore.createIndex('by-date', 'date');
        feedingStore.createIndex('by-synced', 'synced');
      }

      // Medicine schedules
      if (!db.objectStoreNames.contains('medicine_schedules')) {
        const medicineStore = db.createObjectStore('medicine_schedules', { keyPath: 'id' });
        medicineStore.createIndex('by-farmId', 'farmId');
        medicineStore.createIndex('by-date', 'scheduledDate');
      }

      // Medicine completions
      if (!db.objectStoreNames.contains('medicine_completions')) {
        const medicineCompStore = db.createObjectStore('medicine_completions', { keyPath: 'id' });
        medicineCompStore.createIndex('by-farmId', 'farmId');
        medicineCompStore.createIndex('by-synced', 'synced');
      }

      // Expenses
      if (!db.objectStoreNames.contains('expenses')) {
        const expenseStore = db.createObjectStore('expenses', { keyPath: 'id' });
        expenseStore.createIndex('by-farmId', 'farmId');
        expenseStore.createIndex('by-date', 'date');
      }

      // Sales
      if (!db.objectStoreNames.contains('sales')) {
        const saleStore = db.createObjectStore('sales', { keyPath: 'id' });
        saleStore.createIndex('by-farmId', 'farmId');
        saleStore.createIndex('by-date', 'date');
      }

      // Activity logs
      if (!db.objectStoreNames.contains('activity_logs')) {
        const activityStore = db.createObjectStore('activity_logs', { keyPath: 'id' });
        activityStore.createIndex('by-userId', 'userId');
        activityStore.createIndex('by-farmId', 'farmId');
        activityStore.createIndex('by-timestamp', 'timestamp');
      }

      // Tasks
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('by-farmId', 'farmId');
        taskStore.createIndex('by-status', 'status');
      }

      // Sync queue for offline changes
      if (!db.objectStoreNames.contains('sync_queue')) {
        const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        syncStore.createIndex('by-synced', 'synced');
        syncStore.createIndex('by-timestamp', 'timestamp');
      }
    }
  });

  return db;
};

export const getDB = async (): Promise<IDBPDatabase> => {
  if (!db) {
    return initDB();
  }
  return db;
};

export const closeDB = async (): Promise<void> => {
  if (db) {
    db.close();
    db = null;
  }
};

// Generic database operations
export const addRecord = async <T>(
  storeName: string,
  data: T
): Promise<unknown> => {
  const database = await getDB();
  return database.add(storeName, data);
};

export const updateRecord = async <T>(
  storeName: string,
  data: T
): Promise<unknown> => {
  const database = await getDB();
  return database.put(storeName, data);
};

export const deleteRecord = async (
  storeName: string,
  key: string | number
): Promise<void> => {
  const database = await getDB();
  return database.delete(storeName, key);
};

export const getRecord = async <T>(
  storeName: string,
  key: string | number
): Promise<T | undefined> => {
  const database = await getDB();
  return database.get(storeName, key);
};

export const getAllRecords = async <T>(
  storeName: string
): Promise<T[]> => {
  const database = await getDB();
  return database.getAll(storeName);
};

export const getRecordsByIndex = async <T>(
  storeName: string,
  indexName: string,
  value: IDBValidKey | IDBKeyRange
): Promise<T[]> => {
  const database = await getDB();
  const tx = database.transaction(storeName);
  const index = tx.objectStore(storeName).index(indexName);
  return index.getAll(value);
};

export const clearStore = async (
  storeName: string
): Promise<void> => {
  const database = await getDB();
  return database.clear(storeName);
};

export const getUnsyncedRecords = async <T extends { synced?: boolean }>(
  storeName: string
): Promise<T[]> => {
  // TODO: Query unsynced records from database
  // For now, return empty array - logic to be implemented
  if (storeName !== 'sync_queue') {
    return [];
  }
  const database = await getDB();
  const tx = database.transaction(storeName);
  const allRecords = await tx.objectStore(storeName).getAll();
  // Filter records where synced === false/0
  return allRecords.filter((record: T) => !record.synced);
};
