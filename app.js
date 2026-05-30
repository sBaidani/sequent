/* ═══════════════════════════════════════════════════════════════
   SEQUENT — Application Core (app.js)
   Unified Calendar & Tasks PWA
   Stage: Web prototype — Full feature implementation
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────────────────────────────
// 1. CONSTANTS & CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'sequent_data_v1';
const CONFIG_KEY  = 'sequent_config_v1';

// IndexedDB Config
const DB_NAME = 'sequent_db';
const DB_VERSION = 1;
const STORE_NAME = 'sequent_store';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function getDBValue(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function setDBValue(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** Calendar colors matching Timepage's palette */
const CAL_COLORS = {
  work:     '#E8942A',
  personal: '#C0185A',
  family:   '#1FA7A7',
  health:   '#6B5BDB',
  other:    '#3B6ED6',
};

/** List card colors matching Actions' palette */
const LIST_COLORS = [
  '#1FA7A7', // teal
  '#C0185A', // crimson
  '#3B6ED6', // blue
  '#6B5BDB', // purple
  '#E8942A', // amber
  '#2A9D4E', // green
  '#8B4513', // brown/maroon
  '#B8476A', // mauve
];

const PRIORITY_ICON = { urgent: '🔥', normal: '', someday: '❄️' };
const WEATHER_ICONS = {
  '1000': '☀️', '1001': '🌤️', '1100': '🌤️', '1101': '⛅', '1102': '☁️',
  '2000': '🌫️', '4000': '🌧️', '4001': '🌧️', '4200': '🌦️', '4201': '🌧️',
  '5000': '❄️', '5001': '🌨️', '8000': '⛈️',
};

// ─────────────────────────────────────────────────────────────────
// 2. STATE MANAGEMENT
// ─────────────────────────────────────────────────────────────────

let state = {
  calendars: [],
  events: [],
  tasks: [],
  lists: [],
  archive: [],
  config: {
    geminiKey: '',
    weatherKey: '',
    supabaseUrl: '',
    supabaseKey: '',
    location: null,
    theme: 'amber',
  },
  ui: {
    view: 'timeline',
    miniCalDate: new Date(),
    timelineOffsetDays: -30, // how many days before today to pre-render
    listening: false,
    weatherCache: {},
  }
};

// ─────────────────────────────────────────────────────────────────
// 3. SEED DATA (rich demo to showcase Timepage + Actions design)
// ─────────────────────────────────────────────────────────────────

function seedData() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  function d(dayOffset, h = 0, m = 0) {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + dayOffset);
    dt.setHours(h, m, 0, 0);
    return dt.toISOString();
  }

  state.lists = [
    { id: 'list-1', name: 'Around Home',    color: LIST_COLORS[0], emoji: '🏠', collaborators: ['NH', 'BH'] },
    { id: 'list-2', name: 'Work Projects',  color: LIST_COLORS[1], emoji: '💼', collaborators: ['SW'] },
    { id: 'list-3', name: 'Trip Planning',  color: LIST_COLORS[2], emoji: '✈️', collaborators: ['AD', 'AS'] },
    { id: 'list-4', name: 'Films to Watch', color: LIST_COLORS[3], emoji: '🎬', collaborators: [] },
    { id: 'list-5', name: 'Groceries',      color: LIST_COLORS[4], emoji: '🛒', collaborators: [] },
    { id: 'list-6', name: 'Coursework',     color: LIST_COLORS[0], emoji: '📚', collaborators: ['SW', 'BH'] },
  ];

  state.calendars = [
    { id: 'work', name: 'Work', type: 'native', color: CAL_COLORS.work },
    { id: 'personal', name: 'Personal', type: 'native', color: CAL_COLORS.personal },
    { id: 'family', name: 'Family', type: 'native', color: CAL_COLORS.family },
    { id: 'health', name: 'Health', type: 'native', color: CAL_COLORS.health },
    { id: 'other', name: 'Other', type: 'native', color: CAL_COLORS.other },
    { id: 'g-personal', name: 'Sadiq (Personal)', type: 'google', color: '#4285F4' },
    { id: 'm-work', name: 'Contoso (Work)', type: 'microsoft', color: '#00A4EF' },
  ];

  state.events = [
    { id: 'ev-1',  title: 'Team Standup',        start: d(-2,  9, 0),  end: d(-2,  9,30), allDay: false, calendarId: 'work',     location: null,                   notes: 'Daily sync with engineering team', color: CAL_COLORS.work },
    { id: 'ev-2',  title: 'Lunch with Priya',     start: d(-1, 13, 0),  end: d(-1, 14, 0), allDay: false, calendarId: 'personal',  location: 'The Olive Tree, W1',  notes: null,                               color: CAL_COLORS.personal },
    { id: 'ev-3',  title: 'Design Review',         start: d(0,  10, 0),  end: d(0,  11, 0), allDay: false, calendarId: 'work',     location: 'Conference Room A',   notes: 'Review new onboarding flow',       color: CAL_COLORS.work },
    { id: 'ev-4',  title: 'Project Review',        start: d(0,  14, 0),  end: d(0,  15, 0), allDay: false, calendarId: 'work',     location: 'Conference Room A',   notes: null,                               color: CAL_COLORS.work },
    { id: 'ev-5',  title: 'Dinner Reservation',    start: d(0,  19,30),  end: d(0,  21, 0), allDay: false, calendarId: 'personal',  location: 'Nobu, Park Lane',     notes: 'Remember to bring the gift!',      color: CAL_COLORS.personal },
    { id: 'ev-6',  title: 'Gym',                   start: d(1,   7,0),   end: d(1,   8, 0), allDay: false, calendarId: 'health',   location: 'PureGym City',        notes: null,                               color: CAL_COLORS.health },
    { id: 'ev-7',  title: 'Football Training',     start: d(1,  18,0),   end: d(1,  19, 0), allDay: false, calendarId: 'personal',  location: null,                  notes: null,                               color: CAL_COLORS.personal },
    { id: 'ev-8',  title: 'Team Catchup',           start: d(2,   9,0),   end: d(2,  10, 0), allDay: false, calendarId: 'work',     location: null,                   notes: null,                               color: CAL_COLORS.work },
    { id: 'ev-9',  title: 'Yoga Class',             start: d(3,   6,30),  end: d(3,   7,30), allDay: false, calendarId: 'health',   location: 'Yoga Studio, SW1',    notes: null,                               color: CAL_COLORS.health },
    { id: 'ev-10', title: 'Lunch with Team',        start: d(3,  12,30),  end: d(3,  13,30), allDay: false, calendarId: 'work',     location: 'Pret, Bishopsgate',   notes: null,                               color: CAL_COLORS.work },
    { id: 'ev-11', title: 'Picnic',                 start: d(5,   9,0),   end: d(5,  10, 0), allDay: false, calendarId: 'family',   location: 'Commonwealth Park',   notes: 'Remember to bring ice!',           color: CAL_COLORS.family },
    { id: 'ev-12', title: 'Hiking with Adam',       start: d(6,  12,0),   end: d(6,  17, 0), allDay: false, calendarId: 'personal',  location: 'Jindabyne NSW',       notes: null,                               color: CAL_COLORS.personal },
    { id: 'ev-13', title: 'Club Meetup',            start: d(7,  11,0),   end: d(7,  12, 0), allDay: false, calendarId: 'family',   location: null,                  notes: null,                               color: CAL_COLORS.family },
    { id: 'ev-14', title: 'Family Movie Night',     start: d(7,  20,0),   end: d(7,  22, 0), allDay: false, calendarId: 'family',   location: null,                  notes: null,                               color: CAL_COLORS.family },
    { id: 'ev-15', title: 'Dinosaur Museum',        start: d(10, 12,0),   end: d(10, 13, 0), allDay: false, calendarId: 'family',   location: 'Natural History Museum, SW7', notes: 'Bring hat — there are outdoor areas', color: CAL_COLORS.family },
    // All-day events
    { id: 'ev-16', title: 'Daylight Saving Time',  start: d(-3), end: d(-3), allDay: true, calendarId: 'other',   color: CAL_COLORS.other },
    { id: 'ev-17', title: 'Workshop',              start: d(0),  end: d(1),  allDay: true, calendarId: 'work',    color: CAL_COLORS.work },
    { id: 'ev-18', title: 'Alex on Holidays',      start: d(4),  end: d(9),  allDay: true, calendarId: 'family',  color: CAL_COLORS.family },
    { id: 'ev-19', title: 'Design Conference',     start: d(8),  end: d(11), allDay: true, calendarId: 'work',    color: CAL_COLORS.work },
    // High density calendar events to populate multiple weeks of Month view
    { id: 'ev-20', title: 'Dentist Appointment',    start: d(14, 15, 0),  end: d(14, 15, 45), allDay: false, calendarId: 'health',  location: 'City Dental Practice', color: CAL_COLORS.health },
    { id: 'ev-21', title: 'Strategy Sync',          start: d(15, 10, 0),  end: d(15, 11, 30), allDay: false, calendarId: 'work',    location: 'Zoom',                 color: CAL_COLORS.work },
    { id: 'ev-22', title: 'Client Presentations',   start: d(22, 13, 0),  end: d(22, 15, 0), allDay: false, calendarId: 'work',    location: 'Boardroom B',          color: CAL_COLORS.work },
    { id: 'ev-23', title: 'Car Service',            start: d(25,  8, 30), end: d(25, 10, 0),  allDay: false, calendarId: 'other',   location: 'Auto Centre',          color: CAL_COLORS.other },
    { id: 'ev-24', title: 'Quarterly Planning',     start: d(32),         end: d(33),         allDay: true,  calendarId: 'work',    color: CAL_COLORS.work },
    { id: 'ev-25', title: 'Sarah Birthday Party',   start: d(-10),        end: d(-9),         allDay: true,  calendarId: 'personal', color: CAL_COLORS.personal },
    { id: 'ev-26', title: 'Rent Payment',           start: d(-15),        end: d(-14),        allDay: true,  calendarId: 'other',   color: CAL_COLORS.other },
    { id: 'ev-27', title: 'Google Meet sync',       start: d(1, 14, 0),   end: d(1, 15, 0),   allDay: false, calendarId: 'g-personal', location: 'Meet', color: '#4285F4' },
    { id: 'ev-28', title: 'Contoso All-Hands',      start: d(2, 10, 0),   end: d(2, 11, 0),   allDay: false, calendarId: 'm-work',     location: 'Teams', color: '#00A4EF' }
  ];

  state.tasks = [
    { id: 't-1',  title: 'New batteries for detectors', listId: 'list-1', priority: 'urgent',  schedule: 'date', scheduledDate: d(0),   deadline: d(3),   completed: false, notes: null, checklist: [], isDirty: false },
    { id: 't-2',  title: 'Water the plants',            listId: 'list-1', priority: 'normal',  schedule: 'date', scheduledDate: d(0),   deadline: null,   completed: false, notes: 'Check hanging pots on balcony', checklist: [{id:'c1',text:'Balcony',done:false},{id:'c2',text:'Kitchen',done:false}], isDirty: false },
    { id: 't-3',  title: 'Walk the dog',                listId: 'list-1', priority: 'normal',  schedule: 'date', scheduledDate: d(0),   deadline: d(6),   completed: false, notes: null, checklist: [], isDirty: false },
    { id: 't-4',  title: 'Submit assignment',           listId: 'list-6', priority: 'urgent',  schedule: 'date', scheduledDate: d(0),   deadline: d(2),   completed: false, notes: null, checklist: [], isDirty: false },
    { id: 't-5',  title: 'Book flights ✈️',             listId: 'list-3', priority: 'urgent',  schedule: 'date', scheduledDate: d(1),   deadline: d(1),   completed: false, notes: null, checklist: [], isDirty: false },
    { id: 't-6',  title: 'Vote on cities to visit',     listId: 'list-3', priority: 'normal',  schedule: 'date', scheduledDate: d(1),   deadline: null,   completed: false, notes: null, checklist: [], isDirty: false },
    { id: 't-7',  title: 'Car hire',                   listId: 'list-3', priority: 'normal',  schedule: 'date', scheduledDate: d(1),   deadline: d(1),   completed: false, notes: null, checklist: [], isDirty: false },
    { id: 't-8',  title: 'Research places to stay',    listId: 'list-3', priority: 'normal',  schedule: 'date', scheduledDate: d(3),   deadline: null,   completed: false, notes: null, checklist: [], isDirty: false },
    { id: 't-9',  title: 'Buy new lamps',               listId: 'list-1', priority: 'someday', schedule: 'someday', scheduledDate: null, deadline: null,   completed: false, notes: null, checklist: [], isDirty: false },
    { id: 't-10', title: 'Get paint samples',           listId: 'list-1', priority: 'someday', schedule: 'someday', scheduledDate: null, deadline: d(27),  completed: false, notes: null, checklist: [], isDirty: false },
    { id: 't-11', title: 'Organise meeting',            listId: 'list-2', priority: 'normal',  schedule: 'date', scheduledDate: d(2),   deadline: null,   completed: false, notes: null, checklist: [], isDirty: false },
    { id: 't-12', title: 'Create video of final design',listId: 'list-2', priority: 'urgent',  schedule: 'date', scheduledDate: d(0),   deadline: d(1),   completed: false, notes: null, checklist: [], isDirty: false },
    // Completed (archive)
    { id: 't-c1', title: 'Clean garage',                listId: 'list-1', priority: 'normal',  schedule: 'date', scheduledDate: d(-1),  deadline: null,   completed: true,  completedAt: d(-1, 14, 0), notes: null, checklist: [], isDirty: false },
    { id: 't-c2', title: 'Mentor review',               listId: 'list-6', priority: 'normal',  schedule: 'date', scheduledDate: d(-1),  deadline: null,   completed: true,  completedAt: d(-1, 10, 0), notes: null, checklist: [], isDirty: false },
    { id: 't-c3', title: 'Haloumi',                     listId: 'list-5', priority: 'normal',  schedule: 'date', scheduledDate: d(-1),  deadline: null,   completed: true,  completedAt: d(-1, 11, 0), notes: null, checklist: [], isDirty: false },
    { id: 't-c4', title: 'Hommus',                      listId: 'list-5', priority: 'normal',  schedule: 'date', scheduledDate: d(-8),  deadline: null,   completed: true,  completedAt: d(-8, 9, 0),  notes: null, checklist: [], isDirty: false },
    { id: 't-c5', title: 'Mince',                       listId: 'list-5', priority: 'normal',  schedule: 'date', scheduledDate: d(-8),  deadline: null,   completed: true,  completedAt: d(-8, 9, 30), notes: null, checklist: [], isDirty: false },
  ];

  state.archive = state.tasks.filter(t => t.completed);
}

