import { createSignal, onMount, createMemo, Show } from 'solid-js';
import { format, isAfter } from 'date-fns';
import { weatherService } from '../../services/weatherService';
import { eventStore } from '../../stores/eventStore';
import { expandRecurringItems } from '../../lib/recurrenceEngine';

function SidebarAtAGlance() {
  const [time, setTime] = createSignal(new Date());
  
  onMount(() => {
    // Defaulting to NYC coordinates for demo purposes
    weatherService.fetchWeather('40.7128', '-74.0060');
    
    const interval = setInterval(() => {
      setTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  });

  const nextEvent = createMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const events = expandRecurringItems(eventStore.visibleEvents, now, thirtyDaysFromNow);
    const upcoming = events.filter(e => e.start_time && isAfter(new Date(e.start_time), now)).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return upcoming[0] || null;
  });

  return (
    <div class="px-5 pb-5 border-b border-white/10 mb-5 flex flex-col gap-6 pt-1">
      {/* Clock Section */}
      <div class="flex flex-col">
        <span class="text-white text-[28px] font-extrabold tracking-tight leading-none">{format(time(), 'h:mm a')}</span>
        <span class="text-white/50 text-[11px] font-bold uppercase tracking-wider mt-1.5">{format(time(), 'EEEE, MMMM d')}</span>
      </div>

      {/* At a Glance Section */}
      <div class="flex flex-col gap-2">
        <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">At a Glance</span>
        
        <div class="flex items-center justify-between gap-4 bg-white/5 rounded-xl p-3">
          <div class="flex-1 min-w-0">
            <Show when={nextEvent()} fallback={<span class="text-white/50 text-[11px] italic">No upcoming events</span>}>
              <div class="flex flex-col">
                <span class="text-accent text-[9px] uppercase font-bold tracking-wider mb-0.5">Next Event</span>
                <span class="text-white text-[13px] font-bold truncate tracking-wide">{nextEvent().title} {nextEvent().rrule && '🔄'}</span>
                <span class="text-white/60 text-[10px] font-semibold mt-0.5">{format(new Date(nextEvent().start_time), 'h:mm a')}</span>
              </div>
            </Show>
          </div>

          <Show when={!weatherService.loading} fallback={<div class="w-10 h-10 rounded-full bg-white/5 animate-pulse"></div>}>
            <Show when={weatherService.state}>
              <div class="flex flex-col items-center justify-center shrink-0 border-l border-white/10 pl-3">
                <span class="text-2xl drop-shadow-md leading-none mb-1" title={weatherService.state.current.condition}>{weatherService.state.current.icon}</span>
                <span class="text-white font-bold text-[11px] leading-none">{weatherService.state.current.temp}°</span>
              </div>
            </Show>
          </Show>
        </div>
      </div>
    </div>
  );
}

export default SidebarAtAGlance;
