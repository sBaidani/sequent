import { onMount, createSignal, createUniqueId, For, Show } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { settingsStore } from '../../stores/settingsStore';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { api } from '../../lib/api';
import { snapUserColor } from '../../lib/colorTokens';
import ColorPicker from '../shared/ColorPicker';
import EditableItem from '../shared/EditableItem';
import DurationPicker from '../shared/DurationPicker';
import LocationPicker from '../shared/LocationPicker';
import {
  Badge,
  Button,
  EmptyState,
  FormLayout,
  Heading,
  IconButton,
  List,
  ListItem,
  Section,
  Selector,
  Switch,
  Text,
  cx,
} from '../kit';
import { Menu as MenuIcon, RefreshCw, X } from 'lucide-solid';

// Shared card chrome for the settings groups (token-backed: --radius-lg,
// --color-border, --shadow-low), matching the other migrated views.
const GROUP_CLASS = 'rounded-lg border border-border shadow-[var(--shadow-low)]';

/**
 * Third-party brand marks (Google / Microsoft). The literal fills are the
 * providers' official logo colors — brand content, not UI styling — which is
 * why they are not theme tokens.
 */
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" class="size-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const MicrosoftLogo = () => (
  <svg viewBox="0 0 24 24" class="size-5" fill="#00a4ef" aria-hidden="true">
    <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z" />
  </svg>
);

