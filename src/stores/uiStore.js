import { createStore } from 'solid-js/store';

// Accent slugs → base (dark-mode) hex. The slug is written to
// document.documentElement.dataset.accent, which drives the Astryx accent
// tokens via [data-accent] blocks in src/theme/accents.css.
const ACCENTS = {
  amber: '#E8942A',
  rose: '#C0185A',
  teal: '#1FA7A7',
  purple: '#6B5BDB',
  blue: '#3B6ED6',
  graphite: '#888888',
};

// Legacy migration: sequent_theme used to store a hex. Map known hexes to
// slugs (older palettes map to their nearest current accent); unknown → amber.
const HEX_TO_SLUG = {
  '#E8942A': 'amber',
  '#C0185A': 'rose',
  '#1FA7A7': 'teal',
  '#6B5BDB': 'purple',
  '#3B6ED6': 'blue',
  '#888888': 'graphite',
  // pre-rebrand accent palette
  '#FF3B30': 'rose',
  '#FF2D55': 'rose',
  '#AF52DE': 'purple',
};

const toSlug = (value) => {
  if (ACCENTS[value]) return value;
  return HEX_TO_SLUG[value] || 'amber';
};

const initialHasSeenOnboarding = localStorage.getItem('sequent_onboarding_seen') === 'true';
const initialMode = localStorage.getItem('sequent_mode') || 'dark';
const storedTheme = localStorage.getItem('sequent_theme');
const initialThemeBase = toSlug(storedTheme || 'amber');
if (storedTheme !== initialThemeBase) {
  localStorage.setItem('sequent_theme', initialThemeBase);
}

const [uiState, setUiState] = createStore({
  mode: initialMode,
  themeBase: initialThemeBase, // accent slug ('amber', 'rose', ...)
  view: 'timeline', // 'timeline', 'calendar', 'tasks', 'archive'
  viewDirection: 'up', // 'up' or 'down' for slide animations
  theme: ACCENTS[initialThemeBase], // the accent's base hex
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

// Apply the accent slug to the document: dataset.accent drives the Astryx
// accent tokens via [data-accent] blocks in accents.css. Returns the accent's
// base hex (mirrored into state.theme for consumers that need a plain color).
const applyTheme = (slug) => {
  document.documentElement.dataset.accent = slug;
  return ACCENTS[slug] || ACCENTS.amber;
};

// Apply the light/dark mode to the document: style.colorScheme drives
// light-dark() in the Astryx theme.
const applyMode = (mode) => {
  document.documentElement.style.colorScheme = mode;
};

// Initialize document theming
applyMode(uiState.mode);
setUiState('theme', applyTheme(uiState.themeBase));

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
    applyMode(mode);
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
  // Accepts an accent slug ('rose') or a legacy hex ('#C0185A') — hexes are
  // normalized to slugs and the slug is what gets persisted.
  setTheme: (accent) => {
    const slug = toSlug(accent);
    localStorage.setItem('sequent_theme', slug);
    setUiState('themeBase', slug);
    setUiState('theme', applyTheme(slug));
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
