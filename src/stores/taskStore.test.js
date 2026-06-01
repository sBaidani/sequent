import { describe, it, expect, beforeEach, vi } from 'vitest';
import { taskStore } from './taskStore';
import { syncEngine } from './syncEngine';

vi.mock('./syncEngine', () => ({
  syncEngine: {
    enqueue: vi.fn().mockResolvedValue(true)
  }
}));

describe('Task Store', () => {
  beforeEach(() => {
    // Reset store state by re-initializing or manually clearing
    taskStore.state.tasks.forEach(t => taskStore.deleteTask(t.id));
    vi.clearAllMocks();
  });

  it('should add a task correctly', () => {
    taskStore.addTask('Buy groceries', '2026-06-01T12:00:00Z');
    
    expect(taskStore.state.tasks.length).toBe(1);
    expect(taskStore.state.tasks[0].title).toBe('Buy groceries');
    expect(taskStore.state.tasks[0].completed).toBe(false);
    expect(syncEngine.enqueue).toHaveBeenCalledWith('tasks', 'INSERT', expect.objectContaining({
      title: 'Buy groceries'
    }));
  });

  it('should toggle a task status', () => {
    taskStore.addTask('Finish report', '2026-06-01T12:00:00Z');
    const task = taskStore.state.tasks[0];
    
    taskStore.toggleTask(task.id);
    expect(taskStore.state.tasks[0].completed).toBe(true);
    expect(syncEngine.enqueue).toHaveBeenCalledWith('tasks', 'UPDATE', expect.objectContaining({
      completed: true
    }));
    
    taskStore.toggleTask(task.id);
    expect(taskStore.state.tasks[0].completed).toBe(false);
  });

  it('should delete a task', () => {
    taskStore.addTask('Task to delete', null);
    const task = taskStore.state.tasks[0];
    
    taskStore.deleteTask(task.id);
    expect(taskStore.state.tasks.length).toBe(0);
    expect(syncEngine.enqueue).toHaveBeenCalledWith('tasks', 'DELETE', { id: task.id });
  });
});
