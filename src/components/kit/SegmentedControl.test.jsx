/**
 * Tests for the kit SegmentedControl (Astryx SegmentedControl re-implemented
 * for Solid). Queries by role/text/label only. Covers rendering (radiogroup
 * + radio structure, selected state, hidden labels, sizes/layouts), the
 * interaction contract (click, arrow-key roving focus with wrap-around and
 * selection-follows-focus, Home/End, disabled skipping, roving tabindex
 * repair) and a11y attributes (aria-label, aria-checked, aria-disabled,
 * aria-describedby, tabindex).
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { describe, test, expect, vi } from 'vitest';
import { SegmentedControl, SegmentedControlItem } from './SegmentedControl';

const renderBasic = (props = {}) =>
  render(() => (
    <SegmentedControl value="list" onChange={() => {}} label="View mode" {...props}>
      <SegmentedControlItem value="list" label="List" />
      <SegmentedControlItem value="grid" label="Grid" />
      <SegmentedControlItem value="table" label="Table" />
    </SegmentedControl>
  ));

/** Controlled harness: selection is wired through a signal like a real app. */
const renderControlled = (extra = {}) => {
  const [value, setValue] = createSignal('list');
  render(() => (
    <SegmentedControl value={value()} onChange={setValue} label="View mode" {...extra}>
      <SegmentedControlItem value="list" label="List" />
      <SegmentedControlItem value="grid" label="Grid" />
      <SegmentedControlItem value="table" label="Table" />
    </SegmentedControl>
  ));
  return { value, setValue };
};

