import { createSignal, createEffect } from 'solid-js';
import { Check } from 'lucide-solid';

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

  return (
    <div class="relative flex-1 flex items-center group">
      <input 
        type="text" 
        value={value()}
        onInput={(e) => {
          setValue(e.target.value);
          setIsEditing(e.target.value !== props.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave();
          if (e.key === 'Escape') {
            setValue(props.value);
            setIsEditing(false);
          }
        }}
        class="bg-transparent border-none text-text-primary text-sm font-semibold outline-none w-full pr-8"
        placeholder={props.placeholder || "Name..."}
      />
      {isEditing() && (
        <button 
          onClick={handleSave}
          class="absolute right-1 text-text-primary bg-accent hover:bg-accent/80 rounded-md p-1 cursor-pointer transition-colors border-none flex items-center justify-center animate-in fade-in shadow-md"
          title="Save changes"
        >
          <Check class="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default EditableItem;
