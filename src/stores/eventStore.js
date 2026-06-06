import { createStore } from 'solid-js/store';
import { generateId } from '../lib/id';
import { syncEngine } from './syncEngine';

const [eventsState, setEventsState] = createStore({
  events: [],
  calendars: [],
});

export const eventStore = {
  get state() { return eventsState; },
  get visibleEvents() {
    const hiddenCalendarIds = new Set(
      eventsState.calendars.filter(c => c.visible === false).map(c => c.id)
    );
    if (hiddenCalendarIds.size === 0) return eventsState.events;
    return eventsState.events.filter(e => !hiddenCalendarIds.has(e.calendarId));
  },
  
  setEvents: (events) => setEventsState('events', events),
  setCalendars: (calendars) => setEventsState('calendars', calendars),
  
  addEvent: (title, startTime, endTime, calendarId = null, description = '', rrule = null, allDay = false) => {
    // Resolve calendarId: use provided, or fall back to first available calendar
    let targetCalendarId = calendarId;
    if (!targetCalendarId && eventsState.calendars.length > 0) {
      targetCalendarId = eventsState.calendars[0].id;
    }

    const newEvent = {
      id: generateId(),
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      allDay,
      calendarId: targetCalendarId,
      rrule,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Optimistic UI
    setEventsState('events', (prev) => [...prev, newEvent]);
    
    // Enqueue for server sync
    syncEngine.enqueue('events', 'INSERT', newEvent);
  },
  
  updateEvent: (id, updates) => {
    setEventsState('events', (e) => e.id === id, { ...updates, updated_at: new Date().toISOString() });
    const event = eventsState.events.find(e => e.id === id);
    if (event) {
      syncEngine.enqueue('events', 'UPDATE', event);
    }
  },
  
  addCalendar: (name, color) => {
    const newCalendar = {
      id: generateId(),
      name,
      color,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Optimistic UI
    setEventsState('calendars', (prev) => [...prev, newCalendar]);
    
    // Sync
    syncEngine.enqueue('calendars', 'INSERT', newCalendar);
  },
  
  deleteEvent: (id) => {
    // Optimistic UI
    setEventsState('events', (prev) => prev.filter(e => e.id !== id));
    
    // Sync
    syncEngine.enqueue('events', 'DELETE', { id });
  },
  
  updateCalendar: (id, updates) => {
    // Optimistic UI
    setEventsState('calendars', (c) => c.id === id, updates);
    
    // Sync
    const calendar = eventsState.calendars.find(c => c.id === id);
    if (calendar) {
      syncEngine.enqueue('calendars', 'UPDATE', calendar);
    }
  },
  
  deleteCalendar: (id) => {
    // Optimistic UI
    setEventsState('calendars', (prev) => prev.filter(c => c.id !== id));
    
    // Delete all events belonging to this calendar
    const eventsToDelete = eventsState.events.filter(e => e.calendarId === id);
    setEventsState('events', (prev) => prev.filter(e => e.calendarId !== id));
    
    // Sync (cascade delete also handled by DB FK ON DELETE CASCADE)
    syncEngine.enqueue('calendars', 'DELETE', { id });
    eventsToDelete.forEach(e => {
      syncEngine.enqueue('events', 'DELETE', { id: e.id });
    });
  }
};
