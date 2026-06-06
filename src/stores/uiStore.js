import { createStore } from 'solid-js/store';

const initialHasSeenOnboarding = localStorage.getItem('sequent_onboarding_seen') === 'true';
const initialMode = localStorage.getItem('sequent_mode') || 'dark';
const initialThemeBase = localStorage.getItem('sequent_theme') || '#E8942A';

const [uiState, setUiState] = createStore({
  mode: initialMode,
  themeBase: initialThemeBase,
  view: 'timeline', // 'timeline', 'calendar', 'tasks', 'archive'
  viewDirection: 'up', // 'up' or 'down' for slide animations
  theme: initialThemeBase,
  sidebarOpen: true,
  smartBarOpen: false,
  activeDate: new Date().toISOString(),
  searchQuery: '',
  hasSeenOnboarding: initialHasSeenOnboarding,
  isOnline: navigator.onLine,
  activeModal: null, // null, 'addEvent', 'addTask', 'addCalendar', 'viewEvent'
  activeListId: '',
  activeEventId: null,
  activeEventType: null, // 'event' or 'task'
  clickCoords: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
});

// Helper to compute and apply theme based on mode
const applyTheme = (baseColor, mode) => {
  let r = parseInt(baseColor.slice(1, 3), 16);
  let g = parseInt(baseColor.slice(3, 5), 16);
  let b = parseInt(baseColor.slice(5, 7), 16);
  
  let finalTheme = baseColor;
  
  if (mode === 'light') {
    // Desaturate and darken slightly for light mode contrast
    r = Math.round(r * 0.75 + 102 * 0.25); // 102 is 0x66
    g = Math.round(g * 0.75 + 102 * 0.25);
    b = Math.round(b * 0.75 + 102 * 0.25);
    finalTheme = `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }
  
  document.documentElement.style.setProperty('--accent', finalTheme);
  document.documentElement.style.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  return finalTheme;
};

// Initialize CSS variables
setUiState('theme', applyTheme(uiState.themeBase, uiState.mode));
if (uiState.mode === 'light') document.documentElement.classList.add('light');

window.addEventListener('click', (e) => {
  setUiState('clickCoords', { x: e.clientX, y: e.clientY });
}, true);

window.addEventListener('online', () => setUiState('isOnline', true));
window.addEventListener('offline', () => setUiState('isOnline', false));

export const uiStore = {
  get state() { return uiState; },
  setMode: (mode) => {
    localStorage.setItem('sequent_mode', mode);
    setUiState('mode', mode);
    if (mode === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    setUiState('theme', applyTheme(uiState.themeBase, mode));
  },
  setView: (view) => {
    const viewOrder = ['timeline', 'calendar', 'tasks', 'archive', 'settings'];
    const oldIdx = viewOrder.indexOf(uiState.view);
    const newIdx = viewOrder.indexOf(view);
    if (newIdx !== -1 && oldIdx !== -1 && newIdx !== oldIdx) {
      // If moving to a view further down the list (e.g. timeline to calendar),
      // they appear stacked, so the screen slides UP (views slide UP)
      setUiState('viewDirection', newIdx > oldIdx ? 'up' : 'down');
    }
    setUiState('view', view);
  },
  setTheme: (themeBase) => {
    localStorage.setItem('sequent_theme', themeBase);
    setUiState('themeBase', themeBase);
    setUiState('theme', applyTheme(themeBase, uiState.mode));
  },
  toggleSidebar: () => setUiState('sidebarOpen', !uiState.sidebarOpen),
  setSmartBarOpen: (isOpen) => setUiState('smartBarOpen', isOpen),
  setActiveDate: (dateStr) => setUiState('activeDate', dateStr),
  setSearchQuery: (query) => setUiState('searchQuery', query),
  setActiveModal: (modalName) => setUiState('activeModal', modalName),
  setActiveListId: (listId) => setUiState('activeListId', listId),
  setActiveEvent: (id, type) => {
    setUiState('activeEventId', id);
    setUiState('activeEventType', type);
    setUiState('activeModal', 'viewEvent');
  },
  completeOnboarding: () => {
    localStorage.setItem('sequent_onboarding_seen', 'true');
    setUiState('hasSeenOnboarding', true);
  },
};
