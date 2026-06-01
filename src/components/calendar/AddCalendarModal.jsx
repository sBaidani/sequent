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
      <h2 class="text-2xl font-extrabold mb-5 text-white">New Calendar</h2>
      <form onSubmit={handleSubmit} class="flex flex-col gap-4">
        
        <div>
          <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Calendar Name</label>
          <input 
            type="text" 
            placeholder="Work, Personal..."
            value={name()}
            onInput={(e) => setName(e.target.value)}
            class="w-full bg-white/5 border border-border rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors"
            autofocus
          />
        </div>
        
        <div>
          <label class="block text-xs text-text-muted font-semibold mb-2 uppercase tracking-wider">Color</label>
          <div class="flex gap-3">
            {colors.map(c => (
              <button 
                type="button"
                onClick={() => setColor(c)}
                class={`w-8 h-8 rounded-full border-4 cursor-pointer transition-transform hover:scale-110 ${color() === c ? 'border-white' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        <button 
          type="submit"
          class="mt-2 bg-accent text-white border-none p-3.5 rounded-xl text-[15px] font-bold cursor-pointer hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
        >
          Create Calendar
        </button>
      </form>
    </Modal>
  );
}

export default AddCalendarModal;
