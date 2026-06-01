import { uiStore } from '../../stores/uiStore';
import { settingsStore } from '../../stores/settingsStore';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';

function SettingsView() {
  const { state: uiState, setTheme } = uiStore;
  const { state: settings, setStartOfWeek, setDefaultDuration } = settingsStore;
  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;
  
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
      <div class="h-[60px] min-h-[60px] border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div class="text-xl font-bold text-white tracking-wide">Settings</div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-8 max-w-[800px] mx-auto w-full">
        
        {/* Appearance */}
        <section class="border-b border-white/10 pb-8">
          <h3 class="text-base font-extrabold mb-4 text-white">Appearance</h3>
          
          <div class="bg-card rounded-[16px] p-5 border border-border">
            <div class="mb-5">
              <label class="block text-[13px] font-semibold text-text-secondary mb-3">Theme Color</label>
              <div class="flex gap-3 flex-wrap">
                {themes.map(t => (
                  <button 
                    onClick={() => setTheme(t.color)}
                    class={`w-10 h-10 rounded-full transition-transform hover:scale-110 border-4 cursor-pointer ${uiState.theme === t.color ? 'border-white' : 'border-transparent'}`}
                    style={{ background: t.color }}
                    title={t.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Calendars */}
        <section class="border-b border-white/10 pb-8">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-extrabold text-white">Local Calendars</h3>
            <button 
              onClick={() => uiStore.setActiveModal('addCalendar')}
              class="bg-accent text-white border-none py-1.5 px-3 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-accent/80 transition-colors"
            >
              + New Calendar
            </button>
          </div>
          
          <div class="bg-card rounded-[16px] border border-border overflow-hidden">
            {eventState.calendars.map(cal => (
              <div class="p-4 flex items-center justify-between border-b border-border last:border-b-0">
                <div class="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={cal.color} 
                    onChange={(e) => eventStore.updateCalendar(cal.id, { color: e.target.value })}
                    class="w-6 h-6 border-none rounded-full cursor-pointer p-0 bg-transparent"
                  />
                  <input 
                    type="text" 
                    value={cal.name}
                    onChange={(e) => eventStore.updateCalendar(cal.id, { name: e.target.value })}
                    class="bg-transparent border-none text-white text-sm font-semibold outline-none"
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
            {eventState.calendars.length === 0 && (
              <div class="p-5 text-center text-text-muted text-[13px]">No calendars found.</div>
            )}
          </div>
        </section>

        {/* Task Lists */}
        <section class="border-b border-white/10 pb-8">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-base font-extrabold text-white">Task Lists</h3>
            <button 
              onClick={() => {
                const name = prompt('New list name:');
                if (name) taskStore.addList(name, '#3B6ED6');
              }}
              class="bg-accent text-white border-none py-1.5 px-3 rounded-lg text-[13px] font-semibold cursor-pointer hover:bg-accent/80 transition-colors"
            >
              + New List
            </button>
          </div>
          
          <div class="bg-card rounded-[16px] border border-border overflow-hidden">
            {taskState.lists.map(list => (
              <div class="p-4 flex items-center justify-between border-b border-border last:border-b-0">
                <div class="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={list.color} 
                    onChange={(e) => taskStore.updateList(list.id, { color: e.target.value })}
                    class="w-6 h-6 border-none rounded-full cursor-pointer p-0 bg-transparent"
                  />
                  <input 
                    type="text" 
                    value={list.name}
                    onChange={(e) => taskStore.updateList(list.id, { name: e.target.value })}
                    class="bg-transparent border-none text-white text-sm font-semibold outline-none"
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
            {taskState.lists.length === 0 && (
              <div class="p-5 text-center text-text-muted text-[13px]">No task lists found.</div>
            )}
          </div>
        </section>

        {/* Preferences */}
        <section class="border-b border-white/10 pb-8">
          <h3 class="text-base font-extrabold mb-4 text-white">Preferences</h3>
          
          <div class="bg-card rounded-[16px] border border-border">
            
            <div class="p-4 flex items-center justify-between border-b border-border">
              <div>
                <div class="text-sm font-semibold text-white">Start of Week</div>
                <div class="text-xs text-text-muted mt-0.5">Which day should calendars start on?</div>
              </div>
              <select 
                value={settings.startOfWeek} 
                onChange={(e) => setStartOfWeek(e.target.value)}
                class="bg-white/10 text-white border-none py-2 px-3 rounded-lg outline-none"
              >
                <option value="monday" class="text-black">Monday</option>
                <option value="sunday" class="text-black">Sunday</option>
              </select>
            </div>
            
            <div class="p-4 flex items-center justify-between">
              <div>
                <div class="text-sm font-semibold text-white">Default Event Duration</div>
                <div class="text-xs text-text-muted mt-0.5">Used when adding new events</div>
              </div>
              <select 
                value={settings.defaultDuration.toString()} 
                onChange={(e) => setDefaultDuration(parseInt(e.target.value, 10))}
                class="bg-white/10 text-white border-none py-2 px-3 rounded-lg outline-none"
              >
                <option value="30" class="text-black">30 minutes</option>
                <option value="60" class="text-black">1 hour</option>
                <option value="120" class="text-black">2 hours</option>
              </select>
            </div>

          </div>
        </section>

        {/* Sync Accounts */}
        <section class="pb-8">
          <h3 class="text-base font-extrabold mb-4 text-white">Calendar Accounts</h3>
          
          <div class="bg-card rounded-[16px] p-5 border border-border">
            <div class="text-[13px] text-text-secondary mb-4">
              Connect external calendars to view them in Sequent. Two-way sync allows you to add and edit events.
            </div>
            
            <div class="flex flex-col gap-3">
              <button class="bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-white flex items-center gap-3 font-semibold cursor-pointer hover:bg-white/20 transition-colors">
                <svg viewBox="0 0 24 24" class="w-5 h-5 fill-current"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Connect Google Calendar
              </button>
              
              <button class="bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-white flex items-center gap-3 font-semibold cursor-pointer hover:bg-white/20 transition-colors">
                <svg viewBox="0 0 24 24" class="w-5 h-5 fill-[#00a4ef]"><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/></svg>
                Connect Microsoft Outlook
              </button>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}

export default SettingsView;
