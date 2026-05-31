import { createStore } from 'solid-js/store';

const initialHasSeenOnboarding = localStorage.getItem('sequent_onboarding_seen') === 'true';

const [uiState, setUiState] = createStore({
  view: 'timeline', // 'timeline', 'calendar', 'tasks', 'archive'
  theme: '#E8942A',
  sidebarOpen: true,
  smartBarOpen: false,
  activeDate: new Date().toISOString(),
  searchQuery: '',
  hasSeenOnboarding: initialHasSeenOnboarding,
  isOnline: navigator.onLine,
  activeModal: null, // null, 'addEvent', 'addTask', 'addCalendar'
});

window.addEventListener('online', () => setUiState('isOnline', true));
window.addEventListener('offline', () => setUiState('isOnline', false));

export const uiStore = {
  get state() { return uiState; },
  setView: (view) => setUiState('view', view),
  setTheme: (theme) => setUiState('theme', theme),
  toggleSidebar: () => setUiState('sidebarOpen', !uiState.sidebarOpen),
  setSmartBarOpen: (isOpen) => setUiState('smartBarOpen', isOpen),
  setActiveDate: (dateStr) => setUiState('activeDate', dateStr),
  setSearchQuery: (query) => setUiState('searchQuery', query),
  setActiveModal: (modalName) => setUiState('activeModal', modalName),
  completeOnboarding: () => {
    localStorage.setItem('sequent_onboarding_seen', 'true');
    setUiState('hasSeenOnboarding', true);
  },
};
