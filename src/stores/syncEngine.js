import { supabase } from '../lib/supabase';
import { api, NetworkError } from '../lib/api';
import { localDB } from '../lib/db';
import { taskStore } from './taskStore';
import { eventStore } from './eventStore';

/**
 * Lightweight mapper for Supabase Realtime payloads (DB format → UI format).
 * Realtime delivers raw DB column names, so we need a thin client-side transform.
 */
function mapRealtimePayload(table, dbItem) {
  if (!dbItem) return null;
  const item = { ...dbItem };

  // Remove server-internal fields
  delete item.user_id;
  delete item.sync_version;

  if (table === 'tasks') {
    item.listId = dbItem.list_id ?? null;
    delete item.list_id;
    item.completed = dbItem.status === 'completed';
    delete item.status;
    item.scheduled_date = dbItem.due_date ? new Date(dbItem.due_date).toISOString() : null;
    delete item.due_date;
  } else if (table === 'events') {
    item.calendarId = dbItem.calendar_id ?? null;
    delete item.calendar_id;
    if (dbItem.is_all_day !== undefined) {
      item.allDay = dbItem.is_all_day;
      delete item.is_all_day;
    }
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

  // Add mutation to local IndexedDB queue + optimistic local cache
  async enqueue(table, action, payload) {
    console.log(`[SyncEngine] Enqueue called for ${table} ${action}`, payload);
    // Strip SolidJS reactive proxies before storing in IndexedDB
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    const queueItem = { table, action, payload: cleanPayload, timestamp: Date.now() };
    console.log(`[SyncEngine] Putting in syncQueue...`);
    await localDB.put('syncQueue', queueItem);
    console.log(`[SyncEngine] syncQueue put successful.`);

    // Save to local DB for instant offline reads (UI format)
    if (action === 'INSERT' || action === 'UPDATE') {
      await localDB.put(table, cleanPayload);
    } else if (action === 'DELETE') {
      await localDB.delete(table, cleanPayload.id);
    }

    // Try to sync to cloud if online
    console.log(`[SyncEngine] navigator.onLine is ${navigator.onLine}`);
    if (navigator.onLine) {
      console.log(`[SyncEngine] Calling processQueue from enqueue...`);
      this.processQueue();
    }
  }

  // Process pending mutations via individual server-side REST APIs
  async processQueue() {
    console.log(`[SyncEngine] processQueue started. isSyncing: ${this.isSyncing}, onLine: ${navigator.onLine}`);
    if (this.isSyncing || !navigator.onLine) {
      console.log(`[SyncEngine] Exiting early. isSyncing=${this.isSyncing}, onLine=${navigator.onLine}`);
      return;
    }
    this.isSyncing = true;

    try {
      const queue = await localDB.getAll('syncQueue');
      console.log(`[SyncEngine] Retrieved queue length: ${queue?.length}`);
      if (!queue || queue.length === 0) {
        console.log(`[SyncEngine] Queue is empty, returning.`);
        return;
      }

      // Sort by timestamp ascending (oldest first)
      queue.sort((a, b) => a.timestamp - b.timestamp);

      for (const queueItem of queue) {
        const { table, action, payload } = queueItem;
        console.log(`[SyncEngine] Processing queueItem:`, queueItem);
        try {
          let resultData;
          console.log(`[SyncEngine] Calling api[${table}].${action.toLowerCase()}`);
          if (action === 'INSERT') {
            resultData = await api[table].create(payload);
          } else if (action === 'UPDATE') {
            resultData = await api[table].update(payload);
          } else if (action === 'DELETE') {
            resultData = await api[table].delete(payload.id);
          }
          console.log(`[SyncEngine] API call succeeded! resultData:`, resultData);

          await localDB.delete('syncQueue', queueItem.queueId);
          console.log(`[SyncEngine] Removed from syncQueue: ${queueItem.queueId}`);
          
          if (resultData && action !== 'DELETE') {
            if (resultData._conflict === 'server_won') {
              console.log(`Conflict resolved for ${table} ${payload.id}: server won`);
              delete resultData._conflict;
            }
            await localDB.put(table, resultData);
            console.log(`[SyncEngine] Updated localDB with server data for ${table}`);
          }
        } catch (err) {
          console.error(`[SyncEngine] Error during API call for ${table} ${action}:`, err);
          if (err instanceof NetworkError) {
            console.log(`[SyncEngine] NetworkError detected, returning.`);
            // Network error — stop, will retry when online
            return;
          }
          if (err.status === 401 || err.message?.includes('violates foreign key') || err.message?.includes('Key is not present in table "users"')) {
            console.warn('Authentication expired or invalid user. Logging out...');
            import('./authStore').then(({ authStore }) => authStore.signOut());
            return;
          }
          console.error(`Sync error for ${table} ${action} ${payload.id}:`, err);
          await localDB.delete('syncQueue', queueItem.queueId);
        }
      }

      // Refresh UI stores from local cache after sync
      console.log(`[SyncEngine] Queue processed successfully. Refreshing local stores.`);
      await this.refreshLocalStores();
    } catch (err) {
      console.error('Queue processing failed:', err);
    } finally {
      console.log(`[SyncEngine] finally block executed, setting isSyncing to false`);
      this.isSyncing = false;
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
    // 1. Load from IndexedDB for instant UI
    await this.refreshLocalStores();

    // 2. Fetch fresh data from distinct APIs if online
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !navigator.onLine) return;

    try {
      // Fetch all user data concurrently from distinct endpoints
      const [tasks, lists, events, calendars] = await Promise.all([
        api.tasks.list(),
        api.lists.list(),
        api.events.list(),
        api.calendars.list()
      ]);

      // Replace local cache with server data
      await localDB.clear('tasks');
      for (const t of tasks) await localDB.put('tasks', t);

      await localDB.clear('events');
      for (const e of events) await localDB.put('events', e);

      await localDB.clear('lists');
      for (const l of lists) await localDB.put('lists', l);

      await localDB.clear('calendars');
      for (const c of calendars) await localDB.put('calendars', c);

      // Update UI stores with fresh data
      await this.refreshLocalStores();

      // Ensure defaults if missing (server will auto-create on first task/event,
      // but we want them visible in the UI immediately)
      if (taskStore.state.lists.length === 0) {
        await taskStore.addList('My Tasks', '#6B5BDB');
      }
      if (eventStore.state.calendars.length === 0) {
        await eventStore.addCalendar('Personal', '#E8942A');
      }

      console.log('Hydrated from API & updated local cache');
    } catch (err) {
      console.error('Hydration error:', err);
    }
  }

  subscribe() {
    this.subscription = supabase
      .channel('public-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, async payload => {
        console.log('Realtime change received!', payload);

        // Map Realtime DB-format payload to UI format and update local cache
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const uiItem = mapRealtimePayload(payload.table, payload.new);
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
