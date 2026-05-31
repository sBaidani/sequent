import { describe, test, expect, beforeEach, vi } from 'vitest';
import { eventStore } from '../../src/stores/eventStore';
import { taskStore } from '../../src/stores/taskStore';
import { syncEngine } from '../../src/stores/syncEngine';

// Mock syncEngine to avoid actual indexedDB calls during unit tests
vi.mock('../../src/stores/syncEngine', () => ({
  syncEngine: {
    enqueue: vi.fn(),
    hydrate: vi.fn(),
  }
}));

describe('Event Store', () => {
  beforeEach(() => {
    eventStore.setEvents([]);
    eventStore.setCalendars([]);
    vi.clearAllMocks();
  });

  test('addEvent adds an event to state and enqueues sync', () => {
    const title = 'Meeting with John';
    const start = new Date('2026-06-01T10:00:00Z').toISOString();
    const end = new Date('2026-06-01T11:00:00Z').toISOString();
    
    eventStore.addEvent(title, start, end);
    
    expect(eventStore.state.events.length).toBe(1);
    expect(eventStore.state.events[0].title).toBe(title);
    expect(eventStore.state.events[0].start_time).toBe(start);
    expect(eventStore.state.events[0].end_time).toBe(end);
    
    expect(syncEngine.enqueue).toHaveBeenCalledWith('events', 'INSERT', expect.objectContaining({
      title: 'Meeting with John',
      calendarId: 'c-1'
    }));
  });

  test('addCalendar adds a calendar to state and enqueues sync', () => {
    eventStore.addCalendar('Personal', '#C0185A');
    
    expect(eventStore.state.calendars.length).toBe(1);
    expect(eventStore.state.calendars[0].name).toBe('Personal');
    expect(eventStore.state.calendars[0].color).toBe('#C0185A');
    
    expect(syncEngine.enqueue).toHaveBeenCalledWith('calendars', 'INSERT', expect.objectContaining({
      name: 'Personal',
      color: '#C0185A'
    }));
  });
});

describe('Task Store', () => {
  beforeEach(() => {
    taskStore.setTasks([]);
    taskStore.setLists([]);
    vi.clearAllMocks();
  });

  test('addTask adds a task to state and enqueues sync', () => {
    taskStore.addTask('Buy groceries');
    
    expect(taskStore.state.tasks.length).toBe(1);
    expect(taskStore.state.tasks[0].title).toBe('Buy groceries');
    expect(taskStore.state.tasks[0].completed).toBe(false);
    expect(taskStore.state.tasks[0].listId).toBe('l-1');
    
    expect(syncEngine.enqueue).toHaveBeenCalledWith('tasks', 'INSERT', expect.objectContaining({
      title: 'Buy groceries'
    }));
  });
  
  test('addList adds a list to state and enqueues sync', () => {
    taskStore.addList('Work', '#3B6ED6');
    
    expect(taskStore.state.lists.length).toBe(1);
    expect(taskStore.state.lists[0].name).toBe('Work');
    expect(taskStore.state.lists[0].color).toBe('#3B6ED6');
    
    expect(syncEngine.enqueue).toHaveBeenCalledWith('lists', 'INSERT', expect.objectContaining({
      name: 'Work',
      color: '#3B6ED6'
    }));
  });

  test('toggleTask toggles completion status and enqueues sync', () => {
    taskStore.addTask('Test task');
    const taskId = taskStore.state.tasks[0].id;
    
    taskStore.toggleTask(taskId);
    expect(taskStore.state.tasks[0].completed).toBe(true);
    
    expect(syncEngine.enqueue).toHaveBeenCalledWith('tasks', 'UPDATE', expect.objectContaining({
      id: taskId,
      completed: true
    }));
    
    taskStore.toggleTask(taskId);
    expect(taskStore.state.tasks[0].completed).toBe(false);
  });
});
