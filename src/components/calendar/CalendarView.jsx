import { createSignal, createMemo, For, Show, onMount, onCleanup } from 'solid-js';
import { Transition } from 'solid-transition-group';
import { ChevronLeft, ChevronRight } from 'lucide-solid';
import { uiStore } from '../../stores/uiStore';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { settingsStore } from '../../stores/settingsStore';
import { expandRecurringItems } from '../../lib/recurrenceEngine';
import autoAnimate from '@formkit/auto-animate';
import { 
  format, addMonths, subMonths, addWeeks, subWeeks, 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, isSameMonth, isSameDay, isSameWeek, parseISO
} from 'date-fns';
import { weatherService } from '../../services/weatherService';

function CalendarView() {
  const [viewMode, setViewMode] = createSignal('month'); // 'month' or 'week'
  const [viewTransitionDir, setViewTransitionDir] = createSignal(1); // 1 = from right, -1 = from left
  const [workWeekOnly, setWorkWeekOnly] = createSignal(settingsStore.state.workWeekOnly || false);
  const [currentDate, setCurrentDate] = createSignal(new Date());
  const [animationClass, setAnimationClass] = createSignal('');
  const [hoverBlock, setHoverBlock] = createSignal(null); // { date, hour, mins }

  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;
  const { state: settings } = settingsStore;

  const weekStartsOn = () => settings.startOfWeek === 'monday' ? 1 : 0;

  onMount(() => {
    // Auto scroll week view to 07:00 (420px)
    const timeScroll = document.getElementById('weekViewScrollArea');
    if (timeScroll && viewMode() === 'week') {
      timeScroll.scrollTop = 7 * 60;
    }
  });

  const prev = () => {
    setAnimationClass("slide-right-anim");
    setTimeout(() => setAnimationClass(""), 300);
    if (viewMode() === 'month') setCurrentDate(subMonths(currentDate(), 1));
    else setCurrentDate(subWeeks(currentDate(), 1));
  };
  const next = () => {
    setAnimationClass("slide-left-anim");
    setTimeout(() => setAnimationClass(""), 300);
    if (viewMode() === 'month') setCurrentDate(addMonths(currentDate(), 1));
    else setCurrentDate(addWeeks(currentDate(), 1));
  };
  const today = () => {
    const isFuture = new Date().getTime() > currentDate().getTime();
    let shouldAnimate = false;
    if (viewMode() === 'month') {
      shouldAnimate = !isSameMonth(currentDate(), new Date());
    } else {
      shouldAnimate = !isSameWeek(currentDate(), new Date(), { weekStartsOn: weekStartsOn() });
    }
    
    if (shouldAnimate) {
      setAnimationClass(isFuture ? "slide-left-anim" : "slide-right-anim");
      setTimeout(() => setAnimationClass(""), 300);
    }
    setCurrentDate(new Date());
  };

  const monthDays = createMemo(() => {
    const monthStart = startOfMonth(currentDate());
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: weekStartsOn() });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: weekStartsOn() });
    return eachDayOfInterval({ start: startDate, end: endDate });
  });

  const weekDays = createMemo(() => {
    const start = startOfWeek(currentDate(), { weekStartsOn: weekStartsOn() });
    const end = endOfWeek(currentDate(), { weekStartsOn: weekStartsOn() });
    return eachDayOfInterval({ start, end });
  });

  const visibleRange = createMemo(() => {
    if (viewMode() === 'month') {
      const days = monthDays();
      return { start: days[0], end: days[days.length - 1] };
    } else {
      const days = weekDays();
      if (!days.length) return { start: new Date(), end: new Date() };
      return { start: days[0], end: days[days.length - 1] };
    }
  });

  const expandedEvents = createMemo(() => expandRecurringItems(eventStore.visibleEvents, visibleRange().start, visibleRange().end));
  const expandedTasks = createMemo(() => expandRecurringItems(taskState.tasks, visibleRange().start, visibleRange().end));

  const getDayItems = (date) => {
    const events = expandedEvents().filter(e => isSameDay(parseISO(e.start_time), date)).map(e => ({
      ...e, type: 'event', 
      color: eventState.calendars.find(c => c.id === e.calendarId)?.color || '#fff'
    }));
    const tasks = expandedTasks().filter(t => t.scheduled_date && isSameDay(parseISO(t.scheduled_date), date)).map(t => ({
      ...t, type: 'task',
      color: taskState.lists.find(l => l.id === t.listId)?.color || '#fff'
    }));
    return [...events, ...tasks].sort((a, b) => {
      const timeA = a.type === 'event' ? new Date(a.start_time).getTime() : new Date(a.scheduled_date || 0).getTime();
      const timeB = b.type === 'event' ? new Date(b.start_time).getTime() : new Date(b.scheduled_date || 0).getTime();
      return timeA - timeB;
    });
  };

  const handleDrop = (e, targetDate, droppedTime = null) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const id = e.dataTransfer.getData('id');
    const type = e.dataTransfer.getData('type');
    const isInstance = e.dataTransfer.getData('isInstance') === 'true';
    const originalId = e.dataTransfer.getData('originalId');
    
    // For simplicity, we only allow dragging the original item, not individual recurrences
    // (A real recurrence engine would allow splitting the series)
    if (isInstance) {
      alert("Cannot move a single recurrence instance yet.");
      return;
    }

    if (type === 'event') {
      const event = eventState.events.find(ev => ev.id === id);
      if (event) {
        const oldStart = parseISO(event.start_time);
        const newStart = new Date(targetDate);
        
        if (droppedTime) {
          newStart.setHours(droppedTime.hour, droppedTime.mins);
        } else {
          newStart.setHours(oldStart.getHours(), oldStart.getMinutes());
        }
        
        const duration = parseISO(event.end_time).getTime() - oldStart.getTime();
        const newEnd = new Date(newStart.getTime() + duration);
        
        eventStore.updateEvent(id, { start_time: newStart.toISOString(), end_time: newEnd.toISOString() });
      }
    } else if (type === 'task') {
      const task = taskState.tasks.find(t => t.id === id);
      if (task) {
        const newDate = new Date(targetDate);
        if (droppedTime) {
          newDate.setHours(droppedTime.hour, droppedTime.mins);
          taskStore.updateTask(id, { scheduled_date: newDate.toISOString(), allDay: false });
        } else {
          newDate.setHours(new Date(task.scheduled_date || 0).getHours(), new Date(task.scheduled_date || 0).getMinutes());
          taskStore.updateTask(id, { scheduled_date: newDate.toISOString() });
        }
      }
    }
  };

  return (
    <div class="flex flex-col h-full bg-bg-theme">
      
      {/* Header */}
      <div class="px-6 py-5 flex justify-between items-center border-b border-border-theme">
        <div class="flex items-center gap-4">
          <button 
            onClick={() => uiStore.toggleSidebar()}
            class="flex w-9 h-9 rounded-full bg-text-primary/5 border-none text-text-primary items-center justify-center cursor-pointer transition-colors hover:bg-text-primary/20 mr-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h2 class="font-display lowercase text-2xl font-extrabold text-text-primary min-w-[200px]">
            {format(currentDate(), viewMode() === 'month' ? 'MMMM yyyy' : 'MMM yyyy')}
          </h2>
          <div class="flex gap-1 bg-text-primary/10 rounded-lg p-1">
            <button onClick={prev} class="bg-transparent border-none text-text-primary cursor-pointer p-1.5 rounded hover:bg-text-primary/10 transition-colors flex items-center justify-center"><ChevronLeft class="w-4 h-4" /></button>
            <button onClick={today} class="bg-transparent border-none text-text-primary cursor-pointer px-3 py-1 text-[13px] font-semibold rounded hover:bg-text-primary/10 transition-colors">Today</button>
            <button onClick={next} class="bg-transparent border-none text-text-primary cursor-pointer p-1.5 rounded hover:bg-text-primary/10 transition-colors flex items-center justify-center"><ChevronRight class="w-4 h-4" /></button>
          </div>
        </div>

        <div class="flex items-center gap-4">
          <div class="relative flex bg-text-primary/10 rounded-lg p-1 w-[200px]">
            <div 
              class="absolute top-1 bottom-1 w-[calc(33.33%-4px)] bg-accent rounded-md transition-transform duration-300 ease-out shadow-sm pointer-events-none"
              style={{ transform: viewMode() === 'month' ? 'translateX(0)' : (viewMode() === 'week' && !workWeekOnly() ? 'translateX(100%)' : 'translateX(200%)') }}
            />
            <button 
              onClick={() => {
                setViewTransitionDir(-1);
                setViewMode('month');
              }} 
              class={`relative z-10 flex-1 border-none py-1.5 text-[13px] font-semibold cursor-pointer transition-colors bg-transparent ${viewMode() === 'month' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >Month</button>
            <button 
              onClick={() => {
                setViewTransitionDir(viewMode() === 'month' ? 1 : -1);
                setViewMode('week');
                setWorkWeekOnly(false);
                settingsStore.setWorkWeekOnly(false);
                setTimeout(() => {
                  const timeScroll = document.getElementById('weekViewScrollArea');
                  if (timeScroll) timeScroll.scrollTop = 7 * 60;
                }, 50);
              }} 
              class={`relative z-10 flex-1 border-none py-1.5 text-[13px] font-semibold cursor-pointer transition-colors bg-transparent ${viewMode() === 'week' && !workWeekOnly() ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >Week</button>
            <button 
              onClick={() => {
                setViewTransitionDir(1);
                setViewMode('week');
                setWorkWeekOnly(true);
                settingsStore.setWorkWeekOnly(true);
                setTimeout(() => {
                  const timeScroll = document.getElementById('weekViewScrollArea');
                  if (timeScroll) timeScroll.scrollTop = 7 * 60;
                }, 50);
              }} 
              class={`relative z-10 flex-1 border-none py-1.5 text-[13px] font-semibold cursor-pointer transition-colors bg-transparent ${viewMode() === 'week' && workWeekOnly() ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >Work</button>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div class="flex-1 overflow-hidden flex flex-col relative">
        <Transition
          onEnter={(el, done) => {
            el.style.zIndex = '10';
            el.animate(
              [{ opacity: 0, transform: 'scale(0.98)' }, { opacity: 1, transform: 'scale(1)' }],
              { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
            ).onfinish = () => { el.style.zIndex = ''; done(); };
          }}
          onExit={(el, done) => {
            const dir = viewTransitionDir() === 1 ? -100 : 100;
            el.style.zIndex = '20';
            el.animate(
              [{ transform: 'translateX(0)', boxShadow: '0 0 40px rgba(0,0,0,0.2)' }, { transform: `translateX(${dir}%)`, boxShadow: '0 0 0px rgba(0,0,0,0)' }],
              { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
            ).onfinish = () => { el.style.zIndex = ''; done(); };
          }}
        >
          <Show when={viewMode() === 'month'}>
            <div class="flex-1 overflow-hidden flex flex-col absolute inset-0 bg-bg-theme">
              <div class="grid grid-cols-7 border-b border-border-theme shrink-0">
                <For each={['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].slice(weekStartsOn()).concat(weekStartsOn() === 1 ? ['Sun'] : [])}>
                  {day => <div class="font-display lowercase p-2 sm:p-3 text-center text-[10px] sm:text-xs font-bold text-text-muted tracking-wider truncate">{day}</div>}
                </For>
              </div>
              <div class={`grid grid-cols-7 auto-rows-[minmax(120px,1fr)] flex-1 overflow-y-auto bg-text-primary/5 ${animationClass()}`}>
                <For each={monthDays()}>
                  {date => {
                    const items = createMemo(() => getDayItems(date));
                    const isCurrentMonth = isSameMonth(date, currentDate());
                    const isToday = isSameDay(date, new Date());
                    const eventCount = createMemo(() => items().filter(i => i.type === 'event').length);
                    const isPast = date.getTime() < new Date().setHours(0,0,0,0);
                    
                    return (
                      <div 
                        class={`border-r border-b border-border-theme p-2 flex flex-col gap-1 transition-colors calendar-day-cell cursor-pointer ${isToday ? 'bg-accent/10' : (isPast ? 'bg-black/20 opacity-70 hover:opacity-100' : (isCurrentMonth ? 'bg-transparent hover:bg-text-primary/5' : 'bg-text-primary/5'))}`}
                        onClick={() => {
                          uiStore.setActiveDate(date.toISOString());
                          uiStore.setActiveModal('addEvent');
                        }}
                        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('bg-text-primary/10'); }}
                        onDragLeave={(e) => { e.currentTarget.classList.remove('bg-text-primary/10'); }}
                        onDrop={(e) => {
                          e.currentTarget.classList.remove('bg-text-primary/10');
                          handleDrop(e, date);
                        }}
                      >
                        <div class="flex justify-between items-start mb-1">
                          <div class="text-text-muted mt-0.5">
                            <Show when={weatherService.state && weatherService.state.forecast.find(f => isSameDay(new Date(f.time), date))}>
                              {(() => {
                                const dayWeather = weatherService.state.forecast.find(f => isSameDay(new Date(f.time), date));
                                return (
                                  <div class="flex items-center gap-1" title={`${dayWeather.tempMax}° / ${dayWeather.tempMin}°`}>
                                    <span class="font-display lowercase text-lg leading-none">{dayWeather.icon}</span>
                                    <span class="text-[10px] font-bold opacity-70 leading-none">{dayWeather.tempMax}°</span>
                                  </div>
                                )
                              })()}
                            </Show>
                          </div>
                          <div class={`text-[15px] font-extrabold flex justify-end ${isToday || eventCount() > 0 ? '' : (isCurrentMonth ? 'text-text-primary/70' : 'text-text-muted')}`}>
                            <span class={
                              isToday ? "bg-accent text-text-primary w-7 h-7 flex items-center justify-center rounded-full shadow-[0_0_10px_var(--color-accent)]" :
                              (eventCount() > 0 && isCurrentMonth ? 
                                (eventCount() === 1 ? "bg-text-primary/10 text-text-primary w-7 h-7 flex items-center justify-center rounded-full" :
                                 eventCount() === 2 ? "bg-text-primary/20 text-text-primary w-7 h-7 flex items-center justify-center rounded-full" :
                                 "bg-text-primary/30 text-text-primary w-7 h-7 flex items-center justify-center rounded-full font-extrabold")
                              : "w-7 h-7 flex items-center justify-center")
                            }>
                              {format(date, 'd')}
                            </span>
                          </div>
                        </div>
                        
                        <div class="flex-1 overflow-y-auto flex flex-col gap-0.5">
                          <For each={items()}>
                            {item => (
                              <div 
                                draggable="true"
                                onDragStart={(e) => {
                                  e.dataTransfer.setData('id', item.originalId || item.id);
                                  e.dataTransfer.setData('type', item.type);
                                  e.dataTransfer.setData('isInstance', item.isInstance ? 'true' : 'false');
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                class={`py-1 px-1.5 rounded-r-md text-[11px] flex items-center gap-1.5 cursor-grab hover:bg-text-primary/10 transition-colors ${(item.type === 'task' && item.completed) ? 'opacity-50' : 'opacity-100'}`}
                                style={{ "border-left": `2px solid ${item.color}` }}
                              >
                                <span class="whitespace-nowrap overflow-hidden text-ellipsis flex-1 text-text-primary/90 font-medium">
                                  {item.title} {item.rrule && '🔄'}
                                </span>
                                {item.type === 'event' && (
                                  <span class="text-text-muted text-[9px]">{format(parseISO(item.start_time), settings.use24HourClock ? 'H:mm' : 'h:mm a')}</span>
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
            </div>
          </Show>
          
          <Show when={viewMode() === 'week'}>
            <div class="overflow-auto bg-bg-theme absolute inset-0" id="weekViewScrollArea">
              <div class="flex w-full min-h-max relative">
                <div class="w-[60px] min-w-[60px] border-r border-border-theme flex flex-col bg-bg-theme sticky left-0 z-30">
                  <div class="h-[72px] min-h-[72px] shrink-0 border-b border-border-theme sticky top-0 bg-bg-theme z-40" />
                <For each={Array.from({length: 24})}>
                  {(_, i) => (
                    <div class="h-[60px] min-h-[60px] shrink-0 border-b border-border-theme p-1 text-right text-[10px] text-text-muted">
                      {i() === 0 ? '' : `${i()}:00`}
                    </div>
                  )}
                </For>
              </div>
              
              <div class={`flex flex-1 bg-bg-theme ${animationClass()}`}>
                <For each={weekDays()}>
                  {date => {
                    const isToday = isSameDay(date, new Date());
                    const isPast = date.getTime() < new Date().setHours(0,0,0,0);
                    const allItems = createMemo(() => getDayItems(date));
                    const allDayItems = createMemo(() => allItems().filter(i => i.type === 'task' && i.allDay));
                    const timedItems = createMemo(() => allItems().filter(i => !(i.type === 'task' && i.allDay)));
                    
                    const placedItems = createMemo(() => {
                      const items = timedItems().map(item => {
                        let startMin = 0;
                        let endMin = 60;
                        
                        if (item.type === 'event') {
                          const st = parseISO(item.start_time);
                          const en = parseISO(item.end_time);
                          startMin = st.getHours() * 60 + st.getMinutes();
                          endMin = en.getHours() * 60 + en.getMinutes();
                        } else if (item.type === 'task') {
                          const st = new Date(item.scheduled_date || 0);
                          startMin = st.getHours() * 60 + st.getMinutes();
                          endMin = startMin + 30; // default task height
                        }
                        return { item, startMin, endMin };
                      });

                      items.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

                      const columns = [];
                      for (const placed of items) {
                        let placedInCol = false;
                        for (let i = 0; i < columns.length; i++) {
                          const col = columns[i];
                          const lastItem = col[col.length - 1];
                          if (lastItem.endMin <= placed.startMin) {
                            col.push(placed);
                            placed.column = i;
                            placedInCol = true;
                            break;
                          }
                        }
                        if (!placedInCol) {
                          placed.column = columns.length;
                          columns.push([placed]);
                        }
                      }

                      const clusters = [];
                      let currentCluster = [];
                      let currentClusterEnd = -1;

                      for (const placed of items) {
                        if (currentCluster.length === 0) {
                          currentCluster.push(placed);
                          currentClusterEnd = placed.endMin;
                        } else {
                          if (placed.startMin < currentClusterEnd) {
                            currentCluster.push(placed);
                            currentClusterEnd = Math.max(currentClusterEnd, placed.endMin);
                          } else {
                            clusters.push(currentCluster);
                            currentCluster = [placed];
                            currentClusterEnd = placed.endMin;
                          }
                        }
                      }
                      if (currentCluster.length > 0) clusters.push(currentCluster);

                      for (const cluster of clusters) {
                        const maxCol = cluster.reduce((max, c) => Math.max(max, c.column), 0) + 1;
                        for (const c of cluster) {
                          c.maxColumns = maxCol;
                        }
                      }

                      return items;
                    });

                    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                    const isHidden = createMemo(() => workWeekOnly() && isWeekend);

                    return (
                      <div 
                        style={{
                          "flex": isHidden() ? "0 0 0px" : "1 1 0%",
                          "min-width": isHidden() ? "0px" : "120px"
                        }}
                        class={`transition-all duration-500 ease-[var(--ease-spring-smooth)] border-r border-border-theme flex flex-col overflow-hidden ${
                          isHidden() ? 'border-r-transparent' : ''
                        } ${isToday ? 'bg-accent/5' : (isPast ? 'bg-black/10 opacity-80' : '')}`}
                      >
                        <div class="border-b border-border-theme flex flex-col sticky top-0 bg-bg-theme z-40 min-h-[72px]">
                          <div class="flex justify-between items-start w-full p-2.5">
                            {/* Left: Date */}
                            <div class="flex flex-col items-start">
                              <div class={`text-[11px] uppercase font-bold tracking-wider ${isToday ? 'text-accent' : 'text-text-muted'}`}>{format(date, 'EEE')}</div>
                              <div class={`text-[22px] font-bold mt-0.5 leading-none ${isToday ? 'text-accent' : 'text-text-primary'}`}>{format(date, 'd')}</div>
                            </div>
                            {/* Right: Weather */}
                            <Show when={weatherService.state && weatherService.state.forecast.find(f => isSameDay(new Date(f.time), date))}>
                              {(() => {
                                const dayWeather = weatherService.state.forecast.find(f => isSameDay(new Date(f.time), date));
                                return (
                                  <div class="flex flex-col items-end text-text-muted" title={dayWeather.condition}>
                                    <div class="text-[18px] font-display lowercase mb-0.5 leading-none">{dayWeather.icon}</div>
                                    <div class="flex items-center gap-1 text-[10px] font-bold leading-none mt-1">
                                      <span class="text-text-primary">{dayWeather.tempMax}°</span>
                                      <span class="opacity-60">{dayWeather.tempMin}°</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </Show>
                          </div>
                          <div class="w-full px-1.5 pb-1.5 flex flex-col gap-0.5 max-h-[60px] overflow-y-auto">
                            <For each={allDayItems()}>
                              {task => (
                                <div class="text-[10px] px-1.5 py-0.5 rounded text-text-primary truncate shadow-sm cursor-grab" style={{ background: `color-mix(in srgb, ${task.color} 30%, transparent)`, "border-left": `2px solid ${task.color}` }}>
                                  {task.title} {task.rrule && '🔄'}
                                </div>
                              )}
                            </For>
                          </div>
                        </div>
                        
                        <div class="relative h-[1440px] cursor-pointer"
                             onMouseMove={(e) => {
                               if (e.target.closest('[draggable="true"]')) {
                                 setHoverBlock(null);
                                 return;
                               }
                               const rect = e.currentTarget.getBoundingClientRect();
                               const y = e.clientY - rect.top;
                               const hour = Math.min(23, Math.max(0, Math.floor(y / 60)));
                               const mins = Math.floor((y % 60) / 30) * 30;
                               setHoverBlock({ dateStr: date.toISOString(), hour, mins });
                             }}
                             onMouseLeave={() => setHoverBlock(null)}
                             onClick={(e) => {
                               if (hoverBlock()) {
                                 const targetDate = new Date(date);
                                 targetDate.setHours(hoverBlock().hour, hoverBlock().mins, 0, 0);
                                 uiStore.setActiveDate(targetDate.toISOString());
                                 uiStore.setActiveModal('addEvent');
                               }
                             }}
                             onDragOver={(e) => { 
                               e.preventDefault(); 
                               const rect = e.currentTarget.getBoundingClientRect();
                               const y = e.clientY - rect.top;
                               const hour = Math.min(23, Math.max(0, Math.floor(y / 60)));
                               const mins = Math.floor((y % 60) / 30) * 30;
                               setHoverBlock({ dateStr: date.toISOString(), hour, mins, isDragging: true });
                             }}
                             onDragLeave={() => setHoverBlock(null)}
                             onDrop={(e) => {
                               setHoverBlock(null);
                               const rect = e.currentTarget.getBoundingClientRect();
                               const dropY = e.clientY - rect.top;
                               const hour = Math.min(23, Math.max(0, Math.floor(dropY / 60)));
                               const mins = Math.floor((dropY % 60) / 30) * 30;
                               handleDrop(e, date, { hour, mins });
                             }}
                        >
                          <div class="absolute top-[540px] h-[480px] w-full bg-text-primary/5 pointer-events-none" />
                          
                          <For each={Array.from({length: 24})}>
                            {(_, i) => (
                              <div class="absolute w-full h-[60px] border-b border-border-theme pointer-events-none" style={{ top: `${i() * 60}px` }}>
                                <div class="w-full h-[30px] border-b border-text-primary/[0.06]" />
                              </div>
                            )}
                          </For>

                          <Show when={isSameDay(date, new Date())}>
                            {(() => {
                              const now = new Date();
                              const mins = now.getHours() * 60 + now.getMinutes();
                              return (
                                <div class="absolute w-full flex items-center z-30 pointer-events-none" style={{ top: `${mins - 6}px`, left: '0px' }}>
                                  <div class="w-2 h-2 rounded-full bg-red-500 shadow-sm ml-[-4px]" />
                                </div>
                              );
                            })()}
                          </Show>

                          <Show when={hoverBlock() && hoverBlock().dateStr === date.toISOString()}>
                            <div class="absolute left-1 right-1 rounded bg-text-primary/10 border-2 border-dashed border-border-theme pointer-events-none z-10 transition-all duration-75"
                                 style={{ 
                                   top: `${hoverBlock().hour * 60 + hoverBlock().mins}px`, 
                                   height: `${settings.defaultDuration || 60}px`
                                 }}
                             />
                          </Show>
                          
                          <For each={placedItems()}>
                            {(placed) => {
                              const { item, startMin, endMin, column, maxColumns } = placed;
                              const height = Math.max(endMin - startMin, 15);
                              
                              const widthPct = 100 / maxColumns;
                              const width = `calc(${widthPct}% - 6px)`;
                              const left = `calc(${widthPct * column}% + 3px)`;

                              return (
                                <div 
                                  draggable="true"
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData('id', item.originalId || item.id);
                                    e.dataTransfer.setData('type', item.type);
                                    e.dataTransfer.setData('isInstance', item.isInstance ? 'true' : 'false');
                                  }}
                                  class="absolute rounded p-1 text-[10px] text-text-primary overflow-hidden cursor-grab flex flex-col shadow-sm z-20 hover:z-30 hover:shadow-lg transition-shadow"
                                  style={`top: ${startMin}px; height: ${height}px; left: ${left}; width: ${width}; background: color-mix(in srgb, ${item.color} 30%, transparent); border-left: 3px solid ${item.color}; opacity: ${(item.type === 'task' && item.completed) ? 0.5 : 1}; backdrop-filter: blur(4px);`}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div class="font-bold whitespace-nowrap text-ellipsis overflow-hidden">
                                    {item.title} {item.rrule && '🔄'}
                                  </div>
                                  <Show when={height >= 30 && item.type === 'event'}>
                                    <div class="text-text-primary/70 text-[9px]">{format(parseISO(item.start_time), settings.use24HourClock ? 'H:mm' : 'h:mm a')}</div>
                                  </Show>
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
              
              <Show when={weekDays().some(d => isSameDay(d, new Date()))}>
                {(() => {
                  const now = new Date();
                  const mins = now.getHours() * 60 + now.getMinutes();
                  return (
                    <div class="absolute w-full flex items-center z-20 pointer-events-none" style={{ top: `${mins - 6 + 72}px`, left: '0px' }}>
                      <div class="w-[60px] flex items-center justify-end pr-1">
                        <span class="text-[10px] font-bold text-red-500 bg-bg-theme px-1 rounded">{format(now, settings.use24HourClock ? 'H:mm' : 'h:mm a')}</span>
                      </div>
                      <div class="flex-1 h-[2px] border-b-2 border-dashed border-red-500/50" />
                    </div>
                  );
                })()}
              </Show>
              </div>
            </div>
          </Show>
        </Transition>
      </div>
      
      <Show when={viewMode() === 'month'}>
        <button 
          class="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-accent text-text-primary border-none shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 z-[100]" 
          onClick={() => {
            uiStore.setActiveDate(currentDate().toISOString());
            uiStore.setActiveModal('addEvent');
          }}
        >
          <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
        </button>
      </Show>
    </div>
  );
}

export default CalendarView;
