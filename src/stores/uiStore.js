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
  setTheme: (theme) => {
    setUiState('theme', theme);
    
    // Set HEX accent
    document.documentElement.style.setProperty('--accent', theme);
    document.documentElement.style.setProperty('--bg', theme); // Main page background is the theme color!
    
    // Convert HEX to RGB for transparencies
    let r = 0, g = 0, b = 0;
    if (theme.length === 7) {
      r = parseInt(theme.slice(1, 3), 16);
      g = parseInt(theme.slice(3, 5), 16);
      b = parseInt(theme.slice(5, 7), 16);
    }
    document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  },
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
