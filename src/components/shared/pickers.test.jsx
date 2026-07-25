/**
 * Characterization tests for the shared pickers (kit-based ColorPicker,
 * DatePicker, TimePicker, DurationPicker, LocationPicker, EditableItem).
 *
 * Pins the intended behavior: bounded hue-token color palette,
 * radiogroup/dialog semantics, kit field chrome, and the unchanged
 * public onChange contracts. Queries by role/label/text only.
 */
import { render, screen, fireEvent, within } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import ColorPicker from './ColorPicker';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import DurationPicker from './DurationPicker';
import LocationPicker from './LocationPicker';
import EditableItem from './EditableItem';
import { HUE_TOKENS } from '../../lib/colorTokens';

describe('ColorPicker', () => {
  test('trigger is an accessible button that opens a 10-swatch radiogroup', () => {
    render(() => <ColorPicker value="#3B6ED6" onChange={() => {}} />);
    const trigger = screen.getByRole('button', { name: 'Choose color' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    const group = screen.getByRole('radiogroup', { name: 'Color' });
    expect(within(group).getAllByRole('radio')).toHaveLength(HUE_TOKENS.length);
  });

  test('the stored color is snapped to its hue token for the checked state', () => {
    render(() => <ColorPicker value="#3B6ED6" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }));
    expect(screen.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Red' })).toHaveAttribute('aria-checked', 'false');
  });

  test('selecting a swatch returns the token hex and closes the picker', () => {
    const onChange = vi.fn();
    render(() => <ColorPicker value="#3B6ED6" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Teal' }));
    expect(onChange).toHaveBeenCalledWith(HUE_TOKENS.find((t) => t.name === 'teal').hex);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  test('arrow keys move focus between swatches and Escape closes', () => {
    render(() => <ColorPicker value={HUE_TOKENS[0].hex} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Choose color' }));
    const group = screen.getByRole('radiogroup', { name: 'Color' });
    const red = screen.getByRole('radio', { name: 'Red' });
    red.focus();
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(screen.getByRole('radio', { name: 'Orange' })).toHaveFocus();
    fireEvent.keyDown(group, { key: 'Escape' });
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });
});

describe('DatePicker', () => {
  test('opens a dialog with month navigation and fires onChange with yyyy-MM-dd', () => {
    const onChange = vi.fn();
    render(() => <DatePicker value="2026-07-05" onChange={onChange} />);
    const trigger = screen.getByRole('button', { name: /Jul 5, 2026/ });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Choose date' });
    expect(within(dialog).getByRole('button', { name: 'Previous month' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Next month' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'July 10, 2026' }));
    expect(onChange).toHaveBeenCalledWith('2026-07-10');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('month navigation moves the visible month', () => {
    render(() => <DatePicker value="2026-07-05" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Jul 5, 2026/ }));
    expect(screen.getByText('July 2026')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByText('August 2026')).toBeInTheDocument();
  });
});

describe('TimePicker', () => {
  test('opens a dialog with Hour and Minute lists and fires onChange on pick', () => {
    const onChange = vi.fn();
    render(() => <TimePicker value="09:30" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /9:30/ }));
    const dialog = screen.getByRole('dialog', { name: 'Choose time' });
    const hours = within(dialog).getByRole('list', { name: 'Hour' });
    fireEvent.click(within(hours).getByRole('button', { name: '10' }));
    expect(onChange).toHaveBeenCalledWith('10:30');

    const minutes = within(dialog).getByRole('list', { name: 'Minute' });
    fireEvent.click(within(minutes).getByRole('button', { name: '45' }));
    expect(onChange).toHaveBeenCalledWith('09:45');
  });

  test('Done closes the panel', () => {
    render(() => <TimePicker value="09:30" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /9:30/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('DurationPicker', () => {
  test('renders presets as a radiogroup and fires onChange with minutes', () => {
    const onChange = vi.fn();
    render(() => <DurationPicker value={60} onChange={onChange} />);
    const group = screen.getByRole('radiogroup', { name: 'Duration' });
    expect(within(group).getByRole('radio', { name: '1h' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(group).getByRole('radio', { name: '30m' }));
    expect(onChange).toHaveBeenCalledWith(30);
  });

  test('custom flow: enter a value and submit', () => {
    const onChange = vi.fn();
    render(() => <DurationPicker value={60} onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Custom...' }));
    const input = screen.getByLabelText('Custom duration (minutes)');
    fireEvent.input(input, { target: { value: '75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(onChange).toHaveBeenCalledWith(75);
  });

  test('a non-preset value starts in custom mode and Cancel returns to presets', () => {
    render(() => <DurationPicker value={75} onChange={() => {}} />);
    expect(screen.getByLabelText('Custom duration (minutes)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    // The custom segment reflects the off-preset value.
    expect(screen.getByRole('radio', { name: '75m' })).toHaveAttribute('aria-checked', 'true');
  });
});

describe('LocationPicker', () => {
  test('renders a labelled search field and a geolocate icon button', () => {
    render(() => <LocationPicker value={{ name: 'Berlin, Germany' }} onChange={() => {}} />);
    expect(screen.getByLabelText('Search city')).toHaveValue('Berlin, Germany');
    expect(screen.getByRole('button', { name: 'Use my location' })).toBeInTheDocument();
  });
});

describe('EditableItem', () => {
  test('renders the value in a labelled input; save appears only while editing', () => {
    const onChange = vi.fn();
    render(() => <EditableItem value="Personal" onChange={onChange} />);
    const input = screen.getByLabelText('Name');
    expect(input).toHaveValue('Personal');
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();

    fireEvent.input(input, { target: { value: 'Personal 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onChange).toHaveBeenCalledWith('Personal 2');
  });

  test('Enter saves, Escape reverts', () => {
    const onChange = vi.fn();
    render(() => <EditableItem value="Work" onChange={onChange} />);
    const input = screen.getByLabelText('Name');

    fireEvent.input(input, { target: { value: 'Work renamed' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('Work');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.input(input, { target: { value: 'Work 2' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith('Work 2');
  });
});
