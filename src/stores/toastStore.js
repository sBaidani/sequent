import { createStore } from 'solid-js/store';

const [toastState, setToastState] = createStore({
  toasts: [],
});

let nextId = 1;

export const toastStore = {
  get state() { return toastState; },

  add: (message, type = 'success', duration = 3000) => {
    const id = nextId++;
    setToastState('toasts', (t) => [...t, { id, message, type }]);
    
    setTimeout(() => {
      toastStore.remove(id);
    }, duration);
  },

  remove: (id) => {
    setToastState('toasts', (t) => t.filter((toast) => toast.id !== id));
  },
};
