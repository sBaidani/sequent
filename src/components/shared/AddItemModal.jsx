import { createSignal, createEffect, Show } from 'solid-js';
import Modal from '../ui/Modal';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { settingsStore } from '../../stores/settingsStore';
import { uiStore } from '../../stores/uiStore';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import SelectPicker from './SelectPicker';
import DaySchedulePreview from '../calendar/DaySchedulePreview';
import DayTaskListPreview from '../tasks/DayTaskListPreview';

function AddItemModal() {
  const [mode, setMode] = createSignal('event'); // 'event' or 'task'
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [date, setDate] = createSignal('');
  const [time, setTime] = createSignal('12:00');
  const [endDate, setEndDate] = createSignal('');
  const [endTime, setEndTime] = createSignal('13:00');
  const [allDay, setAllDay] = createSignal(true);
  const [showRecurrence, setShowRecurrence] = createSignal(false);
  const [recurrence, setRecurrence] = createSignal('NONE');
  const [calendarId, setCalendarId] = createSignal('');
  const [listId, setListId] = createSignal('');
  const [priority, setPriority] = createSignal('normal');
  const [hasTaskDate, setHasTaskDate] = createSignal(false);

  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;

  createEffect(() => {
    if (uiStore.state.activeModal === 'addItem') {
      const activeStr = uiStore.state.activeDate || new Date().toISOString();
      const st = new Date(activeStr);
      setDate(st.toISOString().split('T')[0]);
      setTime(st.getHours().toString().padStart(2, '0') + ':00');
      
      const defaultDur = settingsStore.state.defaultDuration || 60;
      const en = new Date(st.getTime() + defaultDur * 60000);
      setEndDate(en.toISOString().split('T')[0]);
      setEndTime(en.getHours().toString().padStart(2, '0') + ':' + en.getMinutes().toString().padStart(2, '0'));
      
      setAllDay(true);
      setHasTaskDate(false);
      
      if (eventState.calendars.length > 0) {
        setCalendarId(eventState.calendars[0].id);
      }
      if (taskState.lists.length > 0) {
        setListId(taskState.lists[0].id);
      }
    }
  });

  let touchStartX = 0;
  let touchEndX = 0;

  const handleTouchStart = (e) => {
    touchStartX = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) setMode('task');
    if (touchEndX > touchStartX + 50) setMode('event');
  };

  createEffect(() => {
    // When start date/time changes, auto-update end date/time to maintain a 1-hour minimum if end is before start
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

    let rruleStr = null;
    if (showRecurrence() && recurrence() !== 'NONE') {
      const dtStart = date() ? new Date(`${date()}T12:00:00`).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '';
      rruleStr = `DTSTART:${dtStart}\nRRULE:FREQ=${recurrence()}`;
    }

    if (mode() === 'event') {
      const startObj = new Date(`${date() || new Date().toISOString().split('T')[0]}T${time()}:00`);
      const validStart = isNaN(startObj.getTime()) ? new Date() : startObj;
      const endObj = new Date(`${endDate() || date() || new Date().toISOString().split('T')[0]}T${endTime()}:00`);
      const validEnd = isNaN(endObj.getTime()) ? new Date(validStart.getTime() + 60*60000) : endObj;
      
      eventStore.addEvent(title(), validStart.toISOString(), validEnd.toISOString(), calendarId() || null, description(), rruleStr, allDay());
    } else {
      let targetDateStr = null;
      if (hasTaskDate() && date()) {
        if (allDay()) {
          targetDateStr = new Date(`${date()}T00:00:00`).toISOString();
        } else {
          const timeStr = time() || '12:00';
          targetDateStr = new Date(`${date()}T${timeStr}`).toISOString();
        }
      }
      
      taskStore.addTask(title(), listId() || null, targetDateStr, priority(), description(), rruleStr, hasTaskDate() ? allDay() : false);
    }
    
    setTitle('');
    setDescription('');
    setRecurrence('NONE');
    setShowRecurrence(false);
    uiStore.setActiveModal(null);
  };

  return (
    <Modal id="addItem" wide={true} noPadding={true}>
      <div class="flex flex-col sm:flex-row w-full bg-modal-bg rounded-2xl overflow-hidden h-full min-h-0 max-h-[90vh]">
        
        {/* Left Pane - Form */}
        <div class="flex-1 flex flex-col min-h-0 border-r border-border-theme">
          <div class="px-6 pt-6 flex-shrink-0">
            <div 
              onTouchStart={handleTouchStart} 
              onTouchEnd={handleTouchEnd}
              class="w-full flex flex-col gap-4"
            >
              <div class="flex bg-text-primary/5 rounded-lg p-1 w-full relative mb-1">
                <div class={`absolute h-[calc(100%-8px)] w-[calc(50%-4px)] top-1 rounded-md bg-accent transition-transform duration-300 ease-out shadow-sm ${mode() === 'event' ? 'translate-x-0' : 'translate-x-[calc(100%+4px)]'}`} />
                <button 
                  type="button"
                  onClick={() => setMode('event')} 
                  class={`flex-1 relative z-10 border-none py-2 text-[13px] font-bold cursor-pointer transition-colors bg-transparent ${mode() === 'event' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >Event</button>
                <button 
                  type="button"
                  onClick={() => setMode('task')} 
                  class={`flex-1 relative z-10 border-none py-2 text-[13px] font-bold cursor-pointer transition-colors bg-transparent ${mode() === 'task' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
                >Task</button>
              </div>
            </div>
          </div>

        <form onSubmit={handleSubmit} class="flex flex-col flex-1 min-h-0 mt-4">
          <div class="flex-1 overflow-y-auto px-6 pb-4 flex flex-col gap-4">
            <div>
              <input 
                ref={el => el && setTimeout(() => el.focus(), 50)}
                type="text" 
                placeholder={mode() === 'event' ? "Event Title" : "Task Title"}
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

          <Show when={mode() === 'event' || (mode() === 'task' && hasTaskDate())}>
            <div class="flex items-center gap-2 mb-2">
              <label class="flex items-center gap-2 cursor-pointer group">
                <div class="relative w-10 h-6 bg-text-primary/10 rounded-full transition-colors group-hover:bg-text-primary/20" classList={{ '!bg-accent': allDay() }}>
                  <div class="absolute left-1 top-1 w-4 h-4 bg-text-primary rounded-full transition-transform shadow-sm" classList={{ 'translate-x-4 bg-bg-theme': allDay() }} />
                </div>
                <input type="checkbox" class="hidden" checked={allDay()} onChange={(e) => setAllDay(e.target.checked)} />
                <span class="text-[13px] font-bold text-text-primary">All-Day</span>
              </label>
            </div>
          </Show>

          <Show when={mode() === 'task' && hasTaskDate()}>
            <div class="flex flex-col sm:flex-row gap-4">
              <div class="flex-1">
                <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider flex justify-between">
                  <span>Due Date</span>
                  <span class="text-accent cursor-pointer hover:underline normal-case tracking-normal" onClick={() => setHasTaskDate(false)}>Remove</span>
                </label>
                <DatePicker value={date()} onChange={(v) => setDate(v)} />
              </div>
              <Show when={!allDay()}>
                <div class="flex-1 sm:min-w-[140px]">
                  <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Time</label>
                  <TimePicker value={time()} onChange={(v) => setTime(v)} />
                </div>
              </Show>
            </div>
          </Show>

          <Show when={mode() === 'event'}>
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
          </Show>

          <Show when={mode() === 'task' && !hasTaskDate()}>
            <button 
              type="button" 
              onClick={() => {
                setHasTaskDate(true);
                if (!date()) {
                  setDate(new Date().toISOString().split('T')[0]);
                }
              }}
              class="w-full bg-text-primary/5 border border-border-theme border-dashed rounded-xl py-3 text-text-primary text-[13px] font-semibold cursor-pointer hover:bg-text-primary/10 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 11v6m-3-3h6" /></svg>
              Add Due Date
            </button>
          </Show>

          <Show when={mode() === 'event'}>
            <div class="flex flex-col gap-4">
              
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
            </div>
          </Show>

          <Show when={mode() === 'task'}>
            <div class="flex flex-col gap-4">
              <div>
                <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">List</label>
                <SelectPicker 
                  value={listId()} 
                  onChange={setListId}
                  options={taskState.lists.map(list => ({ value: list.id, label: list.name, color: list.color }))}
                  placeholder="Select..."
                />
              </div>
              <div>
                <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Priority</label>
                <div class="flex bg-text-primary/5 rounded-xl p-1 border border-border-theme w-full">
                  <button 
                    type="button"
                    onClick={() => setPriority('low')}
                    class={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${priority() === 'low' ? 'bg-[#1FA7A7] text-text-primary shadow-md scale-105 border border-border-theme' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/5'}`}
                  >Low</button>
                  <button 
                    type="button"
                    onClick={() => setPriority('normal')}
                    class={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${priority() === 'normal' ? 'bg-text-primary/20 text-text-primary shadow-md scale-105 border border-border-theme' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/5'}`}
                  >Normal</button>
                  <button 
                    type="button"
                    onClick={() => setPriority('high')}
                    class={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${priority() === 'high' ? 'bg-[#FF3B30] text-text-primary shadow-md scale-105 border border-border-theme' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/5'}`}
                  >High</button>
                </div>
              </div>
            </div>
          </Show>

          <div class="pt-2">
            {!showRecurrence() ? (
              <button 
                type="button" 
                onClick={() => setShowRecurrence(true)}
                class="bg-transparent border-none text-accent text-[13px] font-semibold cursor-pointer hover:underline"
              >
                + Add Repeat
              </button>
            ) : (
              <div>
                <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider flex justify-between">
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
              {mode() === 'event' ? 'Add Event' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>

      {/* Right Pane - Schedule/Task Preview */}
      <div class="hidden sm:block">
        <Show 
          when={mode() === 'event'}
          fallback={
            <DayTaskListPreview 
              date={hasTaskDate() ? date() : new Date().toISOString().split('T')[0]}
              ghostTask={{
                title: title() || 'New Task',
                color: taskState.lists.find(l => l.id === listId())?.color || '#6B5BDB'
              }}
            />
          }
        >
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
        </Show>
      </div>

    </div>
  </Modal>
  );
}

export default AddItemModal;
