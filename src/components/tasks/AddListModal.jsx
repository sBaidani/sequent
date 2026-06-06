import { createSignal, For } from 'solid-js';
import Modal from '../ui/Modal';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';

function AddListModal() {
  const [name, setName] = createSignal('');
  const [color, setColor] = createSignal('#1FA7A7');
  
  const colors = ['#E8942A', '#C0185A', '#1FA7A7', '#6B5BDB', '#3B6ED6', '#34A853'];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name().trim()) return;
    
    taskStore.addList(name(), color());
    setName('');
    uiStore.setActiveModal(null);
  };

  return (
    <Modal id="addList" compact>
      <h2 class="font-display lowercase text-2xl font-extrabold mb-5 text-text-primary">New List</h2>
      <form onSubmit={handleSubmit} class="flex flex-col gap-4">
        
        <div>
          <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">List Name</label>
          <input 
            type="text" 
            placeholder="Work, Groceries..."
            value={name()}
            onInput={(e) => setName(e.target.value)}
            class="w-full bg-text-primary/5 border border-border rounded-xl px-3.5 py-3 text-text-primary text-[15px] outline-none focus:border-accent transition-colors"
            autofocus
          />
        </div>
        
        <div>
          <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-2 tracking-wider">Color</label>
          <div class="flex gap-3">
            <For each={colors}>{(c) => (
              <button 
                type="button"
                onClick={() => setColor(c)}
                class={`w-8 h-8 rounded-full border-4 cursor-pointer transition-transform hover:scale-110 ${color() === c ? 'border-text-primary' : 'border-transparent'}`}
                style={{ background: c }}
              />
            )}</For>
          </div>
        </div>

        <button 
          type="submit"
          class="mt-2 bg-accent text-text-primary border-none p-3.5 rounded-xl text-[15px] font-bold cursor-pointer hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
        >
          Create List
        </button>
      </form>
    </Modal>
  );
}

export default AddListModal;
