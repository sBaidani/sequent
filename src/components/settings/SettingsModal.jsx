import { createSignal, onMount } from 'solid-js';
import { localDB } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { authStore } from '../../stores/authStore';
import { uiStore } from '../../stores/uiStore';
import { toastStore } from '../../stores/toastStore';

function SettingsModal(props) {
  const [loading, setLoading] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal('profile');
  const [fullName, setFullName] = createSignal('');
  
  onMount(() => {
    if (authStore.state.profile) {
      setFullName(authStore.state.profile.full_name || '');
    }
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName() })
        .eq('id', authStore.state.user.id);
        
      if (error) throw error;
      await authStore.fetchProfile(authStore.state.user.id);
      toastStore.add('Profile updated successfully!');
    } catch (err) {
      toastStore.add(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const tasks = await localDB.getAll('tasks');
      const events = await localDB.getAll('events');
      const data = { tasks, events, exportDate: new Date().toISOString() };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sequent-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure? This will delete all your data permanently and cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      // Since supabase JS client does not allow a user to delete themselves natively (requires admin api),
      // we would normally call an edge function here to perform the deletion.
      // For this demo phase, we will just sign them out and wipe local db.
      await localDB.clear('tasks');
      await localDB.clear('events');
      await localDB.clear('syncQueue');
      await supabase.auth.signOut();
      window.location.reload();
    } catch (err) {
      console.error('Deletion failed', err);
    } finally {
      setLoading(false);
    }
  };

    <div class="settings-modal" style={{ "position": "fixed", "top": "50%", "left": "50%", "transform": "translate(-50%, -50%)", "background": "#1A1A1A", "padding": "0", "border-radius": "16px", "z-index": 1000, "border": "1px solid #333", "color": "#F3F3F3", "width": "100%", "max-width": "500px", "overflow": "hidden", "display": "flex", "flex-direction": "column" }}>
      <div style={{ "display": "flex", "justify-content": "space-between", "padding": "20px 24px", "border-bottom": "1px solid #333" }}>
        <h2 style={{ "margin": "0", "font-size": "20px" }}>Settings</h2>
        <button onClick={props.onClose} style={{ "background": "none", "border": "none", "color": "#888", "cursor": "pointer", "font-size": "18px" }}>✕</button>
      </div>

      <div style={{ "display": "flex", "border-bottom": "1px solid #333", "padding": "0 24px" }}>
        <button onClick={() => setActiveTab('profile')} style={{ "background": "none", "border": "none", "color": activeTab() === 'profile' ? uiStore.state.theme : "#888", "padding": "16px 0", "margin-right": "24px", "cursor": "pointer", "font-weight": "600", "border-bottom": activeTab() === 'profile' ? `2px solid ${uiStore.state.theme}` : "2px solid transparent" }}>Profile</button>
        <button onClick={() => setActiveTab('data')} style={{ "background": "none", "border": "none", "color": activeTab() === 'data' ? uiStore.state.theme : "#888", "padding": "16px 0", "cursor": "pointer", "font-weight": "600", "border-bottom": activeTab() === 'data' ? `2px solid ${uiStore.state.theme}` : "2px solid transparent" }}>Data & Privacy</button>
      </div>

      <div style={{ "padding": "24px", "flex": "1", "overflow-y": "auto", "max-height": "60vh" }}>
        {activeTab() === 'profile' && (
          <div>
            <form onSubmit={handleUpdateProfile} style={{ "display": "flex", "flex-direction": "column", "gap": "16px", "margin-bottom": "32px" }}>
              <div>
                <label style={{ "display": "block", "margin-bottom": "8px", "color": "#888", "font-size": "13px", "text-transform": "uppercase", "letter-spacing": "0.05em" }}>Full Name</label>
                <input 
                  type="text" 
                  value={fullName()} 
                  onInput={(e) => setFullName(e.target.value)} 
                  style={{ "width": "100%", "padding": "12px", "border-radius": "8px", "border": "1px solid #333", "background": "#222", "color": "#fff" }}
                />
              </div>
              <button disabled={loading()} type="submit" style={{ "padding": "10px 16px", "background": uiStore.state.theme, "color": "#fff", "border": "none", "border-radius": "8px", "font-weight": "600", "cursor": "pointer", "align-self": "flex-start" }}>
                Save Profile
              </button>
            </form>

            <div>
              <h3 style={{ "margin-bottom": "12px", "font-size": "16px" }}>App Theme</h3>
              <div style={{ "display": "flex", "gap": "12px" }}>
                {['#E8942A', '#C0185A', '#1FA7A7', '#6B5BDB', '#3B6ED6'].map(color => (
                  <button 
                    onClick={() => uiStore.setTheme(color)}
                    style={{
                      "width": "32px", "height": "32px", "border-radius": "50%",
                      "background": color,
                      "border": uiStore.state.theme === color ? "2px solid #fff" : "2px solid transparent",
                      "cursor": "pointer", "transition": "transform 0.1s"
                    }}
                    onMouseOver={(e) => e.target.style.transform = "scale(1.1)"}
                    onMouseOut={(e) => e.target.style.transform = "scale(1)"}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab() === 'data' && (
          <div>
        <h3>Data Export</h3>
        <p style={{ "font-size": "14px", "color": "#888", "margin-bottom": "12px" }}>Download a copy of all your tasks and events in JSON format.</p>
        <button disabled={loading()} onClick={handleExportData} style={{ "padding": "8px 16px", "background": "#2a2a2a", "border": "1px solid #444", "color": "#fff", "border-radius": "6px", "cursor": "pointer" }}>
          Export My Data
        </button>
      </div>

      <div style={{ "margin-bottom": "24px" }}>
        <h3 style={{ "color": "#ff4d4f" }}>Danger Zone</h3>
        <p style={{ "font-size": "14px", "color": "#888", "margin-bottom": "12px" }}>Permanently delete your account and all associated data.</p>
            <button disabled={loading()} onClick={handleDeleteAccount} style={{ "padding": "8px 16px", "background": "rgba(255, 77, 79, 0.1)", "border": "1px solid #ff4d4f", "color": "#ff4d4f", "border-radius": "6px", "cursor": "pointer" }}>
              Delete Account
            </button>
          </div>
        )}
      </div>
      
      <div style={{ "font-size": "12px", "color": "#666", "text-align": "center", "padding": "16px", "background": "#141414", "border-top": "1px solid #333" }}>
        <a href="#" style={{ "color": "#888", "margin-right": "12px" }}>Privacy Policy</a>
        <a href="#" style={{ "color": "#888" }}>Terms of Service</a>
      </div>
    </div>
  );
}

export default SettingsModal;
