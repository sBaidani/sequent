// EditableItem — inline rename control used inside kit ListItem rows
// (SettingsView calendar/list rows pass it as the ListItem `label`).
//
// Public contract unchanged: `value`, `onChange(newValue)` on save,
// optional `placeholder`. Enter saves, Escape reverts; a save button
// appears while the draft differs from the stored value.
//
// Internals: kit TextInput (labelled, standard field chrome + focus ring)
// and kit IconButton for the save action.
import { createSignal, createEffect, Show } from 'solid-js';
import { Check } from 'lucide-solid';
import { TextInput, IconButton } from '../kit';

function EditableItem(props) {
  const [value, setValue] = createSignal(props.value);
  const [isEditing, setIsEditing] = createSignal(false);

  // Sync prop changes if external value updates
  createEffect(() => {
    if (!isEditing()) {
      setValue(props.value);
    }
  });

  const handleSave = () => {
    if (value() !== props.value) {
      props.onChange(value());
    }
    setIsEditing(false);
  };

  const handleRevert = () => {
    setValue(props.value);
    setIsEditing(false);
  };

  return (
    <div class="flex-1 flex items-center gap-1 min-w-0">
      <div class="flex-1 min-w-0">
        <TextInput
          label={props.placeholder || 'Name'}
          isLabelHidden
          size="sm"
          value={value()}
          onChange={(v) => {
            setValue(v);
            setIsEditing(v !== props.value);
          }}
          onEnter={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Escape') handleRevert();
          }}
          placeholder={props.placeholder || 'Name...'}
        />
      </div>
      <Show when={isEditing()}>
        <IconButton
          variant="primary"
          size="sm"
          label="Save changes"
          icon={<Check aria-hidden="true" />}
          onClick={handleSave}
        />
      </Show>
    </div>
  );
}

export default EditableItem;