// ─────────────────────────────────────────────────────────────────
// 4. PERSISTENCE
// ─────────────────────────────────────────────────────────────────

function saveState() {
  try {
    const persisted = { events: state.events, tasks: state.tasks, lists: state.lists };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
    setDBValue('data', persisted).catch(e => console.warn('IndexedDB save failed', e));
  } catch(e) { console.warn('Save failed', e); }
}

function loadState() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (data && data.events && data.events.length > 0) {
      state.events = data.events;
      state.tasks  = data.tasks;
      state.lists  = data.lists;
      state.archive = data.tasks.filter(t => t.completed);
      return true;
    }
  } catch(e) {}
  return false;
}

function loadConfig() {
  try {
    const cfg = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null');
    if (cfg) { state.config = { ...state.config, ...cfg }; }
  } catch(e) {}
}

// ─────────────────────────────────────────────────────────────────
// 5. DATE UTILITIES
// ─────────────────────────────────────────────────────────────────

function today() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function isSameDay(a, b) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}
function dayKey(date) { const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function getWeekNumber(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  return Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
}
const MONTHS_SHORT = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
const MONTHS_LONG  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function formatTime(isoStr) {
  const d = new Date(isoStr);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2,'0')} ${ampm}`;
}
function formatTimeRange(start, end) {
  return `${formatTime(start)} → ${formatTime(end)}`;
}
function formatDateShort(isoStr) {
  const d = new Date(isoStr);
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}
function daysFromNow(isoStr) {
  const diff = new Date(new Date(isoStr).setHours(0,0,0,0)) - today();
  const days = Math.round(diff / 86400000);
  if (days === 0) return 'TODAY';
  if (days === 1) return 'TOMORROW';
  if (days === -1) return 'YESTERDAY';
  if (days < 0) return `${Math.abs(days)} DAYS AGO`;
  return `IN ${days} DAYS`;
}
function countdownFromNow(isoStr) {
  const diff = new Date(isoStr) - new Date();
  if (diff < 0) return null;
  const totalDays = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const parts = [];
  if (totalDays > 0) parts.push(`${totalDays} DAY${totalDays !== 1 ? 'S' : ''}`);
  if (hours > 0) parts.push(`${hours} HOUR${hours !== 1 ? 'S' : ''}`);
  return parts.length ? parts.join(', ') : 'NOW';
}

// ─────────────────────────────────────────────────────────────────
// 6. TIMELINE FEED BUILDER
// ─────────────────────────────────────────────────────────────────

/**
 * Build a chronological array of DaySection objects from state.events + state.tasks.
 * Spans from (today - 30 days) to (today + 60 days).
 */
function buildTimelineFeed(startOffset = -30, endOffset = 60) {
  const todayDate = today();
  const sections = [];

  for (let i = startOffset; i <= endOffset; i++) {
    const dayDate = new Date(todayDate);
    dayDate.setDate(dayDate.getDate() + i);
    const key = dayKey(dayDate);
    const isToday = i === 0;
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;

    // All-day events for this day
    const allDayEvents = state.events.filter(ev => {
      if (!ev.allDay) return false;
      const s = new Date(ev.start); s.setHours(0,0,0,0);
      const e = new Date(ev.end);   e.setHours(0,0,0,0);
      const d = new Date(dayDate);  d.setHours(0,0,0,0);
      return d >= s && d < e;
    });

    // Timed events for this day
    const timedEvents = state.events
      .filter(ev => !ev.allDay && isSameDay(ev.start, dayDate))
      .sort((a, b) => new Date(a.start) - new Date(b.start));

    // Tasks scheduled for this day (not completed)
    const dayTasks = state.tasks
      .filter(t => !t.completed && t.scheduledDate && isSameDay(t.scheduledDate, dayDate))
      .sort((a, b) => {
        // Urgent first
        const p = { urgent: 0, normal: 1, someday: 2 };
        return p[a.priority] - p[b.priority];
      });

    sections.push({ dayDate, key, isToday, isWeekend, allDayEvents, timedEvents, dayTasks });
  }
  return sections;
}

// ─────────────────────────────────────────────────────────────────
// 7. TIMELINE RENDERER
// ─────────────────────────────────────────────────────────────────

function renderTimeline() {
  const container = document.getElementById('timelineScroll');
  const feed = buildTimelineFeed();
  const todayDate = today();
  let todayEl = null;

  // Keep track of current month for gutter label
  let lastRenderedMonth = null;

  const fragment = document.createDocumentFragment();

  feed.forEach(section => {
    const showMonth = section.dayDate.getMonth() !== lastRenderedMonth;
    lastRenderedMonth = section.dayDate.getMonth();

    const section_el = document.createElement('article');
    section_el.className = `day-section${section.isToday ? ' is-today' : ''}${section.isWeekend ? ' is-weekend' : ''}`;
    section_el.dataset.dateKey = section.key;
    section_el.setAttribute('aria-label', `${DAYS_SHORT[section.dayDate.getDay()]} ${section.dayDate.getDate()} ${MONTHS_LONG[section.dayDate.getMonth()]}`);

    // ── Left gutter ──
    const gutter = document.createElement('div');
    gutter.className = 'day-gutter';

    if (showMonth) {
      const monthLabel = document.createElement('span');
      monthLabel.className = 'day-gutter-month';
      monthLabel.textContent = `${section.dayDate.getFullYear()} ${MONTHS_SHORT[section.dayDate.getMonth()]}`;
      gutter.appendChild(monthLabel);
    }

    const dow = document.createElement('span');
    dow.className = 'day-gutter-dow';
    dow.textContent = DAYS_SHORT[section.dayDate.getDay()];
    gutter.appendChild(dow);

    const numWrap = document.createElement('div');
    numWrap.className = 'day-gutter-num-wrap';
    const num = document.createElement('span');
    num.className = 'day-gutter-num';
    num.textContent = section.dayDate.getDate();
    numWrap.appendChild(num);
    gutter.appendChild(numWrap);

    section_el.appendChild(gutter);

    // ── Day content ──
    const content = document.createElement('div');
    content.className = 'day-content';

    const colEvents = document.createElement('div');
    colEvents.className = 'day-col-events';
    const colTasks = document.createElement('div');
    colTasks.className = 'day-col-tasks';

    // All-day events
    if (section.allDayEvents.length > 0) {
      const label = createSectionLabel('ALL DAY');
      colEvents.appendChild(label);
      section.allDayEvents.forEach(ev => {
        colEvents.appendChild(createAllDayChip(ev));
      });
    }

    // Timed schedule
    if (section.timedEvents.length > 0) {
      const label = createSectionLabel('CALENDAR');
      colEvents.appendChild(label);
      section.timedEvents.forEach(ev => {
        colEvents.appendChild(createEventCard(ev));
      });
    }

    // Weather (only for today and next 2 days)
    const dayOffset = Math.round((section.dayDate - todayDate) / 86400000);
    if (dayOffset >= 0 && dayOffset <= 2) {
      const weatherHtml = buildWeatherCard(section.key);
      if (weatherHtml) {
        const label = createSectionLabel('WEATHER');
        colEvents.appendChild(label);
        colEvents.appendChild(weatherHtml);
      }
    }

    // Day tasks (without fixed time)
    if (section.dayTasks.length > 0) {
      const divider = createSectionLabel('TASKS');
      colTasks.appendChild(divider);
      section.dayTasks.forEach(task => {
        colTasks.appendChild(createTaskCard(task));
      });
    }

    // Empty day hint
    if (section.allDayEvents.length === 0 && section.timedEvents.length === 0 && section.dayTasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'day-empty';
      colEvents.appendChild(empty);
    }

    if (colEvents.hasChildNodes()) content.appendChild(colEvents);
    if (colTasks.hasChildNodes()) content.appendChild(colTasks);

    section_el.appendChild(content);
    fragment.appendChild(section_el);

    if (section.isToday) todayEl = section_el;
  });

  container.innerHTML = '';
  container.appendChild(fragment);

  // Scroll to today
  if (todayEl) {
    setTimeout(() => todayEl.scrollIntoView({ block: 'start', behavior: 'instant' }), 50);
  }

  // Update top bar
  updateTopBar();

  // Set up scroll listener for FAB
  setupTimelineScroll();
}

function createSectionLabel(text) {
  const el = document.createElement('p');
  el.className = 'section-label';
  el.textContent = text;
  return el;
}

function createAllDayChip(ev) {
  const chip = document.createElement('div');
  chip.className = 'allday-chip';
  chip.setAttribute('role', 'button');
  chip.tabIndex = 0;

  const dot = document.createElement('div');
  dot.className = 'allday-dot';
  dot.style.background = ev.color;

  const title = document.createElement('span');
  title.className = 'allday-title';
  title.textContent = ev.title;

  chip.appendChild(dot);
  chip.appendChild(title);
  chip.addEventListener('click', e => openEventDetail(e, ev.id));
  chip.addEventListener('keydown', e => { if (e.key === 'Enter') openEventDetail(e, ev.id); });
  return chip;
}

function createEventCard(ev) {
  const card = document.createElement('div');
  card.className = 'event-card';
  card.setAttribute('role', 'button');
  card.tabIndex = 0;
  card.style.setProperty('--cal-color', ev.color);
  
  const body = document.createElement('div');
  body.className = 'event-card-body';

  const title = document.createElement('div');
  title.className = 'event-card-title';
  title.textContent = ev.title;

  const meta = document.createElement('div');
  meta.className = 'event-card-meta event-card-time';
  meta.textContent = formatTimeRange(ev.start, ev.end);

  if (ev.location) {
    const loc = document.createElement('div');
    loc.className = 'event-card-meta';
    loc.textContent = ev.location;
    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(loc);
  } else {
    body.appendChild(title);
    body.appendChild(meta);
  }

  card.appendChild(body);
  card.addEventListener('click', e => openEventDetail(e, ev.id));
  card.addEventListener('keydown', e => { if (e.key === 'Enter') openEventDetail(e, ev.id); });
  return card;
}

function createTaskCard(task) {
  const list = state.lists.find(l => l.id === task.listId) || { name: 'Inbox', color: '#555' };

  const card = document.createElement('div');
  card.className = `task-card${task.completed ? ' completed' : ''}`;
  card.id = `task-card-${task.id}`;
  card.style.background = list.color;
  card.setAttribute('role', 'button');
  card.tabIndex = 0;
  
  card.draggable = true;
  card.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', task.id);
    card.style.opacity = '0.4';
  });
  card.addEventListener('dragend', () => {
    card.style.opacity = '';
  });

  const listBadge = document.createElement('div');
  listBadge.className = 'task-card-list-badge';
  listBadge.textContent = list.name.toUpperCase();

  const titleEl = document.createElement('div');
  titleEl.className = 'task-card-title';
  titleEl.textContent = task.title;

  const meta = document.createElement('div');
  meta.className = 'task-card-meta';

  if (task.priority !== 'normal') {
    const icon = document.createElement('span');
    icon.className = 'task-card-priority-icon';
    icon.textContent = PRIORITY_ICON[task.priority];
    meta.appendChild(icon);
  }

  if (task.deadline) {
    const dl = document.createElement('span');
    dl.className = 'task-card-deadline';
    dl.innerHTML = `⏳ ${daysFromNow(task.deadline)}`;
    meta.appendChild(dl);
  }

  if (task.scheduledDate) {
    const sched = document.createElement('span');
    sched.textContent = daysFromNow(task.scheduledDate);
    meta.appendChild(sched);
  }

  // Progress bar (for checklist tasks)
  if (task.checklist && task.checklist.length > 0) {
    const bar = document.createElement('div');
    bar.className = 'task-progress-bar';
    const total = task.checklist.length;
    const done = task.checklist.filter(c => c.done).length;
    task.checklist.forEach((_, i) => {
      const seg = document.createElement('div');
      seg.className = `task-progress-seg${i < done ? ' filled' : ''}`;
      bar.appendChild(seg);
    });
    card.appendChild(listBadge);
    card.appendChild(titleEl);
    if (meta.children.length) card.appendChild(meta);
    card.appendChild(bar);
  } else {
    card.appendChild(listBadge);
    card.appendChild(titleEl);
    if (meta.children.length) card.appendChild(meta);
  }

  // Complete button
  const completeBtn = document.createElement('button');
  completeBtn.className = 'task-complete-btn';
  completeBtn.setAttribute('aria-label', 'Complete task');
  completeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  completeBtn.addEventListener('click', e => {
    e.stopPropagation();
    toggleTaskComplete(task.id);
  });
  card.appendChild(completeBtn);

  card.addEventListener('click', e => openTaskDetail(e, task.id));
  card.addEventListener('keydown', e => { if (e.key === 'Enter') openTaskDetail(e, task.id); });
  return card;
}

function buildWeatherCard(dateKey) {
  const cached = state.ui.weatherCache[dateKey];
  if (!cached) {
    // Try to fetch if we have a key
    if (state.config.weatherKey && state.config.location) {
      fetchWeather(dateKey);
    }
    return null;
  }
  return createWeatherCardEl(cached);
}

function createWeatherCardEl(data) {
  const card = document.createElement('div');
  card.className = 'weather-card';

  const icon = WEATHER_ICONS[String(data.weatherCode)] || '🌡️';
  const locationName = state.config.location?.name || 'Your location';

  card.innerHTML = `
    <div class="weather-main-row">
      <div class="weather-icon-wrap">${icon}</div>
      <div>
        <div class="weather-temp-range">${data.temperatureMin}° – ${data.temperatureMax}°C</div>
        <div class="weather-condition">${data.condition}</div>
        <div class="weather-location">${locationName}</div>
      </div>
    </div>
    <div class="weather-stats">
      <div class="weather-stat"><span class="weather-stat-label">Rain</span><span class="weather-stat-value">${data.precipitationProbability || 0}%</span></div>
      <div class="weather-stat"><span class="weather-stat-label">Humidity</span><span class="weather-stat-value">${data.humidity ? data.humidity + '%' : '—'}</span></div>
      <div class="weather-stat"><span class="weather-stat-label">Wind</span><span class="weather-stat-value">${data.windSpeed ? data.windSpeed + ' mph' : '—'}</span></div>
      <div class="weather-stat"><span class="weather-stat-label">UV Index</span><span class="weather-stat-value">${data.uvIndex || '—'}</span></div>
      <div class="weather-stat"><span class="weather-stat-label">Sunrise</span><span class="weather-stat-value">${data.sunriseTime || '—'}</span></div>
      <div class="weather-stat"><span class="weather-stat-label">Sunset</span><span class="weather-stat-value">${data.sunsetTime || '—'}</span></div>
    </div>`;

  return card;
}

// ─────────────────────────────────────────────────────────────────
// 8. MINI CALENDAR
// ─────────────────────────────────────────────────────────────────

function renderMiniCal() {
  const d = state.ui.miniCalDate;
  const year = d.getFullYear(), month = d.getMonth();
  document.getElementById('miniCalTitle').textContent = `${MONTHS_LONG[month]} ${year}`;

  const grid = document.getElementById('miniCalGrid');
  grid.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDate = today();

  // Pad with prev month days
  for (let i = 0; i < firstDay; i++) {
    const prevMonthDays = new Date(year, month, 0).getDate();
    const cell = document.createElement('button');
    cell.className = 'mini-cal-cell other-month';
    cell.textContent = prevMonthDays - firstDay + i + 1;
    cell.disabled = true;
    grid.appendChild(cell);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    const isToday = isSameDay(cellDate, todayDate);
    const cell = document.createElement('button');
    cell.className = `mini-cal-cell${isToday ? ' today' : ''}`;
    cell.textContent = day;
    cell.setAttribute('aria-label', `${day} ${MONTHS_LONG[month]} ${year}`);

    // Mark if has events (Heatmap)
    const key = dayKey(cellDate);
    const dayEvents = state.events.filter(ev => isSameDay(ev.start, cellDate));
    const dayTasks = state.tasks.filter(t => !t.completed && t.scheduledDate && isSameDay(t.scheduledDate, cellDate));
    const itemsCount = dayEvents.length + dayTasks.length;
    if (itemsCount > 0) {
      const level = Math.min(itemsCount, 3);
      cell.classList.add(`heatmap-${level}`);
    }

    cell.addEventListener('click', () => scrollToDate(cellDate));
    grid.appendChild(cell);
  }
}

// ─────────────────────────────────────────────────────────────────
// 9. LISTS VIEW RENDERER
// ─────────────────────────────────────────────────────────────────

function renderListsView() {
  renderSchedulePane();
  renderListsGrid();
}

function renderSchedulePane() {
  const body = document.getElementById('schedulePaneBody');
  body.innerHTML = '';

  const today_d = today();
  const groups = [
    { label: 'Today', offset: 0 },
    { label: 'Tomorrow', offset: 1 },
  ];

  // Add next 5 days
  for (let i = 2; i <= 5; i++) {
    const dt = new Date(today_d); dt.setDate(dt.getDate() + i);
    groups.push({ label: DAYS_SHORT[dt.getDay()], offset: i });
  }

  groups.forEach(g => {
    const dt = new Date(today_d); dt.setDate(dt.getDate() + g.offset);
    const dayTasks = state.tasks.filter(t => !t.completed && t.scheduledDate && isSameDay(t.scheduledDate, dt));
    const dayEvents = state.events.filter(ev => !ev.allDay && isSameDay(ev.start, dt));

    if (dayTasks.length === 0 && dayEvents.length === 0) return;

    const group = document.createElement('div');
    group.className = 'schedule-group';

    const titleEl = document.createElement('div');
    titleEl.className = 'schedule-group-title';
    titleEl.textContent = g.label;

    const dateEl = document.createElement('div');
    dateEl.className = 'schedule-group-date';
    dateEl.textContent = `${dt.getDate()} ${MONTHS_LONG[dt.getMonth()]}`;

    group.appendChild(titleEl);
    group.appendChild(dateEl);

    // Deadline indicator tasks
    const deadlineTasks = dayTasks.filter(t => t.deadline);
    deadlineTasks.forEach(t => {
      const row = document.createElement('div');
      row.className = 'schedule-task-row';
      row.innerHTML = `<div class="schedule-task-name">⏳ ${t.title}</div>`;
      row.addEventListener('click', e => openTaskDetail(e, t.id));
      group.appendChild(row);
    });

    // Task cards
    dayTasks.forEach(task => {
      const list = state.lists.find(l => l.id === task.listId) || { name: 'Inbox', color: '#555' };
      const row = document.createElement('div');
      row.className = 'schedule-task-row colored-task';
      row.style.setProperty('--task-color', list.color);
      row.innerHTML = `
        <div class="schedule-task-name">${task.title}${PRIORITY_ICON[task.priority] ? ' ' + PRIORITY_ICON[task.priority] : ''}</div>
        <div class="schedule-task-meta">${list.name.toUpperCase()}${task.deadline ? ' · ' + daysFromNow(task.deadline) : ''}</div>`;
      row.addEventListener('click', e => openTaskDetail(e, task.id));
      group.appendChild(row);
    });

    // Events
    dayEvents.forEach(ev => {
      const row = document.createElement('div');
      row.className = 'schedule-task-row';
      row.style.borderLeft = `3px solid ${ev.color}`;
      row.innerHTML = `
        <div class="schedule-task-name">${ev.title}</div>
        <div class="schedule-task-meta">${formatTimeRange(ev.start, ev.end)}</div>`;
      row.addEventListener('click', e => openEventDetail(e, ev.id));
      group.appendChild(row);
    });

    body.appendChild(group);
  });
}

function renderListsGrid() {
  const grid = document.getElementById('listsGrid');
  grid.innerHTML = '';

  state.lists.forEach(list => {
    const listTasks = state.tasks.filter(t => !t.completed && t.listId === list.id);
    const card = document.createElement('div');
    card.className = 'list-card';
    card.style.background = list.color;

    // Header
    let headerHtml = '';
    if (list.emoji) headerHtml += `<div class="list-card-emoji">${list.emoji}</div>`;
    headerHtml += `<div class="list-card-name">${list.name}</div>`;

    // Collaborators
    if (list.collaborators && list.collaborators.length > 0) {
      const avatars = list.collaborators.map(name =>
        `<div class="list-card-avatar">${name}</div>`
      ).join('');
      headerHtml += `<div class="list-card-collaborators">${avatars}</div>`;
    }

    // Tasks inside
    const tasksHtml = listTasks.slice(0, 4).map(t => {
      const metaParts = [];
      if (t.scheduledDate) metaParts.push(daysFromNow(t.scheduledDate));
      if (t.deadline) metaParts.push(`⏳ ${daysFromNow(t.deadline)}`);
      return `
        <div class="list-card-task">
          <span>${t.title}</span>
          <span class="list-card-task-meta">${metaParts[0] || ''}</span>
          ${PRIORITY_ICON[t.priority] ? `<span class="list-card-task-priority">${PRIORITY_ICON[t.priority]}</span>` : ''}
        </div>`;
    }).join('');

    card.innerHTML = `
      ${headerHtml}
      <div class="list-card-tasks">
        ${tasksHtml}
        <button class="list-card-add" aria-label="Add task to ${list.name}">+</button>
      </div>`;

    card.querySelector('.list-card-add').addEventListener('click', e => {
      e.stopPropagation();
      openAddModal(e, 'task', list.id);
    });

    card.addEventListener('click', () => {
      // Could open list detail — for now show toast
      showToast(`📋 ${list.name} — ${listTasks.length} tasks`);
    });

    grid.appendChild(card);
  });
}

// ─────────────────────────────────────────────────────────────────
// 10. archive RENDERER
// ─────────────────────────────────────────────────────────────────

function renderarchive() {
  const body = document.getElementById('archiveBody');
  body.innerHTML = '';

  const todayDate = today();

  const thisWeek = state.archive.filter(t => {
    if (!t.completedAt) return false;
    const diff = (todayDate - new Date(t.completedAt).setHours(0,0,0,0)) / 86400000;
    return diff >= 0 && diff <= 7;
  });

  const lastWeek = state.archive.filter(t => {
    if (!t.completedAt) return false;
    const diff = (todayDate - new Date(t.completedAt).setHours(0,0,0,0)) / 86400000;
    return diff > 7 && diff <= 14;
  });

  function renderPeriod(title, tasks) {
    if (!tasks.length) return;
    const period = document.createElement('div');
    period.className = 'archive-period';
    const titleEl = document.createElement('h2');
    titleEl.className = 'archive-period-title';
    titleEl.textContent = title;
    period.appendChild(titleEl);

    tasks.forEach(t => {
      const list = state.lists.find(l => l.id === t.listId) || { name: 'Inbox', color: '#555' };
      const item = document.createElement('div');
      item.className = 'archive-item';
      item.style.background = list.color;
      item.innerHTML = `
        <div class="archive-item-title">${t.title}</div>
        <div class="archive-item-meta">${list.name.toUpperCase()} · ${t.completedAt ? formatDateShort(t.completedAt) : ''}</div>`;
      period.appendChild(item);
    });

    body.appendChild(period);
  }

  renderPeriod('This Week', thisWeek);
  renderPeriod('Last Week', lastWeek);

  if (!thisWeek.length && !lastWeek.length) {
    body.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px 20px;font-size:14px;font-weight:500;">No completed tasks yet.<br>Complete tasks to see them here.</div>`;
  }
}

