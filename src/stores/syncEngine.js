import { supabase } from '../lib/supabase';
import { localDB } from '../lib/db';
import { taskStore } from './taskStore';
import { eventStore } from './eventStore';

class SyncEngine {
  constructor() {
    this.isSyncing = false;
    
    // Listen for network reconnect
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.processQueue());
    }
  }

  // Add mutation to local indexedDB queue
  async enqueue(table, action, payload) {
    const queueItem = { table, action, payload, timestamp: Date.now() };
    await localDB.put('syncQueue', queueItem);
    
    // Also save to local DB directly for instant offline reads
    if (action === 'INSERT' || action === 'UPDATE') {
      await localDB.put(table, payload);
    } else if (action === 'DELETE') {
      await localDB.delete(table, payload.id);
    }

    // Try to sync to cloud if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  // Process pending mutations from IndexedDB
  async processQueue() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      const queue = await localDB.getAll('syncQueue');
      // Sort queue by timestamp ascending (oldest first)
      queue.sort((a, b) => a.timestamp - b.timestamp);

      for (const item of queue) {
        await this._processItem(item);
        await localDB.delete('syncQueue', item.queueId);
      }
    } catch (err) {
      console.error('Background sync failed:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  async _processItem(item) {
    const { table, action, payload } = item;
    
    // Conflict resolution: Last-Write-Wins based on updated_at
    if (action === 'UPDATE') {
      const { data: serverRecord } = await supabase
        .from(table)
        .select('updated_at')
        .eq('id', payload.id)
        .single();
        
      if (serverRecord && new Date(serverRecord.updated_at) > new Date(payload.updated_at)) {
        console.log(`Conflict detected for ${table} ${payload.id}, server won`);
        return; // Server is newer, drop local update
      }
    }

    if (action === 'INSERT') {
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
    } else if (action === 'UPDATE') {
      const { error } = await supabase.from(table).update(payload).eq('id', payload.id);
      if (error) throw error;
    } else if (action === 'DELETE') {
      const { error } = await supabase.from(table).delete().eq('id', payload.id);
      if (error) throw error;
    }
  }

  // Initial pull from server or local DB
  async hydrate() {
    // 1. Load from IndexedDB for instant UI
    const [localTasks, localEvents] = await Promise.all([
      localDB.getAll('tasks'),
      localDB.getAll('events')
    ]);
    
    // Hydrate stores immediately from local data
    taskStore.setTasks(localTasks || []);
    eventStore.setEvents(localEvents || []);

    // 2. Fetch fresh data from Supabase if online
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !navigator.onLine) return;

    try {
      const [tasksRes, eventsRes] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('events').select('*')
      ]);

      if (tasksRes.data) {
        // Save fresh data to localDB and update stores
        for (const t of tasksRes.data) await localDB.put('tasks', t);
      }
      if (eventsRes.data) {
        for (const e of eventsRes.data) await localDB.put('events', e);
      }
      
      console.log('Hydrated from Supabase & updated local cache');
    } catch (err) {
      console.error('Hydration error:', err);
    }
  }

  subscribe() {
    this.subscription = supabase
      .channel('public-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, async payload => {
        console.log('Realtime change received!', payload);
        // Save incoming server data directly to localDB to keep cache warm
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          await localDB.put(payload.table, payload.new);
        } else if (payload.eventType === 'DELETE') {
          await localDB.delete(payload.table, payload.old.id);
        }
        // Then dispatch to UI stores
      })
      .subscribe();
  }
}

export const syncEngine = new SyncEngine();
