// SelectPicker — thin wrapper over the kit Selector.
//
// Keeps the pre-kit public contract (options: [{value, label, color?}],
// value, onChange, placeholder, class) so existing consumers don't change.
// Per-option USER colors (calendar/list colors) are rendered through
// snapUserColor() so stored hex values display as theme-adaptive Astryx
// hue token references.
import { Selector, SelectorOption } from '../kit';
import { snapUserColor } from '../../lib/colorTokens';

const ColorDot = (props) => (
  <span
    aria-hidden="true"
    class="size-2.5 shrink-0 rounded-full"
    style={{ 'background-color': snapUserColor(props.color).cssVar }}
  />
);

function SelectPicker(props) {
  const selectedOption = () => props.options.find((o) => o.value === props.value);

  return (
    <Selector
      // Consumers of this wrapper render their own visible captions; the
      // Selector still needs an accessible name, so derive one and hide it
      // unless a real label is passed.
      label={props.label ?? props.placeholder ?? 'Select...'}
      isLabelHidden={props.label == null}
      options={props.options}
      value={props.value}
      onChange={(v) => props.onChange?.(v)}
      placeholder={props.placeholder}
      class={props.class}
      startIcon={selectedOption()?.color ? <ColorDot color={selectedOption().color} /> : undefined}
      renderOption={(option) => (
        <SelectorOption
          icon={option.color ? <ColorDot color={option.color} /> : undefined}
          label={option.label ?? option.value}
        />
      )}
    />
  );
}

export default SelectPicker;
