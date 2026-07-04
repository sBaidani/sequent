/**
 * Tests for the kit Selector + SelectorOption (SolidJS re-implementation of
 * Astryx Selector). Queries by role/text/label only.
 *
 * Combobox contract covered: trigger role/aria wiring, open/close (click,
 * Escape, outside pointer-down), option selection (mouse + keyboard),
 * arrow/Home/End navigation with disabled-option skipping, typeahead,
 * clear button + Delete-to-clear, search filtering, sections/dividers,
 * validation status, and the disabledMessage focusable-disabled pattern.
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { Selector, SelectorOption } from './Selector';

const FRUITS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry', disabled: true },
  { value: 'date', label: 'Date' },
];

const getTrigger = () => screen.getByRole('combobox', { name: 'Fruit' });
const getOption = (name) => screen.getByRole('option', { name });

describe('Selector', () => {
  describe('rendering', () => {
    test('renders a combobox trigger named by the label, showing the placeholder', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      const trigger = getTrigger();
      expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveTextContent('Select...');
    });

    test('shows the selected option label instead of the placeholder', () => {
      render(() => <Selector label="Fruit" options={FRUITS} value="banana" />);
      expect(getTrigger()).toHaveTextContent('Banana');
    });

    test('honors a custom placeholder', () => {
      render(() => <Selector label="Fruit" options={FRUITS} placeholder="Choose a fruit" />);
      expect(getTrigger()).toHaveTextContent('Choose a fruit');
    });

    test('isLabelHidden keeps the accessible name', () => {
      render(() => <Selector label="Fruit" options={FRUITS} isLabelHidden />);
      expect(getTrigger()).toBeInTheDocument();
    });

    test('links the description via aria-describedby', () => {
      render(() => (
        <Selector label="Fruit" options={FRUITS} description="Pick your favorite" />
      ));
      const trigger = getTrigger();
      const description = screen.getByText('Pick your favorite');
      expect(trigger.getAttribute('aria-describedby')).toContain(description.id);
      expect(trigger).toHaveAccessibleDescription('Pick your favorite');
    });

    test('isRequired renders the indicator and sets aria-required', () => {
      render(() => <Selector label="Fruit" options={FRUITS} isRequired />);
      const trigger = screen.getByRole('combobox', { name: /Fruit/ });
      expect(trigger).toHaveAttribute('aria-required', 'true');
      expect(screen.getByText('Required')).toBeInTheDocument();
    });

    test('isOptional renders the indicator without aria-required', () => {
      render(() => <Selector label="Fruit" options={FRUITS} isOptional />);
      expect(screen.getByText('Optional')).toBeInTheDocument();
      expect(screen.getByRole('combobox', { name: /Fruit/ })).not.toHaveAttribute(
        'aria-required',
      );
    });

    test('isLoading sets aria-busy on the trigger', () => {
      render(() => <Selector label="Fruit" options={FRUITS} isLoading />);
      expect(getTrigger()).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('open / close', () => {
    test('no listbox is rendered while closed', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('clicking the trigger opens the listbox with all options', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      fireEvent.click(getTrigger());
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('listbox', { name: 'Fruit' })).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(4);
    });

    test('string options are normalized to value/label', () => {
      const onChange = vi.fn();
      render(() => <Selector label="Fruit" options={['Kiwi', 'Mango']} onChange={onChange} />);
      fireEvent.click(getTrigger());
      fireEvent.click(getOption('Mango'));
      expect(onChange).toHaveBeenCalledWith('Mango');
    });

    test('the selected option has aria-selected=true, others false', () => {
      render(() => <Selector label="Fruit" options={FRUITS} value="banana" />);
      fireEvent.click(getTrigger());
      expect(getOption('Banana')).toHaveAttribute('aria-selected', 'true');
      expect(getOption('Apple')).toHaveAttribute('aria-selected', 'false');
    });

    test('clicking an option fires onChange and closes the listbox', () => {
      const onChange = vi.fn();
      render(() => <Selector label="Fruit" options={FRUITS} onChange={onChange} />);
      fireEvent.click(getTrigger());
      fireEvent.click(getOption('Banana'));
      expect(onChange).toHaveBeenCalledWith('banana');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    test('clicking a disabled option does nothing', () => {
      const onChange = vi.fn();
      render(() => <Selector label="Fruit" options={FRUITS} onChange={onChange} />);
      fireEvent.click(getTrigger());
      const disabledOption = getOption('Cherry');
      expect(disabledOption).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(disabledOption);
      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('Escape closes the listbox and refocuses the trigger', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      const trigger = getTrigger();
      fireEvent.click(trigger);
      fireEvent.keyDown(trigger, { key: 'Escape' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    test('pointer-down outside closes the listbox', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      fireEvent.click(getTrigger());
      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('isDefaultOpen renders the listbox on mount', () => {
      render(() => <Selector label="Fruit" options={FRUITS} isDefaultOpen />);
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('keyboard navigation', () => {
    test('ArrowDown on the closed trigger opens and highlights the first option', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      const trigger = getTrigger();
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-activedescendant', getOption('Apple').id);
    });

    test('ArrowDown skips disabled options', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      const trigger = getTrigger();
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // open, highlight Apple
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // Banana
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // skips Cherry -> Date
      expect(trigger).toHaveAttribute('aria-activedescendant', getOption('Date').id);
    });

    test('ArrowUp on the closed trigger opens and highlights the last option', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      const trigger = getTrigger();
      fireEvent.keyDown(trigger, { key: 'ArrowUp' });
      expect(trigger).toHaveAttribute('aria-activedescendant', getOption('Date').id);
    });

    test('Home and End jump to the first/last enabled option', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      const trigger = getTrigger();
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      fireEvent.keyDown(trigger, { key: 'End' });
      expect(trigger).toHaveAttribute('aria-activedescendant', getOption('Date').id);
      fireEvent.keyDown(trigger, { key: 'Home' });
      expect(trigger).toHaveAttribute('aria-activedescendant', getOption('Apple').id);
    });

    test('Enter selects the highlighted option and closes', () => {
      const onChange = vi.fn();
      render(() => <Selector label="Fruit" options={FRUITS} onChange={onChange} />);
      const trigger = getTrigger();
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // open, Apple
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // Banana
      fireEvent.keyDown(trigger, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith('banana');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('Enter on the closed trigger opens with the selected option highlighted', () => {
      render(() => <Selector label="Fruit" options={FRUITS} value="banana" />);
      const trigger = getTrigger();
      fireEvent.keyDown(trigger, { key: 'Enter' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-activedescendant', getOption('Banana').id);
    });

    test('Space opens the closed trigger', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      const trigger = getTrigger();
      fireEvent.keyDown(trigger, { key: ' ' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('typeahead opens and highlights the first matching option', () => {
      render(() => <Selector label="Fruit" options={FRUITS} />);
      const trigger = getTrigger();
      fireEvent.keyDown(trigger, { key: 'd' });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(trigger).toHaveAttribute('aria-activedescendant', getOption('Date').id);
    });
  });

  describe('clear', () => {
    test('hasClear shows a labelled clear button that fires onChange(null)', () => {
      const onChange = vi.fn();
      render(() => (
        <Selector label="Fruit" options={FRUITS} value="banana" hasClear onChange={onChange} />
      ));
      const clearButton = screen.getByRole('button', { name: 'Clear Fruit' });
      fireEvent.click(clearButton);
      expect(onChange).toHaveBeenCalledWith(null);
      // Clearing must not toggle the popup open.
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('no clear button without a value', () => {
      render(() => <Selector label="Fruit" options={FRUITS} hasClear />);
      expect(screen.queryByRole('button', { name: 'Clear Fruit' })).not.toBeInTheDocument();
    });

    test('Delete on the closed trigger clears a clearable value', () => {
      const onChange = vi.fn();
      render(() => (
        <Selector label="Fruit" options={FRUITS} value="banana" hasClear onChange={onChange} />
      ));
      fireEvent.keyDown(getTrigger(), { key: 'Delete' });
      expect(onChange).toHaveBeenCalledWith(null);
    });

    test('Delete without hasClear does not fire onChange', () => {
      const onChange = vi.fn();
      render(() => <Selector label="Fruit" options={FRUITS} value="banana" onChange={onChange} />);
      fireEvent.keyDown(getTrigger(), { key: 'Delete' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    test('opening shows a search combobox; the trigger is a plain button', () => {
      render(() => <Selector label="Fruit" options={FRUITS} hasSearch />);
      const trigger = screen.getByRole('button', { name: 'Fruit' });
      fireEvent.click(trigger);
      expect(screen.getByRole('combobox', { name: 'Search options' })).toBeInTheDocument();
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    test('typing filters the options', () => {
      render(() => <Selector label="Fruit" options={FRUITS} hasSearch />);
      fireEvent.click(screen.getByRole('button', { name: 'Fruit' }));
      const search = screen.getByRole('combobox', { name: 'Search options' });
      fireEvent.input(search, { target: { value: 'ban' } });
      expect(screen.getAllByRole('option')).toHaveLength(1);
      expect(getOption('Banana')).toBeInTheDocument();
    });

    test('shows the empty state when nothing matches', () => {
      render(() => <Selector label="Fruit" options={FRUITS} hasSearch />);
      fireEvent.click(screen.getByRole('button', { name: 'Fruit' }));
      const search = screen.getByRole('combobox', { name: 'Search options' });
      fireEvent.input(search, { target: { value: 'zzz' } });
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    test('arrow + Enter in the search input selects the filtered option', () => {
      const onChange = vi.fn();
      render(() => <Selector label="Fruit" options={FRUITS} hasSearch onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: 'Fruit' }));
      const search = screen.getByRole('combobox', { name: 'Search options' });
      fireEvent.input(search, { target: { value: 'ban' } });
      fireEvent.keyDown(search, { key: 'ArrowDown' });
      expect(search).toHaveAttribute('aria-activedescendant', getOption('Banana').id);
      fireEvent.keyDown(search, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith('banana');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('sections and dividers', () => {
    const GROUPED = [
      { type: 'section', title: 'Citrus', items: ['Lemon', 'Orange'] },
      { type: 'divider' },
      { type: 'section', title: 'Berries', items: ['Blueberry'] },
    ];

    test('sections render as labelled groups containing their options', () => {
      render(() => <Selector label="Fruit" options={GROUPED} />);
      fireEvent.click(getTrigger());
      const citrus = screen.getByRole('group', { name: 'Citrus' });
      expect(citrus).toContainElement(getOption('Lemon'));
      expect(citrus).toContainElement(getOption('Orange'));
      expect(screen.getByRole('group', { name: 'Berries' })).toContainElement(
        getOption('Blueberry'),
      );
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    test('keyboard navigation walks flatly across sections', () => {
      render(() => <Selector label="Fruit" options={GROUPED} />);
      const trigger = getTrigger();
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // Lemon
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // Orange
      fireEvent.keyDown(trigger, { key: 'ArrowDown' }); // Blueberry (next section)
      expect(trigger).toHaveAttribute('aria-activedescendant', getOption('Blueberry').id);
    });
  });

  describe('status', () => {
    test('error status sets aria-invalid and renders the message as an alert', () => {
      render(() => (
        <Selector
          label="Fruit"
          options={FRUITS}
          status={{ type: 'error', message: 'Pick something' }}
        />
      ));
      expect(getTrigger()).toHaveAttribute('aria-invalid', 'true');
      const message = screen.getByRole('alert');
      expect(message).toHaveTextContent('Pick something');
      expect(getTrigger().getAttribute('aria-describedby')).toContain(message.id);
    });

    test('warning status renders a status message without aria-invalid', () => {
      render(() => (
        <Selector label="Fruit" options={FRUITS} status={{ type: 'warning', message: 'Hmm' }} />
      ));
      expect(getTrigger()).not.toHaveAttribute('aria-invalid');
      expect(screen.getByRole('status')).toHaveTextContent('Hmm');
    });
  });

  describe('disabled', () => {
    test('isDisabled disables the trigger and blocks opening', () => {
      render(() => <Selector label="Fruit" options={FRUITS} isDisabled />);
      const trigger = getTrigger();
      expect(trigger).toBeDisabled();
      fireEvent.click(trigger);
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    test('disabledMessage keeps the trigger focusable via aria-disabled and exposes the reason', () => {
      render(() => (
        <Selector
          label="Fruit"
          options={FRUITS}
          isDisabled
          disabledMessage="You need the Editor role"
        />
      ));
      const trigger = getTrigger();
      expect(trigger).not.toBeDisabled();
      expect(trigger).toHaveAttribute('aria-disabled', 'true');
      expect(trigger).toHaveAccessibleDescription('You need the Editor role');
      fireEvent.click(trigger);
      fireEvent.keyDown(trigger, { key: 'ArrowDown' });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('custom option rendering', () => {
    test('renderOption customizes selectable rows', () => {
      render(() => (
        <Selector
          label="Fruit"
          options={FRUITS.slice(0, 2)}
          renderOption={(option) => (
            <SelectorOption label={option.label} description={`Buy ${option.value}`} />
          )}
        />
      ));
      fireEvent.click(getTrigger());
      expect(screen.getByText('Buy apple')).toBeInTheDocument();
      expect(getOption(/Banana/)).toBeInTheDocument();
    });
  });
});

describe('SelectorOption', () => {
  test('renders label, description, icon, and endContent', () => {
    render(() => (
      <SelectorOption
        label="Banana"
        description="A yellow fruit"
        icon={<span aria-hidden="true">B</span>}
        endContent={<span>42</span>}
      />
    ));
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('A yellow fruit')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
