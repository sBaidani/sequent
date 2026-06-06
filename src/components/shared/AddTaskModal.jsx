import { createSignal, createEffect, Show } from 'solid-js';
import Modal from '../ui/Modal';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import SelectPicker from './SelectPicker';
import DayTaskListPreview from '../tasks/DayTaskListPreview';

function AddTaskModal() {
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [date, setDate] = createSignal('');
  const [time, setTime] = createSignal('');
  const [allDay, setAllDay] = createSignal(true);
  const [listId, setListId] = createSignal('');
  const [priority, setPriority] = createSignal('normal');
  const [showRecurrence, setShowRecurrence] = createSignal(false);
  const [recurrence, setRecurrence] = createSignal('NONE');
  const [hasTaskDate, setHasTaskDate] = createSignal(false);

  const { state: taskState } = taskStore;

  createEffect(() => {
    if (uiStore.state.activeModal === 'addTask') {
      const dateObj = new Date(uiStore.state.activeDate);
      const localDateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
      setDate(localDateStr);
      setHasTaskDate(false);
      
      if (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0) {
        setAllDay(false);
        setTime(`${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`);
      } else {
        setAllDay(true);
        setTime('12:00');
      }

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
    
    let targetDateStr = null;
    if (hasTaskDate() && date()) {
      if (allDay()) {
        targetDateStr = new Date(`${date()}T00:00:00`).toISOString();
      } else {
        const timeStr = time() || '12:00';
        targetDateStr = new Date(`${date()}T${timeStr}`).toISOString();
      }
    }
    
    let rruleStr = null;
    if (recurrence() === 'DAILY') rruleStr = 'FREQ=DAILY';
    else if (recurrence() === 'WEEKLY') rruleStr = 'FREQ=WEEKLY';
    else if (recurrence() === 'MONTHLY') rruleStr = 'FREQ=MONTHLY';
    
    taskStore.addTask(
      title(), 
      listId() || null, 
      targetDateStr, 
      priority(),
      description(),
      rruleStr,
      hasTaskDate() ? allDay() : false
    );
    
    setTitle('');
    setDescription('');
    setRecurrence('NONE');
    setShowRecurrence(false);
    uiStore.setActiveModal(null);
  };

  return (
    <Modal id="addTask" wide={true} noPadding={true}>
      <div class="flex flex-col sm:flex-row w-full bg-modal-bg rounded-2xl overflow-hidden">
        
        {/* Left Pane - Form */}
        <div class="flex-1 p-6 flex flex-col gap-4">
          <form onSubmit={handleSubmit} class="flex flex-col gap-4">
            <h2 class="font-display lowercase text-xl font-extrabold text-text-primary mb-2">New Task</h2>
            
            <div>
              <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Title</label>
              <input 
                ref={el => el && setTimeout(() => el.focus(), 50)}
                type="text" 
                placeholder="Buy groceries..."
                value={title()}
                onInput={(e) => setTitle(e.target.value)}
                class="w-full bg-text-primary/5 border border-border-theme rounded-xl px-3.5 py-3 text-text-primary text-[15px] outline-none focus:border-accent transition-colors"
                required
              />
            </div>

            <div>
              <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Description</label>
              <textarea 
                placeholder="Add details..."
                value={description()}
                onInput={(e) => setDescription(e.target.value)}
                class="w-full bg-text-primary/5 border border-border-theme rounded-xl px-3.5 py-3 text-text-primary text-[15px] outline-none focus:border-accent transition-colors resize-none h-16"
              />
            </div>

            <div class="flex flex-col sm:flex-row gap-4">
              <div class="flex-1">
                <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Due Date</label>
                <DatePicker value={date()} onChange={(v) => setDate(v)} />
              </div>
              <div class="flex-1 sm:min-w-[140px]">
                <div class="flex items-center justify-between mb-1.5 h-[18px]">
                  <label class="font-display lowercase block text-xs text-text-muted font-semibold tracking-wider">Time</label>
                  <div class="flex items-center gap-2">
                    <span class="font-display lowercase text-text-secondary text-[11px] font-bold tracking-wide">All-day</span>
                    <button 
                      type="button"
                      onClick={() => setAllDay(!allDay())}
                      class={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${allDay() ? 'bg-accent' : 'bg-text-primary/20 hover:bg-text-primary/30'}`}
                    >
                      <span class={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-card shadow ring-0 transition duration-200 ease-in-out ${allDay() ? 'translate-x-3' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                {allDay() ? (
                  <div class="w-full bg-text-primary/5 border border-border-theme rounded-xl px-3.5 py-2.5 text-text-muted text-sm font-medium flex items-center h-[46px]">--:--</div>
                ) : (
                  <TimePicker value={time()} onChange={(v) => setTime(v)} />
                )}
              </div>
            </div>

            <div class="flex flex-col gap-4">
              <div>
                <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">List</label>
                <SelectPicker 
                  value={listId()} 
                  onChange={setListId}
                  options={taskState.lists.map(list => ({ value: list.id, label: list.name, color: list.color }))}
                  placeholder="Select..."
                />
              </div>
              
              <div>
                <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider">Priority</label>
                <div class="flex bg-text-primary/5 rounded-xl p-1 border border-border-theme w-full">
                  <button 
                    type="button"
                    onClick={() => setPriority('low')}
                    class={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${priority() === 'low' ? 'bg-[#1FA7A7] text-text-primary shadow-md scale-105 border border-border-theme' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/5'}`}
                  >Low</button>
                  <button 
                    type="button"
                    onClick={() => setPriority('normal')}
                    class={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${priority() === 'normal' ? 'bg-text-primary/20 text-text-primary shadow-md scale-105 border border-border-theme' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/5'}`}
                  >Normal</button>
                  <button 
                    type="button"
                    onClick={() => setPriority('high')}
                    class={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${priority() === 'high' ? 'bg-[#FF3B30] text-text-primary shadow-md scale-105 border border-border-theme' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/5'}`}
                  >High</button>
                </div>
              </div>
            </div>

            <div class="pt-2">
              {!showRecurrence() ? (
                <button 
                  type="button" 
                  onClick={() => setShowRecurrence(true)}
                  class="bg-transparent border-none text-accent text-[13px] font-semibold cursor-pointer hover:underline"
                >
                  + Add Repeat
                </button>
              ) : (
                <div>
                  <label class="font-display lowercase block text-xs text-text-muted font-semibold mb-1.5 tracking-wider flex justify-between">
                    <span>Repeat</span>
                    <span class="text-accent cursor-pointer hover:underline normal-case tracking-normal" onClick={() => { setShowRecurrence(false); setRecurrence('NONE'); }}>Remove</span>
                  </label>
                  <SelectPicker 
                    value={recurrence()} 
                    onChange={setRecurrence}
                    options={[
                      { value: 'NONE', label: 'Does not repeat' },
                      { value: 'DAILY', label: 'Daily' },
                      { value: 'WEEKLY', label: 'Weekly' },
                      { value: 'MONTHLY', label: 'Monthly' }
                    ]}
                  />
                </div>
              )}
            </div>

            <button 
              type="submit"
              class="mt-2 bg-accent text-text-primary border-none p-3.5 rounded-xl text-[15px] font-bold cursor-pointer hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
            >
              Add Task
            </button>
          </form>
        </div>

        {/* Right Pane - Task List Preview */}
        <div class="hidden sm:block">
          <DayTaskListPreview 
            date={date() || new Date().toISOString().split('T')[0]}
            ghostTask={{
              title: title() || 'New Task',
              color: taskState.lists.find(l => l.id === listId())?.color || '#6B5BDB'
            }}
          />
        </div>

      </div>
    </Modal>
  );
}

export default AddTaskModal;
