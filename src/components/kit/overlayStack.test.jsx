/**
 * Tests for the shared overlay-stack primitives: `useOverlayLayer` (the
 * single shared document Escape listener + topmost-wins ownership),
 * `trapFocus`/`FOCUSABLE_SELECTOR` (the extracted focus trap), and
 * `useOutsideDismiss` (the extracted outside pointer-down dismiss hook).
 *
 * The topmost-wins ordering tests are the regression test for the root
 * cause this module fixes: same-target document keydown listeners used to
 * fire in registration order (so an outer Dialog, mounted first, always
 * "won" Escape over a Popover/Selector opened later inside it). The shared
 * stack instead always hands Escape to the most-recently-pushed entry,
 * which is always the true topmost layer regardless of container mount
 * order.
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { createSignal, Show } from 'solid-js';
import {
  useOverlayLayer,
  EscapeLayer,
  trapFocus,
  FOCUSABLE_SELECTOR,
  useOutsideDismiss,
} from './overlayStack';

function Layer(props) {
  const { isTopmost } = useOverlayLayer({ onEscape: props.onEscape });
  return <div data-testid={props.testid}>{isTopmost() ? 'topmost' : 'nested'}</div>;
}

describe('useOverlayLayer', () => {
  test('Escape calls only the topmost layer, even though the outer one mounted first', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const [showInner, setShowInner] = createSignal(false);
    render(() => (
      <>
        <Layer testid="outer" onEscape={outer} />
        <Show when={showInner()}>
          <Layer testid="inner" onEscape={inner} />
        </Show>
      </>
    ));

    // Only the outer layer is open so far — it owns Escape.
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(outer).toHaveBeenCalledTimes(1);
    expect(inner).not.toHaveBeenCalled();

    // The inner layer (e.g. a Popover/Selector) opens later, nested inside
    // the outer one's DOM. It is pushed later, so it is now topmost — this
    // is the exact scenario the old defaultPrevented-guard got backwards.
    outer.mockClear();
    setShowInner(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(inner).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  test('popping the topmost layer on cleanup hands ownership back to the layer beneath it', () => {
    const outer = vi.fn();
    const inner = vi.fn();
    const [showInner, setShowInner] = createSignal(true);
    render(() => (
      <>
        <Layer testid="outer" onEscape={outer} />
        <Show when={showInner()}>
          <Layer testid="inner" onEscape={inner} />
        </Show>
      </>
    ));

    setShowInner(false); // inner unmounts -> popped from the stack
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(outer).toHaveBeenCalledTimes(1);
    expect(inner).not.toHaveBeenCalled();
  });

  test('isTopmost() reflects push/pop reactively', () => {
    const [showInner, setShowInner] = createSignal(false);
    render(() => (
      <>
        <Layer testid="outer" onEscape={() => {}} />
        <Show when={showInner()}>
          <Layer testid="inner" onEscape={() => {}} />
        </Show>
      </>
    ));
    expect(screen.getByTestId('outer')).toHaveTextContent('topmost');

    setShowInner(true);
    expect(screen.getByTestId('outer')).toHaveTextContent('nested');
    expect(screen.getByTestId('inner')).toHaveTextContent('topmost');

    setShowInner(false);
    expect(screen.getByTestId('outer')).toHaveTextContent('topmost');
  });

  test('Escape with no registered layers is a silent no-op', () => {
    render(() => <div>no overlays</div>);
    expect(() => fireEvent.keyDown(document, { key: 'Escape' })).not.toThrow();
  });

  test('non-Escape keys are ignored', () => {
    const onEscape = vi.fn();
    render(() => <Layer testid="only" onEscape={onEscape} />);
    fireEvent.keyDown(document, { key: 'Tab' });
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onEscape).not.toHaveBeenCalled();
  });
});

describe('EscapeLayer', () => {
  test('joins the stack only while its <Show> condition is true', () => {
    const onEscape = vi.fn();
    const [open, setOpen] = createSignal(false);
    render(() => (
      <Show when={open()}>
        <EscapeLayer onEscape={onEscape} />
      </Show>
    ));

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).not.toHaveBeenCalled();

    setOpen(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);

    setOpen(false);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});

describe('trapFocus', () => {
  const makeContainer = (html) => {
    const container = document.createElement('div');
    container.innerHTML = html;
    document.body.appendChild(container);
    return container;
  };

  test('Tab from the last focusable wraps to the first', () => {
    const container = makeContainer('<button id="a">A</button><button id="b">B</button>');
    container.querySelector('#b').focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    trapFocus(container, event);
    expect(document.activeElement).toBe(container.querySelector('#a'));
    container.remove();
  });

  test('Shift+Tab from the first focusable wraps to the last', () => {
    const container = makeContainer('<button id="a">A</button><button id="b">B</button>');
    container.querySelector('#a').focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, cancelable: true });
    trapFocus(container, event);
    expect(document.activeElement).toBe(container.querySelector('#b'));
    container.remove();
  });

  test('Tab from outside the container is pulled back to the first focusable', () => {
    const container = makeContainer('<button id="a">A</button><button id="b">B</button>');
    document.body.focus();
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    trapFocus(container, event);
    expect(document.activeElement).toBe(container.querySelector('#a'));
    container.remove();
  });

  test('with no focusable elements, focuses and preventDefaults on the container itself', () => {
    const container = makeContainer('');
    container.tabIndex = -1;
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');
    trapFocus(container, event);
    expect(spy).toHaveBeenCalled();
    expect(document.activeElement).toBe(container);
    container.remove();
  });

  test('a null container is a no-op', () => {
    const event = new KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
    expect(() => trapFocus(null, event)).not.toThrow();
  });

  test('FOCUSABLE_SELECTOR excludes disabled controls', () => {
    const container = makeContainer(
      '<button id="a" disabled>A</button><button id="b">B</button>',
    );
    expect(Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))).toEqual([
      container.querySelector('#b'),
    ]);
    container.remove();
  });
});

describe('useOutsideDismiss', () => {
  function DismissHarness(props) {
    let panelRef;
    useOutsideDismiss({
      isOpen: props.isOpen,
      refs: [() => panelRef],
      onDismiss: props.onDismiss,
    });
    return (
      <div data-testid="panel" ref={panelRef}>
        <button>Inside</button>
      </div>
    );
  }

  test('dismisses on outside mousedown while open, ignores inside clicks', () => {
    const onDismiss = vi.fn();
    render(() => (
      <>
        <button>Outside</button>
        <DismissHarness isOpen={() => true} onDismiss={onDismiss} />
      </>
    ));

    fireEvent.mouseDown(screen.getByText('Inside'));
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('also dismisses on touchstart outside (upgrade over mousedown-only implementations)', () => {
    const onDismiss = vi.fn();
    render(() => (
      <>
        <button>Outside</button>
        <DismissHarness isOpen={() => true} onDismiss={onDismiss} />
      </>
    ));

    fireEvent.touchStart(screen.getByText('Outside'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('stops listening once isOpen becomes false', () => {
    const onDismiss = vi.fn();
    const [isOpen, setIsOpen] = createSignal(true);
    render(() => (
      <>
        <button>Outside</button>
        <DismissHarness isOpen={isOpen} onDismiss={onDismiss} />
      </>
    ));

    setIsOpen(false);
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
