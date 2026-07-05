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
import { snapUserColor } from '../../lib/colorTokens';
import {
  Button,
  IconButton,
  Heading,
  Text,
  List,
  ListItem,
  CheckboxInput,
  SegmentedControl,
  SegmentedControlItem,
  EmptyState,
  Skeleton,
  cx,
} from '../kit';
import { Menu as MenuIcon, Plus, PanelRight, MapPin, ChevronUp } from 'lucide-solid';

// Now-line glow shadows: --color-error through color-mix (replaces the old
// raw rgba(239,68,68,*) glows).
const NOW_DOT_GLOW = 'shadow-[0_0_8px_color-mix(in_srgb,var(--color-error)_60%,transparent)]';
const NOW_LINE_GLOW = 'shadow-[0_0_5px_color-mix(in_srgb,var(--color-error)_40%,transparent)]';

function TimelineView() {
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

  // Per-item USER colors rendered through the bounded Astryx hue palette
  // (snapUserColor). Missing calendar → accent token; missing list → purple
  // hue token (replacing the old raw '#E8942A' / '#6B5BDB' fallbacks).
  const eventColor = (e) => {
    const stored = eventState.calendars.find(c => c.id === e.calendarId)?.color;
    return stored ? snapUserColor(stored).cssVar : 'var(--color-accent)';
  };
  const taskColor = (t) => {
    const stored = taskState.lists.find(l => l.id === t.listId)?.color;
    return stored ? snapUserColor(stored).cssVar : 'var(--color-purple-vivid)';
  };

  const fmtTime = (dateLike) => {
    const d = new Date(dateLike);
    return isNaN(d.getTime()) ? '' : format(d, settings.use24HourClock ? 'H:mm' : 'h:mm a');
  };

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
      ...e, type: 'event', color: eventColor(e)
    }));
    const tasks = expandedTasks().filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), today)).map(t => ({
      ...t, type: 'task', color: taskColor(t)
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

  const upcomingTodayEvents = () => {
    const now = new Date().getTime();
    return todayItems().filter(i => i.type === 'event' && !i.allDay && parseISO(i.end_time).getTime() > now);
  };

  const openItem = (item) => {
    if (item.type === 'event') {
      uiStore.setActiveEvent(item.originalId || item.id, 'event');
      uiStore.setActiveModal('eventView');
    } else {
      uiStore.setActiveEvent(item.originalId || item.id, 'task');
    }
  };

  const setAgendaMode = (mode) => {
    setScheduleViewMode(mode);
    if (mode === 'grid') {
      setTimeout(() => {
        const scrollArea = document.getElementById('todayGridScrollArea');
        if (scrollArea) {
          const now = new Date();
          const mins = now.getHours() * 60 + now.getMinutes();
          scrollArea.scrollTop = Math.max(0, mins - 60);
        }
      }, 50);
    }
  };

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
      <div class="h-[60px] min-h-[60px] border-b border-border flex items-center justify-between px-6 bg-body/40 backdrop-blur-md sticky top-0 z-50">
        <div class="flex items-center gap-4">
          <IconButton
            variant="ghost"
            label="Toggle sidebar"
            icon={<MenuIcon />}
            class="rounded-full"
            onClick={() => uiStore.toggleSidebar()}
          />
          <div class="flex flex-col">
            <Heading level={1} class="lowercase leading-tight">Timeline</Heading>
            <Text
              type="supporting"
              color="disabled"
              weight="bold"
              display="block"
              class="font-display lowercase text-xs tracking-widest leading-none mt-0.5"
            >
              Upcoming Schedule
            </Text>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <span class="hidden xl:inline-flex">
            <IconButton
              variant="ghost"
              label="Toggle today pane"
              aria-pressed={showTodayPane()}
              icon={<PanelRight />}
              class={cx('rounded-full', showTodayPane() && 'text-accent bg-accent-muted')}
              onClick={() => setShowTodayPane(!showTodayPane())}
            />
          </span>
          <IconButton
            variant="ghost"
            label="Add item"
            icon={<Plus />}
            class="rounded-full"
            onClick={() => uiStore.setActiveModal('addItem')}
          />
        </div>
      </div>

      <div class="flex-1 flex overflow-hidden relative">
        {/* Main Timeline Column */}
        <div class="flex-1 relative overflow-hidden flex flex-col">
          <div
            id="timelineScroll"
            class={`flex-1 overflow-y-auto overflow-x-hidden relative transition-opacity duration-300 ${isReady() ? 'opacity-100' : 'opacity-0'} ${smoothScroll() ? 'scroll-smooth' : ''}`}
          >
            <div ref={topSentinel} style={{ height: '1px' }} />
          <For each={days()}>
            {(day) => {
              const isDayToday = isSameDay(day, today);
              const dateStr = format(day, 'yyyy-MM-dd');

              const unifiedItems = createMemo(() => {
                const events = expandedEvents().filter(e => e.start_time && isSameDay(new Date(e.start_time), day)).map(e => ({
                  ...e, type: 'event', time: parseISO(e.start_time).getTime(), color: eventColor(e)
                }));

                let tasks = [];
                if (settings.showTasksInTimeline) {
                  tasks = expandedTasks().filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), day)).map(t => ({
                    ...t, type: 'task', time: t.allDay ? 0 : parseISO(t.scheduled_date).getTime(), color: taskColor(t)
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
                <div class={`day-section timeline-row-enter flex border-b border-border min-h-[160px] transition-colors relative ${isDayToday ? 'bg-accent/5 is-today' : ''}`} data-date={dateStr}>
                  <div class="w-20 min-w-20 border-r border-border p-4 flex flex-col items-center sticky top-0">
                    {day.getDate() === 1 && (
                      <Text type="supporting" color="secondary" weight="bold" display="block" class="text-xs uppercase mb-2">{format(day, 'MMMM')}</Text>
                    )}
                    <Text color="disabled" weight="bold" display="block" class="text-xs uppercase mb-1">{format(day, 'EEE')}</Text>
                    <div class={`flex items-center justify-center ${isDayToday ? 'w-9 h-9 rounded-full bg-accent shadow-[0_0_15px_var(--color-accent)]' : ''}`}>
                      <div class={cx('font-display lowercase text-2xl font-bold', isDayToday ? 'text-on-accent' : 'text-primary')}>{format(day, 'd')}</div>
                    </div>
                  </div>

                  <div class="flex-1 p-4 md:px-8 lg:px-12">
                    <div class="max-w-[800px] mx-auto">
                      <Show
                        when={displayItems().length > 0}
                        fallback={<EmptyState isCompact title="Nothing scheduled." />}
                      >
                        <List density="balanced" aria-label={`Schedule for ${format(day, 'EEEE d MMMM')}`}>
                          <For each={displayItems()}>
                            {(item) => (
                              <Show
                                when={!item.isRedLine}
                                fallback={
                                  <li aria-hidden="true" class="flex items-center gap-2 my-2 z-0 relative pointer-events-none opacity-90 -ml-3 w-[calc(100%+var(--spacing-6))]">
                                    <span class={cx('w-2 h-2 rounded-full bg-error', NOW_DOT_GLOW)} />
                                    <span class={cx('flex-1 h-0.5 bg-error', NOW_LINE_GLOW)} />
                                  </li>
                                }
                              >
                                <ListItem
                                  class="group z-10 transition-opacity duration-300"
                                  style={{
                                    opacity: (item.isPast ? 0.4 : 1) * ((item.type === 'task' && item.completed) ? 0.5 : 1),
                                  }}
                                  onClick={() => uiStore.setActiveEvent(item.originalId || item.id, item.type)}
                                  startContent={
                                    <>
                                      <Show when={item.hasRedLine}>
                                        <span
                                          aria-hidden="true"
                                          class={cx('absolute h-0.5 bg-error z-[-1] flex items-center pointer-events-none opacity-90 -left-3 -right-3', NOW_LINE_GLOW)}
                                          style={{ top: `${Math.max(5, Math.min(95, item.progress * 100))}%` }}
                                        >
                                          <span class={cx('w-2 h-2 rounded-full bg-error absolute left-0', NOW_DOT_GLOW)} />
                                        </span>
                                      </Show>
                                      <span class="flex items-center justify-center w-6">
                                        <Show
                                          when={item.type === 'task'}
                                          fallback={
                                            <span
                                              class="w-1.5 min-h-9 self-stretch rounded-full"
                                              style={{ 'background-color': item.color }}
                                            />
                                          }
                                        >
                                          <CheckboxInput
                                            size="sm"
                                            isLabelHidden
                                            label={item.title}
                                            value={!!item.completed}
                                            color={item.color}
                                            onChange={() => taskStore.toggleTask(item.originalId || item.id)}
                                          />
                                        </Show>
                                      </span>
                                    </>
                                  }
                                  label={
                                    <span class={cx(
                                      'block truncate text-base font-bold transition-colors',
                                      (item.type === 'task' && item.completed)
                                        ? 'line-through text-disabled'
                                        : 'text-primary/90 group-hover:text-primary',
                                    )}>
                                      {item.title} {item.rrule && '🔄'}
                                    </span>
                                  }
                                  description={item.type === 'event' && item.location ? (
                                    <span class="flex items-center gap-1 min-w-0 text-sm font-medium text-disabled mt-0.5">
                                      <MapPin aria-hidden="true" class="size-3.5 opacity-70 shrink-0" />
                                      <span class="truncate">{item.location}</span>
                                    </span>
                                  ) : undefined}
                                  endContent={
                                    <span class="w-16 md:w-20 text-right flex flex-col justify-center py-1 pr-1">
                                      <Show when={item.allDay} fallback={
                                        <>
                                          <span class="text-sm font-bold text-primary/80 group-hover:text-primary transition-colors">
                                            {item.type === 'event' ? fmtTime(item.start_time) : fmtTime(item.scheduled_date)}
                                          </span>
                                          <Show when={item.type === 'event' && item.end_time}>
                                            <span class="text-xs font-semibold text-disabled mt-0.5">
                                              {fmtTime(item.end_time)}
                                            </span>
                                          </Show>
                                        </>
                                      }>
                                        <span class="text-sm font-bold text-disabled uppercase tracking-wider">All-day</span>
                                      </Show>
                                    </span>
                                  }
                                />
                              </Show>
                            )}
                          </For>
                        </List>
                      </Show>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
          <div ref={bottomSentinel} style={{ height: '1px' }} />
        </div>

        {/* FAB for Today Scroll */}
        <IconButton
          variant="primary"
          size="lg"
          label="Scroll to today"
          class="absolute bottom-8 right-8 rounded-full shadow-[var(--shadow-high)] z-[var(--z-popover,60)] hover:scale-105 transition-transform"
          onClick={() => {
            const scrollContainer = document.getElementById('timelineScroll');
            const todayEl = document.querySelector('.day-section.is-today');
            if (scrollContainer && todayEl) {
              scrollContainer.scrollTo({ top: todayEl.offsetTop, behavior: 'smooth' });
            }
          }}
          icon={
            <span class="relative flex items-center justify-center">
              <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2" />
                <path d="M16 2v4M8 2v4M3 10h18" stroke-width="2" stroke-linecap="round" />
              </svg>
              <span class="absolute inset-0 flex items-center justify-center pt-1">
                <span class="text-2xs font-bold leading-none">
                  {currentTime().getDate()}
                </span>
              </span>
            </span>
          }
        />
      </div>

      {/* Right Pane: Today View */}
      <div
        class="hidden xl:flex flex-col border-l border-border bg-body z-10 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden relative"
        style={{
          width: showTodayPane() ? '400px' : '0px',
          opacity: showTodayPane() ? 1 : 0
        }}
      >
        <div class="w-[400px] flex flex-col h-full absolute top-0 left-0 overflow-y-auto overflow-x-hidden">
        <div class="p-8 pb-4 flex items-start justify-between">
          <div>
            <Heading level={2} class="lowercase tracking-widest">{format(today, 'EEEE')}</Heading>
            <Text type="supporting" color="disabled" weight="bold" display="block" class="font-display lowercase tracking-widest mt-1">{format(today, 'd MMMM')}</Text>
          </div>
          <IconButton
            variant="ghost"
            label="Add event today"
            icon={<Plus />}
            class="rounded-full text-accent bg-accent-muted mt-1 shrink-0"
            onClick={() => {
              uiStore.setActiveDate(today.toISOString());
              uiStore.setActiveModal('addEvent');
            }}
          />
        </div>

        {/* Tasks Section */}
        <div class="px-8 py-4">
          <div class="flex items-center justify-between mb-4">
            <Text color="disabled" weight="bold" class="font-display lowercase text-xs tracking-widest">Tasks</Text>
          </div>

          <div class="flex flex-col gap-2">
            <List density="compact" class="-mx-2" aria-label="Today's tasks">
              <For each={todayTasks()}>
                {(task) => (
                  <ListItem
                    class="group"
                    startContent={
                      <CheckboxInput
                        size="sm"
                        isLabelHidden
                        label={task.title}
                        value={!!task.completed}
                        color={taskColor(task)}
                        onChange={() => taskStore.toggleTask(task.originalId || task.id)}
                      />
                    }
                    label={
                      <span class={cx(
                        'block truncate text-base font-medium leading-tight',
                        task.completed ? 'line-through text-disabled' : 'text-primary/90',
                      )}>
                        {task.title}
                      </span>
                    }
                    onClick={() => uiStore.setActiveEvent(task.originalId || task.id, 'task')}
                  />
                )}
              </For>
            </List>

            <Button
              variant="secondary"
              label="Add task"
              icon={<Plus />}
              class="w-full mt-2"
              onClick={() => uiStore.setActiveModal('addTask')}
            />
          </div>
        </div>

        {/* Agenda Section */}
        <div class="px-8 py-4 flex-1 flex flex-col min-h-0">
          <div class="flex items-center justify-between mb-4">
            <Text color="disabled" weight="bold" class="font-display lowercase text-xs tracking-widest">Agenda</Text>
            <SegmentedControl
              size="sm"
              value={scheduleViewMode()}
              onChange={setAgendaMode}
              label="Agenda view"
            >
              <SegmentedControlItem value="list" label="List" />
              <SegmentedControlItem value="grid" label="Grid" />
            </SegmentedControl>
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
                <div class="flex flex-col absolute inset-0 overflow-y-auto pr-2 pb-4">
                  <Show
                    when={upcomingTodayEvents().length > 0}
                    fallback={<EmptyState isCompact title="No upcoming events today" />}
                  >
                    <List density="compact" aria-label="Upcoming events today">
                      <For each={upcomingTodayEvents()}>
                        {item => {
                          const timeStr = fmtTime(parseISO(item.start_time)) + ' - ' + fmtTime(parseISO(item.end_time));

                          return (
                            <ListItem
                              class="group border border-transparent hover:border-border"
                              startContent={
                                <span class="flex items-stretch gap-3">
                                  <span class="w-16 text-right text-xs font-bold text-disabled pt-1">
                                    {timeStr.split(' - ')[0]}
                                  </span>
                                  <span class="w-1 rounded-full" style={{ 'background-color': item.color }} />
                                </span>
                              }
                              label={
                                <span class="block truncate text-sm font-bold text-primary group-hover:text-accent transition-colors">
                                  {item.title} {item.rrule && '🔄'}
                                </span>
                              }
                              description={
                                <span class="text-xs font-semibold text-disabled mt-0.5">{timeStr}</span>
                              }
                            />
                          );
                        }}
                      </For>
                    </List>
                  </Show>
                </div>
              </Show>

              <Show when={scheduleViewMode() === 'grid'}>
                <div class="absolute inset-0 flex flex-col pb-4">
                  <Show when={todayItems().filter(i => i.allDay).length > 0}>
                    <div class="w-full border border-border bg-body rounded-lg mb-2 flex flex-col gap-1 p-2 max-h-[100px] overflow-y-auto relative shrink-0">
                      <Text color="disabled" weight="bold" display="block" class="font-display lowercase text-xs tracking-wider mb-1 px-1">All Day</Text>
                      <For each={todayItems().filter(i => i.allDay)}>
                        {(item) => (
                          <button
                            type="button"
                            class="w-full text-left rounded px-2 py-1.5 text-xs font-bold text-primary truncate shadow-[var(--shadow-low)] cursor-pointer hover:brightness-110 border-0"
                            style={{
                              background: `color-mix(in srgb, ${item.color} 30%, transparent)`,
                              'border-left': `3px solid ${item.color}`,
                              opacity: (item.type === 'task' && item.completed) ? 0.5 : 1,
                            }}
                            onClick={() => openItem(item)}
                          >
                            {item.title} {item.rrule && '🔄'}
                          </button>
                        )}
                      </For>
                    </div>
                  </Show>

                  <div id="todayGridScrollArea" class="flex-1 overflow-y-auto relative border border-border rounded-lg bg-primary/5 min-h-[300px]">
                    <div class="relative h-[1440px] w-full">
                      <For each={Array.from({length: 24})}>
                        {(_, i) => {
                          const hourForecast = () => {
                            if (!weatherService.state) return null;
                            return weatherService.state.hourly.find(h => new Date(h.time).getHours() === i() && isSameDay(new Date(h.time), today));
                          };
                          return (
                            <div class="absolute w-full h-[60px] border-b border-border pointer-events-none flex" style={{ top: `${i() * 60}px` }}>
                              <div class="w-14 min-w-[56px] h-full border-r border-border flex flex-col items-center py-1">
                                <span class="text-xs text-disabled font-bold">{i() === 0 ? '12 AM' : i() < 12 ? `${i()} AM` : i() === 12 ? '12 PM' : `${i()-12} PM`}</span>
                                <Show when={hourForecast()}>
                                  <div class="flex items-center gap-0.5 text-xs text-disabled font-semibold mt-1">
                                    <span title={hourForecast().condition}>{hourForecast().icon}</span>
                                    <span>{hourForecast().temp}°</span>
                                  </div>
                                </Show>
                              </div>
                              <div class="flex-1 h-[30px] border-b border-border/30" />
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
                              <svg class="w-3 h-3 text-error -ml-1.5 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                              <div class={cx('flex-1 h-0.5 bg-error', NOW_LINE_GLOW)} />
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
                                class="absolute rounded-md p-2 overflow-hidden transition-all duration-300 shadow-[var(--shadow-low)] z-10 border border-border bg-body text-primary cursor-pointer hover:z-30 hover:shadow-[var(--shadow-med)] group flex items-center justify-center backdrop-blur-md hover:h-auto min-h-[30px]"
                                style={{
                                  top: `${item.startMin}px`,
                                  height: `${height}px`,
                                  left: item.left,
                                  width: item.width
                                }}
                              >
                                <div class="text-xs font-bold tracking-wide group-hover:hidden text-center truncate w-full px-2">
                                  {item.items.length} Events
                                </div>
                                <div class="hidden group-hover:flex flex-col gap-1 w-full bg-body relative p-1 z-40 rounded">
                                  <For each={item.items}>
                                    {(subItem) => (
                                      <button
                                        type="button"
                                        class="w-full text-left rounded p-1.5 hover:brightness-110 transition-colors cursor-pointer text-primary truncate text-xs font-semibold border-0"
                                        style={{
                                          background: `color-mix(in srgb, ${subItem.color} 30%, transparent)`,
                                          'border-left': `3px solid ${subItem.color}`,
                                          opacity: (subItem.type === 'task' && subItem.completed) ? 0.5 : 1,
                                        }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openItem(subItem);
                                        }}
                                      >
                                        {subItem.title}
                                      </button>
                                    )}
                                  </For>
                                </div>
                              </div>
                            );
                          }

                          const height = Math.max(item.endMin - item.startMin, 15);
                          return (
                            <button
                              type="button"
                              class="absolute text-left rounded-md p-1.5 overflow-hidden transition-all duration-300 shadow-[var(--shadow-low)] z-10 text-primary cursor-pointer hover:z-20 hover:shadow-[var(--shadow-med)] border-0"
                              style={{
                                top: `${item.startMin}px`,
                                height: `${height}px`,
                                left: item.left,
                                width: item.width,
                                background: `color-mix(in srgb, ${item.color} 30%, transparent)`,
                                'border-left': `3px solid ${item.color}`,
                                'backdrop-filter': 'blur(4px)',
                                opacity: (item.type === 'task' && item.completed) ? 0.5 : 1
                              }}
                              onClick={() => openItem(item)}
                            >
                              <div class="text-xs font-bold leading-tight truncate text-primary">
                                {item.title} {item.rrule && '🔄'}
                              </div>
                              <Show when={height >= 30 && item.type === 'event'}>
                                <div class="text-2xs font-semibold text-secondary">
                                  {Math.floor(item.startMin / 60)}:{(item.startMin % 60).toString().padStart(2, '0')} - {Math.floor(item.endMin / 60)}:{(item.endMin % 60).toString().padStart(2, '0')}
                                </div>
                              </Show>
                            </button>
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
              <Text color="disabled" weight="bold" class="font-display lowercase text-xs tracking-widest">Weather</Text>
              <Show when={weatherService.state}>
                <IconButton
                  variant="ghost"
                  size="sm"
                  label={isWeatherExpanded() ? 'Collapse weather details' : 'Expand weather details'}
                  aria-expanded={isWeatherExpanded()}
                  icon={<ChevronUp />}
                  class={cx('rounded-full transition-transform', isWeatherExpanded() && 'rotate-180')}
                  onClick={() => setIsWeatherExpanded(!isWeatherExpanded())}
                />
              </Show>
            </div>

            <Show
              when={weatherService.state}
              fallback={
                <div class="bg-card rounded-lg p-4 shadow-[var(--shadow-low)] flex items-center gap-4" aria-busy="true">
                  <Skeleton shape="circle" width={48} />
                  <div class="flex-1 flex flex-col gap-2">
                    <Skeleton shape="text" width="75%" height={12} index={1} />
                    <Skeleton shape="text" width="50%" height={12} index={2} />
                  </div>
                </div>
              }
            >
              <div
                class={`bg-card rounded-lg transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] overflow-hidden cursor-pointer flex flex-col relative ${isWeatherExpanded() ? 'h-[380px] shadow-[var(--shadow-high)] ring-1 ring-border transform -translate-y-2 scale-[1.02] z-30' : 'h-[80px] shadow-[var(--shadow-low)] hover:bg-primary/5'}`}
                onClick={() => { if (!isWeatherExpanded()) setIsWeatherExpanded(true); }}
              >
                {/* Collapsed / Header View */}
                <div class="p-4 flex items-center gap-4 shrink-0">
                  <div class="font-display lowercase text-4xl" title={weatherService.state.current.condition}>{weatherService.state.current.icon}</div>
                  <div class="flex-1 flex flex-col">
                    <span class="text-base font-bold text-primary leading-tight">{weatherService.state.current.temp}° and {weatherService.state.current.condition}</span>
                    <span class="text-xs font-semibold text-disabled mt-0.5">Today's forecast</span>
                  </div>
                  <Show when={weatherService.state.forecast[0]}>
                    <div class="flex flex-col text-right text-xs font-bold text-disabled">
                      <span class="text-primary">↑ {weatherService.state.forecast[0].tempMax}°</span>
                      <span>↓ {weatherService.state.forecast[0].tempMin}°</span>
                    </div>
                  </Show>
                </div>

                {/* Expanded View */}
                <div
                  class={`flex-1 flex flex-col px-4 pb-4 transition-opacity duration-500 delay-100 ${isWeatherExpanded() ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                >
                  <Show when={weatherService.state.current.insight}>
                    <div class="bg-accent/10 rounded-md p-3 mb-4 shrink-0 border border-accent/20 flex items-start gap-2">
                      <span class="text-accent mt-0.5" aria-hidden="true">✨</span>
                      <span class="text-sm font-semibold text-primary leading-snug">{weatherService.state.current.insight}</span>
                    </div>
                  </Show>

                  <Text color="disabled" weight="bold" display="block" class="font-display lowercase text-xs tracking-wider mb-2">Hourly</Text>
                  <div class="flex-1 overflow-y-auto pr-1 flex flex-col gap-1 -mx-2 px-2">
                    <For each={(() => {
                      const now = new Date();
                      const todayHours = weatherService.state.hourly.filter(h => isSameDay(new Date(h.time), now) && new Date(h.time).getTime() >= now.getTime() - 60*60*1000);
                      return todayHours;
                    })()}>
                      {(hour) => {
                        const date = new Date(hour.time);
                        return (
                          <div class="flex items-center justify-between p-2 rounded-md hover:bg-primary/5 transition-colors">
                            <span class="text-sm font-bold text-secondary w-12">{format(date, settings.use24HourClock ? 'H:00' : 'ha')}</span>
                            <span class="text-lg w-8 text-center">{hour.icon}</span>
                            <span class="text-sm font-bold text-primary w-12 text-right">{hour.temp}°</span>
                          </div>
                        );
                      }}
                    </For>
                  </div>

                  <div class="mt-4 pt-3 border-t border-border flex justify-between items-center text-xs font-semibold text-disabled shrink-0">
                    <div class="flex items-center gap-1"><span class="text-base" aria-hidden="true">💨</span> {weatherService.state.current.windSpeed} mph</div>
                    <div class="flex items-center gap-1"><span class="text-base" aria-hidden="true">💧</span> {weatherService.state.current.humidity}%</div>
                    <div class="flex items-center gap-1"><span class="text-base" aria-hidden="true">☂️</span> {weatherService.state.current.precipitationProbability}%</div>
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
