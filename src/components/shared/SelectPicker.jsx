import { createSignal, onCleanup, onMount, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { ChevronDown, Check } from 'lucide-solid';

function SelectPicker(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0, width: 0 });
  
  let containerRef;
  let popoverRef;

  const handleClickOutside = (e) => {
    if (isOpen() && containerRef && !containerRef.contains(e.target) && popoverRef && !popoverRef.contains(e.target)) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
    document.removeEventListener('touchstart', handleClickOutside);
  });

  const togglePicker = (e) => {
    e.preventDefault();
    if (!isOpen()) {
      const rect = containerRef.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left, width: rect.width });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (val) => {
    props.onChange(val);
    setIsOpen(false);
  };

  const selectedOption = () => props.options.find(o => o.value === props.value);

  return (
    <div class="relative w-full" ref={containerRef}>
      <button 
        type="button"
        onClick={togglePicker}
        class={props.class || "w-full bg-text-primary/5 border border-border-theme text-text-primary rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors text-sm font-medium flex items-center justify-between"}
      >
        <div class="flex items-center gap-2">
          <Show when={selectedOption()?.color}>
            <div class="w-2.5 h-2.5 rounded-full" style={{ "background-color": selectedOption().color }}></div>
          </Show>
          <span class={selectedOption() ? "" : "text-text-muted"}>
            {selectedOption() ? selectedOption().label : (props.placeholder || 'Select...')}
          </span>
        </div>
        <ChevronDown class={`w-4 h-4 text-text-muted transition-transform duration-200 ${isOpen() ? 'rotate-180' : ''}`} />
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div 
            ref={popoverRef}
            class="fixed z-[9999] py-1.5 bg-bg-theme/40 border border-border-theme rounded-xl shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200 max-h-[300px] overflow-y-auto"
            style={{ top: `${coords().top}px`, left: `${coords().left}px`, width: `${Math.max(coords().width, 200)}px` }}
          >
            <For each={props.options}>
              {option => (
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  class="w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between hover:bg-text-primary/10 transition-colors"
                >
                  <div class="flex items-center gap-2">
                    <Show when={option.color}>
                      <div class="w-2.5 h-2.5 rounded-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.2)]" style={{ "background-color": option.color }}></div>
                    </Show>
                    <span class={props.value === option.value ? 'text-text-primary' : 'text-text-secondary'}>
                      {option.label}
                    </span>
                  </div>
                  <Show when={props.value === option.value}>
                    <Check class="w-4 h-4 text-accent" />
                  </Show>
                </button>
              )}
            </For>
            <Show when={props.options.length === 0}>
              <div class="px-4 py-3 text-sm text-text-muted text-center">No options available</div>
            </Show>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

export default SelectPicker;
