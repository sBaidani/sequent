import { createSignal, onCleanup, onMount, For, Show, createMemo, createEffect } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Clock } from 'lucide-solid';
import { format } from 'date-fns';
import { settingsStore } from '../../stores/settingsStore';

function TimePicker(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  let containerRef;
  let popoverRef;
  let hoursContainerRef;
  let minutesContainerRef;

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
  // Provide 5 min increments
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

  createEffect(() => {
    if (isOpen()) {
      // Use requestAnimationFrame to ensure the portal is fully rendered before scrolling
      requestAnimationFrame(() => {
        if (hoursContainerRef) {
          const activeHour = hoursContainerRef.querySelector('.bg-accent');
          if (activeHour) {
            activeHour.scrollIntoView({ block: 'center' });
          }
        }
        if (minutesContainerRef) {
          const activeMin = minutesContainerRef.querySelector('.bg-accent');
          if (activeMin) {
            activeMin.scrollIntoView({ block: 'center' });
          }
        }
      });
    }
  });

  const displayValue = createMemo(() => {
    if (!props.value) return 'Select time';
    if (settingsStore.state.use24HourClock) return props.value;
    
    const [h, m] = props.value.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0);
    return format(d, 'h:mm a');
  });

  return (
    <div class="relative w-full" ref={containerRef}>
      <button 
        type="button"
        onClick={togglePicker}
        class="w-full bg-text-primary/5 border border-border-theme text-text-primary rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors text-sm font-medium flex items-center justify-between"
      >
        <span>{displayValue()}</span>
        <Clock class="w-4 h-4 text-text-muted" />
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div 
            ref={popoverRef}
            class="fixed z-[9999] p-3 bg-bg-theme border border-border-theme rounded-xl shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-3 w-max"
            style={{ top: `${coords().top}px`, left: `${coords().left}px` }}
          >
            <div class="flex gap-2">
              <div ref={hoursContainerRef} class="flex flex-col h-[200px] overflow-y-auto rounded-lg bg-text-primary/5 px-1 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <For each={hours}>
                  {h => (
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation();
                        updateTime(h, selectedMinute()); 
                      }}
                      class={`w-12 py-2 shrink-0 text-center text-sm rounded-md transition-colors ${h === selectedHour() ? 'bg-accent text-text-primary font-bold shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}`}
                    >
                      {h}
                    </button>
                  )}
                </For>
              </div>
              <div class="w-px bg-text-primary/10"></div>
              <div ref={minutesContainerRef} class="flex flex-col h-[200px] overflow-y-auto rounded-lg bg-text-primary/5 px-1 py-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <For each={minutes}>
                  {m => (
                    <button
                      type="button"
                      onClick={(e) => { 
                        e.preventDefault();
                        e.stopPropagation();
                        updateTime(selectedHour(), m); 
                      }}
                      class={`w-12 py-2 shrink-0 text-center text-sm rounded-md transition-colors ${m === selectedMinute() ? 'bg-accent text-text-primary font-bold shadow-md' : 'text-text-secondary hover:text-text-primary hover:bg-text-primary/10'}`}
                    >
                      {m}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(false); }}
              class="w-full bg-accent text-text-primary font-bold py-2 rounded-lg text-sm hover:bg-accent/80 transition-colors flex items-center justify-center gap-1 shadow-sm"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              Done
            </button>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

export default TimePicker;
