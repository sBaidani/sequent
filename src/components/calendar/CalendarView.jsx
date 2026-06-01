import { createSignal, createMemo, For, Show } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { settingsStore } from '../../stores/settingsStore';
import { 
  format, addMonths, subMonths, addWeeks, subWeeks, 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, parseISO,
  getHours, addDays
} from 'date-fns';

function CalendarView() {
  const [viewMode, setViewMode] = createSignal('month'); // 'month' or 'week'
  const [workWeekOnly, setWorkWeekOnly] = createSignal(false);
  const [currentDate, setCurrentDate] = createSignal(new Date());

  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;
  const { state: settings } = settingsStore;

  const weekStartsOn = () => settings.startOfWeek === 'monday' ? 1 : 0;

  // Navigation
  const prev = () => {
    if (viewMode() === 'month') setCurrentDate(subMonths(currentDate(), 1));
    else setCurrentDate(subWeeks(currentDate(), 1));
  };
  const next = () => {
    if (viewMode() === 'month') setCurrentDate(addMonths(currentDate(), 1));
    else setCurrentDate(addWeeks(currentDate(), 1));
  };
  const today = () => setCurrentDate(new Date());

  // Month View Days
  const monthDays = createMemo(() => {
    const monthStart = startOfMonth(currentDate());
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: weekStartsOn() });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: weekStartsOn() });
    return eachDayOfInterval({ start: startDate, end: endDate });
  });

  // Week View Days
  const weekDays = createMemo(() => {
    const start = startOfWeek(currentDate(), { weekStartsOn: weekStartsOn() });
    const end = endOfWeek(currentDate(), { weekStartsOn: weekStartsOn() });
    let days = eachDayOfInterval({ start, end });
    if (workWeekOnly()) {
      // Filter out weekends (0 = Sunday, 6 = Saturday)
      days = days.filter(d => d.getDay() !== 0 && d.getDay() !== 6);
    }
    return days;
  });

  const getDayItems = (date) => {
    const events = eventState.events.filter(e => isSameDay(parseISO(e.start_time), date)).map(e => ({
      ...e, type: 'event', 
      color: eventState.calendars.find(c => c.id === e.calendarId)?.color || '#fff'
    }));
    const tasks = taskState.tasks.filter(t => t.scheduled_date && isSameDay(parseISO(t.scheduled_date), date)).map(t => ({
      ...t, type: 'task',
      color: taskState.lists.find(l => l.id === t.listId)?.color || '#fff'
    }));
    return [...events, ...tasks].sort((a, b) => {
      const timeA = a.type === 'event' ? new Date(a.start_time).getTime() : 0;
      const timeB = b.type === 'event' ? new Date(b.start_time).getTime() : 0;
      return timeA - timeB;
    });
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const id = e.dataTransfer.getData('id');
    const type = e.dataTransfer.getData('type');
    
    if (type === 'event') {
      const event = eventState.events.find(ev => ev.id === id);
      if (event) {
        // Just keep the same time, change the date
        const oldStart = parseISO(event.start_time);
        const newStart = new Date(targetDate);
        newStart.setHours(oldStart.getHours(), oldStart.getMinutes());
        
        const oldEnd = parseISO(event.end_time);
        const newEnd = new Date(targetDate);
        newEnd.setHours(oldEnd.getHours(), oldEnd.getMinutes());
        
        eventStore.deleteEvent(id);
        eventStore.addEvent(event.title, newStart.toISOString(), newEnd.toISOString(), event.calendarId);
      }
    } else if (type === 'task') {
      taskStore.updateTaskDate(id, targetDate.toISOString());
    }
  };

  return (
    <div class="flex flex-col h-full bg-bg-theme">
      
      {/* Header */}
      <div class="px-6 py-5 flex justify-between items-center border-b border-white/5">
        <div class="flex items-center gap-4">
          <h2 class="text-2xl font-extrabold text-white min-w-[200px]">
            {format(currentDate(), viewMode() === 'month' ? 'MMMM yyyy' : 'MMM yyyy')}
          </h2>
          <div class="flex gap-1 bg-white/10 rounded-lg p-1">
            <button onClick={prev} class="bg-transparent border-none text-white cursor-pointer px-2 py-1 rounded hover:bg-white/10 transition-colors">&lt;</button>
            <button onClick={today} class="bg-transparent border-none text-white cursor-pointer px-3 py-1 text-[13px] font-semibold rounded hover:bg-white/10 transition-colors">Today</button>
            <button onClick={next} class="bg-transparent border-none text-white cursor-pointer px-2 py-1 rounded hover:bg-white/10 transition-colors">&gt;</button>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <Show when={viewMode() === 'week'}>
            <label class="flex items-center gap-2 text-text-secondary text-[13px] cursor-pointer hover:text-white transition-colors">
              <input type="checkbox" checked={workWeekOnly()} onChange={(e) => setWorkWeekOnly(e.target.checked)} class="cursor-pointer" />
              Work Week Only
            </label>
          </Show>
          <div class="flex bg-white/10 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('month')} 
              class={`border-none px-4 py-1.5 text-[13px] font-semibold cursor-pointer rounded-md transition-colors ${viewMode() === 'month' ? 'bg-accent text-white shadow-sm' : 'bg-transparent text-text-secondary hover:text-white'}`}
            >Month</button>
            <button 
              onClick={() => setViewMode('week')} 
              class={`border-none px-4 py-1.5 text-[13px] font-semibold cursor-pointer rounded-md transition-colors ${viewMode() === 'week' ? 'bg-accent text-white shadow-sm' : 'bg-transparent text-text-secondary hover:text-white'}`}
            >Week</button>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div class="flex-1 overflow-hidden flex flex-col">
        <Show when={viewMode() === 'month'}>
          {/* Month View Headers */}
          <div class="grid grid-cols-7 border-b border-white/5">
            <For each={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].slice(weekStartsOn()).concat(weekStartsOn() === 1 ? ['Sun'] : [])}>
              {day => <div class="p-2 sm:p-3 text-center text-[10px] sm:text-xs font-bold text-text-muted uppercase tracking-wider truncate">{day}</div>}
            </For>
          </div>
          {/* Month Grid */}
          <div class="grid grid-cols-7 auto-rows-[minmax(120px,1fr)] flex-1 overflow-y-auto bg-black/20">
            <For each={monthDays()}>
              {date => {
                const items = getDayItems(date);
                const isCurrentMonth = isSameMonth(date, currentDate());
                const isToday = isSameDay(date, new Date());
                const eventCount = items.filter(i => i.type === 'event').length;
                
                let dateBadgeClass = "";
                if (isToday) {
                  dateBadgeClass = "bg-accent text-white w-6 h-6 flex items-center justify-center rounded-full shadow-[0_0_10px_var(--color-accent)]";
                } else if (eventCount > 0 && isCurrentMonth) {
                  if (eventCount === 1) dateBadgeClass = "bg-white/10 text-white w-6 h-6 flex items-center justify-center rounded-full";
                  else if (eventCount === 2) dateBadgeClass = "bg-white/20 text-white w-6 h-6 flex items-center justify-center rounded-full";
                  else dateBadgeClass = "bg-white/30 text-white w-6 h-6 flex items-center justify-center rounded-full font-bold";
                }
                
                return (
                  <div 
                    class={`border-r border-b border-white/5 p-2 flex flex-col gap-1 transition-colors ${isCurrentMonth ? 'bg-transparent' : 'bg-black/20'}`}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-white/10'); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('bg-white/10'); }}
                    onDrop={(e) => {
                      e.currentTarget.classList.remove('bg-white/10');
                      handleDrop(e, date);
                    }}
                  >
                    <div class={`text-xs font-bold mb-1 flex justify-end ${isToday || eventCount > 0 ? '' : (isCurrentMonth ? 'text-white/70' : 'text-text-muted')}`}>
                      <span class={dateBadgeClass}>
                        {format(date, 'd')}
                      </span>
                    </div>
                    
                    <div class="flex-1 overflow-y-auto flex flex-col gap-0.5">
                      <For each={items}>
                        {item => (
                          <div 
                            draggable="true"
                            onDragStart={(e) => {
                              e.dataTransfer.setData('id', item.id);
                              e.dataTransfer.setData('type', item.type);
                            }}
                            class={`py-1 px-1.5 rounded-r-md text-[11px] flex items-center gap-1.5 cursor-grab hover:bg-white/5 transition-colors ${(item.type === 'task' && item.completed) ? 'opacity-50' : 'opacity-100'}`}
                            style={{ "border-left": `2px solid ${item.color}` }}
                          >
                            <span class="whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-white/90 font-medium">{item.title}</span>
                            {item.type === 'event' && (
                              <span class="text-text-muted text-[9px]">{format(parseISO(item.start_time), 'HH:mm')}</span>
                            )}
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )
              }}
            </For>
          </div>
        </Show>

        <Show when={viewMode() === 'week'}>
          {/* Week View */}
          <div class="flex flex-1 overflow-hidden">
            {/* Time column */}
            <div class="w-[60px] border-r border-white/5 overflow-y-scroll flex flex-col bg-bg-theme">
              <div class="h-[40px] border-b border-white/5 sticky top-0 bg-bg-theme z-20"></div> {/* header spacer */}
              <For each={Array.from({length: 24})}>
                {(_, i) => (
                  <div class="h-[60px] border-b border-white/5 p-1 text-right text-[10px] text-text-muted">
                    {i() === 0 ? '' : `${i()}:00`}
                  </div>
                )}
              </For>
            </div>
            
            {/* Days columns */}
            <div class="flex flex-1 overflow-x-auto overflow-y-scroll bg-bg-theme">
              <For each={weekDays()}>
                {date => {
                  const isToday = isSameDay(date, new Date());
                  const items = getDayItems(date);
                  
                  return (
                    <div class="flex-1 min-w-[120px] border-r border-white/5 flex flex-col">
                      <div class="h-[40px] border-b border-white/5 flex flex-col items-center justify-center sticky top-0 bg-bg-theme z-20">
                        <div class="text-[10px] text-text-muted uppercase font-bold tracking-wider">{format(date, 'EEE')}</div>
                        <div class={`text-sm font-extrabold ${isToday ? 'text-accent' : 'text-white'}`}>{format(date, 'd')}</div>
                      </div>
                      
                      <div class="relative h-[1440px]"
                           onDragOver={(e) => { e.preventDefault(); }}
                           onDrop={(e) => handleDrop(e, date)}
                      >
                        {/* Shading for 9am-5pm (hours 9 to 17) */}
                        <div class="absolute top-[540px] h-[480px] w-full bg-white/5 pointer-events-none"></div>
                        
                        {/* Grid lines */}
                        <For each={Array.from({length: 24})}>
                          {(_, i) => (
                            <div class="absolute w-full h-[60px] border-b border-white/[0.02] pointer-events-none" style={{ top: `${i() * 60}px` }}></div>
                          )}
                        </For>
                        
                        {/* Items */}
                        <For each={items}>
                          {item => {
                            let top = 0;
                            let height = 30; // default for tasks
                            
                            if (item.type === 'event') {
                              const start = parseISO(item.start_time);
                              const end = parseISO(item.end_time);
                              top = (start.getHours() * 60) + start.getMinutes();
                              height = ((end.getTime() - start.getTime()) / (1000 * 60));
                            }
                            
                            return (
                              <div 
                                draggable="true"
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('id', item.id);
                                  e.dataTransfer.setData('type', item.type);
                                }}
                                class="absolute left-1 right-1 rounded p-1 text-[10px] text-white overflow-hidden cursor-grab flex flex-col shadow-sm"
                                style={{
                                  "top":`${top}px`, 
                                  "height":`${height}px`,
                                  "background": `color-mix(in srgb, ${item.color} 30%, transparent)`,
                                  "border-left": `3px solid ${item.color}`,
                                  "opacity": (item.type === 'task' && item.completed) ? 0.5 : 1
                                }}
                              >
                                <div class="font-bold whitespace-nowrap text-ellipsis overflow-hidden">{item.title}</div>
                                {item.type === 'event' && (
                                  <div class="text-white/70">{format(parseISO(item.start_time), 'HH:mm')}</div>
                                )}
                              </div>
                            )
                          }}
                        </For>
                      </div>
                    </div>
                  )
                }}
              </For>
            </div>
          </div>
        </Show>
      </div>

    </div>
  );
}

export default CalendarView;
