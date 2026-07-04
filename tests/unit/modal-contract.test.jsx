/**
 * PRE-REFACTOR characterization tests for the Modal contract.
 *
 * Pins the BEHAVIOR of src/components/ui/Modal.jsx + src/stores/uiStore.js
 * before the UI is rewritten (Astryx Dialog). Queries by role/text only —
 * never by class or DOM structure. The one exception is the backdrop:
 * today's overlay has no role or label, so we locate it via the `id` prop,
 * which is part of the Modal component's public API (props.id is stamped on
 * the overlay element and matched against uiStore.state.activeModal).
 *
 * Contract pinned here:
 *  - Modal renders its children only while uiStore.state.activeModal === props.id
 *  - Clicking the backdrop closes (setActiveModal(null))
 *  - Clicking the close button closes (setActiveModal(null))
 *  - Clicking modal content does NOT close
 *  - Escape does NOT close today (Astryx Dialog will add this — see below)
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest';
import Modal from '../../src/components/ui/Modal';
import { uiStore } from '../../src/stores/uiStore';

const MODAL_ID = 'test-modal';

beforeAll(() => {
  // jsdom has no Web Animations API; solid-transition-group's enter/exit
  // hooks call el.animate(). Stub it so open/close transitions don't throw.
  // The stub's onfinish is never invoked, so exiting elements are not
  // removed from the DOM — tests therefore assert on the store's close
  // path (activeModal === null), which is the actual behavioral contract.
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(() => ({
      onfinish: null,
      cancel: vi.fn(),
      finished: Promise.resolve(),
    }));
  }
});

const openModal = () => {
  uiStore.setActiveModal(MODAL_ID);
  return render(() => (
    <Modal id={MODAL_ID}>
      <p>Modal body content</p>
    </Modal>
  ));
};

describe('Modal contract (pre-refactor characterization)', () => {
  beforeEach(() => {
    uiStore.setActiveModal(null);
  });

  describe('visibility is driven by uiStore.activeModal', () => {
    test('renders children when activeModal matches its id', () => {
      openModal();
      expect(screen.getByText('Modal body content')).toBeInTheDocument();
    });

    test('renders nothing when activeModal is null', () => {
      render(() => (
        <Modal id={MODAL_ID}>
          <p>Modal body content</p>
        </Modal>
      ));
      expect(screen.queryByText('Modal body content')).not.toBeInTheDocument();
    });

    test('renders nothing when a DIFFERENT modal is active', () => {
      uiStore.setActiveModal('some-other-modal');
      render(() => (
        <Modal id={MODAL_ID}>
          <p>Modal body content</p>
        </Modal>
      ));
      expect(screen.queryByText('Modal body content')).not.toBeInTheDocument();
    });

    test('opens reactively when activeModal is set after render', () => {
      render(() => (
        <Modal id={MODAL_ID}>
          <p>Modal body content</p>
        </Modal>
      ));
      expect(screen.queryByText('Modal body content')).not.toBeInTheDocument();
      uiStore.setActiveModal(MODAL_ID);
      expect(screen.getByText('Modal body content')).toBeInTheDocument();
    });
  });

  describe('close paths', () => {
    test('backdrop click closes: setActiveModal(null)', () => {
      openModal();
      // The overlay carries the modal's `id` prop; the component only closes
      // when the click target IS the overlay itself (e.target === overlayRef).
      const backdrop = document.getElementById(MODAL_ID);
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop);
      expect(uiStore.state.activeModal).toBe(null);
    });

    test('close button click closes: setActiveModal(null)', () => {
      openModal();
      // NOTE (pinned quirk): today's close button has NO accessible name —
      // it's an icon-only <button> with a bare SVG (no aria-label). It is the
      // only button the Modal itself renders. The Astryx Dialog replacement
      // should give it a proper accessible name (e.g. "Close").
      const closeButton = screen.getByRole('button');
      fireEvent.click(closeButton);
      expect(uiStore.state.activeModal).toBe(null);
    });

    test('clicking modal content does NOT close', () => {
      openModal();
      fireEvent.click(screen.getByText('Modal body content'));
      expect(uiStore.state.activeModal).toBe(MODAL_ID);
      expect(screen.getByText('Modal body content')).toBeInTheDocument();
    });

    test('Escape does NOT close (current behavior — no key handling exists)', () => {
      // CHARACTERIZATION: Modal.jsx has no keyboard handling today, so
      // pressing Escape leaves the modal open. The Astryx Dialog that
      // replaces this component WILL close on Escape — this test documents
      // the current behavior and is expected to be updated (inverted) as
      // part of the refactor. Do not "fix" Modal.jsx to make Escape close.
      openModal();
      fireEvent.keyDown(document.activeElement || document.body, { key: 'Escape' });
      fireEvent.keyDown(document.getElementById(MODAL_ID), { key: 'Escape' });
      expect(uiStore.state.activeModal).toBe(MODAL_ID);
      expect(screen.getByText('Modal body content')).toBeInTheDocument();
    });
  });
});
