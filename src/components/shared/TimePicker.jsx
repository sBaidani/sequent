import { createSignal, onCleanup, onMount, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Clock } from 'lucide-solid';

function TimePicker(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  let containerRef;
  let popoverRef;

  const handleClickOutside = (e) => {
    if (isOpen() && containerRef && !containerRef.contains(e.target) && popoverRef && !popoverRef.contains(e.target)) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });

  const hours = Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0'));
  // Let's provide 5 min increments for better granularity
  const minutes = Array.from({length: 12}, (_, i) => (i * 5).toString().padStart(2, '0'));

  const selectedHour = () => props.value ? props.value.split(':')[0] : '09';
  const selectedMinute = () => props.value ? props.value.split(':')[1] : '00';

  const updateTime = (h, m) => {
    props.onChange(`${h}:${m}`);
  };

  const togglePicker = (e) => {
    e.preventDefault();
    if (!isOpen()) {
      const rect = containerRef.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div class="relative w-full" ref={containerRef}>
      <button 
        type="button"
        onClick={togglePicker}
        class="w-full bg-text-primary/5 border border-border-theme text-text-primary rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors text-sm font-medium flex items-center justify-between"
      >
        <span>{props.value || 'Select time'}</span>
        <Clock class="w-4 h-4 text-text-muted" />
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div 
            ref={popoverRef}
            class="fixed z-[9999] p-2 bg-bg-theme/40 border border-border-theme rounded-xl shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200 flex gap-2 w-max"
            style={{ top: `${coords().top}px`, left: `${coords().left}px` }}
          >
            <div class="flex flex-col h-[200px] overflow-y-auto rounded-lg bg-text-primary/5 px-1 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <For each={hours}>
              {h => (
                <button
                  type="button"
                  onClick={() => { updateTime(h, selectedMinute()); }}
                  class={`w-12 py-2 text-center text-sm rounded-md transition-colors ${h === selectedHour() ? 'bg-accent text-text-primary font-bold shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}`}
                >
                  {h}
                </button>
              )}
            </For>
          </div>
          <div class="w-px bg-text-primary/10"></div>
          <div class="flex flex-col h-[200px] overflow-y-auto rounded-lg bg-text-primary/5 px-1 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <For each={minutes}>
              {m => (
                <button
                  type="button"
                  onClick={() => { updateTime(selectedHour(), m); setIsOpen(false); }}
                  class={`w-12 py-2 text-center text-sm rounded-md transition-colors ${m === selectedMinute() ? 'bg-accent text-text-primary font-bold shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}`}
                >
                  {m}
                </button>
              )}
            </For>
          </div>
        </div>
        </Portal>
      </Show>
    </div>
  );
}

export default TimePicker;
