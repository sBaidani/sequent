import { createMemo, For, Show, createSignal, createEffect } from 'solid-js';
import { format, parseISO, isSameDay } from 'date-fns';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { expandRecurringItems } from '../../lib/recurrenceEngine';
import { calculateGridOverlap } from '../../lib/scheduling';

function DaySchedulePreview(props) {
  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;

  const [collapsed, setCollapsed] = createSignal(false);
  let scrollRef;

  createEffect(() => {
    if (!scrollRef || collapsed()) return;
    
    let targetScrollTop = Math.max(0, (9 * 60) - 60);

    if (props.ghostEvent) {
      if (props.ghostEvent.allDay) {
        targetScrollTop = 0;
      } else if (props.ghostEvent.startTime) {
        const st = new Date(props.ghostEvent.startTime);
        if (!isNaN(st.getTime())) {
          const min = st.getHours() * 60 + st.getMinutes();
          if (min < 480) targetScrollTop = 0;
          else if (min < 960) targetScrollTop = 480;
          else targetScrollTop = 960;
        }
      }
    }
    
    scrollRef.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  });

  const previewItems = createMemo(() => {
    if (!props.date) return [];
    const dStr = props.date.includes('T') ? props.date : `${props.date}T12:00:00`;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return [];

    const expandedEvs = expandRecurringItems(eventStore.visibleEvents, d, d);
    let events = expandedEvs.filter(e => e.start_time && isSameDay(new Date(e.start_time), d) && !e.allDay).map(e => {
      const st = parseISO(e.start_time);
      const en = parseISO(e.end_time);
      return {
        ...e,
        type: 'event',
        startMin: st.getHours() * 60 + st.getMinutes(),
        endMin: en.getHours() * 60 + en.getMinutes(),
        color: eventState.calendars.find(c => c.id === e.calendarId)?.color || '#E8942A',
        isGhost: false
      };
    });

    const expandedTasks = expandRecurringItems(taskState.tasks, d, d);
    let tasks = expandedTasks.filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), d) && !t.allDay).map(t => {
      const st = new Date(t.scheduled_date);
      return {
        ...t,
        type: 'task',
        startMin: st.getHours() * 60 + st.getMinutes(),
        endMin: st.getHours() * 60 + st.getMinutes() + 30,
        color: taskState.lists.find(l => l.id === t.listId)?.color || '#6B5BDB',
        isGhost: false
      };
    });

    // Add ghost event if valid
    let ghost = null;
    if (props.ghostEvent && !props.ghostEvent.allDay && props.ghostEvent.startTime && props.ghostEvent.endTime) {
      const gst = new Date(props.ghostEvent.startTime);
      const gen = new Date(props.ghostEvent.endTime);
      
      // Ensure ghost event lands on this day
      if (isSameDay(gst, d)) {
        ghost = {
          id: 'ghost-1',
          title: props.ghostEvent.title || 'New Event',
          type: props.ghostEvent.type || 'event',
          startMin: gst.getHours() * 60 + gst.getMinutes(),
          endMin: gen.getHours() * 60 + gen.getMinutes(),
          color: props.ghostEvent.color || '#E8942A',
          isGhost: true
        };
      }
    }

    const all = [...events, ...tasks];
    if (ghost) all.push(ghost);

    return calculateGridOverlap(all);
  });

  const allDayItems = createMemo(() => {
    if (!props.date) return [];
    const dStr = props.date.includes('T') ? props.date : `${props.date}T12:00:00`;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return [];

    const expandedEvs = expandRecurringItems(eventStore.visibleEvents, d, d);
    const events = expandedEvs.filter(e => e.start_time && isSameDay(new Date(e.start_time), d) && e.allDay).map(e => ({
      ...e,
      type: 'event',
      color: eventState.calendars.find(c => c.id === e.calendarId)?.color || '#E8942A'
    }));

    const expandedTasks = expandRecurringItems(taskState.tasks, d, d);
    let tasks = expandedTasks.filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), d) && t.allDay).map(t => ({
      ...t,
      type: 'task',
      color: taskState.lists.find(l => l.id === t.listId)?.color || '#6B5BDB'
    }));

    if (props.ghostEvent && props.ghostEvent.allDay) {
      events.push({
        id: 'ghost-all-day',
        title: props.ghostEvent.title || 'New Event',
        type: props.ghostEvent.type || 'event',
        color: props.ghostEvent.color || '#E8942A',
        isGhost: true
      });
    }

    return [...events, ...tasks];
  });

  return (
    <div class={`flex flex-col h-full min-h-[500px] border-l border-border-theme bg-bg-theme/50 transition-all duration-300 ease-in-out ${collapsed() ? 'w-12 min-w-[48px]' : 'w-[350px] min-w-[350px]'}`}>
      
      <div class="flex items-center p-4 border-b border-border-theme gap-3">
        <button 
          onClick={() => setCollapsed(!collapsed())}
          class={`flex items-center justify-center w-6 h-6 rounded border-none bg-transparent cursor-pointer hover:bg-text-primary/10 text-text-muted hover:text-text-primary transition-colors ${collapsed() ? 'mx-auto' : ''} shrink-0`}
          title={collapsed() ? "Expand Preview" : "Collapse Preview"}
        >
          <svg class={`w-4 h-4 transition-transform duration-300 ${collapsed() ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
        </button>
        <Show when={!collapsed()}>
          <div class="flex items-center justify-between w-full min-w-0">
            <div class="text-[14px] font-bold text-text-primary tracking-wide truncate pr-2">
              {props.mode === 'task' 
                ? `${format(new Date(props.date.includes('T') ? props.date : props.date + 'T12:00:00'), 'eeee')} Tasks` 
                : `${format(new Date(props.date.includes('T') ? props.date : props.date + 'T12:00:00'), 'eeee')} Events`}
            </div>
            <div class="text-[12px] font-bold text-text-muted shrink-0">
              {format(new Date(props.date.includes('T') ? props.date : props.date + 'T12:00:00'), 'MMM d')}
            </div>
          </div>
        </Show>
      </div>

      <Show when={allDayItems().length > 0 && !collapsed()}>
        <div class="w-full border-b border-border-theme bg-bg-theme px-12 py-2 flex flex-col gap-1 max-h-[80px] overflow-y-auto relative">
          <div class="absolute left-0 top-0 bottom-0 w-12 border-r border-border-theme flex flex-col items-center justify-center pt-1">
             <span class="font-display lowercase text-[9px] font-bold text-text-muted tracking-wider -rotate-90 origin-center whitespace-nowrap">All Day</span>
          </div>
          <For each={allDayItems()}>
            {(item) => (
              <div 
                class={`rounded px-2 py-1 text-[10px] font-bold text-white truncate shadow-sm cursor-pointer hover:brightness-110 ${item.isGhost ? 'border-2 border-dashed border-white/50 animate-pulse' : ''}`}
                style={{ background: item.color, opacity: (item.type === 'task' && item.completed) ? 0.5 : 1 }}
              >
                {item.title} {item.rrule && '🔄'}
              </div>
            )}
          </For>
        </div>
      </Show>

      <div class={`flex-1 overflow-y-auto relative ${collapsed() ? 'hidden' : 'block'}`} ref={scrollRef}>
        <div class="relative h-[1440px] w-full">
          {/* Grid lines */}
          <For each={Array.from({length: 24})}>
            {(_, i) => (
              <div class="absolute w-full h-[60px] border-b border-border-theme pointer-events-none flex" style={{ top: `${i() * 60}px` }}>
                <div class="w-12 h-full border-r border-border-theme flex justify-center py-1">
                  <span class="text-[10px] text-text-muted font-bold">{i() === 0 ? '12 AM' : i() < 12 ? `${i()} AM` : i() === 12 ? '12 PM' : `${i()-12} PM`}</span>
                </div>
                <div class="flex-1 h-[30px] border-b border-white/[0.03]"></div>
              </div>
            )}
          </For>

          {/* Current Time Indicator */}
          <Show when={isSameDay(new Date(props.date.includes('T') ? props.date : props.date + 'T12:00:00'), new Date())}>
            {(() => {
              const now = new Date();
              const mins = now.getHours() * 60 + now.getMinutes();
              return (
                <div class="absolute w-[calc(100%-48px)] flex items-center z-30 pointer-events-none" style={{ top: `${mins - 6}px`, left: '48px' }}>
                  <svg class="w-3 h-3 text-red-500 -ml-1.5 drop-shadow-md" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  <div class="flex-1 h-[2px] bg-red-500 shadow-sm"></div>
                </div>
              );
            })()}
          </Show>

          {/* Items */}
          <For each={previewItems()}>
            {(item) => {
              if (item.isGroup) {
                const height = Math.max(item.endMin - item.startMin, 30);
                return (
                  <div 
                    class="absolute rounded-md overflow-hidden transition-all duration-300 shadow-sm z-10 border border-border-theme bg-bg-theme text-text-primary cursor-pointer hover:z-40 hover:shadow-2xl group flex flex-col justify-start backdrop-blur-md bg-opacity-90 hover:!h-max min-h-[30px]"
                    style={{ 
                      top: `${item.startMin}px`, 
                      height: `${height}px`,
                      left: item.left,
                      width: item.width
                    }}
                  >
                    <div class="text-[11px] font-bold tracking-wide group-hover:hidden text-center truncate w-full h-full flex items-center justify-center px-2">
                      {item.items.length} Events
                    </div>
                    <div class="hidden group-hover:flex flex-col gap-1.5 w-full relative p-1.5 z-50 rounded-md">
                      <For each={item.items}>
                        {(subItem) => {
                          const subHeight = Math.max(subItem.endMin - subItem.startMin, 25);
                          return (
                            <div 
                              class={`w-full text-left rounded-md p-1.5 hover:brightness-110 transition-colors cursor-pointer text-white flex flex-col justify-start overflow-hidden ${subItem.isGhost ? 'border-2 border-dashed border-white/50 animate-pulse' : 'border border-black/10 shadow-sm'}`}
                              style={{ 
                                background: subItem.color,
                                height: `${subHeight}px`
                              }}
                            >
                              <div class="text-[10px] font-bold leading-tight truncate">
                                {subItem.title}
                              </div>
                              <Show when={subHeight >= 30}>
                                <div class="text-[9px] font-semibold opacity-80 mt-auto">
                                  {Math.floor(subItem.startMin / 60)}:{(subItem.startMin % 60).toString().padStart(2, '0')} - {Math.floor(subItem.endMin / 60)}:{(subItem.endMin % 60).toString().padStart(2, '0')}
                                </div>
                              </Show>
                            </div>
                          );
                        }}
                      </For>
                    </div>
                  </div>
                );
              }

              const height = Math.max(item.endMin - item.startMin, 15);
              return (
                <div 
                  class={`absolute rounded-md p-1.5 overflow-hidden transition-all duration-300 shadow-sm ${item.isGhost ? 'border-2 border-dashed border-text-primary/50 bg-[var(--cal-color)]/20 animate-pulse z-20' : 'bg-[var(--cal-color)] z-10 border border-black/10 text-white'}`}
                  style={{ 
                    top: `${item.startMin}px`, 
                    height: `${height}px`,
                    left: item.left,
                    width: item.width,
                    "--cal-color": item.color
                  }}
                >
                  <div class={`text-[10px] font-bold leading-tight truncate ${item.isGhost ? 'text-text-primary' : 'text-white'}`}>
                    {item.title}
                  </div>
                  <Show when={height >= 30}>
                    <div class={`text-[9px] font-semibold opacity-80 ${item.isGhost ? 'text-text-secondary' : 'text-white/80'}`}>
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
  );
}

export default DaySchedulePreview;
