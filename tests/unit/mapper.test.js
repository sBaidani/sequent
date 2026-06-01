import { describe, test, expect, vi } from 'vitest';

vi.unmock('../../src/stores/syncEngine');

import { mapToDbFormat, mapFromDbFormat } from '../../src/stores/syncEngine';

describe('Sync Engine Data Mappers', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  describe('Tasks Mapping', () => {
    test('mapToDbFormat converts camelCase task to snake_case and binds user_id', () => {
      const uiTask = {
        id: 'task-1',
        title: 'Complete report',
        listId: 'list-99',
        completed: true,
        priority: 'high',
        scheduled_date: '2026-06-15T10:00:00.000Z',
        created_at: '2026-06-01T12:00:00.000Z',
        updated_at: '2026-06-01T12:00:00.000Z'
      };

      const dbTask = mapToDbFormat('tasks', uiTask, mockUserId);

      expect(dbTask.id).toBe('task-1');
      expect(dbTask.user_id).toBe(mockUserId);
      expect(dbTask.list_id).toBe('list-99');
      expect(dbTask.status).toBe('completed');
      expect(dbTask.due_date).toBe('2026-06-15');
      expect(dbTask.priority).toBe('high');
      expect(dbTask.created_at).toBe('2026-06-01T12:00:00.000Z');
      expect(dbTask.updated_at).toBe('2026-06-01T12:00:00.000Z');

      // Ensure old camelCase keys are removed
      expect(dbTask.listId).toBeUndefined();
      expect(dbTask.completed).toBeUndefined();
      expect(dbTask.scheduled_date).toBeUndefined();
    });

    test('mapToDbFormat handles task without scheduled date or listId', () => {
      const uiTask = {
        id: 'task-2',
        title: 'Clean room',
        completed: false,
      };

      const dbTask = mapToDbFormat('tasks', uiTask, mockUserId);
      expect(dbTask.status).toBe('pending');
      expect(dbTask.due_date).toBeNull();
      expect(dbTask.list_id).toBeNull();
    });

    test('mapFromDbFormat converts database task fields back to UI camelCase', () => {
      const dbTask = {
        id: 'task-1',
        user_id: mockUserId,
        list_id: 'list-99',
        title: 'Complete report',
        status: 'completed',
        due_date: '2026-06-15',
        priority: 'high',
        created_at: '2026-06-01T12:00:00.000Z',
        updated_at: '2026-06-01T12:00:00.000Z'
      };

      const uiTask = mapFromDbFormat('tasks', dbTask);

      expect(uiTask.id).toBe('task-1');
      expect(uiTask.listId).toBe('list-99');
      expect(uiTask.completed).toBe(true);
      expect(new Date(uiTask.scheduled_date).getDate()).toBe(15);
      expect(uiTask.priority).toBe('high');

      // Ensure database keys are cleaned up
      expect(uiTask.list_id).toBeUndefined();
      expect(uiTask.status).toBeUndefined();
      expect(uiTask.due_date).toBeUndefined();
    });
  });

  describe('Events Mapping', () => {
    test('mapToDbFormat maps calendarId and binds user_id', () => {
      const uiEvent = {
        id: 'event-1',
        title: 'Doctor appointment',
        start_time: '2026-06-10T09:00:00.000Z',
        end_time: '2026-06-10T10:00:00.000Z',
        calendarId: 'cal-abc'
      };

      const dbEvent = mapToDbFormat('events', uiEvent, mockUserId);

      expect(dbEvent.user_id).toBe(mockUserId);
      expect(dbEvent.calendar_id).toBe('cal-abc');
      expect(dbEvent.calendarId).toBeUndefined();
    });

    test('mapFromDbFormat maps calendar_id to calendarId', () => {
      const dbEvent = {
        id: 'event-1',
        calendar_id: 'cal-abc',
        title: 'Doctor appointment'
      };

      const uiEvent = mapFromDbFormat('events', dbEvent);

      expect(uiEvent.calendarId).toBe('cal-abc');
      expect(uiEvent.calendar_id).toBeUndefined();
    });
  });

  describe('Calendars Mapping', () => {
    test('mapToDbFormat defaults provider and binds user_id', () => {
      const uiCal = {
        id: 'cal-abc',
        name: 'Personal',
        color: '#E8942A'
      };

      const dbCal = mapToDbFormat('calendars', uiCal, mockUserId);

      expect(dbCal.user_id).toBe(mockUserId);
      expect(dbCal.provider).toBe('local');
    });
  });
});
