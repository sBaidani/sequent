import { createSignal } from 'solid-js';
import Modal from '../ui/Modal';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';

function AddTaskModal() {
  const [title, setTitle] = createSignal('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title().trim()) return;
    
    taskStore.addTask(title());
    setTitle('');
    uiStore.setActiveModal(null);
  };

  return (
    <Modal id="addTask" compact>
      <h2 style={{ "font-size": "24px", "font-weight": "800", "margin-bottom": "20px", "color": "#fff" }}>New Task</h2>
      <form onSubmit={handleSubmit} style={{ "display": "flex", "flex-direction": "column", "gap": "16px" }}>
        
        <div>
          <label style={{ "display": "block", "font-size": "12px", "color": "var(--text-muted)", "font-weight": "600", "margin-bottom": "6px", "text-transform": "uppercase", "letter-spacing": "0.05em" }}>I want to...</label>
          <input 
            type="text" 
            placeholder="Buy groceries..."
            value={title()}
            onInput={(e) => setTitle(e.target.value)}
            style={{ 
              "width": "100%", "background": "rgba(255,255,255,0.06)", "border": "1px solid var(--border)", 
              "border-radius": "10px", "padding": "12px 14px", "color": "#fff", "font-size": "15px", "outline": "none"
            }}
            autofocus
          />
        </div>

        <button 
          type="submit"
          style={{ 
            "margin-top": "8px", "background": "var(--accent)", "color": "#fff", "border": "none", 
            "padding": "14px", "border-radius": "10px", "font-size": "15px", "font-weight": "700", "cursor": "pointer"
          }}
        >
          Add Task
        </button>
      </form>
    </Modal>
  );
}

export default AddTaskModal;
