import { createSignal, For } from 'solid-js';
import { Dialog, DialogHeader, DialogBody, DialogFooter, FormLayout, TextInput, Text, Button, cx } from '../kit';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';

// Seed palette for user list colors. The hex values are DATA (persisted via
// taskStore.addList); rendering will route through src/lib/colorTokens.js
// snapUserColor once it lands.
const COLORS = [
  { value: '#E8942A', name: 'Amber' },
  { value: '#C0185A', name: 'Rose' },
  { value: '#1FA7A7', name: 'Teal' },
  { value: '#6B5BDB', name: 'Purple' },
  { value: '#3B6ED6', name: 'Blue' },
  { value: '#34A853', name: 'Green' },
];

function AddListModal() {
  const [name, setName] = createSignal('');
  const [color, setColor] = createSignal('#1FA7A7');

  const close = () => uiStore.setActiveModal(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name().trim()) return;

    taskStore.addList(name(), color());
    setName('');
    close();
  };

  return (
    <Dialog open={uiStore.state.activeModal === 'addList'} onClose={close} size="sm">
      <DialogHeader title="New List" />
      <form class="contents" onSubmit={handleSubmit}>
        <DialogBody>
          <FormLayout>
            <TextInput
              label="List Name"
              placeholder="Work, Groceries..."
              value={name()}
              onChange={(v) => setName(v)}
              hasAutoFocus
            />
            <div class="flex flex-col gap-1">
              <Text as="span" type="label" color="secondary" id="add-list-color-label">
                Color
              </Text>
              <div role="group" aria-labelledby="add-list-color-label" class="flex gap-3">
                <For each={COLORS}>{(c) => (
                  <button
                    type="button"
                    aria-label={c.name}
                    aria-pressed={color() === c.value}
                    onClick={() => setColor(c.value)}
                    class={cx(
                      'h-8 w-8 cursor-pointer rounded-full border-4 border-solid transition-transform hover:scale-110',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
                      color() === c.value ? 'border-primary' : 'border-transparent',
                    )}
                    style={{ background: c.value }}
                  />
                )}</For>
              </div>
            </div>
          </FormLayout>
        </DialogBody>
        <DialogFooter>
          <Button type="submit" variant="primary" label="Create List" class="w-full" />
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default AddListModal;
