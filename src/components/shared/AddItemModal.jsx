import { createSignal } from 'solid-js';
import Modal from '../ui/Modal';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';

function AddItemModal() {
  const [mode, setMode] = createSignal('event'); // 'event' or 'task'
  const [title, setTitle] = createSignal('');
  const [date, setDate] = createSignal(new Date().toISOString().split('T')[0]);
  const [time, setTime] = createSignal('12:00');

  let touchStartX = 0;
  let touchEndX = 0;

  const handleTouchStart = (e) => {
    touchStartX = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) setMode('task');
    if (touchEndX > touchStartX + 50) setMode('event');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title().trim()) return;
    
    if (mode() === 'event') {
      const dateStr = date() || new Date().toISOString().split('T')[0];
      const timeStr = time() || '12:00';
      const startObj = new Date(`${dateStr}T${timeStr}`);
      const validStart = isNaN(startObj.getTime()) ? new Date() : startObj;
      const endObj = new Date(validStart.getTime() + 60 * 60 * 1000);
      eventStore.addEvent(title(), validStart.toISOString(), endObj.toISOString());
    } else {
      const dateStr = date() ? new Date(date()) : null;
      const isoDate = dateStr && !isNaN(dateStr.getTime()) ? dateStr.toISOString() : null;
      taskStore.addTask(title(), null, isoDate);
    }
    
    setTitle('');
    uiStore.setActiveModal(null);
  };

  return (
    <Modal id="addItem" compact>
      <div 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
        class="w-full flex flex-col gap-4 overflow-hidden"
      >
        <div class="flex bg-white/5 rounded-lg p-1 w-full relative mb-4">
          <div class={`absolute h-[calc(100%-8px)] w-[calc(50%-4px)] top-1 rounded-md bg-accent transition-transform duration-300 ease-out ${mode() === 'event' ? 'translate-x-0' : 'translate-x-[calc(100%+4px)]'}`}></div>
          <button 
            type="button"
            onClick={() => setMode('event')} 
            class={`flex-1 relative z-10 border-none py-2 text-[13px] font-bold cursor-pointer rounded-md transition-colors ${mode() === 'event' ? 'text-white' : 'bg-transparent text-text-secondary hover:text-white'}`}
          >Event</button>
          <button 
            type="button"
            onClick={() => setMode('task')} 
            class={`flex-1 relative z-10 border-none py-2 text-[13px] font-bold cursor-pointer rounded-md transition-colors ${mode() === 'task' ? 'text-white' : 'bg-transparent text-text-secondary hover:text-white'}`}
          >Task</button>
        </div>

        <form onSubmit={handleSubmit} class="flex flex-col gap-4 relative">
          <div class="flex flex-col gap-4 transition-transform duration-300 ease-out w-[200%] flex-row" style={{ transform: mode() === 'event' ? 'translateX(0)' : 'translateX(-50%)' }}>
            {/* Event Form Area */}
            <div class="w-1/2 shrink-0 flex flex-col gap-4 pr-2">
              <div>
                <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Title</label>
                <input 
                  type="text" 
                  placeholder="Coffee with Sarah..."
                  value={title()}
                  onInput={(e) => setTitle(e.target.value)}
                  class="w-full bg-white/5 border border-border rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors"
                />
              </div>

              <div class="flex gap-4">
                <div class="flex-1">
                  <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Date</label>
                  <input 
                    type="date"
                    value={date()}
                    onInput={(e) => setDate(e.target.value)}
                    class="w-full bg-white/5 border border-border rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors [color-scheme:dark]"
                  />
                </div>
                <div class="flex-1">
                  <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Time</label>
                  <input 
                    type="time"
                    value={time()}
                    onInput={(e) => setTime(e.target.value)}
                    class="w-full bg-white/5 border border-border rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>

            {/* Task Form Area */}
            <div class="w-1/2 shrink-0 flex flex-col gap-4 pl-2">
              <div>
                <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Task Title</label>
                <input 
                  type="text" 
                  placeholder="Buy groceries..."
                  value={title()}
                  onInput={(e) => setTitle(e.target.value)}
                  class="w-full bg-white/5 border border-border rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors"
                />
              </div>

              <div>
                <label class="block text-xs text-text-muted font-semibold mb-1.5 uppercase tracking-wider">Due Date</label>
                <input 
                  type="date"
                  value={date()}
                  onInput={(e) => setDate(e.target.value)}
                  class="w-full bg-white/5 border border-border rounded-xl px-3.5 py-3 text-white text-[15px] outline-none focus:border-accent transition-colors [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            class="mt-2 bg-accent text-white border-none p-3.5 rounded-xl text-[15px] font-bold cursor-pointer hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
          >
            {mode() === 'event' ? 'Add Event' : 'Add Task'}
          </button>
        </form>
      </div>
    </Modal>
  );
}

export default AddItemModal;
