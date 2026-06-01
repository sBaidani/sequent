import { supabase } from '../lib/supabase';
import { localDB } from '../lib/db';
import { taskStore } from './taskStore';
import { eventStore } from './eventStore';

// Data Mapper Utilities for Store <-> Database conversions
export function mapToDbFormat(table, item, userId) {
  const dbItem = { ...item };
  if (userId) {
    dbItem.user_id = userId;
  }
  
  if (table === 'tasks') {
    dbItem.list_id = item.listId || null;
    delete dbItem.listId;
    
    dbItem.status = item.completed ? 'completed' : 'pending';
    delete dbItem.completed;
    
    dbItem.due_date = item.scheduled_date ? item.scheduled_date.split('T')[0] : null;
    delete dbItem.scheduled_date;
  } else if (table === 'events') {
    dbItem.calendar_id = item.calendarId || null;
    delete dbItem.calendarId;
  } else if (table === 'calendars') {
    dbItem.provider = item.provider || 'local';
  }
  
  return dbItem;
}

export function mapFromDbFormat(table, dbItem) {
  if (!dbItem) return null;
  const item = { ...dbItem };
  
  if (table === 'tasks') {
    item.listId = dbItem.list_id || null;
    delete item.list_id;
    
    item.completed = dbItem.status === 'completed';
    delete item.status;
    
    item.scheduled_date = dbItem.due_date ? new Date(dbItem.due_date).toISOString() : null;
    delete item.due_date;
  } else if (table === 'events') {
    item.calendarId = dbItem.calendar_id || null;
    delete item.calendar_id;
  }
  
  return item;
}

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
    
    // Also save to local DB directly for instant offline reads (in UI format)
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
    
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      console.warn(`Sync skipped for ${table} ${action} because user is not authenticated`);
      return;
    }
    
    // Convert to DB format
    const dbPayload = mapToDbFormat(table, payload, userId);
    
    // Conflict resolution: Last-Write-Wins based on updated_at
    if (action === 'UPDATE') {
      const { data: serverRecord } = await supabase
        .from(table)
        .select('updated_at')
        .eq('id', dbPayload.id)
        .single();
        
      if (serverRecord && new Date(serverRecord.updated_at) > new Date(dbPayload.updated_at)) {
        console.log(`Conflict detected for ${table} ${dbPayload.id}, server won`);
        return; // Server is newer, drop local update
      }
    }

    if (action === 'INSERT') {
      const { error } = await supabase.from(table).insert(dbPayload);
      if (error) throw error;
    } else if (action === 'UPDATE') {
      const { error } = await supabase.from(table).update(dbPayload).eq('id', dbPayload.id);
      if (error) throw error;
    } else if (action === 'DELETE') {
      const { error } = await supabase.from(table).delete().eq('id', dbPayload.id);
      if (error) throw error;
    }
  }

  async refreshLocalStores() {
    const [localTasks, localEvents, localLists, localCals] = await Promise.all([
      localDB.getAll('tasks'),
      localDB.getAll('events'),
      localDB.getAll('lists'),
      localDB.getAll('calendars')
    ]);
    taskStore.setTasks(localTasks || []);
    taskStore.setLists(localLists || []);
    eventStore.setEvents(localEvents || []);
    eventStore.setCalendars(localCals || []);
  }

  async hydrate() {
    // Clear syncQueue to wipe out any bad IDs from before the UUID fix
    await localDB.clear('syncQueue');

    // 1. Load from IndexedDB for instant UI
    await this.refreshLocalStores();

    // 2. Fetch fresh data from Supabase if online
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !navigator.onLine) return;

    try {
      const [tasksRes, eventsRes, listsRes, calsRes] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('events').select('*'),
        supabase.from('lists').select('*'),
        supabase.from('calendars').select('*')
      ]);

      if (tasksRes.data) {
        await localDB.clear('tasks');
        const mappedTasks = tasksRes.data.map(t => mapFromDbFormat('tasks', t));
        for (const t of mappedTasks) await localDB.put('tasks', t);
      }
      if (eventsRes.data) {
        await localDB.clear('events');
        const mappedEvents = eventsRes.data.map(e => mapFromDbFormat('events', e));
        for (const e of mappedEvents) await localDB.put('events', e);
      }
      if (listsRes.data) {
        await localDB.clear('lists');
        const mappedLists = listsRes.data.map(l => mapFromDbFormat('lists', l));
        for (const l of mappedLists) await localDB.put('lists', l);
      }
      if (calsRes.data) {
        await localDB.clear('calendars');
        const mappedCals = calsRes.data.map(c => mapFromDbFormat('calendars', c));
        for (const c of mappedCals) await localDB.put('calendars', c);
      }
      
      // Update UI stores with clean mapped local DB data
      await this.refreshLocalStores();
      
      // Ensure defaults if missing
      if (taskStore.state.lists.length === 0) {
        await taskStore.addList('My Tasks', '#6B5BDB');
      }
      if (eventStore.state.calendars.length === 0) {
        await eventStore.addCalendar('Personal', '#E8942A');
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
          const uiItem = mapFromDbFormat(payload.table, payload.new);
          if (uiItem) {
            await localDB.put(payload.table, uiItem);
          }
        } else if (payload.eventType === 'DELETE') {
          if (payload.old?.id) {
            await localDB.delete(payload.table, payload.old.id);
          }
        }
        
        // Update stores in-memory
        await this.refreshLocalStores();
      })
      .subscribe();
  }
}

export const syncEngine = new SyncEngine();
