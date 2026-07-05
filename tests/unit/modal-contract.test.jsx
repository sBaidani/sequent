/**
 * Characterization tests for the Modal contract — POST-REFACTOR (Phase 4).
 *
 * Modal (src/components/ui/Modal.jsx) is now a deprecated thin adapter over
 * the kit Dialog: it preserves the legacy id/uiStore contract (open while
 * uiStore.state.activeModal === props.id, every dismiss path calls
 * uiStore.setActiveModal(null)) while Dialog provides the surface.
 *
 * Queries by role/text/label only. The backdrop is the dialog's overlay
 * parent element; it intentionally has no role (same approach as
 * src/components/kit/Dialog.test.jsx).
 *
 * Contract pinned here:
 *  - Modal renders its children only while uiStore.state.activeModal === props.id
 *  - Clicking the backdrop closes (setActiveModal(null))
 *  - Clicking the close button (aria-label="Close", rendered by the composed
 *    DialogHeader) closes (setActiveModal(null))
 *  - Clicking modal content does NOT close
 *  - Escape NOW CLOSES (new Dialog behavior; the old hand-rolled Modal had
 *    no key handling — that pre-refactor pin was inverted here on purpose)
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, beforeAll, beforeEach, vi } from 'vitest';
import Modal from '../../src/components/ui/Modal';
import { DialogHeader } from '../../src/components/kit';
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
      <DialogHeader title="Test modal" />
      <p>Modal body content</p>
    </Modal>
  ));
};

describe('Modal contract (Dialog adapter)', () => {
  beforeEach(() => {
    uiStore.setActiveModal(null);
  });

  describe('visibility is driven by uiStore.activeModal', () => {
    test('renders children when activeModal matches its id', () => {
      openModal();
      expect(screen.getByText('Modal body content')).toBeInTheDocument();
      expect(screen.getByRole('dialog', { name: 'Test modal' })).toBeInTheDocument();
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
      // The backdrop is the dialog panel's overlay parent (no role by design);
      // Dialog only closes when the click target IS the overlay itself.
      const backdrop = screen.getByRole('dialog').parentElement;
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop);
      expect(uiStore.state.activeModal).toBe(null);
    });

    test('close button click closes: setActiveModal(null)', () => {
      openModal();
      // The DialogHeader close button now has a proper accessible name
      // ("Close") — this was an unnamed icon-only button pre-refactor.
      const closeButton = screen.getByRole('button', { name: 'Close' });
      fireEvent.click(closeButton);
      expect(uiStore.state.activeModal).toBe(null);
    });

    test('clicking modal content does NOT close', () => {
      openModal();
      fireEvent.click(screen.getByText('Modal body content'));
      fireEvent.click(screen.getByRole('dialog'));
      expect(uiStore.state.activeModal).toBe(MODAL_ID);
      expect(screen.getByText('Modal body content')).toBeInTheDocument();
    });

    test('Escape closes: setActiveModal(null) (new Dialog contract)', () => {
      // Pre-refactor the hand-rolled Modal had no keyboard handling and this
      // test pinned "Escape does NOT close". The kit Dialog adds
      // Escape-to-close; this pin was inverted as part of the refactor.
      openModal();
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(uiStore.state.activeModal).toBe(null);
    });
  });
});