describe('SegmentedControl', () => {
  describe('rendering', () => {
    test('renders a radiogroup named by the label prop', () => {
      renderBasic();
      expect(screen.getByRole('radiogroup', { name: 'View mode' })).toBeInTheDocument();
    });

    test('renders each item as a radio with its visible label', () => {
      renderBasic();
      expect(screen.getAllByRole('radio')).toHaveLength(3);
      expect(screen.getByRole('radio', { name: 'List' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Grid' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Table' })).toBeInTheDocument();
      expect(screen.getByText('Grid')).toBeVisible();
    });

    test('the group label is not rendered as visible text', () => {
      renderBasic();
      expect(screen.queryByText('View mode')).not.toBeInTheDocument();
    });

    test('exactly the selected item has aria-checked=true', () => {
      renderBasic({ value: 'grid' });
      expect(screen.getByRole('radio', { name: 'Grid' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'false');
      expect(screen.getByRole('radio', { name: 'Table' })).toHaveAttribute('aria-checked', 'false');
    });

    test('isLabelHidden keeps the accessible name without visible label text', () => {
      render(() => (
        <SegmentedControl value="list" onChange={() => {}} label="View mode">
          <SegmentedControlItem value="list" label="List view" isLabelHidden icon={<svg />} />
          <SegmentedControlItem value="grid" label="Grid view" isLabelHidden icon={<svg />} />
        </SegmentedControl>
      ));
      expect(screen.getByRole('radio', { name: 'List view' })).toBeInTheDocument();
      expect(screen.queryByText('List view')).not.toBeInTheDocument();
    });

    test('size and layout variants still render the full radio group', () => {
      renderBasic({ size: 'sm', layout: 'fill' });
      const group = screen.getByRole('radiogroup', { name: 'View mode' });
      expect(group).toHaveAttribute('data-size', 'sm');
      expect(screen.getAllByRole('radio')).toHaveLength(3);
    });
  });

  describe('pointer interaction', () => {
    test('clicking an unselected segment calls onChange once with its value', () => {
      const onChange = vi.fn();
      renderBasic({ onChange });
      fireEvent.click(screen.getByRole('radio', { name: 'Grid' }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('grid');
    });

    test('clicking the already-selected segment does not call onChange', () => {
      const onChange = vi.fn();
      renderBasic({ onChange });
      fireEvent.click(screen.getByRole('radio', { name: 'List' }));
      expect(onChange).not.toHaveBeenCalled();
    });

    test('is controlled: selection moves when the consumer updates value', () => {
      renderControlled();
      fireEvent.click(screen.getByRole('radio', { name: 'Table' }));
      expect(screen.getByRole('radio', { name: 'Table' })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'false');
    });

    test('clicking a disabled item does not call onChange', () => {
      const onChange = vi.fn();
      render(() => (
        <SegmentedControl value="list" onChange={onChange} label="View mode">
          <SegmentedControlItem value="list" label="List" />
          <SegmentedControlItem value="grid" label="Grid" isDisabled />
        </SegmentedControl>
      ));
      fireEvent.click(screen.getByRole('radio', { name: 'Grid' }));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('keyboard interaction', () => {
    test('ArrowRight moves focus to the next segment and selects it', () => {
      renderControlled();
      const list = screen.getByRole('radio', { name: 'List' });
      list.focus();
      fireEvent.keyDown(list, { key: 'ArrowRight' });
      const grid = screen.getByRole('radio', { name: 'Grid' });
      expect(grid).toHaveFocus();
      expect(grid).toHaveAttribute('aria-checked', 'true');
      expect(list).toHaveAttribute('aria-checked', 'false');
    });

    test('ArrowLeft moves focus to the previous segment and selects it', () => {
      const { setValue } = renderControlled();
      setValue('grid');
      const grid = screen.getByRole('radio', { name: 'Grid' });
      grid.focus();
      fireEvent.keyDown(grid, { key: 'ArrowLeft' });
      expect(screen.getByRole('radio', { name: 'List' })).toHaveFocus();
      expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'true');
    });

    test('ArrowDown/ArrowUp behave like ArrowRight/ArrowLeft', () => {
      renderControlled();
      const list = screen.getByRole('radio', { name: 'List' });
      list.focus();
      fireEvent.keyDown(list, { key: 'ArrowDown' });
      const grid = screen.getByRole('radio', { name: 'Grid' });
      expect(grid).toHaveAttribute('aria-checked', 'true');
      fireEvent.keyDown(grid, { key: 'ArrowUp' });
      expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'true');
    });

    test('arrow navigation wraps at both ends', () => {
      const { setValue } = renderControlled();
      setValue('table');
      const table = screen.getByRole('radio', { name: 'Table' });
      table.focus();
      fireEvent.keyDown(table, { key: 'ArrowRight' });
      const list = screen.getByRole('radio', { name: 'List' });
      expect(list).toHaveFocus();
      expect(list).toHaveAttribute('aria-checked', 'true');
      fireEvent.keyDown(list, { key: 'ArrowLeft' });
      expect(screen.getByRole('radio', { name: 'Table' })).toHaveFocus();
      expect(screen.getByRole('radio', { name: 'Table' })).toHaveAttribute('aria-checked', 'true');
    });

    test('Home selects the first segment, End the last', () => {
      const { setValue } = renderControlled();
      setValue('grid');
      const grid = screen.getByRole('radio', { name: 'Grid' });
      grid.focus();
      fireEvent.keyDown(grid, { key: 'End' });
      expect(screen.getByRole('radio', { name: 'Table' })).toHaveAttribute('aria-checked', 'true');
      fireEvent.keyDown(screen.getByRole('radio', { name: 'Table' }), { key: 'Home' });
      expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'true');
    });

    test('arrow navigation skips disabled segments', () => {
      const [value, setValue] = createSignal('list');
      render(() => (
        <SegmentedControl value={value()} onChange={setValue} label="View mode">
          <SegmentedControlItem value="list" label="List" />
          <SegmentedControlItem value="grid" label="Grid" isDisabled />
          <SegmentedControlItem value="table" label="Table" />
        </SegmentedControl>
      ));
      const list = screen.getByRole('radio', { name: 'List' });
      list.focus();
      fireEvent.keyDown(list, { key: 'ArrowRight' });
      const table = screen.getByRole('radio', { name: 'Table' });
      expect(table).toHaveFocus();
      expect(table).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('radio', { name: 'Grid' })).toHaveAttribute('aria-checked', 'false');
    });

    test('unrelated keys do not change the selection', () => {
      const onChange = vi.fn();
      renderBasic({ onChange });
      const list = screen.getByRole('radio', { name: 'List' });
      list.focus();
      fireEvent.keyDown(list, { key: 'a' });
      fireEvent.keyDown(list, { key: 'Tab' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('roving tabindex', () => {
    test('only the selected segment is a tab stop', () => {
      renderBasic({ value: 'grid' });
      expect(screen.getByRole('radio', { name: 'Grid' })).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('tabindex', '-1');
      expect(screen.getByRole('radio', { name: 'Table' })).toHaveAttribute('tabindex', '-1');
    });

    test('falls back to the first enabled segment when the selected one is disabled', () => {
      render(() => (
        <SegmentedControl value="grid" onChange={() => {}} label="View mode">
          <SegmentedControlItem value="list" label="List" isDisabled />
          <SegmentedControlItem value="grid" label="Grid" isDisabled />
          <SegmentedControlItem value="table" label="Table" />
        </SegmentedControl>
      ));
      expect(screen.getByRole('radio', { name: 'Table' })).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('radio', { name: 'Grid' })).toHaveAttribute('tabindex', '-1');
      expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('tabindex', '-1');
    });

    test('disabled items are marked aria-disabled and are never tab stops', () => {
      renderBasic();
      render(() => (
        <SegmentedControl value="a" onChange={() => {}} label="Second group">
          <SegmentedControlItem value="a" label="A" />
          <SegmentedControlItem value="b" label="B" isDisabled />
        </SegmentedControl>
      ));
      const b = screen.getByRole('radio', { name: 'B' });
      expect(b).toHaveAttribute('aria-disabled', 'true');
      expect(b).toHaveAttribute('tabindex', '-1');
    });
  });

  describe('disabled group', () => {
    test('isDisabled marks the group and every radio disabled and blocks selection', () => {
      const onChange = vi.fn();
      renderBasic({ isDisabled: true, onChange });
      expect(screen.getByRole('radiogroup', { name: 'View mode' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      for (const radio of screen.getAllByRole('radio')) {
        expect(radio).toHaveAttribute('aria-disabled', 'true');
        expect(radio).toHaveAttribute('tabindex', '-1');
      }
      fireEvent.click(screen.getByRole('radio', { name: 'Grid' }));
      expect(onChange).not.toHaveBeenCalled();
    });

    test('disabledMessage keeps the selected segment focusable and describes the group', () => {
      const onChange = vi.fn();
      renderBasic({
        isDisabled: true,
        disabledMessage: 'Timeline is loading',
        onChange,
      });
      const group = screen.getByRole('radiogroup', { name: 'View mode' });
      expect(group).toHaveAccessibleDescription('Timeline is loading');
      const selected = screen.getByRole('radio', { name: 'List' });
      expect(selected).toHaveAttribute('tabindex', '0');
      selected.focus();
      expect(selected).toHaveFocus();
      // Selection stays blocked: clicks and arrows are no-ops.
      fireEvent.click(screen.getByRole('radio', { name: 'Grid' }));
      fireEvent.keyDown(selected, { key: 'ArrowRight' });
      expect(onChange).not.toHaveBeenCalled();
      expect(selected).toHaveFocus();
    });
  });
});
