import { createSignal, createEffect } from 'solid-js';
import Modal from '../ui/Modal';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';

function AddTaskModal() {
  const [title, setTitle] = createSignal('');
  const [date, setDate] = createSignal('');
  const [listId, setListId] = createSignal('');
  const [priority, setPriority] = createSignal('normal');

  const { state: taskState } = taskStore;

  createEffect(() => {
    if (uiStore.state.activeModal === 'addTask') {
      setDate(uiStore.state.activeDate.split('T')[0]);
      // Use the activeListId if set, otherwise default to the first list
      if (uiStore.state.activeListId) {
        setListId(uiStore.state.activeListId);
      } else if (taskState.lists.length > 0) {
        setListId(taskState.lists[0].id);
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title().trim()) return;
    
    const targetDate = date() ? new Date(date()).toISOString() : null;
    
    taskStore.addTask(title(), listId() || null, targetDate, priority());
    
    setTitle('');
    uiStore.setActiveModal(null);
  };

  return (
    <Modal id="addTask" compact>
      <div class="w-full flex flex-col gap-4 overflow-hidden">
        <h2 class="text-xl font-bold text-white mb-2">New Task</h2>
        
        <form onSubmit={handleSubmit} class="flex flex-col gap-4">
          <div>
            <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Task Title</label>
            <input 
              type="text" 
              placeholder="Buy groceries..."
              value={title()}
              onInput={(e) => setTitle(e.target.value)}
              class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors"
              required
            />
          </div>

          <div>
            <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Due Date</label>
            <input 
              type="date"
              value={date()}
              onInput={(e) => setDate(e.target.value)}
              class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors [color-scheme:dark]"
            />
          </div>

          <div class="flex gap-4">
            <div class="flex-1">
              <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">List</label>
              <select 
                value={listId()} 
                onChange={(e) => setListId(e.target.value)}
                class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors [color-scheme:dark]"
              >
                <option value="" class="text-black">Select a list...</option>
                {taskState.lists.map(list => (
                  <option value={list.id} class="text-black">{list.name}</option>
                ))}
              </select>
            </div>
            
            <div class="flex-1">
              <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Priority</label>
              <select 
                value={priority()} 
                onChange={(e) => setPriority(e.target.value)}
                class="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors [color-scheme:dark]"
              >
                <option value="low" class="text-black">Low</option>
                <option value="normal" class="text-black">Normal</option>
                <option value="high" class="text-black">High</option>
              </select>
            </div>
          </div>

          <button 
            type="submit"
            class="mt-2 bg-accent text-white border-none p-3.5 rounded-xl text-[15px] font-bold cursor-pointer hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
          >
            Add Task
          </button>
        </form>
      </div>
    </Modal>
  );
}

export default AddTaskModal;
