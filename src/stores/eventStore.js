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
  
  addEvent: (title, startTime, endTime, calendarId = 'c-1') => {
    const newEvent = {
      id: generateId('e-'),
      title,
      start_time: startTime,
      end_time: endTime,
      calendarId,
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
      id: generateId('c-'),
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
  }
};
