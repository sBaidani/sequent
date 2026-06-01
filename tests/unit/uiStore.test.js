import { describe, test, expect, beforeEach, vi } from 'vitest';

// Mock dependencies before importing uiStore
vi.mock('../../src/stores/syncEngine', () => ({
  syncEngine: {
    enqueue: vi.fn(),
    hydrate: vi.fn(),
  },
}));

describe('UI Store', () => {
  let uiStore;

  beforeEach(async () => {
    // Reset localStorage
    localStorage.clear();
    // Re-import to get fresh state
    vi.resetModules();
    const mod = await import('../../src/stores/uiStore');
    uiStore = mod.uiStore;
  });

  describe('Onboarding Flow', () => {
    test('initially shows onboarding when not seen', () => {
      expect(uiStore.state.hasSeenOnboarding).toBe(false);
    });

    test('completeOnboarding sets hasSeenOnboarding to true', () => {
      uiStore.completeOnboarding();
      expect(uiStore.state.hasSeenOnboarding).toBe(true);
    });

    test('completeOnboarding persists to localStorage', () => {
      uiStore.completeOnboarding();
      expect(localStorage.getItem('sequent_onboarding_seen')).toBe('true');
    });

    test('respects localStorage flag on load', async () => {
      localStorage.setItem('sequent_onboarding_seen', 'true');
      vi.resetModules();
      const freshMod = await import('../../src/stores/uiStore');
      expect(freshMod.uiStore.state.hasSeenOnboarding).toBe(true);
    });
  });

  describe('Sidebar Navigation View Swapping', () => {
    test('defaults to timeline view', () => {
      expect(uiStore.state.view).toBe('timeline');
    });

    test('setView changes to calendar', () => {
      uiStore.setView('calendar');
      expect(uiStore.state.view).toBe('calendar');
    });

    test('setView changes to tasks', () => {
      uiStore.setView('tasks');
      expect(uiStore.state.view).toBe('tasks');
    });

    test('setView changes to archive', () => {
      uiStore.setView('archive');
      expect(uiStore.state.view).toBe('archive');
    });

    test('setView changes to settings', () => {
      uiStore.setView('settings');
      expect(uiStore.state.view).toBe('settings');
    });

    test('can switch between views sequentially', () => {
      uiStore.setView('calendar');
      expect(uiStore.state.view).toBe('calendar');
      uiStore.setView('tasks');
      expect(uiStore.state.view).toBe('tasks');
      uiStore.setView('timeline');
      expect(uiStore.state.view).toBe('timeline');
    });
  });

  describe('Theme Customization', () => {
    test('default theme is Amber (#E8942A)', () => {
      expect(uiStore.state.theme).toBe('#E8942A');
    });

    test('setTheme updates the store state', () => {
      uiStore.setTheme('#C0185A');
      expect(uiStore.state.theme).toBe('#C0185A');
    });

    test('setTheme sets --accent CSS variable on document', () => {
      uiStore.setTheme('#C0185A');
      const accent = document.documentElement.style.getPropertyValue('--accent');
      expect(accent).toBe('#C0185A');
    });

    test('setTheme sets --accent-rgb CSS variable with correct RGB', () => {
      uiStore.setTheme('#C0185A');
      const accentRgb = document.documentElement.style.getPropertyValue('--accent-rgb');
      // #C0 = 192, #18 = 24, #5A = 90
      expect(accentRgb).toBe('192, 24, 90');
    });

    test('setTheme with Teal color sets correct variables', () => {
      uiStore.setTheme('#1FA7A7');
      expect(uiStore.state.theme).toBe('#1FA7A7');
      expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#1FA7A7');
      // #1F = 31, #A7 = 167, #A7 = 167
      expect(document.documentElement.style.getPropertyValue('--accent-rgb')).toBe('31, 167, 167');
    });
  });

  describe('Modal Management', () => {
    test('activeModal defaults to null', () => {
      expect(uiStore.state.activeModal).toBeNull();
    });

    test('setActiveModal opens addItem modal', () => {
      uiStore.setActiveModal('addItem');
      expect(uiStore.state.activeModal).toBe('addItem');
    });

    test('setActiveModal opens addEvent modal', () => {
      uiStore.setActiveModal('addEvent');
      expect(uiStore.state.activeModal).toBe('addEvent');
    });

    test('setActiveModal opens addTask modal', () => {
      uiStore.setActiveModal('addTask');
      expect(uiStore.state.activeModal).toBe('addTask');
    });

    test('setActiveModal(null) closes modal', () => {
      uiStore.setActiveModal('addItem');
      uiStore.setActiveModal(null);
      expect(uiStore.state.activeModal).toBeNull();
    });
  });

  describe('Sidebar Toggle', () => {
    test('sidebar starts open', () => {
      expect(uiStore.state.sidebarOpen).toBe(true);
    });

    test('toggleSidebar closes sidebar', () => {
      uiStore.toggleSidebar();
      expect(uiStore.state.sidebarOpen).toBe(false);
    });

    test('toggleSidebar toggles back to open', () => {
      uiStore.toggleSidebar();
      uiStore.toggleSidebar();
      expect(uiStore.state.sidebarOpen).toBe(true);
    });
  });

  describe('Active Date and List', () => {
    test('setActiveDate updates activeDate', () => {
      const dateStr = '2025-06-15T10:00:00.000Z';
      uiStore.setActiveDate(dateStr);
      expect(uiStore.state.activeDate).toBe(dateStr);
    });

    test('setActiveListId updates activeListId', () => {
      uiStore.setActiveListId('list-123');
      expect(uiStore.state.activeListId).toBe('list-123');
    });
  });
});