// ─────────────────────────────────────────────────────────────────
// 11. EVENT DETAIL MODAL
// ─────────────────────────────────────────────────────────────────

function openEventDetail(e, id) {
  const ev = state.events.find(ev => ev.id === id);
  if (!ev) return;
  const overlay = document.getElementById('eventDetailOverlay');
  if (e) triggerExpandingCircle(e, overlay, ev.color);

  const content = document.getElementById('eventDetailContent');
  const countdown = ev.end ? countdownFromNow(ev.end) : null;
  const startDate = new Date(ev.start);

  // Travel time (placeholder — would call Maps API)
  const travelMin = ev.location ? Math.floor(Math.random() * 40) + 5 : null;

  // Weather at event (from cache)
  const key = dayKey(startDate);
  const weather = state.ui.weatherCache[key];
  const weatherIcon = weather ? (WEATHER_ICONS[String(weather.weatherCode)] || '🌡️') : null;

  const calendar = state.calendars.find(c => c.id === ev.calendarId) || { name: ev.calendarId, color: ev.color };
  
  // Set modal sheet background color
  const sheet = document.getElementById('eventDetailSheet');
  sheet.style.background = `color-mix(in srgb, ${ev.color} 85%, var(--bg))`;

  content.innerHTML = `
    <div class="event-detail-header" style="margin-top: 24px;">
      <div class="event-detail-title" style="color:#fff;">${ev.title}</div>
      ${!ev.allDay ? `<div class="event-detail-datetime" style="color:rgba(255,255,255,0.8);">${formatTimeRange(ev.start, ev.end)}</div>` : ''}
      <div class="event-detail-date-row" style="color:rgba(255,255,255,0.7);">${DAYS_SHORT[startDate.getDay()]} ${startDate.getDate()} ${MONTHS_LONG[startDate.getMonth()]}</div>
    </div>

    <div class="event-detail-list">
      <div class="event-detail-row">
        <div style="display:flex;align-items:center;gap:12px;color:#fff;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;opacity:0.8;"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span style="font-weight:600;">${calendar.name}</span>
        </div>
      </div>

      ${ev.location ? `
      <div class="event-detail-row">
        <div style="display:flex;align-items:center;gap:12px;color:#fff;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;opacity:0.8;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          <span style="font-weight:500;">${ev.location}</span>
        </div>
      </div>` : ''}

      ${travelMin ? `
      <div class="event-detail-row">
        <div style="display:flex;align-items:center;gap:12px;color:#fff;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;opacity:0.8;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span style="font-weight:500;">Travel time: ${travelMin} min</span>
        </div>
      </div>` : ''}
      
      ${weather ? `
      <div class="event-detail-row">
        <div style="display:flex;align-items:center;gap:12px;color:#fff;">
          <span style="font-size:20px;width:20px;text-align:center;">${weatherIcon}</span>
          <span style="font-weight:500;">${weather.condition}, ${weather.temperatureMax}°</span>
        </div>
      </div>` : ''}

      ${ev.notes ? `
      <div class="event-detail-row">
        <div style="display:flex;align-items:flex-start;gap:12px;color:#fff;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;opacity:0.8;margin-top:2px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span style="font-weight:400;opacity:0.9;line-height:1.4;">${ev.notes}</span>
        </div>
      </div>` : ''}

      <div class="event-detail-row">
        <div style="display:flex;align-items:center;gap:12px;color:#fff;opacity:0.8;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span style="font-weight:500;">Never (recurrence)</span>
        </div>
      </div>
    </div>

    ${countdown ? `
    <div class="event-countdown" style="margin-top:24px;">
      <div class="event-countdown-value" style="color:#fff;">${countdown}</div>
      <div class="event-countdown-label" style="color:rgba(255,255,255,0.7);">Until event</div>
    </div>` : ''}
  `;

  overlay.removeAttribute('hidden');
  overlay.focus();
  document.body.style.overflow = 'hidden';
}

