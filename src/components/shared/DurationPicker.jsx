// DurationPicker — preset duration chooser rebuilt on kit primitives.
//
// Public contract unchanged: `value` is a number of minutes, `onChange(min)`
// fires on preset pick or custom submit. Values outside the preset set start
// (and render) in custom mode, exactly as before.
//
// Internals: the presets are a kit SegmentedControl (radiogroup semantics,
// arrow-key navigation); custom entry is a kit TextInput + Buttons.
import { createSignal, Show, For } from 'solid-js';
import { SegmentedControl, SegmentedControlItem, TextInput, Button } from '../kit';

const CUSTOM = 'custom';

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

  const isCustomValue = () => !presets.find((p) => p.value === props.value) && props.value !== undefined;

  // If initial value isn't in presets, start in custom mode
  if (isCustomValue()) {
    setIsCustom(true);
  }

  const selectedSegment = () => (isCustomValue() ? CUSTOM : String(props.value));

  const handleSegmentChange = (segment) => {
    if (segment === CUSTOM) {
      setIsCustom(true);
    } else {
      props.onChange(parseInt(segment, 10));
    }
  };

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
          <form onSubmit={handleCustomSubmit} class="flex items-end gap-2 w-full">
            <div class="flex-1 min-w-0">
              <TextInput
                label="Custom duration (minutes)"
                isLabelHidden
                type="number"
                min="1"
                value={String(customVal())}
                onChange={(v) => setCustomVal(v)}
                placeholder="Minutes..."
                hasAutoFocus
              />
            </div>
            <Button type="submit" variant="primary" label="Set" />
            <Button
              label="Cancel"
              onClick={() => setIsCustom(false)}
            />
          </form>
        }
      >
        <div class="w-full overflow-x-auto no-scrollbar pb-1 -mb-1">
          <SegmentedControl
            label="Duration"
            value={selectedSegment()}
            onChange={handleSegmentChange}
          >
            <For each={presets}>
              {(preset) => <SegmentedControlItem value={String(preset.value)} label={preset.label} />}
            </For>
            <SegmentedControlItem
              value={CUSTOM}
              label={isCustomValue() ? `${props.value}m` : 'Custom...'}
            />
          </SegmentedControl>
        </div>
      </Show>
    </div>
  );
}

export default DurationPicker;