function SettingsView() {
  const { state: uiState, setTheme } = uiStore;
  const { state: settings, setStartOfWeek, setDefaultDuration, setWeatherLocation, setWeatherUnits, setFocusDuration, setRestDuration } = settingsStore;
  const [isSyncing, setIsSyncing] = createSignal(false);
  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;

  const themeGroupId = createUniqueId();
  const eventDurationId = createUniqueId();
  const weatherLocationId = createUniqueId();
  const cloudSyncHeadingId = createUniqueId();

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const provider = params.get('provider'); // Assuming Google/Microsoft redirects to ?code=...&provider=...
    // Alternatively, if provider is missing, we could infer it if there's a state param or similar.
    // For now, let's assume we pass `provider` back in the redirect URI
    if (code) {
      // Need a default or fallback provider if not specified,
      // but in our implementation we'll add provider to redirect URL
      const actualProvider = provider || localStorage.getItem('oauth_provider_intent');
      if (actualProvider) {
        api.auth.finalizeConnection(actualProvider, code)
          .then(() => {
            alert(`Successfully connected ${actualProvider} calendar!`);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch(err => {
            alert('Failed to complete connection: ' + err.message);
          });
      }
    }
  });

  const themes = [
    { name: 'Amber', slug: 'amber', color: '#E8942A' },
    { name: 'Rose', slug: 'rose', color: '#C0185A' },
    { name: 'Teal', slug: 'teal', color: '#1FA7A7' },
    { name: 'Purple', slug: 'purple', color: '#6B5BDB' },
    { name: 'Blue', slug: 'blue', color: '#3B6ED6' },
    { name: 'Graphite', slug: 'graphite', color: '#888888' }
  ];

  const handleSyncNow = async () => {
    if (isSyncing()) return;
    setIsSyncing(true);
    try {
      await Promise.allSettled([
        api.auth.triggerSync('google'),
        api.auth.triggerSync('microsoft')
      ]);
      // Let the Realtime subscriptions pull the new data in automatically
    } catch (err) {
      console.error('Manual sync error:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const connectProvider = async (provider, providerName) => {
    try {
      localStorage.setItem('oauth_provider_intent', provider);
      const { url } = await api.auth.getAuthUrl(provider);
      window.location.href = url;
    } catch (err) {
      alert(`Failed to start ${providerName} Auth: ` + err.message);
    }
  };

  const localCalendars = () => eventState.calendars.filter(c => !c.provider || c.provider === 'local');
  const cloudCalendars = () => eventState.calendars.filter(c => c.provider && c.provider !== 'local');
  const localLists = () => taskState.lists.filter(l => !l.provider || l.provider === 'local');
  const cloudLists = () => taskState.lists.filter(l => l.provider && l.provider !== 'local');

  return (
    <>
      <div class="h-[60px] min-h-[60px] border-b border-border flex items-center justify-between px-6 bg-body/80 backdrop-blur-md sticky top-0 z-50">
        <div class="flex items-center gap-4">
          <IconButton
            variant="ghost"
            label="Toggle sidebar"
            icon={<MenuIcon />}
            class="rounded-full"
            onClick={() => uiStore.toggleSidebar()}
          />
          <Heading level={1} class="lowercase">Settings</Heading>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto w-full">
        <div class="p-6 flex flex-col gap-8 max-w-[800px] mx-auto w-full">

          {/* Appearance */}
          <Section title="Appearance" class={GROUP_CLASS}>
            <FormLayout>
              <div role="radiogroup" aria-labelledby={themeGroupId}>
                <Text as="span" id={themeGroupId} type="label" color="secondary" display="block" class="mb-3">
                  Theme Color
                </Text>
                <div class="flex gap-3 flex-wrap">
                  <For each={themes}>{t => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={uiState.themeBase === t.slug ? 'true' : 'false'}
                      aria-label={t.name}
                      title={t.name}
                      onClick={() => setTheme(t.slug)}
                      class={cx(
                        'w-10 h-10 rounded-full transition-transform hover:scale-110 border-4 cursor-pointer',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
                        uiState.themeBase === t.slug ? 'border-primary' : 'border-transparent',
                      )}
                      /* Sanctioned theme-preview exception: each swatch renders
                         the accent hex it would apply — these are the theme's
                         own accent values, not ad-hoc styling. */
                      style={{ background: t.color }}
                    />
                  )}</For>
                </div>
              </div>

              <Switch
                label="Dark Mode"
                description="Toggle between light and dark UI"
                labelPosition="start"
                labelSpacing="spread"
                value={uiState.mode === 'dark'}
                onChange={(checked) => uiStore.setMode(checked ? 'dark' : 'light')}
              />
            </FormLayout>
          </Section>

          {/* Preferences */}
          <Section title="Preferences" class={GROUP_CLASS}>
            <FormLayout>
              <Selector
                label="Start of Week"
                description="Which day should calendars start on?"
                value={settings.startOfWeek}
                onChange={setStartOfWeek}
                options={[
                  { value: 'monday', label: 'Monday' },
                  { value: 'sunday', label: 'Sunday' }
                ]}
              />

              {/* DurationPicker is a domain control without built-in field
                  chrome; give it the label/description shell + group semantics. */}
              <div role="group" aria-labelledby={eventDurationId}>
                <Text as="span" id={eventDurationId} type="label" color="secondary" display="block">
                  Default Event Duration
                </Text>
                <Text type="supporting" display="block" class="mb-2">Used when adding new events</Text>
                <DurationPicker
                  value={settings.defaultDuration}
                  onChange={setDefaultDuration}
                />
              </div>

              <Switch
                label="Show Tasks in Timeline"
                description="Display tasks alongside events in the timeline view"
                labelPosition="start"
                labelSpacing="spread"
                value={settings.showTasksInTimeline}
                onChange={(checked) => settingsStore.setShowTasksInTimeline(checked)}
              />

              <Switch
                label="Use 24-Hour Clock"
                description="Display times in 24-hour format"
                labelPosition="start"
                labelSpacing="spread"
                value={settings.use24HourClock}
                onChange={(checked) => settingsStore.setUse24HourClock(checked)}
              />

              <Switch
                label="Show Seconds on Clock"
                description="Include seconds in the sidebar clock"
                labelPosition="start"
                labelSpacing="spread"
                value={settings.showSeconds}
                onChange={(checked) => settingsStore.setShowSeconds(checked)}
              />

              {/* LocationPicker is a domain control without built-in field
                  chrome; give it the label/description shell + group semantics. */}
              <div role="group" aria-labelledby={weatherLocationId}>
                <Text as="span" id={weatherLocationId} type="label" color="secondary" display="block">
                  Weather Location
                </Text>
                <Text type="supporting" display="block" class="mb-2">Search for a city or use current location</Text>
                <LocationPicker
                  value={settings.weatherLocation}
                  onChange={setWeatherLocation}
                />
              </div>

              <Selector
                label="Weather Units"
                description="Display temperature in Celsius or Fahrenheit"
                value={settings.weatherUnits}
                onChange={setWeatherUnits}
                options={[
                  { value: 'celsius', label: 'Celsius (°C)' },
                  { value: 'fahrenheit', label: 'Fahrenheit (°F)' }
                ]}
              />
            </FormLayout>
          </Section>

          {/* Focus */}
          <Section title="Focus & Pomodoro" class={GROUP_CLASS}>
            <FormLayout>
              <Selector
                label="Focus Duration"
                description="Length of your focus sessions (minutes)"
                value={settings.focusDuration.toString()}
                onChange={(val) => setFocusDuration(parseInt(val, 10))}
                options={[
                  { value: '15', label: '15 min' },
                  { value: '20', label: '20 min' },
                  { value: '25', label: '25 min' },
                  { value: '30', label: '30 min' },
                  { value: '45', label: '45 min' },
                  { value: '60', label: '60 min' }
                ]}
              />

              <Selector
                label="Rest Duration"
                description="Length of breaks between sessions (minutes)"
                value={settings.restDuration.toString()}
                onChange={(val) => setRestDuration(parseInt(val, 10))}
                options={[
                  { value: '5', label: '5 min' },
                  { value: '10', label: '10 min' },
                  { value: '15', label: '15 min' },
                  { value: '20', label: '20 min' },
                  { value: '30', label: '30 min' }
                ]}
              />
            </FormLayout>
          </Section>

          {/* Sync Accounts */}
          <Section aria-labelledby={cloudSyncHeadingId} class={GROUP_CLASS}>
            <div class="flex items-center justify-between gap-4 mb-3">
              <Heading level={3} id={cloudSyncHeadingId}>Cloud Sync</Heading>
              <Button
                label="Sync Now"
                size="sm"
                icon={<RefreshCw />}
                isLoading={isSyncing()}
                onClick={handleSyncNow}
              />
            </div>

            <Text type="supporting" display="block" class="mb-4">
              Connect external calendars to view them in Sequent. Two-way sync allows you to add and edit events.
            </Text>

            <div class="flex flex-col gap-3">
              <Button
                label="Connect Google Calendar"
                icon={<GoogleLogo />}
                class="w-full justify-start"
                onClick={() => connectProvider('google', 'Google')}
              />
              <Button
                label="Connect Microsoft Outlook"
                icon={<MicrosoftLogo />}
                class="w-full justify-start"
                onClick={() => connectProvider('microsoft', 'Microsoft')}
              />
            </div>
          </Section>

          {/* Calendars */}
          <Section title="Calendars" variant="transparent" padding={0}>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Local Calendars */}
              <div>
                <div class="flex justify-between items-center mb-2 px-1">
                  <Text type="label" color="secondary" class="lowercase">Local</Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    label="+ New"
                    class="text-accent"
                    onClick={() => uiStore.setActiveModal('addCalendar')}
                  />
                </div>
                <Show
                  when={localCalendars().length > 0}
                  fallback={<EmptyState isCompact title="No local calendars found." />}
                >
                  <List hasDividers aria-label="Local calendars">
                    <For each={localCalendars()}>{cal => (
                      <ListItem
                        startContent={
                          <ColorPicker
                            value={cal.color}
                            onChange={(newColor) => eventStore.updateCalendar(cal.id, { color: newColor })}
                          />
                        }
                        label={
                          <EditableItem
                            value={cal.name}
                            onChange={(newName) => eventStore.updateCalendar(cal.id, { name: newName })}
                          />
                        }
                        endContent={
                          <IconButton
                            variant="destructive"
                            size="sm"
                            label={`Delete calendar: ${cal.name}`}
                            icon={<X />}
                            onClick={() => { if (confirm('Delete calendar and all its events?')) eventStore.deleteCalendar(cal.id); }}
                          />
                        }
                      />
                    )}</For>
                  </List>
                </Show>
              </div>

              {/* Cloud Calendars */}
              <div>
                <div class="flex items-center mb-2 px-1">
                  <Text type="label" color="secondary" class="lowercase">Cloud Synced</Text>
                </div>
                <Show
                  when={cloudCalendars().length > 0}
                  fallback={<EmptyState isCompact title="No cloud calendars synced." description="Connect an account above." />}
                >
                  <List hasDividers aria-label="Cloud synced calendars">
                    <For each={cloudCalendars()}>{cal => (
                      <ListItem
                        startContent={
                          // Per-item USER color (stored value) snapped to the
                          // nearest Astryx hue token.
                          <span aria-hidden="true" class="size-4 rounded-full" style={{ background: snapUserColor(cal.color).cssVar }} />
                        }
                        label={cal.name}
                        endContent={<Badge label={cal.provider} />}
                      />
                    )}</For>
                  </List>
                </Show>
              </div>
            </div>
          </Section>

          {/* Task Lists */}
          <Section title="Task Lists" variant="transparent" padding={0} class="pb-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Local Task Lists */}
              <div>
                <div class="flex justify-between items-center mb-2 px-1">
                  <Text type="label" color="secondary" class="lowercase">Local</Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    label="+ New"
                    class="text-accent"
                    onClick={() => uiStore.setActiveModal('addList')}
                  />
                </div>
                <Show
                  when={localLists().length > 0}
                  fallback={<EmptyState isCompact title="No local lists found." />}
                >
                  <List hasDividers aria-label="Local task lists">
                    <For each={localLists()}>{list => (
                      <ListItem
                        startContent={
                          <ColorPicker
                            value={list.color}
                            onChange={(newColor) => taskStore.updateList(list.id, { color: newColor })}
                          />
                        }
                        label={
                          <EditableItem
                            value={list.name}
                            onChange={(newName) => taskStore.updateList(list.id, { name: newName })}
                          />
                        }
                        endContent={
                          <IconButton
                            variant="destructive"
                            size="sm"
                            label={`Delete list: ${list.name}`}
                            icon={<X />}
                            onClick={() => { if (confirm('Delete list and all its tasks?')) taskStore.deleteList(list.id); }}
                          />
                        }
                      />
                    )}</For>
                  </List>
                </Show>
              </div>

              {/* Cloud Task Lists */}
              <div>
                <div class="flex items-center mb-2 px-1">
                  <Text type="label" color="secondary" class="lowercase">Cloud Synced</Text>
                </div>
                <Show
                  when={cloudLists().length > 0}
                  fallback={<EmptyState isCompact title="No cloud lists synced." description="Connect an account above." />}
                >
                  <List hasDividers aria-label="Cloud synced task lists">
                    <For each={cloudLists()}>{list => (
                      <ListItem
                        startContent={
                          // Per-item USER color (stored value) snapped to the
                          // nearest Astryx hue token.
                          <span aria-hidden="true" class="size-4 rounded-full" style={{ background: snapUserColor(list.color).cssVar }} />
                        }
                        label={list.name}
                        endContent={<Badge label={list.provider} />}
                      />
                    )}</For>
                  </List>
                </Show>
              </div>
            </div>
          </Section>

        </div>
      </div>
    </>
  );
}

export default SettingsView;
