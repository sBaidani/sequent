// SidebarAtAGlance — clock + "up next" event + weather (Phase 4, kit-based).
// Retired here: the clickable <div> event card (kit List/ListItem invisible-
// button pattern — real button semantics, keyboard reachable), hand-rolled
// bg-white/NN + bg-accent/NN tints (token surfaces: bg-accent-muted,
// border-border), the raw pulse div while weather loads (kit Skeleton), and
// off-scale text-[9..42px] type (token type scale via the Tailwind bridge).
// The event's calendar color renders through snapUserColor() as a StatusDot
// (inline background from the snapped hue token — same documented user-color
// pattern as kit CheckboxInput's `color` prop).
import { createSignal, onMount, createMemo, createEffect, Show } from 'solid-js';
import { format } from 'date-fns';
import { weatherService } from '../../services/weatherService';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';
import { settingsStore } from '../../stores/settingsStore';
import { expandRecurringItems } from '../../lib/recurrenceEngine';
import { snapUserColor } from '../../lib/colorTokens';
import { List, ListItem, Text, StatusDot, Skeleton, cx } from '../kit';

function SidebarAtAGlance() {
  const [time, setTime] = createSignal(new Date());
  const { state: settings } = settingsStore;
  const { state: eventState } = eventStore;

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

  // Per-item USER color: the event's calendar color snapped to the nearest
  // Astryx hue token (theme-adaptive cssVar), never the raw stored hex.
  const eventHue = () => {
    const data = displayData();
    if (!data) return null;
    const cal = eventState.calendars?.find((c) => c.id === data.event.calendarId);
    return snapUserColor(cal?.color);
  };

  const openActiveEvent = () => {
    const data = displayData();
    if (data) uiStore.setActiveEvent(data.event.originalId || data.event.id, 'event');
  };

  // Weather insight — shown with or without an upcoming event (as before).
  const insightLine = () => (
    <Show when={weatherService.state?.current?.insight}>
      <Text size="xsm" weight="semibold" color="accent" maxLines={1} class="mt-1">
        ✨ {weatherService.state.current.insight}
      </Text>
    </Show>
  );

  // Trailing weather block: kit Skeleton while loading, token border divider.
  const weatherEnd = () => (
    <Show
      when={!weatherService.loading}
      fallback={<Skeleton shape="circle" width={40} />}
    >
      <Show when={weatherService.state}>
        <span class="flex flex-col items-center justify-center ps-3 border-s border-border">
          <span
            class="font-display lowercase text-2xl leading-none mb-1 drop-shadow-md"
            title={weatherService.state.current.condition}
          >
            {weatherService.state.current.icon}
          </span>
          <Text size="xsm" weight="bold" color="secondary" class="leading-none">
            {weatherService.state.current.temp}°{settings.weatherUnits === 'fahrenheit' ? 'F' : 'C'}
          </Text>
        </span>
      </Show>
    </Show>
  );

  const cardClass = () =>
    cx(
      'rounded-lg border transition-all duration-(--duration-medium)',
      displayData() ? 'border-accent-muted bg-accent-muted' : 'border-border',
      displayData()?.pulse
        ? 'animate-pulse-glow'
        : displayData() &&
            'shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent)_20%,transparent)]',
    );

  return (
    <div class="px-5 pb-4 mb-4 flex flex-col gap-6 pt-0">
      {/* Clock Section */}
      <div class="flex flex-col">
        <Text weight="bold" hasTabularNumbers display="block" class="text-5xl tracking-tighter leading-none drop-shadow-sm">
          {format(time(), timeFormat())}
        </Text>
        {/* Brand typography (Major Mono via font-display) stays by decision. */}
        <Text size="xsm" weight="bold" color="disabled" display="block" class="font-display lowercase tracking-widest mt-2">
          {format(time(), 'EEEE, MMMM d')}
        </Text>
      </div>

      {/* At a Glance Section */}
      <List aria-label="Up next">
        <Show
          when={displayData()}
          fallback={
            <ListItem
              class={cardClass()}
              label={
                <Text size="sm" color="disabled" class="italic">
                  No upcoming events
                </Text>
              }
              description={insightLine()}
              endContent={weatherEnd()}
            />
          }
        >
          {(data) => (
            <ListItem
              class={cardClass()}
              startContent={
                <StatusDot
                  label={`Calendar color: ${eventHue().name}`}
                  isPulsing={data().pulse}
                  // Snapped user hue token (see header comment) — the inline
                  // background is a token cssVar, not the raw stored color.
                  style={{ 'background-color': eventHue().cssVar }}
                />
              }
              label={`${data().event.title}${data().event.rrule ? ' 🔄' : ''}`}
              description={
                <>
                  <Text type="supporting" weight="semibold" display="block" maxLines={1}>
                    {data().timeStr}
                    <Show when={data().event.location}> • {data().event.location}</Show>
                  </Text>
                  {insightLine()}
                </>
              }
              endContent={weatherEnd()}
              onClick={openActiveEvent}
            />
          )}
        </Show>
      </List>
    </div>
  );
}

export default SidebarAtAGlance;
