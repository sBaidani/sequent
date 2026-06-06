import { createSignal, createEffect, createMemo, For, onMount, onCleanup, Show } from 'solid-js';
import { Transition } from 'solid-transition-group';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';
import { settingsStore } from '../../stores/settingsStore';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { expandRecurringItems } from '../../lib/recurrenceEngine';
import { calculateGridOverlap } from '../../lib/scheduling';
import { weatherService } from '../../services/weatherService';

function TimelineView() {
  const [hoverBlock, setHoverBlock] = createSignal(null);
  const [scheduleViewMode, setScheduleViewMode] = createSignal('grid'); // 'list' or 'grid'
  const [showTodayPane, setShowTodayPane] = createSignal(true);
  const [isWeatherExpanded, setIsWeatherExpanded] = createSignal(false);

  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;
  const { state: uiState } = uiStore;
  const { state: settings } = settingsStore;

  const [currentTime, setCurrentTime] = createSignal(new Date());

  onMount(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    onCleanup(() => clearInterval(timer));
  });

  createEffect(() => {
    if (scheduleViewMode() === 'grid' && showTodayPane()) {
      setTimeout(() => {
        const scrollArea = document.getElementById('todayGridScrollArea');
        if (scrollArea) {
          const now = new Date();
          const mins = now.getHours() * 60 + now.getMinutes();
          // Center the current time roughly in the view
          scrollArea.scrollTop = Math.max(0, mins - 60);
        }
      }, 100);
    }
  });

  const today = new Date();
  // Start with 15 days before and 30 days after
  const [days, setDays] = createSignal(Array.from({ length: 45 }).map((_, i) => addDays(today, i - 15)));
  const [isReady, setIsReady] = createSignal(false);
  const [smoothScroll, setSmoothScroll] = createSignal(false);

  // Compute expanded events and tasks
  const expandedEvents = createMemo(() => {
    const d = days();
    if (!d || d.length === 0) return [];
    return expandRecurringItems(eventStore.visibleEvents, d[0], d[d.length - 1]);
  });
  
  const expandedTasks = createMemo(() => {
    const d = days();
    if (!d || d.length === 0) return [];
    return expandRecurringItems(taskState.tasks, d[0], d[d.length - 1]);
  });

  const todayItems = createMemo(() => {
    const events = expandedEvents().filter(e => e.start_time && isSameDay(new Date(e.start_time), today)).map(e => ({
      ...e, type: 'event', color: eventState.calendars.find(c => c.id === e.calendarId)?.color || '#E8942A'
    }));
    const tasks = expandedTasks().filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), today)).map(t => ({
      ...t, type: 'task', color: taskState.lists.find(l => l.id === t.listId)?.color || '#6B5BDB'
    }));
    return [...events, ...tasks].sort((a, b) => {
        const tA = a.type === 'event' ? parseISO(a.start_time).getTime() : (a.allDay ? 0 : parseISO(a.scheduled_date).getTime());
        const tB = b.type === 'event' ? parseISO(b.start_time).getTime() : (b.allDay ? 0 : parseISO(b.scheduled_date).getTime());
        return tA - tB;
    });
  });

  const todayEvents = createMemo(() => expandedEvents().filter(e => e.start_time && isSameDay(new Date(e.start_time), today)).sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()));
  const todayTasks = createMemo(() => expandedTasks().filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), today)).sort((a, b) => {
    const tA = a.allDay ? 0 : parseISO(a.scheduled_date).getTime();
    const tB = b.allDay ? 0 : parseISO(b.scheduled_date).getTime();
    return tA - tB;
  }));

  let topSentinel;
  let bottomSentinel;

  onMount(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target === topSentinel) {
            // Load past
            const scrollContainer = document.getElementById('timelineScroll');
            const oldScrollHeight = scrollContainer ? scrollContainer.scrollHeight : 0;
            const oldScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

            setDays(prev => {
              const firstDay = prev[0];
              const pastDays = Array.from({ length: 15 }).map((_, i) => addDays(firstDay, -(15 - i)));
              return [...pastDays, ...prev];
            });

            if (scrollContainer) {
              requestAnimationFrame(() => {
                const newScrollHeight = scrollContainer.scrollHeight;
                // Temporarily disable smooth scrolling to prevent bouncing back animation
                const oldBehavior = scrollContainer.style.scrollBehavior;
                scrollContainer.style.scrollBehavior = 'auto';
                
                scrollContainer.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
                
                // Restore in the next frame
                requestAnimationFrame(() => {
                  scrollContainer.style.scrollBehavior = oldBehavior;
                });
              });
            }
          } else if (entry.target === bottomSentinel) {
            // Load future
            setDays(prev => {
              const lastDay = prev[prev.length - 1];
              const futureDays = Array.from({ length: 15 }).map((_, i) => addDays(lastDay, i + 1));
              return [...prev, ...futureDays];
            });
          }
        }
      });
    }, { rootMargin: '3000px' });

    if (topSentinel) observer.observe(topSentinel);
    if (bottomSentinel) observer.observe(bottomSentinel);

    // Initial scroll to today without jumping visibly
    let hasUserScrolled = false;
    const scrollToToday = () => {
      const scrollContainer = document.getElementById('timelineScroll');
      const todayEl = document.querySelector('.day-section.is-today');
      
      if (todayEl && scrollContainer && todayEl.offsetTop > 0) {
        // Set the scroll position instantly
        scrollContainer.scrollTop = todayEl.offsetTop;
        
        // Track user scroll to break the pin
        const stopPin = () => hasUserScrolled = true;
        scrollContainer.addEventListener('wheel', stopPin, { passive: true, once: true });
        scrollContainer.addEventListener('touchstart', stopPin, { passive: true, once: true });
        
        // Wait for the browser to apply the scroll before showing the container
        requestAnimationFrame(() => {
          setIsReady(true);
          
          // Pin scroll for 1 second to account for asynchronous data loading
          // which expands past days and shifts the offset
          let attempts = 0;
          const pinInterval = setInterval(() => {
            if (!hasUserScrolled && todayEl.offsetTop > 0) {
              const oldSmooth = scrollContainer.style.scrollBehavior;
              scrollContainer.style.scrollBehavior = 'auto';
              scrollContainer.scrollTop = todayEl.offsetTop;
              scrollContainer.style.scrollBehavior = oldSmooth;
            }
            if (++attempts > 20) clearInterval(pinInterval);
          }, 50);

          // Delay enabling smooth scroll to ensure the initial jump isn't animated
          setTimeout(() => setSmoothScroll(true), 300);
        });
      } else {
        // If elements aren't rendered or laid out yet, keep trying
        requestAnimationFrame(scrollToToday);
      }
    };

    scrollToToday();

    onCleanup(() => observer.disconnect());
  });

  return (
    <>
      <div class="h-[60px] min-h-[60px] border-b border-border-theme flex items-center justify-between px-6 bg-bg-theme/40 backdrop-blur-md sticky top-0 z-50">
        <button 
          onClick={() => uiStore.toggleSidebar()}
          class="flex w-9 h-9 rounded-full bg-text-primary/5 border-none text-text-primary items-center justify-center cursor-pointer transition-colors hover:bg-text-primary/20"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        <div class="flex flex-col">
          <div class="font-display lowercase text-xl font-bold text-text-primary tracking-wide leading-tight">Timeline</div>
          <div class="font-display lowercase text-[11px] font-bold text-text-muted tracking-widest leading-none mt-0.5">Upcoming Schedule</div>
        </div>
        <div class="flex items-center gap-2">
          <button 
            class={`hidden xl:flex w-9 h-9 rounded-full border-none items-center justify-center cursor-pointer transition-colors ${showTodayPane() ? 'bg-accent/10 text-accent' : 'bg-text-primary/5 text-text-primary hover:bg-text-primary/20'}`} 
            onClick={() => setShowTodayPane(!showTodayPane())}
            title="Toggle Today Pane"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
          <button class="w-9 h-9 rounded-full bg-text-primary/5 border-none text-text-primary flex items-center justify-center cursor-pointer transition-colors hover:bg-text-primary/20" onClick={() => uiStore.setActiveModal('addItem')}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
      </div>

      <div class="flex-1 flex overflow-hidden relative">
        {/* Main Timeline Column */}
        <div class="flex-1 relative overflow-hidden flex flex-col">
          <div 
            id="timelineScroll" 
            class={`flex-1 overflow-y-auto overflow-x-hidden relative transition-opacity duration-300 ${isReady() ? 'opacity-100' : 'opacity-0'} ${smoothScroll() ? 'scroll-smooth' : ''}`}
          >
            <div ref={topSentinel} style={{ height: '1px' }}></div>
          <For each={days()}>
            {(day) => {
              const isDayToday = isSameDay(day, today);
              const dateStr = format(day, 'yyyy-MM-dd');
              
              const unifiedItems = createMemo(() => {
                const events = expandedEvents().filter(e => e.start_time && isSameDay(new Date(e.start_time), day)).map(e => ({
                  ...e, type: 'event', time: parseISO(e.start_time).getTime(), color: eventState.calendars.find(c => c.id === e.calendarId)?.color || '#E8942A'
                }));
                
                let tasks = [];
                if (settings.showTasksInTimeline) {
                  tasks = expandedTasks().filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), day)).map(t => ({
                    ...t, type: 'task', time: t.allDay ? 0 : parseISO(t.scheduled_date).getTime(), color: taskState.lists.find(l => l.id === t.listId)?.color || '#6B5BDB'
                  }));
                }
                
                return [...events, ...tasks].sort((a, b) => a.time - b.time);
              });

              const displayItems = createMemo(() => {
                const items = unifiedItems();
                if (items.length === 0) return [];
                
                if (!isSameDay(day, currentTime())) {
                  const isPastDay = day.getTime() < currentTime().getTime();
                  return items.map(item => ({ ...item, isPast: isPastDay }));
                }

                let redLineRendered = false;
                const result = [];
                const now = currentTime().getTime();

                for (let i = 0; i < items.length; i++) {
                  const item = { ...items[i] };
                  const start = item.time;
                  const end = item.type === 'event' && !item.allDay ? parseISO(item.end_time).getTime() : start + 30 * 60000;
                  
                  item.isPast = end <= now;

                  if (item.allDay) {
                    result.push(item);
                    continue;
                  }

                  if (now < start && !redLineRendered) {
                    result.push({ isRedLine: true, id: `red-line-gap-${day.getTime()}` });
                    redLineRendered = true;
                  }

                  if (now >= start && now < end && !redLineRendered) {
                    item.hasRedLine = true;
                    item.progress = Math.max(0, Math.min(1, (now - start) / (end - start)));
                    redLineRendered = true;
                  }

                  result.push(item);
                }

                if (!redLineRendered && items.filter(i => !i.allDay).length > 0) {
                  result.push({ isRedLine: true, id: `red-line-end-${day.getTime()}` });
                }

                return result;
              });

              return (
                <div class={`day-section timeline-row-enter flex border-b border-border-theme min-h-[160px] transition-colors relative ${isDayToday ? 'bg-accent/5 is-today' : ''}`} data-date={dateStr}>
                  <div class="w-20 min-w-20 border-r border-border-theme p-4 flex flex-col items-center sticky top-0">
                    {day.getDate() === 1 && (
                      <div class="text-xs font-bold text-text-secondary uppercase mb-2">{format(day, 'MMMM')}</div>
                    )}
                    <div class="text-[10px] font-bold text-text-muted uppercase mb-1">{format(day, 'EEE')}</div>
                    <div class={`flex items-center justify-center ${isDayToday ? 'w-9 h-9 rounded-full bg-accent text-text-primary shadow-[0_0_15px_var(--color-accent)]' : ''}`}>
                      <div class="font-display lowercase text-2xl font-bold text-text-primary">{format(day, 'd')}</div>
                    </div>
                  </div>
                  
                  <div class="flex-1 p-4 md:px-8 lg:px-12">
                    <div class="flex flex-col gap-0.5 max-w-[800px] mx-auto">
                      {displayItems().length === 0 ? (
                        <div class="text-sm font-semibold text-text-muted italic py-4">Nothing scheduled.</div>
                      ) : (
                        <For each={displayItems()}>
                          {(item) => (
                            <Show 
                              when={!item.isRedLine}
                              fallback={
                                <div class="w-full flex items-center gap-2 my-2 z-0 relative pointer-events-none opacity-90" style="margin-left: -12px; width: calc(100% + 24px);">
                                  <div class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                                  <div class="flex-1 h-[2px] bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.4)]"></div>
                                </div>
                              }
                            >
                              <div class="relative w-full z-10 transition-opacity duration-300" style={{ opacity: item.isPast ? 0.4 : 1 }}>
                                <Show when={item.hasRedLine}>
                                  <div 
                                    class="absolute h-[2px] bg-red-500 z-[-1] flex items-center pointer-events-none shadow-[0_0_5px_rgba(239,68,68,0.4)] opacity-90"
                                    style={{ 
                                      top: `${Math.max(5, Math.min(95, item.progress * 100))}%`, 
                                      left: '-12px', 
                                      right: '-12px' 
                                    }}
                                  >
                                    <div class="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] absolute left-0"></div>
                                  </div>
                                </Show>
                                <div 
                                  class="group relative bg-transparent hover:bg-text-primary/5 rounded-xl p-2 flex items-stretch gap-3 md:gap-4 transition-colors cursor-pointer"
                                  onClick={() => uiStore.setActiveEvent(item.originalId || item.id, item.type)}
                                  style={{ opacity: (item.type === 'task' && item.completed) ? 0.5 : 1 }}
                                >
                                  {/* Pill / Checkbox Column */}
                                  <div class="flex items-center justify-center shrink-0 w-6">
                                    <Show 
                                      when={item.type === 'task'}
                                      fallback={
                                        <div 
                                          class="w-1.5 rounded-full"
                                          style={{ "background-color": item.color, "min-height": "100%" }}
                                        ></div>
                                      }
                                    >
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); taskStore.toggleTask(item.originalId || item.id); }}
                                        class="w-5 h-5 rounded-full border-[2px] flex items-center justify-center cursor-pointer transition-colors bg-transparent hover:scale-110"
                                        style={{ "border-color": item.color }}
                                      >
                                        <Show when={item.completed}>
                                          <div class="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                                        </Show>
                                      </button>
                                    </Show>
                                  </div>

                                  {/* Title & Location Column */}
                                  <div class="flex flex-col min-w-0 flex-1 justify-center py-1">
                                    <div class={`text-[15px] font-bold text-text-primary/90 truncate transition-colors ${(item.type === 'task' && item.completed) ? 'line-through text-text-muted' : 'group-hover:text-text-primary'}`}>
                                      {item.title} {item.rrule && '🔄'}
                                    </div>
                                    <Show when={item.type === 'event' && item.location}>
                                      <div class="text-[12px] font-medium text-text-muted truncate flex items-center gap-1 mt-0.5">
                                        <svg class="w-3.5 h-3.5 opacity-70 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                        <span class="truncate">{item.location}</span>
                                      </div>
                                    </Show>
                                  </div>

                                  {/* Time Column */}
                                  <div class="w-16 md:w-20 shrink-0 text-right flex flex-col justify-center py-1 pr-1">
                                    <Show when={item.allDay} fallback={
                                      <>
                                        <div class="text-[13px] font-bold text-text-primary/80 group-hover:text-text-primary transition-colors">
                                          {item.type === 'event' 
                                            ? (() => { const d = new Date(item.start_time); return isNaN(d.getTime()) ? '' : format(d, settings.use24HourClock ? 'H:mm' : 'h:mm a'); })()
                                            : (() => { const d = new Date(item.scheduled_date); return isNaN(d.getTime()) ? '' : format(d, settings.use24HourClock ? 'H:mm' : 'h:mm a'); })()
                                          }
                                        </div>
                                        <Show when={item.type === 'event' && item.end_time}>
                                          <div class="text-[11px] font-semibold text-text-muted mt-0.5">
                                            {(() => { const d = new Date(item.end_time); return isNaN(d.getTime()) ? '' : format(d, settings.use24HourClock ? 'H:mm' : 'h:mm a'); })()}
                                          </div>
                                        </Show>
                                      </>
                                    }>
                                      <div class="text-[12px] font-bold text-text-muted uppercase tracking-wider">All-day</div>
                                    </Show>
                                  </div>
                                </div>
                              </div>
                            </Show>
                          )}
                        </For>
                      )}
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
          <div ref={bottomSentinel} style={{ height: '1px' }}></div>
        </div>
        
        {/* FAB for Today Scroll */}
        <button class="absolute bottom-8 right-8 w-14 h-14 rounded-full bg-card ring-1 ring-border-theme text-text-primary shadow-2xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 z-[100]" onClick={() => {
          const scrollContainer = document.getElementById('timelineScroll');
          const todayEl = document.querySelector('.day-section.is-today');
          if (scrollContainer && todayEl) {
            scrollContainer.scrollTo({ top: todayEl.offsetTop, behavior: 'smooth' });
          }
        }}>
          <div class="relative flex items-center justify-center">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2"></rect>
              <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round"></path>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-[12px] font-bold text-text-primary leading-none mt-[6px]">
                {currentTime().getDate()}
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Right Pane: Today View */}
      <div 
        class="hidden xl:flex flex-col border-l border-border-theme bg-bg-theme z-10 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden relative"
        style={{
          width: showTodayPane() ? '400px' : '0px',
          opacity: showTodayPane() ? 1 : 0
        }}
      >
        <div class="w-[400px] flex flex-col h-full absolute top-0 left-0 overflow-y-auto overflow-x-hidden">
        <div class="p-8 pb-4 flex items-start justify-between">
          <div>
            <h2 class="font-display lowercase text-2xl font-extrabold text-text-primary tracking-widest">{format(today, 'EEEE')}</h2>
            <div class="font-display lowercase text-sm font-bold text-text-muted tracking-widest mt-1">{format(today, 'd MMMM')}</div>
          </div>
          <button 
            onClick={() => {
              uiStore.setActiveDate(today.toISOString());
              uiStore.setActiveModal('addEvent');
            }}
            class="w-8 h-8 rounded-full bg-accent/10 text-accent border-none flex items-center justify-center cursor-pointer hover:bg-accent hover:text-text-primary transition-colors mt-1 shrink-0"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
          
        {/* Tasks Section */}
        <div class="px-8 py-4">
          <div class="flex items-center justify-between mb-4">
            <span class="font-display lowercase text-[11px] font-extrabold text-text-muted tracking-widest">Tasks</span>
          </div>
          
          <div class="flex flex-col gap-2">
            <For each={todayTasks()}>
              {(task) => {
                const color = taskState.lists.find(l => l.id === task.listId)?.color || '#6B5BDB';
                return (
                  <div class="flex items-start gap-3 py-1 group">
                    <button 
                      onClick={() => taskStore.toggleTask(task.originalId || task.id)}
                      class="w-5 h-5 rounded-full border-[2px] mt-0.5 flex items-center justify-center shrink-0 cursor-pointer transition-colors bg-transparent"
                      style={{ "border-color": color }}
                    >
                      <Show when={task.completed}>
                        <div class="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                      </Show>
                    </button>
                    <div 
                      class="flex-1 cursor-pointer"
                      onClick={() => uiStore.setActiveEvent(task.originalId || task.id, 'task')}
                    >
                      <div class={`text-[14px] font-medium text-text-primary/90 leading-tight ${task.completed ? 'line-through text-text-muted' : ''}`}>
                        {task.title}
                      </div>
                    </div>
                  </div>
                );
              }}
            </For>

            <button 
              onClick={() => uiStore.setActiveModal('addTask')}
              class="mt-2 w-full bg-card hover:bg-text-primary/10 border-none rounded-xl p-3 flex items-center justify-center text-text-primary cursor-pointer transition-colors shadow-sm"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
            </button>
          </div>
        </div>

        {/* Agenda Section */}
        <div class="px-8 py-4 flex-1 flex flex-col min-h-0">
          <div class="flex items-center justify-between mb-4">
            <span class="font-display lowercase text-[11px] font-extrabold text-text-muted tracking-widest">Agenda</span>
            <div class="flex bg-text-primary/10 rounded-lg p-0.5 relative">
              <div class={`absolute top-0.5 bottom-0.5 w-[calc(50%-2px)] bg-accent rounded shadow-sm transition-transform duration-300 pointer-events-none ${scheduleViewMode() === 'grid' ? 'translate-x-[calc(100%+2px)]' : 'translate-x-0'}`}></div>
              <button type="button" class={`relative z-10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-colors rounded bg-transparent border-none ${scheduleViewMode() === 'list' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`} onClick={() => setScheduleViewMode('list')}>List</button>
              <button type="button" class={`relative z-10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-colors rounded bg-transparent border-none ${scheduleViewMode() === 'grid' ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary'}`} onClick={() => {
                setScheduleViewMode('grid');
                setTimeout(() => {
                  const scrollArea = document.getElementById('todayGridScrollArea');
                  if (scrollArea) {
                    const now = new Date();
                    const mins = now.getHours() * 60 + now.getMinutes();
                    scrollArea.scrollTop = Math.max(0, mins - 60);
                  }
                }, 50);
              }}>Grid</button>
            </div>
          </div>
          
          <div class="flex-1 overflow-hidden relative">
            <Transition
              mode="outin"
              onEnter={(el, done) => {
                el.animate([{opacity: 0, transform: 'scale(0.98)'}, {opacity: 1, transform: 'scale(1)'}], {duration: 300, easing: 'ease-out'}).onfinish = done;
              }}
              onExit={(el, done) => {
                el.animate([{opacity: 1, transform: 'scale(1)'}, {opacity: 0, transform: 'scale(0.98)'}], {duration: 200, easing: 'ease-in'}).onfinish = done;
              }}
            >
              <Show when={scheduleViewMode() === 'list'}>
                <div class="flex flex-col gap-2 absolute inset-0 overflow-y-auto pr-2 pb-4">
                  <For each={(() => {
                    const now = new Date().getTime();
                    return todayItems().filter(i => i.type === 'event' && !i.allDay && parseISO(i.end_time).getTime() > now);
                  })()}>
                    {item => {
                      const timeFmt = settings.use24HourClock ? 'H:mm' : 'h:mm a';
                      const timeStr = format(parseISO(item.start_time), timeFmt) + ' - ' + format(parseISO(item.end_time), timeFmt);

                      return (
                        <div class="flex gap-4 group cursor-pointer p-2 rounded-xl hover:bg-text-primary/5 transition-colors border border-transparent hover:border-border-theme shrink-0">
                          <div class="w-16 text-right text-xs font-bold text-text-muted pt-1">
                            {timeStr.split(' - ')[0]}
                          </div>
                          <div class="flex-1 flex gap-3">
                            <div class="w-1 rounded-full flex-shrink-0" style={{ "background-color": item.color }}></div>
                            <div class="flex-1">
                              <div class="text-[13px] font-bold text-text-primary group-hover:text-accent transition-colors">{item.title} {item.rrule && '🔄'}</div>
                              <div class="text-[11px] font-semibold text-text-muted mt-0.5">{timeStr}</div>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  </For>
                  <Show when={(() => {
                    const now = new Date().getTime();
                    return todayItems().filter(i => i.type === 'event' && !i.allDay && parseISO(i.end_time).getTime() > now).length === 0;
                  })()}>
                    <div class="text-[13px] font-semibold text-text-muted py-4 text-center">No upcoming events today</div>
                  </Show>
                </div>
              </Show>

              <Show when={scheduleViewMode() === 'grid'}>
                <div class="absolute inset-0 flex flex-col pb-4">
                  <Show when={todayItems().filter(i => i.allDay).length > 0}>
                    <div class="w-full border border-border-theme bg-bg-theme rounded-xl mb-2 flex flex-col gap-1 p-2 max-h-[100px] overflow-y-auto relative shrink-0">
                      <div class="font-display lowercase text-[9px] font-bold text-text-muted tracking-wider mb-1 px-1">All Day</div>
                      <For each={todayItems().filter(i => i.allDay)}>
                        {(item) => (
                          <div 
                            class="rounded px-2 py-1.5 text-[10px] font-bold text-white truncate shadow-sm cursor-pointer hover:brightness-110"
                            style={{ background: item.color, opacity: (item.type === 'task' && item.completed) ? 0.5 : 1 }}
                            onClick={() => {
                              if (item.type === 'event') {
                                uiStore.setActiveEvent(item.originalId || item.id, 'event');
                                uiStore.setActiveModal('eventView');
                              } else {
                                uiStore.setActiveEvent(item.originalId || item.id, 'task');
                              }
                            }}
                          >
                            {item.title} {item.rrule && '🔄'}
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>

                  <div id="todayGridScrollArea" class="flex-1 overflow-y-auto relative border border-border-theme rounded-xl bg-text-primary/5 min-h-[300px]">
                    <div class="relative h-[1440px] w-full">
                      <For each={Array.from({length: 24})}>
                        {(_, i) => {
                          const hourForecast = () => {
                            if (!weatherService.state) return null;
                            return weatherService.state.hourly.find(h => new Date(h.time).getHours() === i() && isSameDay(new Date(h.time), today));
                          };
                          return (
                            <div class="absolute w-full h-[60px] border-b border-border-theme pointer-events-none flex" style={{ top: `${i() * 60}px` }}>
                              <div class="w-14 min-w-[56px] h-full border-r border-border-theme flex flex-col items-center py-1">
                                <span class="text-[10px] text-text-muted font-bold">{i() === 0 ? '12 AM' : i() < 12 ? `${i()} AM` : i() === 12 ? '12 PM' : `${i()-12} PM`}</span>
                                <Show when={hourForecast()}>
                                  <div class="flex items-center gap-0.5 text-[10px] text-text-muted font-semibold mt-1">
                                    <span title={hourForecast().condition}>{hourForecast().icon}</span>
                                    <span>{hourForecast().temp}°</span>
                                  </div>
                                </Show>
                              </div>
                              <div class="flex-1 h-[30px] border-b border-white/[0.03]"></div>
                            </div>
                          );
                        }}
                      </For>

                      {/* Current Time Indicator */}
                      <Show when={isSameDay(today, new Date())}>
                        {(() => {
                          const now = new Date();
                          const mins = now.getHours() * 60 + now.getMinutes();
                          return (
                            <div class="absolute w-[calc(100%-56px)] flex items-center z-30 pointer-events-none" style={{ top: `${mins - 6}px`, left: '56px' }}>
                              <svg class="w-3 h-3 text-red-500 -ml-1.5 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                              <div class="flex-1 h-[2px] bg-red-500 shadow-sm"></div>
                            </div>
                          );
                        })()}
                      </Show>

                      {/* Items */}
                      <For each={(() => {
                        const timed = todayItems().filter(i => (i.type === 'event' && !i.allDay) || (i.type === 'task' && !i.allDay));
                        const placed = [];
                        timed.forEach((item) => {
                          let startMin = 0;
                          let endMin = 60;
                          if (item.type === 'event') {
                            const st = parseISO(item.start_time);
                            const en = parseISO(item.end_time);
                            startMin = st.getHours() * 60 + st.getMinutes();
                            endMin = en.getHours() * 60 + en.getMinutes();
                          } else {
                            const st = new Date(item.scheduled_date || 0);
                            startMin = st.getHours() * 60 + st.getMinutes();
                            endMin = startMin + 30;
                          }
                          placed.push({ ...item, startMin, endMin });
                        });
                        return calculateGridOverlap(placed);
                      })()}>
                        {(item) => {
                          if (item.isGroup) {
                            const height = Math.max(item.endMin - item.startMin, 30);
                            return (
                              <div 
                                class="absolute rounded-md p-2 overflow-hidden transition-all duration-300 shadow-sm z-10 border border-border-theme bg-bg-theme text-text-primary cursor-pointer hover:z-30 hover:shadow-lg group flex items-center justify-center backdrop-blur-md bg-opacity-90 hover:h-auto min-h-[30px]"
                                style={{ 
                                  top: `${item.startMin}px`, 
                                  height: `${height}px`,
                                  left: item.left,
                                  width: item.width
                                }}
                              >
                                <div class="text-[11px] font-bold tracking-wide group-hover:hidden text-center truncate w-full px-2">
                                  {item.items.length} Events
                                </div>
                                <div class="hidden group-hover:flex flex-col gap-1 w-full bg-bg-theme relative p-1 z-40 rounded">
                                  <For each={item.items}>
                                    {(subItem) => (
                                      <div 
                                        class="w-full text-left rounded p-1.5 hover:brightness-110 transition-colors cursor-pointer text-white truncate text-[10px] font-semibold"
                                        style={{ background: subItem.color, opacity: (subItem.type === 'task' && subItem.completed) ? 0.5 : 1 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (subItem.type === 'event') {
                                            uiStore.setActiveEvent(subItem.originalId || subItem.id, 'event');
                                            uiStore.setActiveModal('eventView');
                                          } else {
                                            uiStore.setActiveEvent(subItem.originalId || subItem.id, 'task');
                                          }
                                        }}
                                      >
                                        {subItem.title}
                                      </div>
                                    )}
                                  </For>
                                </div>
                              </div>
                            );
                          }

                          const height = Math.max(item.endMin - item.startMin, 15);
                          return (
                            <div 
                              class="absolute rounded-md p-1.5 overflow-hidden transition-all duration-300 shadow-sm z-10 border border-black/10 text-white cursor-pointer hover:z-20 hover:shadow-md"
                              style={{ 
                                top: `${item.startMin}px`, 
                                height: `${height}px`,
                                left: item.left,
                                width: item.width,
                                background: item.color,
                                opacity: (item.type === 'task' && item.completed) ? 0.5 : 1
                              }}
                              onClick={() => {
                                if (item.type === 'event') {
                                  uiStore.setActiveEvent(item.originalId || item.id, 'event');
                                  uiStore.setActiveModal('eventView');
                                } else {
                                  uiStore.setActiveEvent(item.originalId || item.id, 'task');
                                }
                              }}
                            >
                              <div class="text-[10px] font-bold leading-tight truncate text-white">
                                {item.title} {item.rrule && '🔄'}
                              </div>
                              <Show when={height >= 30 && item.type === 'event'}>
                                <div class="text-[9px] font-semibold opacity-80 text-white/80">
                                  {Math.floor(item.startMin / 60)}:{(item.startMin % 60).toString().padStart(2, '0')} - {Math.floor(item.endMin / 60)}:{(item.endMin % 60).toString().padStart(2, '0')}
                                </div>
                              </Show>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </div>
                </div>
              </Show>
            </Transition>
          </div>
        </div>

          {/* Weather Section */}
          <div class="px-8 py-4 relative z-20">
            <div class="flex items-center justify-between mb-4">
              <span class="font-display lowercase text-[11px] font-extrabold text-text-muted tracking-widest">Weather</span>
              <Show when={weatherService.state}>
                <button 
                  onClick={() => setIsWeatherExpanded(!isWeatherExpanded())}
                  class={`bg-transparent border-none text-text-muted hover:text-text-primary cursor-pointer transition-transform ${isWeatherExpanded() ? 'rotate-180' : ''}`}
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg>
                </button>
              </Show>
            </div>
            
            <Show 
              when={weatherService.state} 
              fallback={
                <div class="bg-card rounded-xl p-4 shadow-sm flex items-center gap-4 animate-pulse">
                  <div class="w-12 h-12 rounded-full bg-white/5"></div>
                  <div class="flex-1 flex flex-col gap-2">
                    <div class="h-3 w-3/4 bg-white/5 rounded"></div>
                    <div class="h-3 w-1/2 bg-white/5 rounded"></div>
                  </div>
                </div>
              }
            >
              <div 
                class={`bg-card rounded-xl shadow-sm transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden cursor-pointer flex flex-col relative ${isWeatherExpanded() ? 'h-[380px] shadow-[0_-15px_40px_rgba(0,0,0,0.2),0_0_20px_rgba(255,255,255,0.05)] ring-1 ring-border-theme transform -translate-y-2 scale-[1.02] z-30' : 'h-[80px] hover:bg-text-primary/5'}`}
                onClick={() => { if (!isWeatherExpanded()) setIsWeatherExpanded(true); }}
              >
                {/* Collapsed / Header View */}
                <div class="p-4 flex items-center gap-4 shrink-0">
                  <div class="font-display lowercase text-4xl" title={weatherService.state.current.condition}>{weatherService.state.current.icon}</div>
                  <div class="flex-1 flex flex-col">
                    <span class="text-[14px] font-bold text-text-primary leading-tight">{weatherService.state.current.temp}° and {weatherService.state.current.condition}</span>
                    <span class="text-[11px] font-semibold text-text-muted mt-0.5">Today's forecast</span>
                  </div>
                  <Show when={weatherService.state.forecast[0]}>
                    <div class="flex flex-col text-right text-[11px] font-bold text-text-muted">
                      <span class="text-text-primary">↑ {weatherService.state.forecast[0].tempMax}°</span>
                      <span>↓ {weatherService.state.forecast[0].tempMin}°</span>
                    </div>
                  </Show>
                </div>

                {/* Expanded View */}
                <div 
                  class={`flex-1 flex flex-col px-4 pb-4 transition-opacity duration-500 delay-100 ${isWeatherExpanded() ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                  <Show when={weatherService.state.current.insight}>
                    <div class="bg-accent/10 rounded-lg p-3 mb-4 shrink-0 border border-accent/20 flex items-start gap-2">
                      <span class="text-accent mt-0.5">✨</span>
                      <span class="text-[12px] font-semibold text-text-primary leading-snug">{weatherService.state.current.insight}</span>
                    </div>
                  </Show>

                  <div class="font-display lowercase text-[10px] font-bold text-text-muted tracking-wider mb-2">Hourly</div>
                  <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 -mx-2 px-2">
                    <For each={(() => {
                      const now = new Date();
                      const todayHours = weatherService.state.hourly.filter(h => isSameDay(new Date(h.time), now) && new Date(h.time).getTime() >= now.getTime() - 60*60*1000);
                      return todayHours;
                    })()}>
                      {(hour) => {
                        const date = new Date(hour.time);
                        return (
                          <div class="flex items-center justify-between p-2 rounded-lg hover:bg-text-primary/5 transition-colors">
                            <span class="text-[12px] font-bold text-text-secondary w-12">{format(date, settings.use24HourClock ? 'H:00' : 'ha')}</span>
                            <span class="text-lg w-8 text-center">{hour.icon}</span>
                            <span class="text-[13px] font-bold text-text-primary w-12 text-right">{hour.temp}°</span>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                  
                  <div class="mt-4 pt-3 border-t border-border-theme flex justify-between items-center text-[10px] font-semibold text-text-muted shrink-0">
                    <div class="flex items-center gap-1"><span class="text-[14px]">💨</span> {weatherService.state.current.windSpeed} mph</div>
                    <div class="flex items-center gap-1"><span class="text-[14px]">💧</span> {weatherService.state.current.humidity}%</div>
                    <div class="flex items-center gap-1"><span class="text-[14px]">☂️</span> {weatherService.state.current.precipitationProbability}%</div>
                  </div>
                </div>
              </div>
            </Show>
          </div>

    </div>
      </div>
    </div>
    </>
  );
};

export default TimelineView;