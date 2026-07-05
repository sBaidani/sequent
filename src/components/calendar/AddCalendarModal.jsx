import { createSignal, For } from 'solid-js';
import { Dialog, DialogHeader, DialogBody, DialogFooter, FormLayout, TextInput, Text, Button, cx } from '../kit';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';
import { snapUserColor } from '../../lib/colorTokens';

// Seed palette for user calendar colors. The hex values are DATA (persisted
// via eventStore.addCalendar); swatches display through
// snapUserColor's theme-adaptive hue tokens.
const COLORS = [
  { value: '#E8942A', name: 'Amber' },
  { value: '#C0185A', name: 'Rose' },
  { value: '#1FA7A7', name: 'Teal' },
  { value: '#6B5BDB', name: 'Purple' },
  { value: '#3B6ED6', name: 'Blue' },
  { value: '#34A853', name: 'Green' },
];

function AddCalendarModal() {
  const [name, setName] = createSignal('');
  const [color, setColor] = createSignal('#E8942A');

  const close = () => uiStore.setActiveModal(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name().trim()) return;

    eventStore.addCalendar(name(), color());
    setName('');
    close();
  };

  return (
    <Dialog open={uiStore.state.activeModal === 'addCalendar'} onClose={close} size="sm">
      <DialogHeader title="New Calendar" />
      <form class="contents" onSubmit={handleSubmit}>
        <DialogBody>
          <FormLayout>
            <TextInput
              label="Calendar Name"
              placeholder="Work, Personal..."
              value={name()}
              onChange={(v) => setName(v)}
              hasAutoFocus
            />
            <div class="flex flex-col gap-1">
              <Text as="span" type="label" color="secondary" id="add-calendar-color-label">
                Color
              </Text>
              <div role="group" aria-labelledby="add-calendar-color-label" class="flex gap-3">
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
                    style={{ background: snapUserColor(c.value).cssVar }}
                  />
                )}</For>
              </div>
            </div>
          </FormLayout>
        </DialogBody>
        <DialogFooter>
          <Button type="submit" variant="primary" label="Create Calendar" class="w-full" />
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export default AddCalendarModal;
