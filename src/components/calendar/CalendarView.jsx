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
    <div class="calendar-view-container" style={{"display":"flex", "flex-direction":"column", "height":"100%", "background":"var(--bg)"}}>
      
      {/* Header */}
      <div style={{"padding":"20px 24px", "display":"flex", "justify-content":"space-between", "align-items":"center", "border-bottom":"1px solid rgba(255,255,255,0.05)"}}>
        <div style={{"display":"flex", "align-items":"center", "gap":"16px"}}>
          <h2 style={{"font-size":"24px", "font-weight":"800", "color":"#fff", "min-width":"200px"}}>
            {format(currentDate(), viewMode() === 'month' ? 'MMMM yyyy' : 'MMM yyyy')}
          </h2>
          <div style={{"display":"flex", "gap":"4px", "background":"rgba(255,255,255,0.1)", "border-radius":"8px", "padding":"4px"}}>
            <button onClick={prev} style={{"background":"transparent", "border":"none", "color":"#fff", "cursor":"pointer", "padding":"4px 8px"}}>&lt;</button>
            <button onClick={today} style={{"background":"transparent", "border":"none", "color":"#fff", "cursor":"pointer", "padding":"4px 12px", "font-size":"13px", "font-weight":"600"}}>Today</button>
            <button onClick={next} style={{"background":"transparent", "border":"none", "color":"#fff", "cursor":"pointer", "padding":"4px 8px"}}>&gt;</button>
          </div>
        </div>

        <div style={{"display":"flex", "align-items":"center", "gap":"16px"}}>
          <Show when={viewMode() === 'week'}>
            <label style={{"display":"flex", "align-items":"center", "gap":"8px", "color":"var(--text-secondary)", "font-size":"13px", "cursor":"pointer"}}>
              <input type="checkbox" checked={workWeekOnly()} onChange={(e) => setWorkWeekOnly(e.target.checked)} />
              Work Week Only
            </label>
          </Show>
          <div style={{"display":"flex", "background":"rgba(255,255,255,0.1)", "border-radius":"8px", "overflow":"hidden"}}>
            <button 
              onClick={() => setViewMode('month')} 
              style={{"background":viewMode()==='month'?"var(--accent)":"transparent", "color":"#fff", "border":"none", "padding":"8px 16px", "font-size":"13px", "font-weight":"600", "cursor":"pointer"}}
            >Month</button>
            <button 
              onClick={() => setViewMode('week')} 
              style={{"background":viewMode()==='week'?"var(--accent)":"transparent", "color":"#fff", "border":"none", "padding":"8px 16px", "font-size":"13px", "font-weight":"600", "cursor":"pointer"}}
            >Week</button>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div style={{"flex":"1", "overflow":"hidden", "display":"flex", "flex-direction":"column"}}>
        <Show when={viewMode() === 'month'}>
          {/* Month View Headers */}
          <div style={{"display":"grid", "grid-template-columns":"repeat(7, 1fr)", "border-bottom":"1px solid rgba(255,255,255,0.05)"}}>
            <For each={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].slice(weekStartsOn()).concat(weekStartsOn() === 1 ? ['Sun'] : [])}>
              {day => <div style={{"padding":"12px", "text-align":"center", "font-size":"12px", "font-weight":"700", "color":"var(--text-muted)", "text-transform":"uppercase"}}>{day}</div>}
            </For>
          </div>
          {/* Month Grid */}
          <div style={{"display":"grid", "grid-template-columns":"repeat(7, 1fr)", "grid-auto-rows":"minmax(120px, 1fr)", "flex":"1", "overflow-y":"auto"}}>
            <For each={monthDays()}>
              {date => {
                const items = getDayItems(date);
                const isCurrentMonth = isSameMonth(date, currentDate());
                const isToday = isSameDay(date, new Date());
                
                return (
                  <div 
                    style={{
                      "border-right":"1px solid rgba(255,255,255,0.05)", 
                      "border-bottom":"1px solid rgba(255,255,255,0.05)",
                      "background": isCurrentMonth ? "transparent" : "rgba(0,0,0,0.2)",
                      "padding":"8px",
                      "display":"flex",
                      "flex-direction":"column",
                      "gap":"4px"
                    }}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                    onDragLeave={(e) => { e.currentTarget.style.background = isCurrentMonth ? "transparent" : "rgba(0,0,0,0.2)"; }}
                    onDrop={(e) => {
                      e.currentTarget.style.background = isCurrentMonth ? "transparent" : "rgba(0,0,0,0.2)";
                      handleDrop(e, date);
                    }}
                  >
                    <div style={{
                      "font-size":"12px", "font-weight":"700", 
                      "color": isToday ? "var(--accent)" : (isCurrentMonth ? "#fff" : "var(--text-muted)"),
                      "margin-bottom":"4px",
                      "display":"flex", "justify-content":"flex-end"
                    }}>
                      <span style={isToday ? {"background":"var(--accent)", "color":"#fff", "width":"24px", "height":"24px", "display":"flex", "align-items":"center", "justify-content":"center", "border-radius":"50%"} : {}}>
                        {format(date, 'd')}
                      </span>
                    </div>
                    
                    <div style={{"flex":"1", "overflow-y":"auto", "display":"flex", "flex-direction":"column", "gap":"2px"}}>
                      <For each={items}>
                        {item => (
                          <div 
                            draggable="true"
                            onDragStart={(e) => {
                              e.dataTransfer.setData('id', item.id);
                              e.dataTransfer.setData('type', item.type);
                            }}
                            style={{
                              "background":"rgba(255,255,255,0.1)", "padding":"4px 6px", "border-radius":"4px", 
                              "font-size":"11px", "display":"flex", "align-items":"center", "gap":"6px", "cursor":"grab",
                              "opacity": (item.type === 'task' && item.completed) ? "0.5" : "1"
                            }}
                          >
                            <span style={{"width":"6px", "height":"6px", "border-radius":"50%", "background-color":item.color, "flex-shrink":"0"}}></span>
                            <span style={{"white-space":"nowrap", "overflow":"hidden", "text-overflow":"ellipsis", "flex":"1", "color":"#fff"}}>{item.title}</span>
                            {item.type === 'event' && (
                              <span style={{"color":"var(--text-muted)", "font-size":"9px"}}>{format(parseISO(item.start_time), 'HH:mm')}</span>
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
          <div style={{"display":"flex", "flex":"1", "overflow":"hidden"}}>
            {/* Time column */}
            <div style={{"width":"60px", "border-right":"1px solid rgba(255,255,255,0.05)", "overflow-y":"scroll", "display":"flex", "flex-direction":"column"}}>
              <div style={{"height":"40px", "border-bottom":"1px solid rgba(255,255,255,0.05)"}}></div> {/* header spacer */}
              <For each={Array.from({length: 24})}>
                {(_, i) => (
                  <div style={{"height":"60px", "border-bottom":"1px solid rgba(255,255,255,0.05)", "padding":"4px", "text-align":"right", "font-size":"10px", "color":"var(--text-muted)"}}>
                    {i === 0 ? '' : `${i}:00`}
                  </div>
                )}
              </For>
            </div>
            
            {/* Days columns */}
            <div style={{"display":"flex", "flex":"1", "overflow-x":"auto", "overflow-y":"scroll"}}>
              <For each={weekDays()}>
                {date => {
                  const isToday = isSameDay(date, new Date());
                  const items = getDayItems(date);
                  
                  return (
                    <div style={{"flex":"1", "min-width":"120px", "border-right":"1px solid rgba(255,255,255,0.05)", "display":"flex", "flex-direction":"column"}}>
                      <div style={{"height":"40px", "border-bottom":"1px solid rgba(255,255,255,0.05)", "display":"flex", "flex-direction":"column", "align-items":"center", "justify-content":"center", "position":"sticky", "top":0, "background":"var(--bg)", "z-index":10}}>
                        <div style={{"font-size":"11px", "color":"var(--text-muted)", "text-transform":"uppercase", "font-weight":"700"}}>{format(date, 'EEE')}</div>
                        <div style={{"font-size":"14px", "font-weight":"800", "color":isToday ? "var(--accent)" : "#fff"}}>{format(date, 'd')}</div>
                      </div>
                      
                      <div style={{"position":"relative", "height":"1440px" /* 24 * 60px */}}
                           onDragOver={(e) => { e.preventDefault(); }}
                           onDrop={(e) => handleDrop(e, date)}
                      >
                        {/* Shading for 9am-5pm (hours 9 to 17) */}
                        <div style={{"position":"absolute", "top":"540px", "height":"480px", "width":"100%", "background":"rgba(255,255,255,0.03)", "pointer-events":"none"}}></div>
                        
                        {/* Grid lines */}
                        <For each={Array.from({length: 24})}>
                          {(_, i) => (
                            <div style={{"position":"absolute", "top":`${i * 60}px`, "height":"60px", "width":"100%", "border-bottom":"1px solid rgba(255,255,255,0.02)", "pointer-events":"none"}}></div>
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
                                style={{
                                  "position":"absolute", 
                                  "top":`${top}px`, 
                                  "left":"4px", 
                                  "right":"4px", 
                                  "height":`${height}px`,
                                  "background": `color-mix(in srgb, ${item.color} 20%, transparent)`,
                                  "border-left": `3px solid ${item.color}`,
                                  "border-radius": "4px",
                                  "padding":"4px",
                                  "font-size":"10px",
                                  "color":"#fff",
                                  "overflow":"hidden",
                                  "cursor":"grab"
                                }}
                              >
                                <div style={{"font-weight":"700", "white-space":"nowrap", "text-overflow":"ellipsis", "overflow":"hidden"}}>{item.title}</div>
                                {item.type === 'event' && (
                                  <div style={{"color":"rgba(255,255,255,0.7)"}}>{format(parseISO(item.start_time), 'HH:mm')}</div>
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
