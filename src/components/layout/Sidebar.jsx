// Sidebar — the app's side navigation, rebuilt on the kit SideNav (Phase 3).
// Retired here: the .glass-sidebar glassmorphism surface (token surfaces now),
// the hand-rolled getBoundingClientRect/scroll-listener flyout (kit Popover),
// the display:none checkbox hack (kit CheckboxInput), and the hardcoded
// #1a1a1a/#52c41a/#ff4d4f colors (token surfaces + kit StatusDot).
// Embedded widgets (SidebarAtAGlance, SidebarHeatmap, PomodoroWidget) stay
// as-is and migrate in Phase 4.
import { createSignal, onMount, onCleanup, Show, For } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { eventStore } from '../../stores/eventStore';
import {
  SideNav,
  SideNavSection,
  SideNavHeading,
  SideNavItem,
  Button,
  IconButton,
  Popover,
  CheckboxInput,
  StatusDot,
} from '../kit';
import SidebarHeatmap from './SidebarHeatmap';
import SidebarAtAGlance from './SidebarAtAGlance';
import PomodoroWidget from './PomodoroWidget';

const TimelineIcon = () => (
  <svg class="size-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
);
const CalendarIcon = () => (
  <svg class="size-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
);
const TasksIcon = () => (
  <svg class="size-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
);
const ArchiveIcon = () => (
  <svg class="size-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
);
const SettingsIcon = () => (
  <svg class="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
);
const InstallIcon = () => (
  <svg class="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
);
const ChevronDownIcon = (props) => (
  <svg
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
    class={`size-4 transition-transform duration-(--duration-medium) motion-reduce:transition-none ${props.rotated ? 'rotate-180' : 'rotate-0'}`}
  >
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
  </svg>
);

function Sidebar() {
  const { state: uiState } = uiStore;
  const { state: eventState } = eventStore;
  const [deferredPrompt, setDeferredPrompt] = createSignal(null);
  const [calendarsExpanded, setCalendarsExpanded] = createSignal(false);

  let calendarFlyoutAnchor;

  const navigateTo = (view) => {
    uiStore.setView(view);
    uiStore.setActiveModal(null);
  };

  onMount(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    onCleanup(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    });
  });

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt();
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const setCalendarVisible = (id, visible) => {
    const newCals = eventState.calendars.map((c) => (c.id === id ? { ...c, visible } : c));
    eventStore.setCalendars(newCals);
  };

  return (
    <SideNav
      label="Primary"
      isOpen={uiState.sidebarOpen}
      class="py-6"
      footer={
        <div class="mt-4 flex flex-col gap-3 border-t border-border px-3 pt-5">
          <SideNavHeading
            heading="Sequent"
            icon={
              <span class="flex size-8 items-center justify-center rounded-lg bg-accent-bg text-sm font-bold text-on-accent shadow-[0_0_10px_var(--color-accent)]">
                S
              </span>
            }
            subheading={
              <>
                <StatusDot
                  variant={uiState.isOnline ? 'success' : 'error'}
                  label={uiState.isOnline ? 'Online' : 'Offline'}
                />
                {/* Brand typography (Major Mono) stays by decision. */}
                <span class="font-display text-[9px] font-bold lowercase tracking-widest text-secondary">
                  {uiState.isOnline ? 'Cloud' : 'Offline'}
                </span>
              </>
            }
          />
          <Button
            label="Settings"
            icon={<SettingsIcon />}
            variant="secondary"
            class="w-full"
            onClick={() => navigateTo('settings')}
          />
          <Show when={deferredPrompt()}>
            <Button
              label="Install App"
              icon={<InstallIcon />}
              variant="secondary"
              class="w-full"
              onClick={handleInstallClick}
            />
          </Show>
        </div>
      }
    >
      <div class="pt-5">
        <SidebarAtAGlance />
      </div>
      <SidebarHeatmap />
      <div class="mt-4 px-3">
        <PomodoroWidget />
      </div>

      <div class="flex-1" />

      <SideNavSection title="Views" isHeaderHidden class="mt-5 px-3">
        <SideNavItem
          label="Timeline"
          icon={<TimelineIcon />}
          isSelected={uiState.view === 'timeline'}
          onClick={() => navigateTo('timeline')}
        />
        <SideNavItem
          label="Calendar"
          icon={<CalendarIcon />}
          isSelected={uiState.view === 'calendar'}
          onClick={() => navigateTo('calendar')}
          endContent={
            <Show when={uiState.view === 'calendar'}>
              <IconButton
                ref={(el) => (calendarFlyoutAnchor = el)}
                label="Choose visible calendars"
                icon={<ChevronDownIcon rotated={calendarsExpanded()} />}
                variant="ghost"
                size="sm"
                aria-haspopup="dialog"
                aria-expanded={calendarsExpanded() ? 'true' : 'false'}
                onClick={() => setCalendarsExpanded(!calendarsExpanded())}
              />
            </Show>
          }
        />
        <SideNavItem
          label="Tasks"
          icon={<TasksIcon />}
          isSelected={uiState.view === 'tasks'}
          onClick={() => navigateTo('tasks')}
        />
        <SideNavItem
          label="Archive"
          icon={<ArchiveIcon />}
          isSelected={uiState.view === 'archive'}
          onClick={() => navigateTo('archive')}
        />
      </SideNavSection>

      {/* Calendar visibility flyout: kit Popover (anchored, flip/clamp, Escape
          + outside-click dismiss) with real, keyboard-reachable checkboxes. */}
      <Popover
        open={calendarsExpanded() && uiState.view === 'calendar'}
        onClose={() => setCalendarsExpanded(false)}
        anchorRef={() => calendarFlyoutAnchor}
        placement="end"
        label="Visible calendars"
        width={240}
      >
        <div class="flex max-h-[300px] flex-col gap-1 overflow-y-auto">
          <For each={eventState.calendars}>
            {(cal) => (
              <CheckboxInput
                label={cal.name}
                value={cal.visible !== false}
                color={cal.color}
                size="sm"
                onChange={(checked) => setCalendarVisible(cal.id, checked)}
              />
            )}
          </For>
        </div>
      </Popover>
    </SideNav>
  );
}

export default Sidebar;
