import { createSignal, onMount, createMemo, createEffect, Show } from 'solid-js';
import { format, differenceInMinutes } from 'date-fns';
import { weatherService } from '../../services/weatherService';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';
import { settingsStore } from '../../stores/settingsStore';
import { expandRecurringItems } from '../../lib/recurrenceEngine';

function SidebarAtAGlance() {
  const [time, setTime] = createSignal(new Date());
  const { state: settings } = settingsStore;
  
  createEffect(() => {
    const lat = settings.weatherLocation?.lat;
    const lon = settings.weatherLocation?.lon;
    if (lat && lon) {
      weatherService.fetchWeather(lat, lon);
    }
  });

  onMount(() => {
    // Update more frequently to support seconds
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  });

  const timeFormat = createMemo(() => {
    let fmt = settings.use24HourClock ? 'H:mm' : 'h:mm';
    if (settings.showSeconds) {
      fmt += ':ss';
    }
    if (!settings.use24HourClock) {
      fmt += ' a';
    }
    return fmt;
  });

  const displayData = createMemo(() => {
    const now = time();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const events = expandRecurringItems(eventStore.visibleEvents, now, thirtyDaysFromNow)
      .filter(e => e.start_time && e.end_time)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const current = events.find(e => {
      const s = new Date(e.start_time).getTime();
      const en = new Date(e.end_time).getTime();
      return s <= now.getTime() && en > now.getTime();
    });

    const next = events.find(e => {
      if (current && e.id === current.id) return false;
      return new Date(e.start_time).getTime() > now.getTime();
    });

    let activeEvent = null;
    let timeStr = '';
    let pulse = false;

    const formatGap = (ms) => {
      const totalMins = Math.floor(ms / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      if (h > 0 && m > 0) return `${h} hr ${m} min free`;
      if (h > 0) return `${h} hr${h > 1 ? 's' : ''} free`;
      return `${m} min${m !== 1 ? 's' : ''} free`;
    };

    if (current) {
      const s = new Date(current.start_time).getTime();
      const en = new Date(current.end_time).getTime();
      const duration = en - s;
      const elapsed = now.getTime() - s;
      const percentElapsed = elapsed / duration;

      if (percentElapsed > 0.5 && next) {
        activeEvent = next;
      } else {
        activeEvent = current;
      }
    } else if (next) {
      activeEvent = next;
    }

    if (!activeEvent) return null;

    if (current && activeEvent.id === current.id) {
      timeStr = 'Now';
      pulse = true;
    } else {
      const timeToStart = (new Date(activeEvent.start_time).getTime() - now.getTime()) / 60000;
      if (timeToStart <= 30 && timeToStart > 0) {
        timeStr = `in ${Math.ceil(timeToStart)} min${Math.ceil(timeToStart) === 1 ? '' : 's'}`;
        pulse = true;
      } else {
        const fmt = format(new Date(activeEvent.start_time), settings.use24HourClock ? 'H:mm' : 'h:mm a');
        let gapMs = 0;
        if (current) {
          gapMs = new Date(activeEvent.start_time).getTime() - new Date(current.end_time).getTime();
        } else {
          gapMs = new Date(activeEvent.start_time).getTime() - now.getTime();
        }
        
        if (gapMs >= 60000) {
          timeStr = `${fmt} • ${formatGap(gapMs)}`;
        } else {
          timeStr = fmt;
        }
        pulse = false;
      }
    }

    return { event: activeEvent, timeStr, pulse };
  });

  return (
    <div class="px-5 pb-4 mb-4 flex flex-col gap-6 pt-0">
      {/* Clock Section */}
      <div class="flex flex-col">
        <span class="text-white text-[42px] font-extrabold tracking-tighter leading-none drop-shadow-sm">{format(time(), timeFormat())}</span>
        <span class="font-display lowercase text-white/40 text-[9px] font-bold tracking-widest mt-2">{format(time(), 'EEEE, MMMM d')}</span>
      </div>

      {/* At a Glance Section */}
      <div class="flex flex-col gap-3">
        <div 
          classList={{
            "group flex items-center justify-between gap-4 bg-accent/10 border border-accent/20 rounded-2xl p-4 transition-all duration-300": true,
            "hover:bg-accent/20 cursor-pointer": !!displayData(),
            "animate-pulse-glow hover:!shadow-[0_0_35px_rgba(var(--accent-rgb),0.8)]": displayData()?.pulse,
            "shadow-[0_0_20px_rgba(var(--accent-rgb),0.2)] hover:shadow-[0_0_25px_rgba(var(--accent-rgb),0.4)]": displayData() && !displayData().pulse
          }}
          onClick={() => displayData() && uiStore.setActiveEvent(displayData().event.originalId || displayData().event.id, 'event')}
        >
          <div class="flex-1 min-w-0 flex flex-col gap-1">
            <Show when={displayData()} fallback={<span class="text-white/40 text-[11px] italic">No upcoming events</span>}>
              {(data) => (
                <>
                  <span class="text-white text-[16px] font-extrabold truncate tracking-wide leading-tight group-hover:text-accent transition-colors">
                    {data().event.title} {data().event.rrule && '🔄'}
                  </span>
                  
                  <div class="flex items-center gap-2 mt-0.5">
                    <span class="text-white/70 text-[11px] font-semibold">{data().timeStr}</span>
                    <Show when={data().event.location}>
                      <span class="w-1 h-1 rounded-full bg-white/20" />
                      <span class="text-white/50 text-[10px] truncate">{data().event.location}</span>
                    </Show>
                  </div>
                </>
              )}
            </Show>

            <Show when={weatherService.state?.current?.insight}>
              <div class="text-accent/90 text-[10px] font-semibold mt-1 leading-tight line-clamp-1 group-hover:line-clamp-none transition-all">
                ✨ {weatherService.state.current.insight}
              </div>
            </Show>
          </div>

          <Show when={!weatherService.loading} fallback={<div class="w-10 h-10 rounded-full bg-white/5 animate-pulse shrink-0" />}>
            <Show when={weatherService.state}>
              <div class="flex flex-col items-center justify-center shrink-0 pl-3 border-l border-white/5">
                <span class="font-display lowercase text-2xl drop-shadow-md leading-none mb-1" title={weatherService.state.current.condition}>{weatherService.state.current.icon}</span>
                <span class="text-white/80 font-bold text-[10px] leading-none">{weatherService.state.current.temp}°{settings.weatherUnits === 'fahrenheit' ? 'F' : 'C'}</span>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}

export default SidebarAtAGlance;
