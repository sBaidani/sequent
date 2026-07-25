/**
 * Cross-component kit smoke test: a composed settings form — Dialog
 * containing FormLayout + TextInput + Selector + Switch + Button — rendered
 * through the public barrel (index.js). Asserts the composition mounts with
 * correct roles/names, that the Dialog's focus trap cycles across the kit
 * controls inside it, that the controls interoperate (typing, selecting,
 * toggling, submitting), and that Escape closes the dialog.
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, beforeAll, vi } from 'vitest';
import { createSignal } from 'solid-js';
import {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  FormLayout,
  TextInput,
  Selector,
  Switch,
  Button,
} from './index';

beforeAll(() => {
  // jsdom has no Web Animations API; solid-transition-group's enter/exit
  // hooks call el.animate(). Stub it so open/close transitions don't throw
  // (same approach as Dialog.test.jsx).
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(() => ({
      onfinish: null,
      cancel: vi.fn(),
      finished: Promise.resolve(),
    }));
  }
});

const PROJECTS = [
  { value: 'sequent', label: 'Sequent' },
  { value: 'atlas', label: 'Atlas' },
];

const renderComposedForm = (extra = {}) => {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  const [name, setName] = createSignal('');
  const [project, setProject] = createSignal(null);
  const [notify, setNotify] = createSignal(false);

  const utils = render(() => (
    <Dialog open={true} onClose={onClose} {...extra}>
      <DialogHeader title="New task" subtitle="Create a task in a project." />
      <DialogBody>
        <FormLayout>
          <TextInput
            label="Task name"
            value={name()}
            onChange={setName}
            isRequired
          />
          <Selector
            label="Project"
            options={PROJECTS}
            value={project()}
            onChange={setProject}
          />
          <Switch label="Notify assignees" value={notify()} onChange={setNotify} />
        </FormLayout>
      </DialogBody>
      <DialogFooter>
        <Button label="Create task" variant="primary" onClick={onSubmit} />
      </DialogFooter>
    </Dialog>
  ));
  return { onClose, onSubmit, name, project, notify, ...utils };
};

describe('kit integration (Dialog + FormLayout + TextInput + Selector + Switch + Button)', () => {
  test('the composed form mounts with every control exposed by role and name', () => {
    renderComposedForm();

    const dialog = screen.getByRole('dialog', { name: 'New task' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Create a task in a project.')).toBeInTheDocument();

    // FormLayout wraps the fields in its vertical layout inside the body.
    expect(dialog.querySelector('[data-direction="vertical"]')).toBeTruthy();

    expect(screen.getByRole('textbox', { name: /Task name/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Project' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Notify assignees' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  test('focus lands on the dialog and Tab is trapped across the kit controls', () => {
    renderComposedForm();
    const dialog = screen.getByRole('dialog', { name: 'New task' });
    expect(dialog).toHaveFocus();

    // Tab from the last focusable (the footer Button) wraps to the first
    // (the header close button) — focus never escapes the dialog.
    const submit = screen.getByRole('button', { name: 'Create task' });
    submit.focus();
    fireEvent.keyDown(submit, { key: 'Tab' });
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    // Shift+Tab from the first focusable wraps back to the last.
    const close = screen.getByRole('button', { name: 'Close' });
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(submit).toHaveFocus();
  });

  test('the kit controls interoperate inside the dialog', () => {
    const { name, project, notify, onSubmit } = renderComposedForm();

    // TextInput: typing drives the controlled signal.
    const input = screen.getByRole('textbox', { name: /Task name/ });
    fireEvent.input(input, { target: { value: 'Ship the kit' } });
    expect(name()).toBe('Ship the kit');

    // Selector: open the listbox and pick an option.
    const trigger = screen.getByRole('combobox', { name: 'Project' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('option', { name: 'Atlas' }));
    expect(project()).toBe('atlas');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    // Switch: clicking toggles the controlled signal.
    const toggle = screen.getByRole('switch', { name: 'Notify assignees' });
    fireEvent.click(toggle);
    expect(notify()).toBe(true);

    // Button: submits.
    fireEvent.click(screen.getByRole('button', { name: 'Create task' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  test('Escape closes the dialog (onClose fires once)', () => {
    const { onClose } = renderComposedForm();
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'New task' }), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('Escape inside the open Selector closes the Selector, not the Dialog', () => {
    const { onClose } = renderComposedForm();
    const trigger = screen.getByRole('combobox', { name: 'Project' });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // The Selector handles Escape first (preventDefault); a second Escape,
    // with the popup closed, reaches the Dialog.
    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
