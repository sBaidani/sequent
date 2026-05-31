import { openDB } from 'idb';

const DB_NAME = 'sequent_db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('lists')) {
        db.createObjectStore('lists', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('calendars')) {
        db.createObjectStore('calendars', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'queueId', autoIncrement: true });
      }
    },
  });
};

export const localDB = {
  async getAll(storeName) {
    const db = await initDB();
    return db.getAll(storeName);
  },
  
  async get(storeName, id) {
    const db = await initDB();
    return db.get(storeName, id);
  },
  
  async put(storeName, item) {
    const db = await initDB();
    return db.put(storeName, item);
  },
  
  async delete(storeName, id) {
    const db = await initDB();
    return db.delete(storeName, id);
  },
  
  async clear(storeName) {
    const db = await initDB();
    return db.clear(storeName);
  }
};