// ─────────────────────────────────────────────────────────────────
// 12. TASK DETAIL MODAL
// ─────────────────────────────────────────────────────────────────

function openTaskDetail(e, id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  const list = state.lists.find(l => l.id === task.listId) || { color: '#555', name: 'Inbox' };
  const overlay = document.getElementById('taskDetailOverlay');
  if (e) triggerExpandingCircle(e, overlay, list.color);

  const content = document.getElementById('taskDetailContent');

  const checklistHtml = (task.checklist && task.checklist.length > 0)
    ? `<div style="margin:12px 0;">
        <p class="section-label" style="margin-bottom:8px;">CHECKLIST</p>
        ${task.checklist.map(item => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
            <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${item.done ? list.color : 'rgba(255,255,255,0.2)'};background:${item.done ? list.color : 'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              ${item.done ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
            </div>
            <span style="font-size:14px;${item.done ? 'text-decoration:line-through;color:var(--text-secondary)' : 'color:var(--text-primary)'}">${item.text}</span>
          </div>`).join('')}
      </div>`
    : '';

  content.innerHTML = `
    <div class="task-detail-header">
      <div class="task-detail-title">${task.title}</div>
      <div style="margin-top:8px;">
        <span class="task-detail-list-badge">
          <div style="width:8px;height:8px;border-radius:50%;background:${list.color}"></div>
          ${list.emoji || ''} ${list.name}
        </span>
      </div>
    </div>

    ${checklistHtml}

    ${task.notes ? `
    <div class="task-detail-meta-row" style="cursor:default;">
      <span style="font-size:14px;">${task.notes}</span>
      <svg class="task-detail-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
    </div>` : ''}

    <div class="task-detail-meta-row" style="cursor:default;">
      <span style="font-size:14px;">
        ${task.scheduledDate ? daysFromNow(task.scheduledDate) + ' · ' + formatDateShort(task.scheduledDate) : 'No date'}
        ${task.recurrenceRule || ''}
      </span>
      <svg class="task-detail-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    </div>

    <div class="task-detail-meta-row" style="cursor:default;">
      <span style="font-size:14px;">On the day at 8:00 am</span>
      <svg class="task-detail-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
    </div>

    <div class="task-detail-meta-row" style="cursor:default;">
      <span style="font-size:14px;">${task.deadline ? 'Due ' + daysFromNow(task.deadline) : 'No Deadline'}</span>
      <svg class="task-detail-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    </div>

    <div class="task-detail-actions">
      <button class="task-complete-big" id="completeTaskBtn" style="background:${list.color}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        ${task.completed ? 'Undo Complete' : 'Mark Complete'}
      </button>
      <button class="task-delete-btn" id="deleteTaskBtn" aria-label="Delete task">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
      </button>
    </div>`;

  document.getElementById('completeTaskBtn').addEventListener('click', () => {
    toggleTaskComplete(task.id);
    closeTaskDetail();
  });
  document.getElementById('deleteTaskBtn').addEventListener('click', () => {
    deleteTask(task.id);
    closeTaskDetail();
  });

  document.getElementById('taskDetailOverlay').removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

// ─────────────────────────────────────────────────────────────────
// 13. TASK OPERATIONS
// ─────────────────────────────────────────────────────────────────

function toggleTaskComplete(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;

  task.completed = !task.completed;
  if (task.completed) {
    task.completedAt = new Date().toISOString();
    state.archive = state.tasks.filter(t => t.completed);
    showToast(`✅ "${task.title}" completed`);
    // Animate card out
    const card = document.getElementById(`task-card-${id}`);
    if (card) {
      card.style.transition = 'opacity 0.4s, transform 0.4s';
      card.style.opacity = '0';
      card.style.transform = 'translateX(20px)';
      setTimeout(() => rerenderTimeline(), 420);
    } else {
      rerenderTimeline();
    }
  } else {
    task.completedAt = null;
    state.archive = state.tasks.filter(t => t.completed);
    rerenderTimeline();
  }
  saveState();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  state.archive = state.tasks.filter(t => t.completed);
  rerenderTimeline();
  saveState();
  showToast('Task deleted');
}

function addEvent(evData) {
  const id = `ev-${Date.now()}`;
  state.events.push({ id, ...evData, isDirty: true });
  saveState();
  rerenderTimeline();
}

function addTask(taskData) {
  const id = `t-${Date.now()}`;
  state.tasks.push({ id, ...taskData, completed: false, isDirty: true });
  saveState();
  rerenderTimeline();
}

function rerenderTimeline() {
  const scroll = document.getElementById('timelineScroll');
  const scrollTop = scroll ? scroll.scrollTop : 0;
  renderTimeline();
  if (scroll) scroll.scrollTop = scrollTop;
  
  if (state.ui.view === 'calendar') renderCalendarView();
  if (state.ui.view === 'tasks') renderTasksView();
  if (state.ui.view === 'archive') renderarchive();
  renderMiniCal();
}

// ─────────────────────────────────────────────────────────────────
// 14. SCROLL BEHAVIOR
// ─────────────────────────────────────────────────────────────────

function setupTimelineScroll() {
  const scroll = document.getElementById('timelineScroll');
  const fab = document.getElementById('scrollToTodayFab');
  let todayEl;

  function findToday() { return document.querySelector('.day-section.is-today'); }

  scroll.addEventListener('scroll', () => {
    const te = findToday();
    if (!te) return;
    const rect = te.getBoundingClientRect();
    const containerRect = scroll.getBoundingClientRect();
    const isAbove = rect.top < containerRect.top - 50;
    const isBelow = rect.bottom > containerRect.bottom + 50;
    fab.style.display = (isAbove || isBelow) ? 'flex' : 'none';
  }, { passive: true });

  fab.addEventListener('click', () => {
    todayEl = findToday();
    if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function scrollToDate(date) {
  const key = dayKey(date);
  const el = document.querySelector(`[data-date-key="${key}"]`);
  if (el) {
    switchView('timeline');
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  }
}

// ─────────────────────────────────────────────────────────────────
// 15. ADD ITEM MODAL
// ─────────────────────────────────────────────────────────────────

window.updateAddModalSheetColor = function() {
  const sheet = document.getElementById('addItemSheet');
  if (!sheet) return;
  const isEvent = document.getElementById('tabEvent').classList.contains('active');
  if (isEvent) {
    const calSelect = document.getElementById('addEventCalendar');
    if (calSelect) {
      const cal = state.calendars.find(c => c.id === calSelect.value);
      if (cal) sheet.style.background = `color-mix(in srgb, ${cal.color} 85%, var(--bg))`;
    }
  } else {
    const listSelect = document.getElementById('addTaskList');
    if (listSelect) {
      const lst = state.lists.find(l => l.id === listSelect.value);
      if (lst) sheet.style.background = `color-mix(in srgb, ${lst.color} 85%, var(--bg))`;
    }
  }
};

function openAddModal(e, type = 'event', preListId = null) {
  const overlay = document.getElementById('addItemOverlay');
  if (e) triggerExpandingCircle(e, overlay, 'var(--accent)');

  // Populate calendar select
  const calSelect = document.getElementById('addEventCalendar');
  calSelect.innerHTML = state.calendars.map(c =>
    `<option value="${c.id}">${c.name}</option>`
  ).join('');

  // Populate list select
  const listSelect = document.getElementById('addTaskList');
  listSelect.innerHTML = state.lists.map(l =>
    `<option value="${l.id}" ${l.id === preListId ? 'selected' : ''}>${l.emoji || ''} ${l.name}</option>`
  ).join('');

  // Set initial sheet color
  calSelect.addEventListener('change', window.updateAddModalSheetColor);
  listSelect.addEventListener('change', window.updateAddModalSheetColor);

  // Default times
  const now = new Date();
  const h1 = now.toISOString().slice(0,16);
  now.setHours(now.getHours() + 1);
  const h2 = now.toISOString().slice(0,16);
  document.getElementById('addEventStart').value = h1;
  document.getElementById('addEventEnd').value = h2;
  document.getElementById('addTaskDate').value = new Date().toISOString().slice(0,10);

  // Switch to correct tab
  if (type === 'task') {
    document.getElementById('tabTask').click();
  } else {
    document.getElementById('tabEvent').click();
  }

  // Ensure color starts correctly after tab click
  setTimeout(window.updateAddModalSheetColor, 0);

  overlay.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    (type === 'task'
      ? document.getElementById('addTaskTitle')
      : document.getElementById('addEventTitle')
    ).focus();
  }, 100);
}

// ─────────────────────────────────────────────────────────────────
// 16. WEATHER API (Tomorrow.io)
// ─────────────────────────────────────────────────────────────────

async function fetchWeather(dateKey) {
  if (!state.config.weatherKey || !state.config.location) return;

  const { lat, lng } = state.config.location;
  const url = `https://api.tomorrow.io/v4/timelines?location=${lat},${lng}&fields=temperatureMin,temperatureMax,weatherCode,precipitationProbability,humidity,windSpeed,uvIndex,sunriseTime,sunsetTime&timesteps=1d&startTime=${dateKey}T00:00:00Z&endTime=${dateKey}T23:59:59Z&apikey=${state.config.weatherKey}`;

  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const interval = data?.data?.timelines?.[0]?.intervals?.[0];
    if (!interval) return;
    const vals = interval.values;

    const condition = weatherCodeToText(vals.weatherCode);
    const sunriseTime = vals.sunriseTime ? new Date(vals.sunriseTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : null;
    const sunsetTime = vals.sunsetTime ? new Date(vals.sunsetTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : null;

    state.ui.weatherCache[dateKey] = {
      temperatureMin: Math.round(vals.temperatureMin),
      temperatureMax: Math.round(vals.temperatureMax),
      weatherCode: vals.weatherCode,
      condition,
      precipitationProbability: Math.round(vals.precipitationProbability),
      humidity: Math.round(vals.humidity),
      windSpeed: Math.round(vals.windSpeed),
      uvIndex: vals.uvIndex,
      sunriseTime,
      sunsetTime,
    };

    // Re-render timeline to inject weather card
    rerenderTimeline();
  } catch (e) {
    console.warn('Weather fetch failed', e);
  }
}

