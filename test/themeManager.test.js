/**
 * Theme Manager Tests
 * Tests for theme switching and persistence
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ThemeManager from '../static/modules/themeManager.js';

describe('ThemeManager', () => {
  let themeManager;
  let mockMatchMedia;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Reset DOM
    document.body.innerHTML = '<div></div>';
    document.documentElement.className = '';

    // Mock matchMedia
    mockMatchMedia = {
      matches: false,
      addListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    window.matchMedia = vi.fn(() => mockMatchMedia);

    // Create theme manager instance
    themeManager = new ThemeManager();
  });

  afterEach(() => {
    // Clean up any created theme toggles
    const toggles = document.querySelectorAll('.theme-toggle');
    toggles.forEach((toggle) => toggle.remove());
  });

  describe('Initialization', () => {
    it('should initialize with default light theme when no preference exists', () => {
      expect(themeManager.currentTheme).toBe('light');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    });

    it('should load saved theme from localStorage', () => {
      localStorage.setItem('sqs-ui-theme', 'dark');
      const tm = new ThemeManager();
      expect(tm.currentTheme).toBe('dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
    });

    it('should respect system dark mode preference when no saved theme', () => {
      // Clear any previously created theme manager
      localStorage.clear();
      document.documentElement.className = '';

      // Need to set up the mock BEFORE creating ThemeManager
      const darkMockMatchMedia = {
        matches: true,
        addListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      window.matchMedia = vi.fn(() => darkMockMatchMedia);

      const tm = new ThemeManager();
      expect(tm.currentTheme).toBe('dark');
    });

    it('should call init on construction', () => {
      const initSpy = vi.spyOn(ThemeManager.prototype, 'init');
      new ThemeManager();
      expect(initSpy).toHaveBeenCalled();
      initSpy.mockRestore();
    });
  });

  describe('Theme Application', () => {
    it('should apply light theme correctly', () => {
      themeManager.applyTheme('light');
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
      expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
      expect(themeManager.currentTheme).toBe('light');
    });

    it('should apply dark theme correctly', () => {
      themeManager.applyTheme('dark');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(true);
      expect(document.documentElement.classList.contains('theme-light')).toBe(false);
      expect(themeManager.currentTheme).toBe('dark');
    });

    it('should save theme to localStorage', () => {
      themeManager.applyTheme('dark');
      expect(localStorage.getItem('sqs-ui-theme')).toBe('dark');
    });

    it('should dispatch themeChanged event', () => {
      const eventListener = vi.fn();
      window.addEventListener('themeChanged', eventListener);

      themeManager.applyTheme('dark');

      expect(eventListener).toHaveBeenCalled();
      const event = eventListener.mock.calls[0][0];
      expect(event.detail.theme).toBe('dark');

      window.removeEventListener('themeChanged', eventListener);
    });

    it('should remove existing theme class before applying new one', () => {
      document.documentElement.classList.add('theme-dark');
      themeManager.applyTheme('light');
      expect(document.documentElement.classList.contains('theme-dark')).toBe(false);
      expect(document.documentElement.classList.contains('theme-light')).toBe(true);
    });
  });

  describe('Theme Toggle', () => {
    it('should toggle from light to dark', () => {
      themeManager.currentTheme = 'light';
      themeManager.toggleTheme();
      expect(themeManager.currentTheme).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      themeManager.currentTheme = 'dark';
      themeManager.toggleTheme();
      expect(themeManager.currentTheme).toBe('light');
    });

    it('should persist toggled theme', () => {
      themeManager.toggleTheme();
      const savedTheme = localStorage.getItem('sqs-ui-theme');
      expect(savedTheme).toBe('dark');
    });
  });

  describe('Theme Toggle Button', () => {
    it('should create theme toggle button', () => {
      // Remove any existing toggle first
      const existing = document.querySelector('.theme-toggle');
      if (existing) existing.remove();

      themeManager.createThemeToggle();
      const toggle = document.querySelector('.theme-toggle');
      expect(toggle).toBeTruthy();
    });

    it('should not create duplicate toggle button', () => {
      themeManager.createThemeToggle();
      themeManager.createThemeToggle();
      const toggles = document.querySelectorAll('.theme-toggle');
      expect(toggles.length).toBe(1);
    });

    it('should add toggle to messages-controls if it exists', () => {
      document.body.innerHTML = '<div class="messages-controls"></div>';
      themeManager.createThemeToggle();
      const controls = document.querySelector('.messages-controls');
      const toggle = controls.querySelector('.theme-toggle');
      expect(toggle).toBeTruthy();
    });

    it('should create messages-controls and add toggle if messages-header exists', () => {
      document.body.innerHTML = '<div class="messages-header"></div>';
      themeManager.createThemeToggle();
      const controls = document.querySelector('.messages-controls');
      const toggle = controls?.querySelector('.theme-toggle');
      expect(toggle).toBeTruthy();
    });

    it('should add toggle to body as fallback', () => {
      document.body.innerHTML = '<div></div>';
      themeManager.createThemeToggle();
      const toggle = document.body.querySelector('.theme-toggle');
      expect(toggle).toBeTruthy();
    });

    it('should show moon icon for light theme', () => {
      themeManager.currentTheme = 'light';
      const icon = themeManager.getToggleIcon();
      expect(icon).toBe('🌙');
    });

    it('should show sun icon for dark theme', () => {
      themeManager.currentTheme = 'dark';
      const icon = themeManager.getToggleIcon();
      expect(icon).toBe('☀️');
    });

    it('should toggle theme when button is clicked', () => {
      themeManager.createThemeToggle();
      const toggle = document.querySelector('.theme-toggle');
      const initialTheme = themeManager.currentTheme;

      toggle.click();

      expect(themeManager.currentTheme).not.toBe(initialTheme);
    });

    it('should update button icon when theme changes', () => {
      themeManager.createThemeToggle();
      themeManager.applyTheme('dark');
      const toggle = document.querySelector('.theme-toggle');
      expect(toggle.innerHTML).toBe('☀️');
    });

    it('should update aria-label when theme changes', () => {
      themeManager.createThemeToggle();
      themeManager.applyTheme('dark');
      const toggle = document.querySelector('.theme-toggle');
      expect(toggle.getAttribute('aria-label')).toContain('light');
    });
  });

  describe('System Theme Watching', () => {
    it('should set up system theme watcher', () => {
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
      expect(mockMatchMedia.addListener).toHaveBeenCalled();
    });

    it('should only auto-switch if no saved theme exists', () => {
      localStorage.setItem('sqs-ui-theme', 'light');
      const tm = new ThemeManager();

      // Simulate system theme change
      const listener = mockMatchMedia.addListener.mock.calls[0][0];
      listener({ matches: true });

      // Should stay light because user preference is saved
      expect(tm.currentTheme).toBe('light');
    });
  });

  describe('Getter and Setter Methods', () => {
    it('should get current theme', () => {
      themeManager.currentTheme = 'dark';
      expect(themeManager.getCurrentTheme()).toBe('dark');
    });

    it('should set valid theme', () => {
      themeManager.setTheme('dark');
      expect(themeManager.currentTheme).toBe('dark');
    });

    it('should reject invalid theme', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      themeManager.setTheme('invalid');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid theme'));
      consoleSpy.mockRestore();
    });

    it('should accept "light" theme', () => {
      themeManager.setTheme('light');
      expect(themeManager.currentTheme).toBe('light');
    });

    it('should accept "dark" theme', () => {
      themeManager.setTheme('dark');
      expect(themeManager.currentTheme).toBe('dark');
    });
  });

  describe('Storage Key', () => {
    it('should use correct storage key', () => {
      expect(themeManager.storageKey).toBe('sqs-ui-theme');
    });

    it('should persist theme with correct key', () => {
      themeManager.applyTheme('dark');
      const stored = localStorage.getItem('sqs-ui-theme');
      expect(stored).toBe('dark');
    });
  });
});
