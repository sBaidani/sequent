import { createSignal, Show, For } from 'solid-js';

function DurationPicker(props) {
  const presets = [
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '45m', value: 45 },
    { label: '1h', value: 60 },
    { label: '1.5h', value: 90 },
    { label: '2h', value: 120 },
    { label: '3h', value: 180 },
    { label: '4h', value: 240 },
  ];

  const [isCustom, setIsCustom] = createSignal(false);
  const [customVal, setCustomVal] = createSignal(props.value || 60);

  // If initial value isn't in presets, start in custom mode
  if (!presets.find(p => p.value === props.value) && props.value !== undefined) {
    setIsCustom(true);
  }

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(customVal(), 10);
    if (!isNaN(val) && val > 0) {
      props.onChange(val);
    }
  };

  return (
    <div class="w-full">
      <Show
        when={!isCustom()}
        fallback={
          <form onSubmit={handleCustomSubmit} class="flex items-center gap-2 w-full">
            <input
              type="number"
              min="1"
              value={customVal()}
              onInput={(e) => setCustomVal(e.target.value)}
              class="flex-1 bg-text-primary/5 border border-border-theme text-text-primary rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors text-sm font-medium"
              placeholder="Minutes..."
              autoFocus
            />
            <span class="text-text-muted text-sm font-medium">min</span>
            <button
              type="submit"
              class="bg-accent text-text-primary px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-accent/80 transition-colors shrink-0"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCustom(false);
                // If the current actual prop value is custom, maybe we keep it selected?
                // Actually, just go back to presets.
              }}
              class="bg-text-primary/10 text-text-primary px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-text-primary/20 transition-colors shrink-0"
            >
              ×
            </button>
          </form>
        }
      >
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mb-1 w-full mask-edges">
          <For each={presets}>
            {preset => (
              <button
                type="button"
                onClick={() => props.onChange(preset.value)}
                class={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                  props.value === preset.value
                    ? 'bg-accent text-text-primary border-accent shadow-md scale-105'
                    : 'bg-text-primary/5 text-text-secondary border-border-theme hover:bg-text-primary/10 hover:text-text-primary'
                }`}
              >
                {preset.label}
              </button>
            )}
          </For>
          <button
            type="button"
            onClick={() => setIsCustom(true)}
            class={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
              !presets.find(p => p.value === props.value) && props.value !== undefined
                ? 'bg-accent text-text-primary border-accent shadow-md scale-105'
                : 'bg-text-primary/5 text-text-secondary border-border-theme hover:bg-text-primary/10 hover:text-text-primary'
            }`}
          >
            {!presets.find(p => p.value === props.value) && props.value !== undefined ? `${props.value}m` : 'Custom...'}
          </button>
        </div>
      </Show>
    </div>
  );
}

export default DurationPicker;
