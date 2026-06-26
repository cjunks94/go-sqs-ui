/**
 * Regression tests for CodeRabbit follow-up fixes.
 *
 * Imports the REAL modules to lock in behavioral fixes that the sibling
 * suites (which mock the module under test) would not catch.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import ThemeManager from '@/themeManager.js';

describe('ThemeManager - system preference is not persisted', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '<div></div>';
    document.documentElement.className = '';
    window.matchMedia = vi.fn(() => ({
      matches: true, // prefers dark
      addListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it('applies the OS preference without writing it to localStorage', () => {
    new ThemeManager();

    // The inferred theme is applied to the DOM...
    expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    // ...but storage stays empty so watchSystemTheme() keeps tracking the OS.
    expect(localStorage.getItem('sqs-ui-theme')).toBeNull();
  });

  it('persists the theme once the user explicitly chooses one', () => {
    const tm = new ThemeManager();
    tm.applyTheme('light'); // explicit change persists (default)
    expect(localStorage.getItem('sqs-ui-theme')).toBe('light');
  });
});

// Note: the keyboardNavigation `:has-text()` fix (an invalid CSS selector that
// throws SyntaxError in real browsers) is not covered here because happy-dom
// does not enforce CSS selector grammar, so the bug is not observable in jsdom-
// style test environments. The fix is verified by the source change itself.
