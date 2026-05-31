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
  
  addTask: (title, listId = 'l-1', priority = 'normal') => {
    const newTask = {
      id: generateId('t-'),
      title,
      listId,
      completed: false,
      priority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Optimistic UI update
    setTasksState('tasks', (prev) => [...prev, newTask]);
    
    // Sync to IndexedDB and Cloud
    syncEngine.enqueue('tasks', 'INSERT', newTask);
  },
  
  addList: (name, color, icon) => {
    const newList = {
      id: generateId('l-'),
      name,
      color,
      icon,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    setTasksState('lists', (prev) => [...prev, newList]);
    syncEngine.enqueue('lists', 'INSERT', newList);
  },
  
  toggleTask: (id) => {
    const task = tasksState.tasks.find(t => t.id === id);
    if (!task) return;
    
    const updatedTask = { ...task, completed: !task.completed, updated_at: new Date().toISOString() };
    
    // Optimistic UI
    setTasksState('tasks', t => t.id === id, 'completed', c => !c);
    
    // Sync to IndexedDB and Cloud
    syncEngine.enqueue('tasks', 'UPDATE', updatedTask);
  },
  
  deleteTask: (id) => {
    // Optimistic UI
    setTasksState('tasks', (prev) => prev.filter(t => t.id !== id));
    
    // Sync
    syncEngine.enqueue('tasks', 'DELETE', { id });
  }
};
