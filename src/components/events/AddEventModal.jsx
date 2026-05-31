import { createSignal } from 'solid-js';
import Modal from '../ui/Modal';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';

function AddEventModal() {
  const [title, setTitle] = createSignal('');
  const [date, setDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [time, setTime] = createSignal('12:00');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title().trim()) return;
    
    // Combine date and time into ISO string
    const startObj = new Date(`${date()}T${time()}`);
    const endObj = new Date(startObj.getTime() + 60 * 60 * 1000); // 1 hour default
    
    eventStore.addEvent(title(), startObj.toISOString(), endObj.toISOString());
    
    // Reset and close
    setTitle('');
    uiStore.setActiveModal(null);
  };

  return (
    <Modal id="addEvent" compact>
      <h2 style={{ "font-size": "24px", "font-weight": "800", "margin-bottom": "20px", "color": "#fff" }}>New Event</h2>
      <form onSubmit={handleSubmit} style={{ "display": "flex", "flex-direction": "column", "gap": "16px" }}>
        
        <div>
          <label style={{ "display": "block", "font-size": "12px", "color": "var(--text-muted)", "font-weight": "600", "margin-bottom": "6px", "text-transform": "uppercase", "letter-spacing": "0.05em" }}>Title</label>
          <input 
            type="text" 
            placeholder="Coffee with Sarah..."
            value={title()}
            onInput={(e) => setTitle(e.target.value)}
            style={{ 
              "width": "100%", "background": "rgba(255,255,255,0.06)", "border": "1px solid var(--border)", 
              "border-radius": "10px", "padding": "12px 14px", "color": "#fff", "font-size": "15px", "outline": "none"
            }}
            autofocus
          />
        </div>

        <div style={{ "display": "flex", "gap": "16px" }}>
          <div style={{ "flex": "1" }}>
            <label style={{ "display": "block", "font-size": "12px", "color": "var(--text-muted)", "font-weight": "600", "margin-bottom": "6px", "text-transform": "uppercase", "letter-spacing": "0.05em" }}>Date</label>
            <input 
              type="date"
              value={date()}
              onInput={(e) => setDate(e.target.value)}
              style={{ 
                "width": "100%", "background": "rgba(255,255,255,0.06)", "border": "1px solid var(--border)", 
                "border-radius": "10px", "padding": "12px 14px", "color": "#fff", "font-size": "15px", "outline": "none", "color-scheme": "dark"
              }}
            />
          </div>
          <div style={{ "flex": "1" }}>
            <label style={{ "display": "block", "font-size": "12px", "color": "var(--text-muted)", "font-weight": "600", "margin-bottom": "6px", "text-transform": "uppercase", "letter-spacing": "0.05em" }}>Time</label>
            <input 
              type="time"
              value={time()}
              onInput={(e) => setTime(e.target.value)}
              style={{ 
                "width": "100%", "background": "rgba(255,255,255,0.06)", "border": "1px solid var(--border)", 
                "border-radius": "10px", "padding": "12px 14px", "color": "#fff", "font-size": "15px", "outline": "none", "color-scheme": "dark"
              }}
            />
          </div>
        </div>

        <button 
          type="submit"
          style={{ 
            "margin-top": "8px", "background": "var(--accent)", "color": "#fff", "border": "none", 
            "padding": "14px", "border-radius": "10px", "font-size": "15px", "font-weight": "700", "cursor": "pointer"
          }}
        >
          Add Event
        </button>
      </form>
    </Modal>
  );
}

export default AddEventModal;
