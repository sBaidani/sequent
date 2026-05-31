import { createStore } from 'solid-js/store';
import { generateId } from '../lib/id';
import { syncEngine } from './syncEngine';

const [eventsState, setEventsState] = createStore({
  events: [],
  calendars: [],
});

export const eventStore = {
  get state() { return eventsState; },
  
  setEvents: (events) => setEventsState('events', events),
  setCalendars: (calendars) => setEventsState('calendars', calendars),
  
  addEvent: (title, startTime, endTime, calendarId = null) => {
    const targetCalendarId = calendarId || (eventsState.calendars[0]?.id) || 'default-cal';
    const newEvent = {
      id: generateId(),
      title,
      start_time: startTime,
      end_time: endTime,
      calendarId: targetCalendarId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Optimistic UI
    setEventsState('events', (prev) => [...prev, newEvent]);
    
    // Sync
    syncEngine.enqueue('events', 'INSERT', newEvent);
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
    
    // Sync
    syncEngine.enqueue('calendars', 'DELETE', { id });
    eventsToDelete.forEach(e => {
      syncEngine.enqueue('events', 'DELETE', { id: e.id });
    });
  }
};
