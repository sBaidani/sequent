import { createStore } from 'solid-js/store';
import { generateId } from '../lib/id';
import { syncEngine } from './syncEngine';

const [tasksState, setTasksState] = createStore({
  tasks: [],
  lists: [],
});

export const taskStore = {
  get state() { return tasksState; },
  
  setTasks: (tasks) => setTasksState('tasks', tasks),
  setLists: (lists) => setTasksState('lists', lists),
  
  addTask: (title, listId = null, scheduledDate = null, priority = 'normal', description = '', rrule = null, allDay = false) => {
    // Resolve listId: use provided, or fall back to first available list
    let targetListId = listId;
    if (!targetListId && tasksState.lists.length > 0) {
      targetListId = tasksState.lists[0].id;
    }
    
    const newTask = {
      id: generateId(),
      title,
      description,
      listId: targetListId,
      completed: false,
      priority,
      allDay,
      scheduled_date: scheduledDate || null,
      rrule,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Optimistic UI update
    setTasksState('tasks', (prev) => [...prev, newTask]);
    
    // Enqueue for server sync
    syncEngine.enqueue('tasks', 'INSERT', newTask);
  },
  
  updateTask: (id, updates) => {
    setTasksState('tasks', (t) => t.id === id, { ...updates, updated_at: new Date().toISOString() });
    const task = tasksState.tasks.find(t => t.id === id);
    if (task) {
      syncEngine.enqueue('tasks', 'UPDATE', task);
    }
  },
  
  addList: (name, color, icon) => {
    const newList = {
      id: generateId(),
      name,
      color,
      icon,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setTasksState('lists', (prev) => [...prev, newList]);
    syncEngine.enqueue('lists', 'INSERT', newList);
  },
  
  updateList: (id, updates) => {
    setTasksState('lists', (l) => l.id === id, updates);
    const list = tasksState.lists.find(l => l.id === id);
    if (list) {
      syncEngine.enqueue('lists', 'UPDATE', list);
    }
  },
  
  deleteList: (id) => {
    setTasksState('lists', (prev) => prev.filter(l => l.id !== id));
    
    const tasksToDelete = tasksState.tasks.filter(t => t.listId === id);
    setTasksState('tasks', (prev) => prev.filter(t => t.listId !== id));
    
    syncEngine.enqueue('lists', 'DELETE', { id });
    tasksToDelete.forEach(t => {
      syncEngine.enqueue('tasks', 'DELETE', { id: t.id });
    });
  },
  
  toggleTask: (id) => {
    const task = tasksState.tasks.find(t => t.id === id);
    if (!task) return;
    
    const updatedTask = { ...task, completed: !task.completed, updated_at: new Date().toISOString() };
    
    // Optimistic UI
    setTasksState('tasks', t => t.id === id, 'completed', c => !c);
    
    // Sync
    syncEngine.enqueue('tasks', 'UPDATE', updatedTask);
  },
  
  updateTaskDate: (id, dateStr) => {
    const task = tasksState.tasks.find(t => t.id === id);
    if (!task) return;
    
    const updatedTask = { ...task, scheduled_date: dateStr, updated_at: new Date().toISOString() };
    
    // Optimistic UI
    setTasksState('tasks', t => t.id === id, 'scheduled_date', dateStr);
    
    // Sync
    syncEngine.enqueue('tasks', 'UPDATE', updatedTask);
  },
  
  deleteTask: (id) => {
    // Optimistic UI
    setTasksState('tasks', (prev) => prev.filter(t => t.id !== id));
    
    // Sync
    syncEngine.enqueue('tasks', 'DELETE', { id });
  }
};
