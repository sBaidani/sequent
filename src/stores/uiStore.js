import { createStore } from 'solid-js/store';

const [uiState, setUiState] = createStore({
  view: 'timeline', // 'timeline', 'calendar', 'tasks', 'archive'
  theme: '#E8942A',
  sidebarOpen: true,
  smartBarOpen: false,
  activeDate: new Date().toISOString(),
  searchQuery: '',
});

export const uiStore = {
  get state() { return uiState; },
  setView: (view) => setUiState('view', view),
  setTheme: (theme) => setUiState('theme', theme),
  toggleSidebar: () => setUiState('sidebarOpen', !uiState.sidebarOpen),
  setSmartBarOpen: (isOpen) => setUiState('smartBarOpen', isOpen),
  setActiveDate: (dateStr) => setUiState('activeDate', dateStr),
  setSearchQuery: (query) => setUiState('searchQuery', query),
};
