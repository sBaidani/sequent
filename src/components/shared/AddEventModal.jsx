import { createSignal, createEffect } from 'solid-js';
import Modal from '../ui/Modal';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';

function AddEventModal() {
  const [title, setTitle] = createSignal('');
  const [date, setDate] = createSignal('');
  const [time, setTime] = createSignal('12:00');
  const [calendarId, setCalendarId] = createSignal('');

  const { state: eventState } = eventStore;

  createEffect(() => {
    if (uiStore.state.activeModal === 'addEvent') {
      const activeDateStr = uiStore.state.activeDate;
      setDate(activeDateStr.split('T')[0]);
      
      const dateObj = new Date(activeDateStr);
      // Fallback to 12:00 if it is exactly midnight (e.g. from month view grid click)
      if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
        setTime('12:00');
      } else {
        const hours = dateObj.getHours();
        const mins = dateObj.getMinutes();
        setTime(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title().trim()) return;
    
    const startObj = new Date(`${date()}T${time()}`);
    const endObj = new Date(startObj.getTime() + 60 * 60 * 1000); // Default 1 hour duration
    
    eventStore.addEvent(title(), startObj.toISOString(), endObj.toISOString(), calendarId() || null);
    
    setTitle('');
    uiStore.setActiveModal(null);
  };

  return (
    <Modal id="addEvent" compact>
      <div class="w-full flex flex-col gap-4 overflow-hidden">
        <h2 class="text-xl font-bold text-white mb-2">New Event</h2>
        
        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <div>
            <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Title</label>
            <input 
              type="text" 
              placeholder="Coffee with Sarah..."
              value={title()}
              onInput={(e) => setTitle(e.target.value)}
              class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors"
              required
            />
          </div>

          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Date</label>
              <input 
                type="date"
                value={date()}
                onInput={(e) => setDate(e.target.value)}
                class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors [color-scheme:dark]"
                required
              />
            </div>
            <div class="flex-1">
              <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Time</label>
              <input 
                type="time"
                value={time()}
                onInput={(e) => setTime(e.target.value)}
                class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors [color-scheme:dark]"
                required
              />
            </div>
          </div>

          <div>
            <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Calendar</label>
            <select 
              value={calendarId()} 
              onChange={(e) => setCalendarId(e.target.value)}
              class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors [color-scheme:dark]"
            >
              <option value="" class="text-black">Select a calendar...</option>
              {eventState.calendars.map(cal => (
                <option value={cal.id} class="text-black">{cal.name}</option>
              ))}
            </select>
          </div>

          <button 
            type="submit"
            class="mt-2 bg-accent text-white border-none p-3.5 rounded-xl text-[15px] font-bold cursor-pointer hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
          >
            Add Event
          </button>
        </form>
      </div>
    </Modal>
  );
}

export default AddEventModal;
