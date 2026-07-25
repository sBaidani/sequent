/**
 * Tests for OnboardingModal (post-refactor: kit Dialog + Button/Text).
 *
 * Pins the Phase 4 contract: a labelled dialog per step, Continue advances,
 * and the final step's "Dive In" completes onboarding. (Dialog dismiss paths
 * — Escape / backdrop / close button — map to completeOnboarding too, but
 * uiStore.hasSeenOnboarding is a one-way singleton flag, so only one
 * onboarding flow can be exercised per module instance; the dismiss
 * machinery itself is covered by the kit Dialog tests.)
 * Queries by role/label/text only.
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, beforeAll, vi } from 'vitest';
import OnboardingModal from '../../src/components/onboarding/OnboardingModal';
import { uiStore } from '../../src/stores/uiStore';

beforeAll(() => {
  // jsdom has no Web Animations API; Dialog's transitions call el.animate().
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(() => ({
      onfinish: null,
      cancel: vi.fn(),
      finished: Promise.resolve(),
    }));
  }
});

describe('OnboardingModal (kit Dialog)', () => {
  test('steps through all three steps and completes onboarding', () => {
    render(() => <OnboardingModal />);

    expect(screen.getByRole('dialog', { name: 'Welcome to Sequent' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: 'Offline First' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('heading', { name: "Let's Get Started" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dive In' }));
    expect(uiStore.state.hasSeenOnboarding).toBe(true);
    expect(localStorage.getItem('sequent_onboarding_seen')).toBe('true');
  });
});