// Fallback: inject demo weather for today so the UI looks complete
function injectDemoWeather() {
  const key = dayKey(new Date());
  if (state.ui.weatherCache[key]) return;
  state.ui.weatherCache[key] = {
    temperatureMin: 14, temperatureMax: 26,
    weatherCode: 1001, condition: 'Mostly Clear',
    precipitationProbability: 0, humidity: 52,
    windSpeed: 9, uvIndex: 7,
    sunriseTime: '6:13 AM', sunsetTime: '8:42 PM',
  };
  const key2 = dayKey((() => { const d = new Date(); d.setDate(d.getDate()+1); return d; })());
  state.ui.weatherCache[key2] = {
    temperatureMin: 12, temperatureMax: 22,
    weatherCode: 4000, condition: 'Rainy',
    precipitationProbability: 80, humidity: 78,
    windSpeed: 14, uvIndex: 2,
    sunriseTime: '6:14 AM', sunsetTime: '8:41 PM',
  };
}

function weatherCodeToText(code) {
  const map = { 1000:'Clear',1001:'Mostly Clear',1100:'Partly Cloudy',1101:'Partly Cloudy',1102:'Cloudy',2000:'Foggy',4000:'Rainy',4001:'Heavy Rain',4200:'Light Rain',4201:'Heavy Rain',5000:'Snowy',5001:'Flurries',8000:'Thunderstorm' };
  return map[code] || 'Variable';
}

// ─────────────────────────────────────────────────────────────────
// 17. GEMINI AI NLP PARSER
// ─────────────────────────────────────────────────────────────────

