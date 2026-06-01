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
    // Strip SolidJS reactive proxies before storing in IndexedDB
    const cleanPayload = JSON.parse(JSON.stringify(payload));
    const queueItem = { table, action, payload: cleanPayload, timestamp: Date.now() };
    await localDB.put('syncQueue', queueItem);

    // Save to local DB for instant offline reads (UI format)
    if (action === 'INSERT' || action === 'UPDATE') {
      await localDB.put(table, cleanPayload);
    } else if (action === 'DELETE') {
      await localDB.delete(table, cleanPayload.id);
    }

    // Try to sync to cloud if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  // Process pending mutations via the server-side sync API
  async processQueue() {
    if (this.isSyncing || !navigator.onLine) return;
    this.isSyncing = true;

    try {
      const queue = await localDB.getAll('syncQueue');
      if (!queue || queue.length === 0) return;

      // Sort by timestamp ascending (oldest first)
      queue.sort((a, b) => a.timestamp - b.timestamp);

      // Build mutations array for the batch sync endpoint
      const mutations = queue.map(item => ({
        table: item.table,
        action: item.action,
        payload: item.payload,
      }));

      let results;
      try {
        const response = await api.sync.push(mutations);
        results = response.results;
      } catch (err) {
        if (err instanceof NetworkError) {
          // Network error — stop, will retry when online
          return;
        }

        // Auth error — check for stale session
        if (err.status === 401) {
          console.warn('Authentication expired during sync. Logging out...');
          import('./authStore').then(({ authStore }) => authStore.signOut());
          return;
        }

        throw err;
      }

      // Process results: clear successful items from queue, handle conflicts
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const queueItem = queue[i];

        if (result.status === 'success') {
          await localDB.delete('syncQueue', queueItem.queueId);
          // Update local cache with server-confirmed data
          if (result.data) {
            await localDB.put(result.table, result.data);
          }
        } else if (result.status === 'conflict') {
          await localDB.delete('syncQueue', queueItem.queueId);
          // Server won — update local cache with server version
          if (result.data) {
            await localDB.put(result.table, result.data);
          }
          console.log(`Conflict resolved for ${result.table} ${result.id}: server won`);
        } else if (result.status === 'error') {
          console.error(`Sync error for ${result.table} ${result.action} ${result.id}: ${result.error}`);
          // Remove failed item from queue to prevent blocking
          await localDB.delete('syncQueue', queueItem.queueId);

          // Check for stale session (foreign key violation on user)
          if (result.error?.includes('violates foreign key') || result.error?.includes('Key is not present in table "users"')) {
            console.warn('Session user does not exist in backend database. Logging out...');
            import('./authStore').then(({ authStore }) => authStore.signOut());
            return;
          }
        }
      }

      // Refresh UI stores from local cache after sync
      await this.refreshLocalStores();
    } catch (err) {
      console.error('Queue processing failed:', err);
    } finally {
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
    // Clear syncQueue to wipe out any stale entries
    await localDB.clear('syncQueue');

    // 1. Load from IndexedDB for instant UI
    await this.refreshLocalStores();

    // 2. Fetch fresh data from server API if online
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !navigator.onLine) return;

    try {
      // Single API call returns all user data pre-mapped to UI format
      const { tasks, lists, events, calendars } = await api.sync.hydrate();

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
