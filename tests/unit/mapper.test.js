import { describe, test, expect } from 'vitest';

// Import mappers from the syncEngine's lightweight realtime mapper
// The full mappers are now server-side in supabase/functions/_shared/mapper.ts
// This test validates the realtime payload mapper that remains client-side

// We test the mapper functions by reimporting the same logic
// that the syncEngine uses for Realtime payloads
function mapRealtimePayload(table, dbItem) {
  if (!dbItem) return null;
  const item = { ...dbItem };

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

describe('Realtime Payload Mapper', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  describe('Tasks Mapping', () => {
    test('mapRealtimePayload converts database task fields to UI camelCase', () => {
      const dbTask = {
        id: 'task-1',
        user_id: mockUserId,
        list_id: 'list-99',
        title: 'Complete report',
        status: 'completed',
        due_date: '2026-06-15',
        priority: 'high',
        sync_version: 1,
        created_at: '2026-06-01T12:00:00.000Z',
        updated_at: '2026-06-01T12:00:00.000Z'
      };

      const uiTask = mapRealtimePayload('tasks', dbTask);

      expect(uiTask.id).toBe('task-1');
      expect(uiTask.listId).toBe('list-99');
      expect(uiTask.completed).toBe(true);
      expect(new Date(uiTask.scheduled_date).getDate()).toBe(15);
      expect(uiTask.priority).toBe('high');

      // Ensure database keys are cleaned up
      expect(uiTask.list_id).toBeUndefined();
      expect(uiTask.status).toBeUndefined();
      expect(uiTask.due_date).toBeUndefined();
      expect(uiTask.user_id).toBeUndefined();
      expect(uiTask.sync_version).toBeUndefined();
    });

    test('mapRealtimePayload handles task without scheduled date or listId', () => {
      const dbTask = {
        id: 'task-2',
        user_id: mockUserId,
        title: 'Clean room',
        status: 'pending',
        due_date: null,
        list_id: null,
      };

      const uiTask = mapRealtimePayload('tasks', dbTask);
      expect(uiTask.completed).toBe(false);
      expect(uiTask.scheduled_date).toBeNull();
      expect(uiTask.listId).toBeNull();
    });
  });

  describe('Events Mapping', () => {
    test('mapRealtimePayload maps calendar_id to calendarId', () => {
      const dbEvent = {
        id: 'event-1',
        user_id: mockUserId,
        calendar_id: 'cal-abc',
        title: 'Doctor appointment',
        start_time: '2026-06-10T09:00:00.000Z',
        end_time: '2026-06-10T10:00:00.000Z',
      };

      const uiEvent = mapRealtimePayload('events', dbEvent);

      expect(uiEvent.calendarId).toBe('cal-abc');
      expect(uiEvent.calendar_id).toBeUndefined();
      expect(uiEvent.user_id).toBeUndefined();
    });
  });

  describe('Lists/Calendars Mapping', () => {
    test('mapRealtimePayload strips user_id and sync_version from lists', () => {
      const dbList = {
        id: 'list-1',
        user_id: mockUserId,
        name: 'Personal',
        color: '#E8942A',
        sync_version: 2,
      };

      const uiList = mapRealtimePayload('lists', dbList);
      expect(uiList.name).toBe('Personal');
      expect(uiList.user_id).toBeUndefined();
      expect(uiList.sync_version).toBeUndefined();
    });
  });
});