async function parseWithGemini(input) {
  if (!state.config.geminiKey) {
    showToast('⚠️ Add your Gemini API key in Settings first');
    return;
  }

  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const systemPrompt = `You are the intelligent input parser for Sequent, a unified calendar and tasks app.

CONTEXT:
- Current date/time (ISO 8601): ${now.toISOString()}
- User's local timezone: ${tz}

TASK:
Parse the user's free-form input and return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "calendarEvents": [
    {
      "title": "string",
      "startTime": "ISO 8601 with timezone",
      "endTime": "ISO 8601 with timezone",
      "isAllDay": false,
      "location": "string or null",
      "notes": "string or null",
      "calendarId": "work|personal|family|health|other"
    }
  ],
  "tasks": [
    {
      "title": "string",
      "listName": "string (Around Home|Work Projects|Trip Planning|Films to Watch|Groceries|Inbox)",
      "dueDate": "ISO date string or null",
      "deadline": "ISO date string or null",
      "priority": "urgent|normal|someday",
      "notes": "string or null"
    }
  ],
  "clarification": "string or null",
  "confidence": 0.0-1.0
}

RULES:
- Resolve ALL relative times ("this Tuesday", "tomorrow at 3PM", "next week") using the current date.
- Items with a specific time → calendarEvents. Items without a time → tasks.
- Default event duration: meetings/reviews = 1 hour, quick events = 30 min.
- "buy", "get", "add to list", "remind me to" → tasks.
- Map lists intelligently: grocery/food items → Groceries, work/meeting/project → Work Projects, travel/flight/hotel → Trip Planning, home/clean/fix → Around Home.
- Return ONLY the JSON object. No extra text.`;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${state.config.geminiKey}`;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt + '\n\nUser input: ' + input }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('No content in response');

    const parsed = JSON.parse(text);
    return applyAiResult(parsed, input);

  } catch (err) {
    console.error('Gemini error', err);
    showToast('❌ AI parse failed: ' + err.message.slice(0, 40));
    return null;
  }
}

function applyAiResult(result, originalInput) {
  let added = 0;
  const eventsAdded = [];
  const tasksAdded = [];

  // Add events
  (result.calendarEvents || []).forEach(ev => {
    const id = `ev-ai-${Date.now()}-${added++}`;
    const color = CAL_COLORS[ev.calendarId] || CAL_COLORS.personal;
    const newEv = {
      id, title: ev.title,
      start: ev.startTime, end: ev.endTime,
      allDay: ev.isAllDay || false,
      calendarId: ev.calendarId || 'personal',
      color, location: ev.location || null,
      notes: ev.notes || null, isDirty: true,
    };
    state.events.push(newEv);
    eventsAdded.push(ev.title);
  });

  // Add tasks
  (result.tasks || []).forEach(t => {
    const id = `t-ai-${Date.now()}-${added++}`;
    // Find matching list
    const listName = t.listName || 'Inbox';
    let list = state.lists.find(l => l.name.toLowerCase().includes(listName.toLowerCase()));
    if (!list) list = state.lists[0] || { id: 'list-1' };

    const newTask = {
      id, title: t.title, listId: list.id,
      priority: t.priority || 'normal',
      schedule: t.dueDate ? 'date' : 'noDate',
      scheduledDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
      deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
      notes: t.notes || null, checklist: [],
      completed: false, isDirty: true,
    };
    state.tasks.push(newTask);
    tasksAdded.push(t.title);
  });

  saveState();
  rerenderTimeline();

  // Show result chip
  const summaryParts = [];
  if (eventsAdded.length) summaryParts.push(`📅 ${eventsAdded.length} event${eventsAdded.length > 1 ? 's' : ''}`);
  if (tasksAdded.length) summaryParts.push(`✅ ${tasksAdded.length} task${tasksAdded.length > 1 ? 's' : ''}`);

  if (summaryParts.length) {
    const chip = document.getElementById('aiResultChip');
    chip.innerHTML = `<span class="chip-label">Added: </span>${summaryParts.join(' · ')} — <em>${[...eventsAdded, ...tasksAdded].join(', ')}</em>`;
    chip.removeAttribute('hidden');
    setTimeout(() => chip.setAttribute('hidden', ''), 6000);
  }

  if (result.clarification) {
    showToast('💬 ' + result.clarification);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────
// 18. VIEW SWITCHING
// ─────────────────────────────────────────────────────────────────

function switchView(viewName) {
  state.ui.view = viewName;
  document.body.dataset.view = viewName;

  // Sections
  ['timeline', 'calendar', 'tasks', 'archive'].forEach(v => {
    const elId = v === 'archive' ? 'viewArchive' : `view${v.charAt(0).toUpperCase() + v.slice(1)}`;
    const el = document.getElementById(elId);
    if (el) {
      if (v === viewName) { el.removeAttribute('hidden'); el.classList.add('active'); }
      else { el.setAttribute('hidden', ''); el.classList.remove('active'); }
    }
  });

  // Nav items (sidebar)
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Bottom nav
  document.querySelectorAll('.bottom-nav-item[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // Render correct view
  if (viewName === 'calendar') renderCalendarView();
  if (viewName === 'tasks') renderTasksView();
  if (viewName === 'archive') renderarchive();
}

// ─────────────────────────────────────────────────────────────────
// 19. TOAST
// ─────────────────────────────────────────────────────────────────

let toastTimer;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ─────────────────────────────────────────────────────────────────
// 20. UPDATE TOP BAR
// ─────────────────────────────────────────────────────────────────

function updateTopBar() {
  const todayDate = new Date();
  const weekNum = getWeekNumber(todayDate);
  const dayName = DAYS_SHORT[todayDate.getDay()];
  document.getElementById('topbarTodayLabel').textContent = 'TODAY';
  document.getElementById('topbarWeekLabel').textContent = `${MONTHS_SHORT[todayDate.getMonth()]} ${todayDate.getDate()}, WEEK ${weekNum}`;
}

// ─────────────────────────────────────────────────────────────────
// 21. MINI CALENDAR NAVIGATION
// ─────────────────────────────────────────────────────────────────

document.getElementById('miniCalPrev').addEventListener('click', () => {
  state.ui.miniCalDate.setMonth(state.ui.miniCalDate.getMonth() - 1);
  renderMiniCal();
});
document.getElementById('miniCalNext').addEventListener('click', () => {
  state.ui.miniCalDate.setMonth(state.ui.miniCalDate.getMonth() + 1);
  renderMiniCal();
});

// ─────────────────────────────────────────────────────────────────
// 22. NAVIGATION & ROUTING
// ─────────────────────────────────────────────────────────────────

// Sidebar nav
// Sidebar nav
document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => {
    switchView(btn.dataset.view);
    if (btn.id === 'navCalendar') {
      const accordion = document.getElementById('navCalendarAccordion');
      if (accordion) accordion.classList.toggle('expanded');
    }
  });
});

// Bottom nav
document.querySelectorAll('.bottom-nav-item[data-view]').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// Add buttons
document.getElementById('btnAddTopbar').addEventListener('click', e => openAddModal(e, 'event'));
document.getElementById('btnAddMobile')?.addEventListener('click', e => openAddModal(e, 'event'));
document.getElementById('btnAddList').addEventListener('click', e => openAddModal(e, 'task'));

// Modal color tinting — colors the sheet, not the background
function triggerExpandingCircle(e, overlay, color) {
  const sheet = overlay.querySelector('.modal-sheet');
  if (!sheet) return;
  // Apply the color as a subtle tint on the glassmorphic sheet
  const resolvedColor = color.startsWith('var(') ? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() : color;
  sheet.style.background = `linear-gradient(135deg, rgba(20,20,26,0.88), rgba(20,20,26,0.92)), linear-gradient(135deg, ${resolvedColor}22, ${resolvedColor}08)`;
  sheet.style.borderColor = `${resolvedColor}25`;
  sheet.style.boxShadow = `0 24px 80px rgba(0,0,0,0.6), 0 0 80px ${resolvedColor}15, 0 0 0 1px ${resolvedColor}12 inset`;
  // Color the hero icon  
  const heroIcon = overlay.querySelector('.modal-hero-icon svg');
  if (heroIcon) {
    heroIcon.style.color = resolvedColor;
    heroIcon.style.filter = `drop-shadow(0 4px 16px ${resolvedColor}60)`;
  }
}

// Mobile hamburger
document.getElementById('btnMobileMenu').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('mobile-open');
  // Create overlay if needed
  let overlay = document.getElementById('sidebarMobileOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'sidebarMobileOverlay';
    overlay.className = 'sidebar-mobile-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('show');
    });
  }
  overlay.classList.toggle('show', sidebar.classList.contains('mobile-open'));
});

// ─────────────────────────────────────────────────────────────────
// 23. MODALS
// ─────────────────────────────────────────────────────────────────

// Close event detail
document.getElementById('eventDetailClose').addEventListener('click', closeEventDetail);
document.getElementById('eventDetailOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeEventDetail();
});
function closeEventDetail() {
  const overlay = document.getElementById('eventDetailOverlay');
  overlay.setAttribute('hidden', '');
  const sheet = overlay.querySelector('.modal-sheet');
  if (sheet) { sheet.style.background = ''; sheet.style.borderColor = ''; sheet.style.boxShadow = ''; }
  document.body.style.overflow = '';
}

// Close task detail
document.getElementById('taskDetailClose').addEventListener('click', closeTaskDetail);
document.getElementById('taskDetailOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeTaskDetail();
});
function closeTaskDetail() {
  const overlay = document.getElementById('taskDetailOverlay');
  overlay.setAttribute('hidden', '');
  const sheet = overlay.querySelector('.modal-sheet');
  if (sheet) { sheet.style.background = ''; sheet.style.borderColor = ''; sheet.style.boxShadow = ''; }
  document.body.style.overflow = '';
}

// Add modal tabs
document.querySelectorAll('.add-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.add-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    const type = tab.dataset.type;
    const track = document.getElementById('addFormsTrack');
    if (track) {
      if (type === 'task') track.classList.add('show-task');
      else track.classList.remove('show-task');
    }
    window.updateAddModalSheetColor();
  });
});

// Close add modal
function closeAddModal() {
  const overlay = document.getElementById('addItemOverlay');
  overlay.setAttribute('hidden', '');
  const sheet = overlay.querySelector('.modal-sheet');
  if (sheet) { sheet.style.background = ''; sheet.style.borderColor = ''; sheet.style.boxShadow = ''; }
  document.body.style.overflow = '';
}
document.getElementById('cancelAddEvent').addEventListener('click', closeAddModal);
document.getElementById('cancelAddTask').addEventListener('click', closeAddModal);
document.getElementById('addItemOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeAddModal();
});

// Save event
document.getElementById('addEventForm').addEventListener('submit', e => {
  e.preventDefault();
  const title    = document.getElementById('addEventTitle').value.trim();
  const start    = document.getElementById('addEventStart').value;
  const end      = document.getElementById('addEventEnd').value;
  const location = document.getElementById('addEventLocation').value.trim() || null;
  const calId    = document.getElementById('addEventCalendar').value;
  const notes    = document.getElementById('addEventNotes').value.trim() || null;
  if (!title || !start || !end) return;
  addEvent({
    title, start: new Date(start).toISOString(), end: new Date(end).toISOString(),
    allDay: false, calendarId: calId, color: CAL_COLORS[calId] || CAL_COLORS.personal,
    location, notes
  });
  closeAddModal();
  showToast(`📅 "${title}" added to timeline`);
  document.getElementById('addEventForm').reset();
});

// Save task
document.getElementById('addTaskForm').addEventListener('submit', e => {
  e.preventDefault();
  const title    = document.getElementById('addTaskTitle').value.trim();
  const listId   = document.getElementById('addTaskList').value;
  const priority = document.getElementById('addTaskPriority').value;
  const dueDate  = document.getElementById('addTaskDate').value;
  const notes    = document.getElementById('addTaskNotes').value.trim() || null;
  if (!title) return;
  addTask({
    title, listId, priority,
    schedule: dueDate ? 'date' : 'noDate',
    scheduledDate: dueDate ? new Date(dueDate).toISOString() : null,
    deadline: null, notes, checklist: []
  });
  closeAddModal();
  showToast(`✅ "${title}" added to your list`);
  document.getElementById('addTaskForm').reset();
});

// Settings
document.getElementById('btnSettings').addEventListener('click', openSettings);
const btnSettingsMobile = document.getElementById('btnSettingsMobile');
if (btnSettingsMobile) btnSettingsMobile.addEventListener('click', openSettings);
document.getElementById('settingsClose').addEventListener('click', closeSettings);
document.getElementById('settingsOverlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeSettings();
});

function openSettings() {
  document.getElementById('geminiKey').value = state.config.geminiKey || '';
  document.getElementById('weatherKey').value = state.config.weatherKey || '';
  document.getElementById('supabaseUrl').value = state.config.supabaseUrl || '';
  document.getElementById('supabaseKey').value = state.config.supabaseKey || '';
  if (state.config.location) {
    document.getElementById('settingsLocationText').textContent =
      `${state.config.location.name || ''} (${state.config.location.lat.toFixed(4)}, ${state.config.location.lng.toFixed(4)})`;
  }
  document.getElementById('settingsOverlay').removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}
function closeSettings() {
  document.getElementById('settingsOverlay').setAttribute('hidden', '');
  document.body.style.overflow = '';
}

document.getElementById('saveSettings').addEventListener('click', () => {
  state.config.geminiKey   = document.getElementById('geminiKey').value.trim();
  state.config.weatherKey  = document.getElementById('weatherKey').value.trim();
  state.config.supabaseUrl = document.getElementById('supabaseUrl').value.trim();
  state.config.supabaseKey = document.getElementById('supabaseKey').value.trim();
  saveState();
  closeSettings();
  showToast('✅ Settings saved');
  // Fetch weather now if key is set
  if (state.config.weatherKey && state.config.location) {
    fetchWeather(dayKey(new Date()));
  }
});

document.getElementById('btnDetectLocation').addEventListener('click', () => {
  if (!navigator.geolocation) { showToast('Geolocation not supported'); return; }
  navigator.geolocation.getCurrentPosition(pos => {
    state.config.location = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      name: 'Current location'
    };
    document.getElementById('settingsLocationText').textContent =
      `Current location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`;
    showToast('📍 Location detected');
    if (state.config.weatherKey) fetchWeather(dayKey(new Date()));
  }, () => showToast('❌ Location access denied'));
});

document.getElementById('btnConnectGoogle').addEventListener('click', () => {
  showToast('🔗 Google OAuth requires a backend redirect URI — configure Supabase Auth first');
});
document.getElementById('btnConnectMicrosoft').addEventListener('click', () => {
  showToast('🔗 Microsoft OAuth requires MSAL setup with your tenant ID');
});

// ─────────────────────────────────────────────────────────────────
// 24. THEME SWITCHER
// ─────────────────────────────────────────────────────────────────

document.querySelectorAll('.swatch').forEach(swatch => {
  swatch.addEventListener('click', () => {
    const theme = swatch.dataset.theme;
    // Remove old theme class
    document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
    document.body.classList.add('theme-dark', `theme-${theme}`);
    state.config.theme = theme;
    saveState();
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
    showToast(`🎨 ${theme.charAt(0).toUpperCase() + theme.slice(1)} theme`);
  });
});

// ─────────────────────────────────────────────────────────────────
// 25. AI INPUT BAR
// ─────────────────────────────────────────────────────────────────

const aiInput = document.getElementById('aiInput');
const aiSendBtn = document.getElementById('aiSendBtn');
const aiMicBtn = document.getElementById('aiMicBtn');

aiSendBtn.addEventListener('click', handleAiSend);
aiInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleAiSend();
  }
});

async function handleAiSend() {
  const input = aiInput.value.trim();
  if (!input) return;
  aiInput.value = '';
  aiInput.disabled = true;
  aiSendBtn.disabled = true;
  aiSendBtn.style.opacity = '0.5';

  showToast('🤖 Parsing with Gemini...');

  try {
    await parseWithGemini(input);
  } finally {
    aiInput.disabled = false;
    aiSendBtn.disabled = false;
    aiSendBtn.style.opacity = '';
    aiInput.focus();
  }
}

// Voice input (Web Speech API)
let recognition;
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = e => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    aiInput.value = transcript;
  };
  recognition.onend = () => {
    state.ui.listening = false;
    aiMicBtn.classList.remove('listening');
    if (aiInput.value.trim()) handleAiSend();
  };
  recognition.onerror = () => {
    state.ui.listening = false;
    aiMicBtn.classList.remove('listening');
    showToast('🎙️ Voice not recognized');
  };

  aiMicBtn.addEventListener('click', () => {
    if (state.ui.listening) {
      recognition.stop();
    } else {
      recognition.start();
      state.ui.listening = true;
      aiMicBtn.classList.add('listening');
      showToast('🎙️ Listening...');
    }
  });
} else {
  aiMicBtn.title = 'Voice not supported in this browser';
  aiMicBtn.style.opacity = '0.3';
}

// ─────────────────────────────────────────────────────────────────
// 26. ESCAPE KEY — close all modals
// ─────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeEventDetail();
    closeTaskDetail();
    closeAddModal();
    closeSettings();
  }
});

// ─────────────────────────────────────────────────────────────────
// 27. APPLY SAVED THEME
// ─────────────────────────────────────────────────────────────────

function applySavedTheme() {
  const theme = state.config.theme || 'amber';
  document.body.className = document.body.className.replace(/theme-\S+/g, '').trim();
  document.body.classList.add('theme-dark', `theme-${theme}`);
  document.querySelectorAll('.swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.theme === theme);
  });
}

// ─────────────────────────────────────────────────────────────────
// CALENDAR VIEW RENDERING FUNCTIONS
// ─────────────────────────────────────────────────────────────────

state.ui.calendarDate = new Date();
state.ui.calendarView = 'month'; // 'month' | 'week' | 'workweek'
state.ui.calendarSelectedDate = new Date();

function renderCalendarView() {
  const currentView = state.ui.calendarView;
  
  // Toggle subviews
  const monthView = document.getElementById('calViewMonth');
  const weekView = document.getElementById('calViewWeek');
  
  monthView.hidden = (currentView !== 'month');
  weekView.hidden = (currentView === 'month');
  
  monthView.classList.toggle('active', currentView === 'month');
  weekView.classList.toggle('active', currentView !== 'month');
  
  // Switcher state
  document.querySelectorAll('.calendar-tab').forEach(btn => {
    const isActive = btn.dataset.calview === currentView;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  
  const d = state.ui.calendarDate;
  const titleText = document.getElementById('calendarTitleText');
  
  if (currentView === 'month') {
    titleText.textContent = `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
    renderCalendarMonth();
  } else {
    // Week or Work Week view range
    const currentDay = d.getDay();
    const distance = (currentDay === 0 ? 6 : currentDay - 1);
    const startOfWeek = new Date(d);
    startOfWeek.setDate(d.getDate() - distance);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + (currentView === 'workweek' ? 4 : 6));
    
    const startStr = `${startOfWeek.getDate()} ${MONTHS_SHORT[startOfWeek.getMonth()]}`;
    const endStr = `${endOfWeek.getDate()} ${MONTHS_SHORT[endOfWeek.getMonth()]} ${endOfWeek.getFullYear()}`;
    titleText.textContent = `${startStr} — ${endStr}`;
    
    renderCalendarWeek();
  }
}

