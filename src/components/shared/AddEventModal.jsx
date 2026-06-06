import { createSignal, createEffect, Show } from 'solid-js';
import Modal from '../ui/Modal';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';
import { settingsStore } from '../../stores/settingsStore';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import SelectPicker from './SelectPicker';
import DaySchedulePreview from '../calendar/DaySchedulePreview';

function AddEventModal() {
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [date, setDate] = createSignal('');
  const [time, setTime] = createSignal('12:00');
  const [endDate, setEndDate] = createSignal('');
  const [endTime, setEndTime] = createSignal('13:00');
  const [calendarId, setCalendarId] = createSignal('');
  const [showRecurrence, setShowRecurrence] = createSignal(false);
  const [recurrence, setRecurrence] = createSignal('NONE'); // NONE, DAILY, WEEKLY, MONTHLY
  const [allDay, setAllDay] = createSignal(false);

  const { state: eventState } = eventStore;

  createEffect(() => {
    if (uiStore.state.activeModal === 'addEvent') {
      const activeDateStr = uiStore.state.activeDate;
      const dateObj = new Date(activeDateStr);
      
      const localDateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
      setDate(localDateStr);
      
      if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
        setTime('12:00');
      } else {
        const hours = dateObj.getHours();
        const mins = dateObj.getMinutes();
        setTime(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
      }

      const defaultDur = settingsStore.state.defaultDuration || 60;
      const st = new Date(`${localDateStr}T${time()}:00`);
      const en = new Date(st.getTime() + defaultDur * 60000);
      setEndDate(en.toISOString().split('T')[0]);
      setEndTime(en.getHours().toString().padStart(2, '0') + ':' + en.getMinutes().toString().padStart(2, '0'));

      if (eventState.calendars.length > 0) {
        setCalendarId(eventState.calendars[0].id);
      }
    }
  });

  createEffect(() => {
    // When start date/time changes, auto-update end date/time
    if (date() && time()) {
      const st = new Date(`${date()}T${time()}:00`);
      if (endDate() && endTime()) {
        const en = new Date(`${endDate()}T${endTime()}:00`);
        if (en <= st) {
          const newEn = new Date(st.getTime() + 60 * 60000);
          setEndDate(newEn.toISOString().split('T')[0]);
          setEndTime(newEn.getHours().toString().padStart(2, '0') + ':' + newEn.getMinutes().toString().padStart(2, '0'));
        }
      }
    }
  });

  const setDurationPill = (mins) => {
    if (!date() || !time()) return;
    const st = new Date(`${date()}T${time()}:00`);
    const en = new Date(st.getTime() + mins * 60000);
    setEndDate(en.toISOString().split('T')[0]);
    setEndTime(en.getHours().toString().padStart(2, '0') + ':' + en.getMinutes().toString().padStart(2, '0'));
  };

  const currentDurationMins = () => {
    if (!date() || !time() || !endDate() || !endTime()) return null;
    const st = new Date(`${date()}T${time()}:00`);
    const en = new Date(`${endDate()}T${endTime()}:00`);
    return Math.round((en - st) / 60000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title().trim()) return;
    
    const dateStr = date() || new Date().toISOString().split('T')[0];
    const timeStr = time() || '12:00';
    const startObj = new Date(`${dateStr}T${timeStr}`);
    const validStart = isNaN(startObj.getTime()) ? new Date() : startObj;
    
    const endObj = new Date(`${endDate() || dateStr}T${endTime()}:00`);
    const validEnd = isNaN(endObj.getTime()) ? new Date(validStart.getTime() + 60*60000) : endObj;
    
    let rruleStr = null;
    if (showRecurrence() && recurrence() !== 'NONE') {
      const dtStart = date() ? new Date(`${date()}T12:00:00`).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '';
      rruleStr = `DTSTART:${dtStart}\nRRULE:FREQ=${recurrence()}`;
    }
    
    eventStore.addEvent(
      title(), 
      validStart.toISOString(), 
      validEnd.toISOString(), 
      calendarId() || null,
      description(),
      rruleStr,
      allDay()
    );
    
    setTitle('');
    setDescription('');
    setRecurrence('NONE');
    setShowRecurrence(false);
    setAllDay(false);
    uiStore.setActiveModal(null);
  };

  return (
    <Modal id="addEvent" wide={true} noPadding={true}>
      <div class="flex flex-col sm:flex-row w-full bg-modal-bg rounded-2xl overflow-hidden h-full min-h-0 max-h-[90vh]">
        
        {/* Left Pane - Form */}
        <div class="flex-1 flex flex-col min-h-0 border-r border-border-theme">
          <form onSubmit={handleSubmit} class="flex flex-col flex-1 min-h-0">
            <div class="flex-1 overflow-y-auto p-6 pb-4 flex flex-col gap-4">
            <div>
              <input 
                ref={el => el && setTimeout(() => el.focus(), 50)}
                type="text" 
                placeholder="Event Title"
                value={title()}
                onInput={(e) => setTitle(e.target.value)}
                class="w-full bg-transparent border-none px-0 py-2 text-text-primary text-3xl font-bold placeholder:text-text-muted outline-none"
                required
              />
            </div>

            <div>
              <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Description</label>
              <textarea 
                placeholder="Add details..."
                value={description()}
                onInput={(e) => setDescription(e.target.value)}
                class="w-full bg-text-primary/5 border border-border-theme rounded-xl px-3.5 py-3 text-text-primary text-[15px] outline-none focus:border-accent transition-colors resize-none h-16"
              />
            </div>

            <div class="flex items-center gap-2 mb-2">
              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative w-10 h-6 bg-text-primary/10 rounded-full transition-colors group-hover:bg-text-primary/20" classList={{ '!bg-accent': allDay() }}>
                  <div class="absolute left-1 top-1 w-4 h-4 bg-text-primary rounded-full transition-transform shadow-sm" classList={{ 'translate-x-4 bg-bg-theme': allDay() }}></div>
                </div>
                <input type="checkbox" class="hidden" checked={allDay()} onChange={(e) => setAllDay(e.target.checked)} />
                <span class="text-[13px] font-bold text-text-primary">All-Day</span>
              </label>
            </div>

            <Show when={allDay()}>
              <div class="flex flex-col sm:flex-row gap-4">
                <div class="flex-1">
                  <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Start Date</label>
                  <DatePicker value={date()} onChange={(v) => setDate(v)} />
                </div>
                <div class="flex-1">
                  <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">End Date</label>
                  <DatePicker value={endDate()} onChange={(v) => setEndDate(v)} />
                </div>
              </div>
            </Show>

            <Show when={!allDay()}>
              <div class="flex flex-col sm:flex-row gap-4">
                <div class="flex-1">
                  <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Start Date</label>
                  <DatePicker value={date()} onChange={(v) => setDate(v)} />
                </div>
                <div class="flex-1 sm:min-w-[140px]">
                  <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Start Time</label>
                  <TimePicker value={time()} onChange={(v) => setTime(v)} />
                </div>
              </div>

              <div class="flex flex-col sm:flex-row gap-4">
                <div class="flex-1">
                  <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">End Date</label>
                  <DatePicker value={endDate()} onChange={(v) => setEndDate(v)} />
                </div>
                <div class="flex-1 sm:min-w-[140px]">
                  <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">End Time</label>
                  <TimePicker value={endTime()} onChange={(v) => setEndTime(v)} />
                </div>
              </div>
            </Show>
            
            <Show when={!allDay()}>
              <div class="flex items-center gap-2">
                <button type="button" onClick={() => setDurationPill(15)} class={`px-3 py-1.5 rounded-full text-xs font-semibold border ${currentDurationMins() === 15 ? 'bg-accent/20 border-accent text-accent' : 'bg-text-primary/5 border-border-theme text-text-secondary hover:bg-text-primary/10 transition-colors'}`}>15m</button>
                <button type="button" onClick={() => setDurationPill(30)} class={`px-3 py-1.5 rounded-full text-xs font-semibold border ${currentDurationMins() === 30 ? 'bg-accent/20 border-accent text-accent' : 'bg-text-primary/5 border-border-theme text-text-secondary hover:bg-text-primary/10 transition-colors'}`}>30m</button>
                <button type="button" onClick={() => setDurationPill(60)} class={`px-3 py-1.5 rounded-full text-xs font-semibold border ${currentDurationMins() === 60 ? 'bg-accent/20 border-accent text-accent' : 'bg-text-primary/5 border-border-theme text-text-secondary hover:bg-text-primary/10 transition-colors'}`}>1h</button>
                <button type="button" onClick={() => setDurationPill(120)} class={`px-3 py-1.5 rounded-full text-xs font-semibold border ${currentDurationMins() === 120 ? 'bg-accent/20 border-accent text-accent' : 'bg-text-primary/5 border-border-theme text-text-secondary hover:bg-text-primary/10 transition-colors'}`}>2h</button>
              </div>
            </Show>

            <div>
              <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Calendar</label>
              <SelectPicker 
                value={calendarId()} 
                onChange={setCalendarId}
                options={eventState.calendars.map(cal => ({ value: cal.id, label: cal.name, color: cal.color }))}
                placeholder="Select..."
              />
            </div>

            <div class="pt-2">
              {!showRecurrence() ? (
                <button type="button" class="text-accent text-[13px] font-semibold cursor-pointer hover:underline border-none bg-transparent flex items-center gap-1.5 p-0" onClick={() => setShowRecurrence(true)}>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                  Add Repeating Rule
                </button>
              ) : (
                <div class="flex flex-col gap-1.5">
                  <label class="font-display lowercase flex text-xs text-text-muted font-semibold tracking-wider justify-between items-center">
                    <span>Repeat</span>
                    <span class="text-accent cursor-pointer hover:underline normal-case tracking-normal" onClick={() => { setShowRecurrence(false); setRecurrence('NONE'); }}>Remove</span>
                  </label>
                  <SelectPicker 
                    value={recurrence()} 
                    onChange={setRecurrence}
                    options={[
                      { value: 'NONE', label: 'Does not repeat' },
                      { value: 'DAILY', label: 'Daily' },
                      { value: 'WEEKLY', label: 'Weekly' },
                      { value: 'MONTHLY', label: 'Monthly' }
                    ]}
                  />
                </div>
              )}
            </div>

            </div>
            <div class="p-6 pt-4 border-t border-border-theme bg-modal-bg flex-shrink-0">
              <button 
                type="submit"
                class="w-full bg-accent text-text-primary border-none p-3.5 rounded-xl text-[15px] font-bold cursor-pointer hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
              >
                Add Event
              </button>
            </div>
          </form>
        </div>

        {/* Right Pane - Schedule Preview */}
        <div class="hidden sm:block">
          <DaySchedulePreview 
            mode="event"
            date={date() || new Date().toISOString().split('T')[0]}
            ghostEvent={{
              title: title() || 'New Event',
              startTime: `${date()}T${time()}:00`,
              endTime: `${endDate()}T${endTime()}:00`,
              type: 'event',
              allDay: allDay(),
              color: eventState.calendars.find(c => c.id === calendarId())?.color || '#E8942A'
            }}
          />
        </div>

      </div>
    </Modal>
  );
}

export default AddEventModal;
