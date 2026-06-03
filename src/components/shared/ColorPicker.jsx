import { createSignal, onCleanup, onMount, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { uiStore } from '../../stores/uiStore';

function ColorPicker(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  let containerRef;
  let popoverRef;

  const themes = [
    { name: 'Amber', color: '#E8942A' },
    { name: 'Rose', color: '#C0185A' },
    { name: 'Teal', color: '#1FA7A7' },
    { name: 'Purple', color: '#6B5BDB' },
    { name: 'Blue', color: '#3B6ED6' },
    { name: 'Graphite', color: '#888888' },
    { name: 'Emerald', color: '#10B981' },
    { name: 'Cyan', color: '#06B6D4' }
  ];

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
    <div class="relative" ref={containerRef}>
      <button
        onClick={togglePicker}
        class="w-6 h-6 rounded-full border-[1.5px] border-border-theme cursor-pointer p-0 transition-transform hover:scale-110 flex-shrink-0"
        style={{ background: props.value }}
        title="Choose color"
      />

      <Show when={isOpen()}>
        <Portal>
          <div 
            ref={popoverRef}
            class="fixed z-[9999] p-3 bg-bg-theme/40 border border-border-theme rounded-xl shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200 w-[200px]"
            style={{ top: `${coords().top}px`, left: `${coords().left}px` }}
          >
          <div class="text-[11px] font-bold text-text-muted mb-2 uppercase tracking-wider">Presets</div>
          <div class="grid grid-cols-4 gap-2 mb-3">
            {themes.map(t => (
              <button
                onClick={() => {
                  props.onChange(t.color);
                  setIsOpen(false);
                }}
                class={`w-8 h-8 rounded-full transition-transform hover:scale-110 border-2 cursor-pointer ${props.value === t.color ? 'border-text-primary' : 'border-transparent'}`}
                style={{ background: t.color }}
                title={t.name}
              />
            ))}
          </div>
          <div class="text-[11px] font-bold text-text-muted mb-2 uppercase tracking-wider border-t border-border-theme pt-2 mt-1">Custom</div>
          <div class="flex gap-2">
            <input 
              type="color" 
              value={props.value} 
              onChange={(e) => {
                props.onChange(e.target.value);
              }}
              class="w-full h-8 rounded-md cursor-pointer border-none bg-transparent outline-none p-0"
            />
          </div>
        </div>
        </Portal>
      </Show>
    </div>
  );
}

export default ColorPicker;