function renderCalendarMonth() {
  const grid = document.getElementById('monthGrid');
  grid.innerHTML = '';
  
  const d = state.ui.calendarDate;
  const year = d.getFullYear(), month = d.getMonth();
  
  const firstDayTemp = new Date(year, month, 1).getDay();
  const firstDay = firstDayTemp === 0 ? 6 : firstDayTemp - 1; // 0=Mon, 6=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const prevMonthDaysCount = new Date(year, month, 0).getDate();
  for (let i = 0; i < firstDay; i++) {
    const dayNum = prevMonthDaysCount - firstDay + i + 1;
    const cellDate = new Date(year, month - 1, dayNum);
    grid.appendChild(createMonthCell(cellDate, false));
  }
  
  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(year, month, day);
    grid.appendChild(createMonthCell(cellDate, true));
  }
  
  const totalCells = 42;
  const addedCells = firstDay + daysInMonth;
  const remaining = totalCells - addedCells;
  for (let day = 1; day <= remaining; day++) {
    const cellDate = new Date(year, month + 1, day);
    grid.appendChild(createMonthCell(cellDate, false));
  }
  
  renderMonthSelectedDayDetails();
}

function createMonthCell(cellDate, isCurrentMonth) {
  const cell = document.createElement('div');
  cell.className = `month-day-cell${!isCurrentMonth ? ' other-month' : ''}`;
  
  const todayDate = today();
  const isToday = isSameDay(cellDate, todayDate);
  if (isToday) cell.classList.add('today');
  
  const isSelected = isSameDay(cellDate, state.ui.calendarSelectedDate);
  if (isSelected) cell.classList.add('selected');
  
  const num = document.createElement('span');
  num.className = 'month-day-num';
  num.textContent = cellDate.getDate();
  cell.appendChild(num);
  
  const dayEvents = state.events.filter(ev => isSameDay(ev.start, cellDate) || (ev.allDay && new Date(cellDate) >= new Date(ev.start).setHours(0,0,0,0) && new Date(cellDate) < new Date(ev.end).setHours(0,0,0,0)));
  const dayTasks = state.tasks.filter(t => !t.completed && t.scheduledDate && isSameDay(t.scheduledDate, cellDate));
  
  const totalItems = dayEvents.length + dayTasks.length;
  if (totalItems > 0) {
    if (totalItems <= 1) cell.classList.add('heatmap-1');
    else if (totalItems <= 3) cell.classList.add('heatmap-2');
    else cell.classList.add('heatmap-3');
  }
  
  if (dayEvents.length > 0 || dayTasks.length > 0) {
    const listContainer = document.createElement('div');
    listContainer.className = 'month-day-events-list';
    
    const allItems = [
      ...dayEvents.map(e => ({ title: e.title, color: e.color })),
      ...dayTasks.map(t => ({ title: t.title, color: '#555' }))
    ].slice(0, 4); // show up to 4 items max
    
    allItems.forEach(item => {
      const el = document.createElement('div');
      el.className = 'month-day-event-item';
      el.textContent = item.title;
      el.style.borderLeftColor = item.color;
      listContainer.appendChild(el);
    });
    cell.appendChild(listContainer);
  }
  
  cell.addEventListener('click', () => {
    state.ui.calendarSelectedDate = cellDate;
    document.querySelectorAll('.month-day-cell').forEach(c => c.classList.remove('selected'));
    cell.classList.add('selected');
    renderMonthSelectedDayDetails();
  });
  
  cell.addEventListener('dblclick', () => {
    openAddModalWithDate('event', cellDate);
  });
  
  return cell;
}

function renderMonthSelectedDayDetails() {
  const title = document.getElementById('monthSelectedDayTitle');
  const container = document.getElementById('monthSelectedDayEvents');
  const selDate = state.ui.calendarSelectedDate;
  
  title.textContent = `${DAYS_SHORT[selDate.getDay()]}, ${MONTHS_LONG[selDate.getMonth()]} ${selDate.getDate()} ${selDate.getFullYear()}`;
  container.innerHTML = '';
  
  // Trigger animation
  container.classList.remove('animate-in');
  void container.offsetWidth; // force reflow
  container.classList.add('animate-in');
  
  const dayEvents = state.events.filter(ev => isSameDay(ev.start, selDate) || (ev.allDay && new Date(selDate) >= new Date(ev.start).setHours(0,0,0,0) && new Date(selDate) < new Date(ev.end).setHours(0,0,0,0)));
  const dayTasks = state.tasks.filter(t => !t.completed && t.scheduledDate && isSameDay(t.scheduledDate, selDate));
  
  if (dayEvents.length === 0 && dayTasks.length === 0) {
    container.innerHTML = `<div class="day-empty">No events or tasks scheduled for this day. Double-click cell to add.</div>`;
    return;
  }
  
  if (dayEvents.length > 0) {
    const lbl = createSectionLabel('Calendar Events');
    container.appendChild(lbl);
    dayEvents.forEach(ev => {
      container.appendChild(ev.allDay ? createAllDayChip(ev) : createEventCard(ev));
    });
  }
  
  if (dayTasks.length > 0) {
    const lbl = createSectionLabel('Tasks');
    container.appendChild(lbl);
    dayTasks.forEach(t => {
      container.appendChild(createTaskCard(t));
    });
  }
}

function openAddModalWithDate(type = 'event', date) {
  openAddModal(type);
  const dateStr = date.toISOString().slice(0, 10);
  if (type === 'task') {
    document.getElementById('addTaskDate').value = dateStr;
  } else {
    const startStr = `${dateStr}T09:00`;
    const endStr = `${dateStr}T10:00`;
    document.getElementById('addEventStart').value = startStr;
    document.getElementById('addEventEnd').value = endStr;
  }
}

function renderCalendarWeek() {
  const container = document.getElementById('weekColumnsContainer');
  const headerContainer = document.getElementById('weekHeaderCols');
  const hoursGutter = document.getElementById('weekHoursGutter');
  
  container.innerHTML = '';
  headerContainer.innerHTML = '';
  hoursGutter.innerHTML = '';
  
  const d = state.ui.calendarDate;
  const isWorkWeek = state.ui.calendarView === 'workweek';
  const numDays = isWorkWeek ? 5 : 7;
  
  const weekViewContainer = document.querySelector('.week-view-container');
  if (weekViewContainer) {
    weekViewContainer.classList.toggle('work-week', isWorkWeek);
  }
  
  const currentDay = d.getDay();
  const distance = (currentDay === 0 ? 6 : currentDay - 1);
  const monday = new Date(d);
  monday.setDate(monday.getDate() - distance);
  
  const todayDate = today();
  
  // Render Hours Gutter
  for (let h = 0; h < 24; h++) {
    const label = document.createElement('div');
    label.className = 'week-hour-label';
    if (h >= 9 && h < 17) label.classList.add('business-hour');
    const displayHour = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    label.textContent = `${displayHour} ${ampm}`;
    hoursGutter.appendChild(label);
  }
  
  const daysOfWeek = [];
  for (let i = 0; i < numDays; i++) {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    daysOfWeek.push(dayDate);
  }
  
  // Render headers
  daysOfWeek.forEach(dayDate => {
    const isToday = isSameDay(dayDate, todayDate);
    const label = document.createElement('div');
    label.className = `week-header-col-label${isToday ? ' today' : ''}`;
    
    const dow = document.createElement('span');
    dow.className = 'week-header-dow';
    dow.textContent = DAYS_SHORT[dayDate.getDay()];
    
    const dom = document.createElement('div');
    dom.className = 'week-header-dom';
    dom.textContent = dayDate.getDate();
    
    label.appendChild(dow);
    label.appendChild(dom);
    headerContainer.appendChild(label);
  });
  
  // Render day columns
  daysOfWeek.forEach(dayDate => {
    const column = document.createElement('div');
    const isToday = isSameDay(dayDate, todayDate);
    column.className = `week-column${isToday ? ' today' : ''}`;
    column.dataset.dateKey = dayKey(dayDate);

    // Business hours shading (9AM-5PM)
    const bizShade = document.createElement('div');
    bizShade.className = 'week-business-hours';
    bizShade.style.top = `${9 * 60}px`;
    bizShade.style.height = `${8 * 60}px`;
    column.appendChild(bizShade);
    
    column.addEventListener('dragover', e => {
      e.preventDefault();
      column.style.background = 'rgba(255, 255, 255, 0.05)';
    });
    
    column.addEventListener('dragleave', () => {
      column.style.background = '';
    });
    
    column.addEventListener('drop', async e => {
      e.preventDefault();
      column.style.background = '';
      const evId = e.dataTransfer.getData('text/plain');
      const ev = state.events.find(event => event.id === evId);
      if (!ev) return;
      
      const rect = column.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const dropHourFloat = y / 60;
      const dropHour = Math.round(dropHourFloat * 4) / 4;
      
      const date = new Date(dayDate);
      date.setHours(Math.floor(dropHour));
      date.setMinutes((dropHour % 1) * 60);
      
      const duration = new Date(ev.end) - new Date(ev.start);
      ev.start = date.toISOString();
      ev.end = new Date(date.getTime() + duration).toISOString();
      
      saveState();
      renderCalendarView();
      showToast(`Rescheduled: ${ev.title} to ${formatTime(ev.start)}`);
    });
    
    column.addEventListener('click', e => {
      if (e.target !== column) return;
      const rect = column.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hourFloat = y / 60;
      const hour = Math.floor(hourFloat);
      
      const clickDate = new Date(dayDate);
      clickDate.setHours(hour);
      clickDate.setMinutes(0);
      
      openAddModalWithDate('event', clickDate);
    });
    
    const dayEvents = state.events.filter(ev => !ev.allDay && isSameDay(ev.start, dayDate));
    
    dayEvents.forEach(ev => {
      const card = document.createElement('div');
      card.className = 'week-event-card';
      card.style.background = ev.color;
      card.draggable = true;
      
      const startDate = new Date(ev.start);
      const endDate = new Date(ev.end);
      const startHour = startDate.getHours() + startDate.getMinutes() / 60;
      const duration = Math.max(0.5, (endDate - startDate) / 3600000);
      
      card.style.top = `${startHour * 60}px`;
      card.style.height = `${duration * 60}px`;
      
      card.innerHTML = `
        <div class="week-event-title">${ev.title}</div>
        <div class="week-event-time">${formatTime(ev.start)}</div>
      `;
      
      card.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', ev.id);
        card.style.opacity = '0.4';
      });
      
      card.addEventListener('dragend', () => {
        card.style.opacity = '';
      });
      
      card.addEventListener('click', e => {
        e.stopPropagation();
        openEventDetail(e, ev.id);
      });
      
      column.appendChild(card);
    });
    
    if (isToday) {
      const nowIndicator = document.createElement('div');
      nowIndicator.className = 'week-now-indicator';
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      nowIndicator.style.top = `${currentHour * 60}px`;
      column.appendChild(nowIndicator);
    }
    
    container.appendChild(column);
  });
  
  startNowLineTimer();
}

