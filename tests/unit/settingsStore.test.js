import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock syncEngine before importing stores
vi.mock('../../src/stores/syncEngine', () => ({
  syncEngine: {
    enqueue: vi.fn(),
    hydrate: vi.fn(),
  },
}));

describe('Settings Store', () => {
  let settingsStore;

  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    const mod = await import('../../src/stores/settingsStore');
    settingsStore = mod.settingsStore;
  });

  test('defaults startOfWeek to monday', () => {
    expect(settingsStore.state.startOfWeek).toBe('monday');
  });

  test('defaults defaultDuration to 60', () => {
    expect(settingsStore.state.defaultDuration).toBe(60);
  });

  test('setStartOfWeek updates state and persists to localStorage', () => {
    settingsStore.setStartOfWeek('sunday');
    expect(settingsStore.state.startOfWeek).toBe('sunday');
    expect(localStorage.getItem('sequent_setting_startOfWeek')).toBe('sunday');
  });

  test('setDefaultDuration updates state and persists to localStorage', () => {
    settingsStore.setDefaultDuration(30);
    expect(settingsStore.state.defaultDuration).toBe(30);
    expect(localStorage.getItem('sequent_setting_defaultDuration')).toBe('30');
  });

  test('loads persisted startOfWeek from localStorage', async () => {
    localStorage.setItem('sequent_setting_startOfWeek', 'sunday');
    vi.resetModules();
    const freshMod = await import('../../src/stores/settingsStore');
    expect(freshMod.settingsStore.state.startOfWeek).toBe('sunday');
  });

  test('loads persisted defaultDuration from localStorage', async () => {
    localStorage.setItem('sequent_setting_defaultDuration', '120');
    vi.resetModules();
    const freshMod = await import('../../src/stores/settingsStore');
    expect(freshMod.settingsStore.state.defaultDuration).toBe(120);
  });
});

describe('Settings: Calendar and List CRUD via Stores', () => {
  let eventStore, taskStore, syncEngine;

  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    const syncMod = await import('../../src/stores/syncEngine');
    syncEngine = syncMod.syncEngine;
    vi.clearAllMocks();
    const evMod = await import('../../src/stores/eventStore');
    eventStore = evMod.eventStore;
    const tkMod = await import('../../src/stores/taskStore');
    taskStore = tkMod.taskStore;
  });

  describe('Calendar CRUD', () => {
    test('addCalendar creates a new calendar', () => {
      eventStore.addCalendar('Work', '#FF0000');
      expect(eventStore.state.calendars.length).toBe(1);
      expect(eventStore.state.calendars[0].name).toBe('Work');
      expect(eventStore.state.calendars[0].color).toBe('#FF0000');
    });

    test('addCalendar enqueues sync mutation', () => {
      eventStore.addCalendar('Work', '#FF0000');
      expect(syncEngine.enqueue).toHaveBeenCalledWith(
        'calendars',
        'INSERT',
        expect.objectContaining({ name: 'Work', color: '#FF0000' })
      );
    });

    test('updateCalendar modifies calendar properties', () => {
      eventStore.addCalendar('Work', '#FF0000');
      const calId = eventStore.state.calendars[0].id;
      eventStore.updateCalendar(calId, { name: 'Updated Work' });
      expect(eventStore.state.calendars[0].name).toBe('Updated Work');
    });

    test('deleteCalendar removes it from the store', () => {
      eventStore.addCalendar('Work', '#FF0000');
      const calId = eventStore.state.calendars[0].id;
      eventStore.deleteCalendar(calId);
      expect(eventStore.state.calendars.length).toBe(0);
    });

    test('deleteCalendar also removes associated events', () => {
      eventStore.addCalendar('Work', '#FF0000');
      const calId = eventStore.state.calendars[0].id;
      eventStore.addEvent('Meeting', '2025-06-15T10:00:00Z', '2025-06-15T11:00:00Z', calId);
      expect(eventStore.state.events.length).toBe(1);
      eventStore.deleteCalendar(calId);
      expect(eventStore.state.events.length).toBe(0);
    });
  });

  describe('List CRUD', () => {
    test('addList creates a new list', () => {
      taskStore.addList('Shopping', '#00FF00');
      expect(taskStore.state.lists.length).toBe(1);
      expect(taskStore.state.lists[0].name).toBe('Shopping');
      expect(taskStore.state.lists[0].color).toBe('#00FF00');
    });

    test('addList enqueues sync mutation', () => {
      taskStore.addList('Shopping', '#00FF00');
      expect(syncEngine.enqueue).toHaveBeenCalledWith(
        'lists',
        'INSERT',
        expect.objectContaining({ name: 'Shopping', color: '#00FF00' })
      );
    });

    test('updateList modifies list properties', () => {
      taskStore.addList('Shopping', '#00FF00');
      const listId = taskStore.state.lists[0].id;
      taskStore.updateList(listId, { name: 'Groceries' });
      expect(taskStore.state.lists[0].name).toBe('Groceries');
    });

    test('deleteList removes it and associated tasks', () => {
      taskStore.addList('Shopping', '#00FF00');
      const listId = taskStore.state.lists[0].id;
      taskStore.addTask('Buy milk', listId);
      expect(taskStore.state.tasks.length).toBe(1);
      taskStore.deleteList(listId);
      expect(taskStore.state.lists.length).toBe(0);
      expect(taskStore.state.tasks.length).toBe(0);
    });
  });

  describe('Task Completion', () => {
    test('toggleTask marks task as completed', () => {
      taskStore.addList('Default', '#333');
      const listId = taskStore.state.lists[0].id;
      taskStore.addTask('Test Task', listId);
      const taskId = taskStore.state.tasks[0].id;

      expect(taskStore.state.tasks[0].completed).toBe(false);
      taskStore.toggleTask(taskId);
      expect(taskStore.state.tasks[0].completed).toBe(true);
    });

    test('toggleTask un-marks completed task', () => {
      taskStore.addList('Default', '#333');
      const listId = taskStore.state.lists[0].id;
      taskStore.addTask('Test Task', listId);
      const taskId = taskStore.state.tasks[0].id;

      taskStore.toggleTask(taskId);
      expect(taskStore.state.tasks[0].completed).toBe(true);
      taskStore.toggleTask(taskId);
      expect(taskStore.state.tasks[0].completed).toBe(false);
    });

    test('toggleTask enqueues sync UPDATE mutation', () => {
      taskStore.addList('Default', '#333');
      const listId = taskStore.state.lists[0].id;
      taskStore.addTask('Test Task', listId);
      const taskId = taskStore.state.tasks[0].id;
      vi.clearAllMocks();

      taskStore.toggleTask(taskId);
      expect(syncEngine.enqueue).toHaveBeenCalledWith(
        'tasks',
        'UPDATE',
        expect.objectContaining({ id: taskId, completed: true })
      );
    });
  });
});
