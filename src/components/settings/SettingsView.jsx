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
      <div class="lists-topbar">
        <div class="lists-title">Settings</div>
      </div>

      <div class="lists-layout" style={{ "overflow-y": "auto", "padding": "24px", "display": "flex", "flex-direction": "column", "gap": "32px", "max-width": "800px", "margin": "0 auto" }}>
        
        {/* Appearance */}
        <section>
          <h3 style={{ "font-size": "16px", "font-weight": "800", "margin-bottom": "16px", "color": "#fff" }}>Appearance</h3>
          
          <div style={{ "background": "var(--card)", "border-radius": "var(--card-radius-lg)", "padding": "20px", "border": "1px solid var(--border)" }}>
            <div style={{ "margin-bottom": "20px" }}>
              <label style={{ "display": "block", "font-size": "13px", "font-weight": "600", "color": "var(--text-secondary)", "margin-bottom": "12px" }}>Theme Color</label>
              <div style={{ "display": "flex", "gap": "12px", "flex-wrap": "wrap" }}>
                {themes.map(t => (
                  <button 
                    onClick={() => setTheme(t.color)}
                    style={{ 
                      "width": "40px", "height": "40px", "border-radius": "50%", 
                      "background": t.color, 
                      "border": uiState.theme === t.color ? "3px solid #fff" : "3px solid transparent",
                      "transition": "transform 0.2s"
                    }}
                    onMouseOver={(e) => e.target.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    title={t.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Calendars */}
        <section>
          <div style={{"display":"flex", "justify-content":"space-between", "align-items":"center", "margin-bottom":"16px"}}>
            <h3 style={{ "font-size": "16px", "font-weight": "800", "color": "#fff" }}>Local Calendars</h3>
            <button 
              onClick={() => uiStore.setActiveModal('addCalendar')}
              style={{"background":"var(--accent)", "color":"#fff", "border":"none", "padding":"6px 12px", "border-radius":"8px", "font-size":"13px", "font-weight":"600", "cursor":"pointer"}}
            >
              + New Calendar
            </button>
          </div>
          
          <div style={{ "background": "var(--card)", "border-radius": "var(--card-radius-lg)", "border": "1px solid var(--border)", "overflow":"hidden" }}>
            {eventState.calendars.map(cal => (
              <div style={{ "padding": "16px 20px", "display": "flex", "align-items": "center", "justify-content": "space-between", "border-bottom": "1px solid var(--border)" }}>
                <div style={{"display":"flex", "align-items":"center", "gap":"12px"}}>
                  <input 
                    type="color" 
                    value={cal.color} 
                    onChange={(e) => eventStore.updateCalendar(cal.id, { color: e.target.value })}
                    style={{"width":"24px", "height":"24px", "border":"none", "border-radius":"50%", "cursor":"pointer", "padding":"0", "background":"transparent"}} 
                  />
                  <input 
                    type="text" 
                    value={cal.name}
                    onChange={(e) => eventStore.updateCalendar(cal.id, { name: e.target.value })}
                    style={{"background":"transparent", "border":"none", "color":"#fff", "font-size":"14px", "font-weight":"600", "outline":"none"}}
                  />
                </div>
                <button 
                  onClick={() => { if(confirm('Delete calendar and all its events?')) eventStore.deleteCalendar(cal.id); }}
                  style={{"background":"transparent", "border":"none", "color":"#ff4d4f", "cursor":"pointer", "font-size":"18px"}}
                  title="Delete Calendar"
                >
                  ×
                </button>
              </div>
            ))}
            {eventState.calendars.length === 0 && (
              <div style={{"padding":"20px", "text-align":"center", "color":"var(--text-muted)", "font-size":"13px"}}>No calendars found.</div>
            )}
          </div>
        </section>

        {/* Task Lists */}
        <section>
          <div style={{"display":"flex", "justify-content":"space-between", "align-items":"center", "margin-bottom":"16px"}}>
            <h3 style={{ "font-size": "16px", "font-weight": "800", "color": "#fff" }}>Task Lists</h3>
            <button 
              onClick={() => {
                const name = prompt('New list name:');
                if (name) taskStore.addList(name, '#3B6ED6');
              }}
              style={{"background":"var(--accent)", "color":"#fff", "border":"none", "padding":"6px 12px", "border-radius":"8px", "font-size":"13px", "font-weight":"600", "cursor":"pointer"}}
            >
              + New List
            </button>
          </div>
          
          <div style={{ "background": "var(--card)", "border-radius": "var(--card-radius-lg)", "border": "1px solid var(--border)", "overflow":"hidden" }}>
            {taskState.lists.map(list => (
              <div style={{ "padding": "16px 20px", "display": "flex", "align-items": "center", "justify-content": "space-between", "border-bottom": "1px solid var(--border)" }}>
                <div style={{"display":"flex", "align-items":"center", "gap":"12px"}}>
                  <input 
                    type="color" 
                    value={list.color} 
                    onChange={(e) => taskStore.updateList(list.id, { color: e.target.value })}
                    style={{"width":"24px", "height":"24px", "border":"none", "border-radius":"50%", "cursor":"pointer", "padding":"0", "background":"transparent"}} 
                  />
                  <input 
                    type="text" 
                    value={list.name}
                    onChange={(e) => taskStore.updateList(list.id, { name: e.target.value })}
                    style={{"background":"transparent", "border":"none", "color":"#fff", "font-size":"14px", "font-weight":"600", "outline":"none"}}
                  />
                </div>
                <button 
                  onClick={() => { if(confirm('Delete list and all its tasks?')) taskStore.deleteList(list.id); }}
                  style={{"background":"transparent", "border":"none", "color":"#ff4d4f", "cursor":"pointer", "font-size":"18px"}}
                  title="Delete List"
                >
                  ×
                </button>
              </div>
            ))}
            {taskState.lists.length === 0 && (
              <div style={{"padding":"20px", "text-align":"center", "color":"var(--text-muted)", "font-size":"13px"}}>No task lists found.</div>
            )}
          </div>
        </section>

        {/* Preferences */}
        <section>
          <h3 style={{ "font-size": "16px", "font-weight": "800", "margin-bottom": "16px", "color": "#fff" }}>Preferences</h3>
          
          <div style={{ "background": "var(--card)", "border-radius": "var(--card-radius-lg)", "border": "1px solid var(--border)" }}>
            
            <div style={{ "padding": "16px 20px", "display": "flex", "align-items": "center", "justify-content": "space-between", "border-bottom": "1px solid var(--border)" }}>
              <div>
                <div style={{ "font-size": "14px", "font-weight": "600", "color": "#fff" }}>Start of Week</div>
                <div style={{ "font-size": "12px", "color": "var(--text-muted)", "margin-top": "2px" }}>Which day should calendars start on?</div>
              </div>
              <select 
                value={settings.startOfWeek} 
                onChange={(e) => setStartOfWeek(e.target.value)}
                style={{ "background": "rgba(255,255,255,0.1)", "color": "#fff", "border": "none", "padding": "8px 12px", "border-radius": "8px", "outline": "none" }}
              >
                <option value="monday" style={{ "color": "#000" }}>Monday</option>
                <option value="sunday" style={{ "color": "#000" }}>Sunday</option>
              </select>
            </div>
            
            <div style={{ "padding": "16px 20px", "display": "flex", "align-items": "center", "justify-content": "space-between" }}>
              <div>
                <div style={{ "font-size": "14px", "font-weight": "600", "color": "#fff" }}>Default Event Duration</div>
                <div style={{ "font-size": "12px", "color": "var(--text-muted)", "margin-top": "2px" }}>Used when adding new events</div>
              </div>
              <select 
                value={settings.defaultDuration.toString()} 
                onChange={(e) => setDefaultDuration(parseInt(e.target.value, 10))}
                style={{ "background": "rgba(255,255,255,0.1)", "color": "#fff", "border": "none", "padding": "8px 12px", "border-radius": "8px", "outline": "none" }}
              >
                <option value="30" style={{ "color": "#000" }}>30 minutes</option>
                <option value="60" style={{ "color": "#000" }}>1 hour</option>
                <option value="120" style={{ "color": "#000" }}>2 hours</option>
              </select>
            </div>

          </div>
        </section>

        {/* Sync Accounts */}
        <section>
          <h3 style={{ "font-size": "16px", "font-weight": "800", "margin-bottom": "16px", "color": "#fff" }}>Calendar Accounts</h3>
          
          <div style={{ "background": "var(--card)", "border-radius": "var(--card-radius-lg)", "padding": "20px", "border": "1px solid var(--border)" }}>
            <div style={{ "font-size": "13px", "color": "var(--text-secondary)", "margin-bottom": "16px" }}>
              Connect external calendars to view them in Sequent. Two-way sync allows you to add and edit events.
            </div>
            
            <div style={{ "display": "flex", "flex-direction": "column", "gap": "12px" }}>
              <button style={{ "background": "rgba(255,255,255,0.1)", "border": "1px solid rgba(255,255,255,0.1)", "border-radius": "10px", "padding": "12px 16px", "color": "#fff", "display": "flex", "align-items": "center", "gap": "12px", "font-weight": "600" }}>
                <svg viewBox="0 0 24 24" style={{ "width": "20px", "height": "20px", "fill": "currentColor" }}><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Connect Google Calendar
              </button>
              
              <button style={{ "background": "rgba(255,255,255,0.1)", "border": "1px solid rgba(255,255,255,0.1)", "border-radius": "10px", "padding": "12px 16px", "color": "#fff", "display": "flex", "align-items": "center", "gap": "12px", "font-weight": "600" }}>
                <svg viewBox="0 0 24 24" style={{ "width": "20px", "height": "20px", "fill": "#00a4ef" }}><path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zM24 11.4H12.6V0H24v11.4z"/></svg>
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
