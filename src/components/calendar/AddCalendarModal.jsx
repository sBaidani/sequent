import { createSignal } from 'solid-js';
import Modal from '../ui/Modal';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';

function AddCalendarModal() {
  const [name, setName] = createSignal('');
  const [color, setColor] = createSignal('#E8942A');
  
  const colors = ['#E8942A', '#C0185A', '#1FA7A7', '#6B5BDB', '#3B6ED6', '#34A853'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name().trim()) return;
    
    eventStore.addCalendar(name(), color());
    setName('');
    uiStore.setActiveModal(null);
  };

  return (
    <Modal id="addCalendar" compact>
      <h2 style={{ "font-size": "24px", "font-weight": "800", "margin-bottom": "20px", "color": "#fff" }}>New Calendar</h2>
      <form onSubmit={handleSubmit} style={{ "display": "flex", "flex-direction": "column", "gap": "16px" }}>
        
        <div>
          <label style={{ "display": "block", "font-size": "12px", "color": "var(--text-muted)", "font-weight": "600", "margin-bottom": "6px", "text-transform": "uppercase", "letter-spacing": "0.05em" }}>Calendar Name</label>
          <input 
            type="text" 
            placeholder="Work, Personal..."
            value={name()}
            onInput={(e) => setName(e.target.value)}
            style={{ 
              "width": "100%", "background": "rgba(255,255,255,0.06)", "border": "1px solid var(--border)", 
              "border-radius": "10px", "padding": "12px 14px", "color": "#fff", "font-size": "15px", "outline": "none"
            }}
            autofocus
          />
        </div>
        
        <div>
          <label style={{ "display": "block", "font-size": "12px", "color": "var(--text-muted)", "font-weight": "600", "margin-bottom": "8px", "text-transform": "uppercase", "letter-spacing": "0.05em" }}>Color</label>
          <div style={{ "display": "flex", "gap": "12px" }}>
            {colors.map(c => (
              <button 
                type="button"
                onClick={() => setColor(c)}
                style={{ 
                  "width": "32px", "height": "32px", "border-radius": "50%", 
                  "background": c, 
                  "border": color() === c ? "3px solid #fff" : "3px solid transparent",
                }}
              />
            ))}
          </div>
        </div>

        <button 
          type="submit"
          style={{ 
            "margin-top": "8px", "background": "var(--accent)", "color": "#fff", "border": "none", 
            "padding": "14px", "border-radius": "10px", "font-size": "15px", "font-weight": "700", "cursor": "pointer"
          }}
        >
          Create Calendar
        </button>
      </form>
    </Modal>
  );
}

export default AddCalendarModal;
