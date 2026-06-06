import { onMount, createSignal } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { settingsStore } from '../../stores/settingsStore';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { api } from '../../lib/api';
import ColorPicker from '../shared/ColorPicker';
import EditableItem from '../shared/EditableItem';
import SelectPicker from '../shared/SelectPicker';
import DurationPicker from '../shared/DurationPicker';
import LocationPicker from '../shared/LocationPicker';

function SettingsView() {
  const { state: uiState, setTheme } = uiStore;
  const { state: settings, setStartOfWeek, setDefaultDuration, setWeatherLocation, setWeatherUnits, setFocusDuration, setRestDuration } = settingsStore;
  const [isSyncing, setIsSyncing] = createSignal(false);
  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;
  
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
    { name: 'Amber', color: '#E8942A' },
    { name: 'Rose', color: '#C0185A' },
    { name: 'Teal', color: '#1FA7A7' },
    { name: 'Purple', color: '#6B5BDB' },
    { name: 'Blue', color: '#3B6ED6' },
    { name: 'Graphite', color: '#888888' }
  ];

  return (
    <>
      <div class="h-[60px] min-h-[60px] border-b border-border-theme flex items-center justify-between px-6 bg-bg-theme/80 backdrop-blur-md sticky top-0 z-50">
        <div class="flex items-center gap-4">
          <button 
            onClick={() => uiStore.toggleSidebar()}
            class="flex w-9 h-9 rounded-full bg-text-primary/5 border-none text-text-primary items-center justify-center cursor-pointer transition-colors hover:bg-text-primary/10"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <div class="font-display lowercase text-xl font-bold text-text-primary tracking-wide">Settings</div>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto w-full">
        <div class="p-6 flex flex-col gap-8 max-w-[800px] mx-auto w-full">
          
          {/* Appearance */}
          <section>
            <h3 class="font-display lowercase text-lg tracking-wider font-extrabold mb-5 text-text-primary">Appearance</h3>
            
            <div class="bg-card rounded-[16px] p-5 ring-1 ring-border-theme shadow-sm">
              <div class="mb-5">
                <label class="block text-[13px] font-semibold text-text-secondary mb-3">Theme Color</label>
                <div class="flex gap-3 flex-wrap">
                  {themes.map(t => (
                    <button 
                      onClick={() => setTheme(t.color)}
                      class={`w-10 h-10 rounded-full transition-transform hover:scale-110 border-4 cursor-pointer ${uiState.theme === t.color ? 'border-text-primary' : 'border-transparent'}`}
                      style={{ background: t.color }}
                      title={t.name}
                    />
                  ))}
                </div>
              </div>

              <div class="pt-4 border-t border-border-theme flex items-center justify-between">
                <div>
                  <div class="text-sm font-semibold text-text-primary">Dark Mode</div>
                  <div class="text-xs text-text-muted mt-0.5">Toggle between light and dark UI</div>
                </div>
                <button 
                  type="button"
                  onClick={() => uiStore.setMode(uiState.mode === 'dark' ? 'light' : 'dark')}
                  class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${uiState.mode === 'dark' ? 'bg-accent' : 'bg-text-primary/20 hover:bg-text-primary/30'}`}
                >
                  <span class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${uiState.mode === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section>
            <h3 class="font-display lowercase text-lg tracking-wider font-extrabold mb-5 text-text-primary">Preferences</h3>
            
            <div class="bg-card rounded-[16px] ring-1 ring-border-theme shadow-sm">
              
              <div class="p-4 flex items-center justify-between border-b border-border-theme">
                <div>
                  <div class="text-sm font-semibold text-text-primary">Start of Week</div>
                  <div class="text-xs text-text-muted mt-0.5">Which day should calendars start on?</div>
                </div>
                <div class="w-36">
                  <SelectPicker 
                    value={settings.startOfWeek} 
                    onChange={setStartOfWeek}
                    options={[
                      { value: 'monday', label: 'Monday' },
                      { value: 'sunday', label: 'Sunday' }
                    ]}
                  />
                </div>
              </div>
              
              <div class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-theme">
                <div>
                  <div class="text-sm font-semibold text-text-primary">Default Event Duration</div>
                  <div class="text-xs text-text-muted mt-0.5">Used when adding new events</div>
                </div>
                <div class="w-full sm:w-[320px]">
                  <DurationPicker 
                    value={settings.defaultDuration} 
                    onChange={setDefaultDuration}
                  />
                </div>
              </div>

              <div class="p-4 flex items-center justify-between border-b border-border-theme">
                <div>
                  <div class="text-sm font-semibold text-text-primary">Show Tasks in Timeline</div>
                  <div class="text-xs text-text-muted mt-0.5">Display tasks alongside events in the timeline view</div>
                </div>
                <button 
                  type="button"
                  onClick={() => settingsStore.setShowTasksInTimeline(!settings.showTasksInTimeline)}
                  class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.showTasksInTimeline ? 'bg-accent' : 'bg-text-primary/20 hover:bg-text-primary/30'}`}
                >
                  <span class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${settings.showTasksInTimeline ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div class="p-4 flex items-center justify-between border-b border-border-theme">
                <div>
                  <div class="text-sm font-semibold text-text-primary">Use 24-Hour Clock</div>
                  <div class="text-xs text-text-muted mt-0.5">Display times in 24-hour format</div>
                </div>
                <button 
                  type="button"
                  onClick={() => settingsStore.setUse24HourClock(!settings.use24HourClock)}
                  class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.use24HourClock ? 'bg-accent' : 'bg-text-primary/20 hover:bg-text-primary/30'}`}
                >
                  <span class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${settings.use24HourClock ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              <div class="p-4 flex items-center justify-between">
                <div>
                  <div class="text-sm font-semibold text-text-primary">Show Seconds on Clock</div>
                  <div class="text-xs text-text-muted mt-0.5">Include seconds in the sidebar clock</div>
                </div>
                <button 
                  type="button"
                  onClick={() => settingsStore.setShowSeconds(!settings.showSeconds)}
                  class={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${settings.showSeconds ? 'bg-accent' : 'bg-text-primary/20 hover:bg-text-primary/30'}`}
                >
                  <span class={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${settings.showSeconds ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>
              
              <div class="p-4 flex items-center justify-between border-t border-border-theme">
                <div class="flex-1">
                  <div class="text-sm font-semibold text-text-primary">Weather Location</div>
                  <div class="text-xs text-text-muted mt-0.5">Search for a city or use current location</div>
                </div>
                <div class="w-64">
                  <LocationPicker 
                    value={settings.weatherLocation}
                    onChange={setWeatherLocation}
                  />
                </div>
              </div>

              <div class="p-4 flex items-center justify-between border-t border-border-theme">
                <div>
                  <div class="text-sm font-semibold text-text-primary">Weather Units</div>
                  <div class="text-xs text-text-muted mt-0.5">Display temperature in Celsius or Fahrenheit</div>
                </div>
                <div class="w-48">
                  <SelectPicker 
                    value={settings.weatherUnits} 
                    onChange={setWeatherUnits}
                    options={[
                      { value: 'celsius', label: 'Celsius (°C)' },
                      { value: 'fahrenheit', label: 'Fahrenheit (°F)' }
                    ]}
                  />
                </div>
              </div>

            </div>
          </section>

          {/* Focus */}
          <section>
            <h3 class="font-display lowercase text-lg tracking-wider font-extrabold mb-5 text-text-primary">Focus & Pomodoro</h3>
            
            <div class="bg-card rounded-[16px] ring-1 ring-border-theme shadow-sm">
              <div class="p-4 flex items-center justify-between border-b border-border-theme">
                <div>
                  <div class="text-sm font-semibold text-text-primary">Focus Duration</div>
                  <div class="text-xs text-text-muted mt-0.5">Length of your focus sessions (minutes)</div>
                </div>
                <div class="w-32">
                  <SelectPicker 
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
                </div>
              </div>
              
              <div class="p-4 flex items-center justify-between">
                <div>
                  <div class="text-sm font-semibold text-text-primary">Rest Duration</div>
                  <div class="text-xs text-text-muted mt-0.5">Length of breaks between sessions (minutes)</div>
                </div>
                <div class="w-32">
                  <SelectPicker 
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
                </div>
              </div>
            </div>
          </section>

          {/* Sync Accounts */}
          <section>
            <div class="flex items-center justify-between mb-5">
              <h3 class="font-display lowercase text-lg tracking-wider font-extrabold m-0 text-text-primary">Cloud Sync</h3>
              <button 
                onClick={async () => {
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
                }}
                disabled={isSyncing()}
                class={`bg-text-primary/10 text-text-primary border-none rounded-xl py-1.5 px-3 text-[13px] font-semibold cursor-pointer hover:bg-text-primary/20 transition-colors flex items-center gap-2 ${isSyncing() ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <svg class={`w-4 h-4 ${isSyncing() ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                {isSyncing() ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
            
            <div class="bg-card rounded-[16px] p-5 ring-1 ring-border-theme shadow-sm">
              <div class="text-[13px] text-text-secondary mb-4">
                Connect external calendars to view them in Sequent. Two-way sync allows you to add and edit events.
              </div>
              
              <div class="flex flex-col gap-3">
                <button 
                  onClick={async () => {
                    try {
                      localStorage.setItem('oauth_provider_intent', 'google');
                      const { url } = await api.auth.getAuthUrl('google');
                      window.location.href = url;
                    } catch (err) {
                      alert('Failed to start Google Auth: ' + err.message);
                    }
                  }}
                  class="bg-text-primary/5 border border-border-theme rounded-xl py-3 px-4 text-text-primary flex items-center gap-3 font-semibold cursor-pointer hover:bg-text-primary/10 transition-colors"
                >
                  <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Connect Google Calendar
                </button>
                
                <button 
                  onClick={async () => {
                    try {
                      localStorage.setItem('oauth_provider_intent', 'microsoft');
                      const { url } = await api.auth.getAuthUrl('microsoft');
                      window.location.href = url;
                    } catch (err) {
                      alert('Failed to start Microsoft Auth: ' + err.message);
                    }
                  }}
                  class="bg-text-primary/5 border border-border-theme rounded-xl py-3 px-4 text-text-primary flex items-center gap-3 font-semibold cursor-pointer hover:bg-text-primary/10 transition-colors"
                >
                  <svg viewBox="0 0 24 24" class="w-5 h-5 fill-[#00a4ef]"><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/></svg>
                  Connect Microsoft Outlook
                </button>
              </div>
            </div>
          </section>

          {/* Calendars */}
          <section>
            <div class="flex items-center mb-4">
              <h3 class="font-display lowercase text-lg tracking-wider font-extrabold text-text-primary">Calendars</h3>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Local Calendars */}
              <div>
                <div class="flex justify-between items-center mb-3 px-1">
                  <div class="font-display lowercase text-[13px] font-bold text-text-secondary tracking-wider">Local</div>
                  <button 
                    onClick={() => uiStore.setActiveModal('addCalendar')}
                    class="text-accent bg-transparent border-none cursor-pointer text-[12px] font-semibold hover:underline p-0"
                  >
                    + New
                  </button>
                </div>
                <div class="bg-card rounded-[16px] ring-1 ring-border-theme shadow-sm overflow-hidden">
                  {eventState.calendars.filter(c => !c.provider || c.provider === 'local').map(cal => (
                    <div class="p-4 flex items-center justify-between border-b border-border-theme last:border-b-0">
                      <div class="flex items-center gap-3 w-full">
                        <ColorPicker 
                          value={cal.color} 
                          onChange={(newColor) => eventStore.updateCalendar(cal.id, { color: newColor })}
                        />
                        <EditableItem 
                          value={cal.name}
                          onChange={(newName) => eventStore.updateCalendar(cal.id, { name: newName })}
                        />
                      </div>
                      <button 
                        onClick={() => { if(confirm('Delete calendar and all its events?')) eventStore.deleteCalendar(cal.id); }}
                        class="bg-transparent border-none text-[#ff4d4f] cursor-pointer text-lg opacity-70 hover:opacity-100"
                        title="Delete Calendar"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {eventState.calendars.filter(c => !c.provider || c.provider === 'local').length === 0 && (
                    <div class="p-5 text-center text-text-muted text-[13px]">No local calendars found.</div>
                  )}
                </div>
              </div>

              {/* Cloud Calendars */}
              <div>
                <div class="flex items-center mb-3 px-1">
                  <div class="font-display lowercase text-[13px] font-bold text-text-secondary tracking-wider">Cloud Synced</div>
                </div>
                <div class="bg-card rounded-[16px] ring-1 ring-border-theme shadow-sm overflow-hidden">
                  {eventState.calendars.filter(c => c.provider && c.provider !== 'local').map(cal => (
                    <div class="p-4 flex items-center justify-between border-b border-border-theme last:border-b-0">
                      <div class="flex items-center gap-3">
                        <div class="w-4 h-4 rounded-full" style={{ background: cal.color }} />
                        <div class="text-[13px] font-semibold text-text-primary">{cal.name}</div>
                      </div>
                      <div class="font-display lowercase text-[11px] font-bold tracking-wider text-text-muted bg-text-primary/5 px-2 py-1 rounded">
                        {cal.provider}
                      </div>
                    </div>
                  ))}
                  {eventState.calendars.filter(c => c.provider && c.provider !== 'local').length === 0 && (
                    <div class="p-5 text-center text-text-muted text-[13px]">No cloud calendars synced. Connect an account above.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Task Lists */}
          <section class="pb-8">
            <div class="flex items-center mb-4">
              <h3 class="font-display lowercase text-lg tracking-wider font-extrabold text-text-primary">Task Lists</h3>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Local Task Lists */}
              <div>
                <div class="flex justify-between items-center mb-3 px-1">
                  <div class="font-display lowercase text-[13px] font-bold text-text-secondary tracking-wider">Local</div>
                  <button 
                    onClick={() => uiStore.setActiveModal('addList')}
                    class="text-accent bg-transparent border-none cursor-pointer text-[12px] font-semibold hover:underline p-0"
                  >
                    + New
                  </button>
                </div>
                <div class="bg-card rounded-[16px] ring-1 ring-border-theme shadow-sm overflow-hidden">
                  {taskState.lists.filter(l => !l.provider || l.provider === 'local').map(list => (
                    <div class="p-4 flex items-center justify-between border-b border-border-theme last:border-b-0">
                      <div class="flex items-center gap-3 w-full">
                        <ColorPicker 
                          value={list.color} 
                          onChange={(newColor) => taskStore.updateList(list.id, { color: newColor })}
                        />
                        <EditableItem 
                          value={list.name}
                          onChange={(newName) => taskStore.updateList(list.id, { name: newName })}
                        />
                      </div>
                      <button 
                        onClick={() => { if(confirm('Delete list and all its tasks?')) taskStore.deleteList(list.id); }}
                        class="bg-transparent border-none text-[#ff4d4f] cursor-pointer text-lg opacity-70 hover:opacity-100"
                        title="Delete List"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {taskState.lists.filter(l => !l.provider || l.provider === 'local').length === 0 && (
                    <div class="p-5 text-center text-text-muted text-[13px]">No local lists found.</div>
                  )}
                </div>
              </div>

              {/* Cloud Task Lists */}
              <div>
                <div class="flex items-center mb-3 px-1">
                  <div class="font-display lowercase text-[13px] font-bold text-text-secondary tracking-wider">Cloud Synced</div>
                </div>
                <div class="bg-card rounded-[16px] ring-1 ring-border-theme shadow-sm overflow-hidden">
                  {taskState.lists.filter(l => l.provider && l.provider !== 'local').map(list => (
                    <div class="p-4 flex items-center justify-between border-b border-border-theme last:border-b-0">
                      <div class="flex items-center gap-3">
                        <div class="w-4 h-4 rounded-full" style={{ background: list.color }} />
                        <div class="text-[13px] font-semibold text-text-primary">{list.name}</div>
                      </div>
                      <div class="font-display lowercase text-[11px] font-bold tracking-wider text-text-muted bg-text-primary/5 px-2 py-1 rounded">
                        {list.provider}
                      </div>
                    </div>
                  ))}
                  {taskState.lists.filter(l => l.provider && l.provider !== 'local').length === 0 && (
                    <div class="p-5 text-center text-text-muted text-[13px]">No cloud lists synced. Connect an account above.</div>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}

export default SettingsView;