let nowLineInterval;
function startNowLineTimer() {
  clearInterval(nowLineInterval);
  nowLineInterval = setInterval(() => {
    const indicator = document.querySelector('.week-now-indicator');
    if (indicator) {
      const now = new Date();
      const currentHour = now.getHours() + now.getMinutes() / 60;
      indicator.style.top = `${currentHour * 60}px`;
    }
  }, 60000);
}

// ─────────────────────────────────────────────────────────────────
// TASKS VIEW RENDERING FUNCTIONS
// ─────────────────────────────────────────────────────────────────

state.ui.tasksView = 'schedule';

function renderTasksView() {
  const currentView = state.ui.tasksView;
  
  document.getElementById('tasksSubViewSchedule').hidden = (currentView !== 'schedule');
  document.getElementById('tasksSubViewBoard').hidden = (currentView !== 'board');
  document.getElementById('tasksSubViewAll').hidden = (currentView !== 'all');
  
  document.querySelectorAll('.tasks-tab').forEach(btn => {
    const isActive = btn.dataset.subview === currentView;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  
  if (currentView === 'schedule') {
    renderTasksSchedule();
  } else if (currentView === 'board') {
    renderListsGrid();
  } else if (currentView === 'all') {
    renderTasksAll();
  }
}

function renderTasksSchedule() {
  const body = document.getElementById('scheduleFullBody');
  body.innerHTML = '';
  
  const today_d = today();
  
  const groups = [
    { id: 'today', label: 'Today', filter: t => t.scheduledDate && isSameDay(t.scheduledDate, today_d) },
    { id: 'tomorrow', label: 'Tomorrow', filter: t => t.scheduledDate && isSameDay(t.scheduledDate, (() => { const d = new Date(today_d); d.setDate(d.getDate()+1); return d; })()) },
    { id: 'thisWeek', label: 'This Week', filter: t => {
      if (!t.scheduledDate) return false;
      const tDate = new Date(t.scheduledDate).setHours(0,0,0,0);
      const nextWeek = new Date(today_d); nextWeek.setDate(today_d.getDate() + 7);
      const tomorrow = new Date(today_d); tomorrow.setDate(today_d.getDate() + 1);
      return tDate > tomorrow.getTime() && tDate < nextWeek.getTime();
    }},
    { id: 'someday', label: 'Someday', filter: t => {
      if (t.schedule === 'someday' || !t.scheduledDate) return true;
      const tDate = new Date(t.scheduledDate).setHours(0,0,0,0);
      const nextWeek = new Date(today_d); nextWeek.setDate(today_d.getDate() + 7);
      return tDate >= nextWeek.getTime();
    }}
  ];
  
  groups.forEach(g => {
    const groupTasks = state.tasks.filter(t => !t.completed && g.filter(t));
    if (groupTasks.length === 0) return;
    
    const groupEl = document.createElement('div');
    groupEl.className = 'schedule-group';
    
    const titleEl = document.createElement('h3');
    titleEl.className = 'schedule-group-title';
    titleEl.textContent = g.label;
    
    const countEl = document.createElement('div');
    countEl.className = 'schedule-group-date';
    countEl.textContent = `${groupTasks.length} task${groupTasks.length > 1 ? 's' : ''}`;
    
    groupEl.appendChild(titleEl);
    groupEl.appendChild(countEl);
    
    groupTasks.forEach(task => {
      groupEl.appendChild(createTaskCard(task));
    });
    
    groupEl.addEventListener('dragover', e => {
      e.preventDefault();
      groupEl.style.background = 'rgba(255,255,255,0.02)';
    });
    groupEl.addEventListener('dragleave', () => {
      groupEl.style.background = '';
    });
    groupEl.addEventListener('drop', e => {
      e.preventDefault();
      groupEl.style.background = '';
      const taskId = e.dataTransfer.getData('text/plain');
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;
      
      if (g.id === 'today') {
        task.schedule = 'date';
        task.scheduledDate = today_d.toISOString();
      } else if (g.id === 'tomorrow') {
        task.schedule = 'date';
        const tom = new Date(today_d); tom.setDate(today_d.getDate() + 1);
        task.scheduledDate = tom.toISOString();
      } else if (g.id === 'thisWeek') {
        task.schedule = 'date';
        const tw = new Date(today_d); tw.setDate(today_d.getDate() + 3);
        task.scheduledDate = tw.toISOString();
      } else if (g.id === 'someday') {
        task.schedule = 'someday';
        task.scheduledDate = null;
      }
      saveState();
      renderTasksSchedule();
      renderTimeline(); // sync
    });
    
    body.appendChild(groupEl);
  });
  
  if (body.children.length === 0) {
    body.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px;grid-column: 1 / -1;">No active tasks! Add a task using the AI bar or "+" button.</div>`;
  }
}

function renderTasksAll() {
  const container = document.getElementById('tasksAllList');
  container.innerHTML = '';
  
  const priorityWeight = { urgent: 0, normal: 1, someday: 2 };
  const allTasks = state.tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      const pDiff = priorityWeight[a.priority] - priorityWeight[b.priority];
      if (pDiff !== 0) return pDiff;
      if (a.scheduledDate && b.scheduledDate) return new Date(a.scheduledDate) - new Date(b.scheduledDate);
      if (a.scheduledDate) return -1;
      if (b.scheduledDate) return 1;
      return 0;
    });
    
  allTasks.forEach(task => {
    const list = state.lists.find(l => l.id === task.listId) || { name: 'Inbox', color: '#555' };
    
    const row = document.createElement('div');
    row.className = 'all-tasks-row';
    
    const left = document.createElement('div');
    left.className = 'all-tasks-left';
    
    const colorBar = document.createElement('div');
    colorBar.className = 'all-tasks-color-bar';
    colorBar.style.background = list.color;
    
    const titleWrap = document.createElement('div');
    titleWrap.className = 'all-tasks-title-wrap';
    
    const title = document.createElement('div');
    title.className = 'all-tasks-title';
    title.textContent = task.title;
    
    const meta = document.createElement('div');
    meta.className = 'all-tasks-meta';
    
    let metaText = list.name.toUpperCase();
    if (task.scheduledDate) metaText += ` · 📅 ${formatDateShort(task.scheduledDate)}`;
    if (task.deadline) metaText += ` · ⏳ ${daysFromNow(task.deadline)}`;
    if (PRIORITY_ICON[task.priority]) metaText += ` · ${PRIORITY_ICON[task.priority]}`;
    
    meta.textContent = metaText;
    
    titleWrap.appendChild(title);
    titleWrap.appendChild(meta);
    left.appendChild(colorBar);
    left.appendChild(titleWrap);
    
    const completeBtn = document.createElement('button');
    completeBtn.className = 'task-complete-btn';
    completeBtn.style.borderColor = list.color;
    completeBtn.style.position = 'static';
    completeBtn.style.marginLeft = '12px';
    completeBtn.setAttribute('aria-label', 'Complete task');
    completeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="width:12px;height:12px;stroke:${list.color}"><polyline points="20 6 9 17 4 12"/></svg>`;
    
    completeBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleTaskComplete(task.id);
      setTimeout(() => renderTasksAll(), 450);
    });
    
    row.appendChild(left);
    row.appendChild(completeBtn);
    
    row.addEventListener('click', e => {
      if (e.target.closest('.task-complete-btn')) return;
      openTaskDetail(e, task.id);
    });
    
    container.appendChild(row);
  });
  
  if (allTasks.length === 0) {
    container.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:40px;">No remaining tasks!</div>`;
  }
}

function setupNewSwitchers() {
  document.querySelectorAll('.calendar-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.ui.calendarView = btn.dataset.calview;
      renderCalendarView();
    });
  });

  document.getElementById('btnCalPrev').addEventListener('click', () => adjustCalendarDate(-1));
  document.getElementById('btnCalNext').addEventListener('click', () => adjustCalendarDate(1));
  document.getElementById('btnCalToday').addEventListener('click', () => {
    state.ui.calendarDate = new Date();
    renderCalendarView();
  });

  document.querySelectorAll('.tasks-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.ui.tasksView = btn.dataset.subview;
      renderTasksView();
    });
  });

  document.getElementById('btnAddTaskFromTopbar')?.addEventListener('click', e => {
    openAddModal(e, 'task');
  });

  // Reset Demo Data
  document.getElementById('btnResetDemo')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all tasks, lists, and events and load premium demo data?')) {
      seedData();
      saveState();
      rerenderTimeline();
      closeSettings();
      showToast('✨ Demo data successfully loaded!');
    }
  });
}

function adjustCalendarDate(offset) {
  const d = state.ui.calendarDate;
  const view = state.ui.calendarView;
  if (view === 'month') {
    d.setMonth(d.getMonth() + offset);
  } else {
    d.setDate(d.getDate() + (offset * 7));
  }
  renderCalendarView();
}

function initOfflineBanner() {
  const banner = document.createElement('div');
  banner.id = 'offlineBanner';
  banner.className = 'offline-banner';
  banner.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.5M5 12.5a10.94 10.94 0 0 1 5.83-2.84M8.5 16a7.5 7.5 0 0 1 7 0M10.88 18.5a3 3 0 0 1 2.24 0"/></svg>
    <span>Offline Mode — Changes will sync when connection is restored</span>
  `;
  document.body.appendChild(banner);

  window.addEventListener('online', () => {
    banner.classList.remove('visible');
    showToast('⚡ Back online!');
  });

  window.addEventListener('offline', () => {
    banner.classList.add('visible');
    showToast('⚠️ Network connection lost');
  });

  if (!navigator.onLine) {
    banner.classList.add('visible');
  }
}

function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js')
        .then(reg => console.log('ServiceWorker registered ✓', reg.scope))
        .catch(err => console.warn('ServiceWorker registration failed ❌', err));
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// 28. BOOT SEQUENCE
// ─────────────────────────────────────────────────────────────────

function renderSidebarCalendars() {
  const container = document.getElementById('calendarAccordionContent');
  if (!container) return;
  
  const types = { native: 'Personal', google: 'Google', microsoft: 'Microsoft' };
  let html = '';
  
  Object.keys(types).forEach(type => {
    const cals = state.calendars.filter(c => c.type === type);
    if (cals.length > 0) {
      html += `<div class="cal-group-title">${types[type]}</div>`;
      cals.forEach(cal => {
        html += `
          <button class="cal-list-item">
            <div class="cal-color-dot" style="background: ${cal.color}"></div>
            ${cal.name}
          </button>
        `;
      });
    }
  });
  
  container.innerHTML = html;
}

async function init() {
  loadConfig();
  applySavedTheme();

  let hadData = false;
  try {
    const data = await getDBValue('data');
    if (data && data.events && data.events.length > 0) {
      state.events = data.events;
      state.tasks  = data.tasks;
      state.lists  = data.lists;
      state.archive = data.tasks.filter(t => t.completed);
      hadData = true;
      console.log('Loaded from IndexedDB ✓');
    }
  } catch (e) {
    console.warn('IndexedDB load failed, trying LocalStorage', e);
  }

  if (!hadData) {
    hadData = loadState();
    if (hadData) {
      setDBValue('data', { events: state.events, tasks: state.tasks, lists: state.lists }).catch(e => {});
    }
  }

  if (!hadData) {
    seedData();
    saveState();
  }

  injectDemoWeather();
  initOfflineBanner();

  renderMiniCal();
  renderTimeline();
  updateTopBar();
  setupNewSwitchers();

  if (state.config.weatherKey && state.config.location) {
    fetchWeather(dayKey(new Date()));
  }

  registerSW();

  console.log(
    '%cSequent %cloaded ✓',
    'color:#E8942A;font-size:16px;font-weight:900',
    'color:white;font-size:16px'
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
