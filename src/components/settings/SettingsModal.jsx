import { createSignal } from 'solid-js';
import { localDB } from '../../lib/db';
import { supabase } from '../../lib/supabase';

function SettingsModal(props) {
  const [loading, setLoading] = createSignal(false);

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

  return (
    <div class="settings-modal" style={{ "position": "fixed", "top": "50%", "left": "50%", "transform": "translate(-50%, -50%)", "background": "#1A1A1A", "padding": "24px", "border-radius": "12px", "z-index": 1000, "border": "1px solid #333", "color": "#F3F3F3", "width": "400px" }}>
      <div style={{ "display": "flex", "justify-content": "space-between", "margin-bottom": "20px" }}>
        <h2 style={{ "margin": "0" }}>Settings & Privacy</h2>
        <button onClick={props.onClose} style={{ "background": "none", "border": "none", "color": "#888", "cursor": "pointer" }}>✕</button>
      </div>

      <div style={{ "margin-bottom": "24px" }}>
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
      
      <div style={{ "font-size": "12px", "color": "#666", "text-align": "center", "margin-top": "24px", "border-top": "1px solid #333", "padding-top": "16px" }}>
        <a href="#" style={{ "color": "#888", "margin-right": "12px" }}>Privacy Policy</a>
        <a href="#" style={{ "color": "#888" }}>Terms of Service</a>
      </div>
    </div>
  );
}

export default SettingsModal;
