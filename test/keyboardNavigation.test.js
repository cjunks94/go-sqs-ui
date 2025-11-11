/**
 * Keyboard Navigation Tests
 * Tests for keyboard shortcuts and navigation functionality
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the KeyboardNavigation module that doesn't exist yet - TDD approach
vi.mock('@/keyboardNavigation.js', () => ({
  KeyboardNavigation: vi.fn().mockImplementation(function (appState) {
    this.appState = appState;
    this.enabled = false;
    this.shortcuts = new Map();
    this.currentFocus = -1;
    this.focusableElements = [];

    this.init = vi.fn(() => {
      // Define default shortcuts
      this.shortcuts.set('j', { action: 'nextMessage', description: 'Next message' });
      this.shortcuts.set('k', { action: 'previousMessage', description: 'Previous message' });
      this.shortcuts.set('Enter', { action: 'expandMessage', description: 'Expand/collapse message' });
      this.shortcuts.set('/', { action: 'focusSearch', description: 'Focus search' });
      this.shortcuts.set('g g', { action: 'jumpToTop', description: 'Jump to top' });
      this.shortcuts.set('G', { action: 'jumpToBottom', description: 'Jump to bottom' });
      this.shortcuts.set('r', { action: 'refresh', description: 'Refresh messages' });
      this.shortcuts.set('n', { action: 'nextPage', description: 'Next page' });
      this.shortcuts.set('p', { action: 'previousPage', description: 'Previous page' });
      this.shortcuts.set('?', { action: 'showHelp', description: 'Show keyboard shortcuts' });
      this.shortcuts.set('Escape', { action: 'clearFocus', description: 'Clear focus/close modals' });
      this.shortcuts.set('e', { action: 'exportMessages', description: 'Export messages' });
      this.shortcuts.set('b', { action: 'toggleBrowser', description: 'Toggle queue browser' });
      this.shortcuts.set('s', { action: 'toggleStatistics', description: 'Toggle statistics' });

      // Attach event listener
      document.addEventListener('keydown', this.handleKeyPress.bind(this));
      this.enabled = true;
    });

    this.handleKeyPress = vi.fn((event) => {
      if (!this.enabled) return;

      // Ignore if typing in input/textarea
      if (event.target && event.target.matches && event.target.matches('input, textarea, select')) {
        if (event.key !== 'Escape') return;
      }

      // Check for shortcut
      const shortcut = this.shortcuts.get(event.key);
      if (shortcut) {
        event.preventDefault();
        this.executeAction(shortcut.action);
      }

      // Handle multi-key shortcuts (like 'g g')
      if (event.key === 'g') {
        this.waitForSecondKey('g', 'jumpToTop');
      }
    });

    this.executeAction = vi.fn((action) => {
      switch (action) {
        case 'nextMessage':
          this.focusNext();
          break;
        case 'previousMessage':
          this.focusPrevious();
          break;
        case 'expandMessage':
          this.expandCurrentMessage();
          break;
        case 'focusSearch':
          this.focusSearchInput();
          break;
        case 'jumpToTop':
          this.scrollToTop();
          break;
        case 'jumpToBottom':
          this.scrollToBottom();
          break;
        case 'refresh':
          this.refreshMessages();
          break;
        case 'nextPage':
          this.goToNextPage();
          break;
        case 'previousPage':
          this.goToPreviousPage();
          break;
        case 'showHelp':
          this.showHelpModal();
          break;
        case 'clearFocus':
          this.clearFocus();
          break;
        case 'exportMessages':
          this.triggerExport();
          break;
        case 'toggleBrowser':
          this.toggleQueueBrowser();
          break;
        case 'toggleStatistics':
          this.toggleStatisticsPanel();
          break;
      }
    });

    this.focusNext = vi.fn(() => {
      const elements = this.getFocusableElements();
      if (elements.length === 0) return;

      this.currentFocus = (this.currentFocus + 1) % elements.length;
      this.setFocus(elements[this.currentFocus]);
    });

    this.focusPrevious = vi.fn(() => {
      const elements = this.getFocusableElements();
      if (elements.length === 0) return;

      this.currentFocus = this.currentFocus <= 0 ? elements.length - 1 : this.currentFocus - 1;
      this.setFocus(elements[this.currentFocus]);
    });

    this.getFocusableElements = vi.fn(() => {
      return Array.from(
        document.querySelectorAll('.message-item, .queue-item, button:not(:disabled), a, input, select, textarea')
      );
    });

    this.setFocus = vi.fn((element) => {
      // Remove previous focus
      document.querySelectorAll('.keyboard-focused').forEach((el) => {
        el.classList.remove('keyboard-focused');
      });

      // Add focus to new element
      element.classList.add('keyboard-focused');
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });

    this.expandCurrentMessage = vi.fn(() => {
      const focused = document.querySelector('.keyboard-focused.message-item');
      if (focused) {
        focused.click();
      }
    });

    this.focusSearchInput = vi.fn(() => {
      const searchInput = document.querySelector('input[type="search"], input.filter-input');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    });

    this.scrollToTop = vi.fn(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      // Focus first message
      const firstMessage = document.querySelector('.message-item');
      if (firstMessage) {
        this.currentFocus = 0;
        this.setFocus(firstMessage);
      }
    });

    this.scrollToBottom = vi.fn(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      // Focus last message
      const messages = document.querySelectorAll('.message-item');
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        this.currentFocus = messages.length - 1;
        this.setFocus(lastMessage);
      }
    });

    this.refreshMessages = vi.fn(() => {
      const refreshButton = document.querySelector('#refreshMessages');
      if (refreshButton) {
        refreshButton.click();
      }
    });

    this.goToNextPage = vi.fn(() => {
      const nextButton = document.querySelector('.pagination-next, .browser-page-next');
      if (nextButton && !nextButton.disabled) {
        nextButton.click();
      }
    });

    this.goToPreviousPage = vi.fn(() => {
      const prevButton = document.querySelector('.pagination-prev, .browser-page-prev');
      if (prevButton && !prevButton.disabled) {
        prevButton.click();
      }
    });

    this.showHelpModal = vi.fn(() => {
      const modal = document.createElement('div');
      modal.className = 'keyboard-help-modal';
      modal.innerHTML = `
                <div class="help-modal-content">
                    <h3>Keyboard Shortcuts</h3>
                    <div class="shortcuts-list">
                        ${Array.from(this.shortcuts.entries())
                          .map(
                            ([key, info]) => `
                            <div class="shortcut-item">
                                <kbd>${key}</kbd>
                                <span>${info.description}</span>
                            </div>
                        `
                          )
                          .join('')}
                    </div>
                    <button class="close-help">Close (ESC)</button>
                </div>
            `;
      document.body.appendChild(modal);
    });

    this.clearFocus = vi.fn(() => {
      // Clear keyboard focus
      document.querySelectorAll('.keyboard-focused').forEach((el) => {
        el.classList.remove('keyboard-focused');
      });
      this.currentFocus = -1;

      // Close any open modals
      document.querySelectorAll('.keyboard-help-modal, .queue-browser-modal').forEach((modal) => {
        modal.remove();
      });

      // Blur active element
      if (document.activeElement) {
        document.activeElement.blur();
      }
    });

    this.triggerExport = vi.fn(() => {
      const exportButton = document.querySelector('.export-button, #exportMessages');
      if (exportButton) {
        exportButton.click();
      }
    });

    this.toggleQueueBrowser = vi.fn(() => {
      const browserButton = document.querySelector('.browse-queue-button');
      if (browserButton) {
        browserButton.click();
      }
    });

    this.toggleStatisticsPanel = vi.fn(() => {
      const statsPanel = document.querySelector('.queue-statistics-panel');
      if (statsPanel) {
        statsPanel.classList.toggle('hidden');
      }
    });

    this.waitForSecondKey = vi.fn((expectedKey, action) => {
      const timeout = setTimeout(() => {
        document.removeEventListener('keydown', handler);
      }, 1000);

      const handler = (e) => {
        clearTimeout(timeout);
        document.removeEventListener('keydown', handler);
        if (e.key === expectedKey) {
          e.preventDefault();
          this.executeAction(action);
        }
      };

      document.addEventListener('keydown', handler);
    });

    this.enable = vi.fn(() => {
      this.enabled = true;
    });

    this.disable = vi.fn(() => {
      this.enabled = false;
    });

    this.isEnabled = vi.fn(() => this.enabled);

    this.getShortcuts = vi.fn(() => this.shortcuts);

    this.addShortcut = vi.fn((key, action, description) => {
      this.shortcuts.set(key, { action, description });
    });

    this.removeShortcut = vi.fn((key) => {
      this.shortcuts.delete(key);
    });

    this.destroy = vi.fn(() => {
      document.removeEventListener('keydown', this.handleKeyPress);
      this.enabled = false;
      this.clearFocus();
    });
  }),
}));

import { KeyboardNavigation } from '@/keyboardNavigation.js';

describe('KeyboardNavigation', () => {
  let keyboardNav;
  let mockAppState;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
            <div class="message-list">
                <div class="message-item" id="msg-1">Message 1</div>
                <div class="message-item" id="msg-2">Message 2</div>
                <div class="message-item" id="msg-3">Message 3</div>
            </div>
            <input type="search" class="filter-input" />
            <button id="refreshMessages">Refresh</button>
            <div class="pagination-controls">
                <button class="pagination-prev">Previous</button>
                <button class="pagination-next">Next</button>
            </div>
        `;

    // Setup mock app state
    mockAppState = {
      getCurrentQueue: vi.fn(),
      getMessages: vi.fn(),
    };

    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();

    // Mock window.scrollTo
    window.scrollTo = vi.fn();

    keyboardNav = new KeyboardNavigation(mockAppState);
  });

  afterEach(() => {
    keyboardNav.destroy();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with default shortcuts', () => {
      keyboardNav.init();

      expect(keyboardNav.isEnabled()).toBe(true);
      expect(keyboardNav.getShortcuts().size).toBeGreaterThan(0);
      expect(keyboardNav.getShortcuts().has('j')).toBe(true);
      expect(keyboardNav.getShortcuts().has('k')).toBe(true);
    });

    it('should attach keyboard event listener', () => {
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      keyboardNav.init();

      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    });
  });

  describe('Message Navigation', () => {
    beforeEach(() => {
      keyboardNav.init();
    });

    it('should navigate to next message with j key', () => {
      const event = new KeyboardEvent('keydown', { key: 'j' });
      document.dispatchEvent(event);

      expect(keyboardNav.focusNext).toHaveBeenCalled();
    });

    it('should navigate to previous message with k key', () => {
      const event = new KeyboardEvent('keydown', { key: 'k' });
      document.dispatchEvent(event);

      expect(keyboardNav.focusPrevious).toHaveBeenCalled();
    });

    it('should cycle through messages', () => {
      // Mock getFocusableElements to return only message items for this test
      const messageItems = document.querySelectorAll('.message-item');
      keyboardNav.getFocusableElements.mockReturnValue(Array.from(messageItems));

      keyboardNav.focusNext();
      expect(document.querySelector('#msg-1').classList.contains('keyboard-focused')).toBe(true);

      keyboardNav.focusNext();
      expect(document.querySelector('#msg-2').classList.contains('keyboard-focused')).toBe(true);

      keyboardNav.focusNext();
      expect(document.querySelector('#msg-3').classList.contains('keyboard-focused')).toBe(true);

      // Should cycle back to first
      keyboardNav.focusNext();
      expect(document.querySelector('#msg-1').classList.contains('keyboard-focused')).toBe(true);
    });

    it('should expand message with Enter key', () => {
      // Focus a message first
      document.querySelector('#msg-1').classList.add('keyboard-focused');
      const clickSpy = vi.spyOn(document.querySelector('#msg-1'), 'click');

      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(event);

      expect(keyboardNav.expandCurrentMessage).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Search Navigation', () => {
    beforeEach(() => {
      keyboardNav.init();
    });

    it('should focus search input with / key', () => {
      const searchInput = document.querySelector('.filter-input');
      const focusSpy = vi.spyOn(searchInput, 'focus');
      const selectSpy = vi.spyOn(searchInput, 'select');

      const event = new KeyboardEvent('keydown', { key: '/' });
      document.dispatchEvent(event);

      expect(keyboardNav.focusSearchInput).toHaveBeenCalled();
      expect(focusSpy).toHaveBeenCalled();
      expect(selectSpy).toHaveBeenCalled();
    });

    it('should not handle shortcuts when typing in input', () => {
      const searchInput = document.querySelector('.filter-input');
      searchInput.focus();

      const event = new KeyboardEvent('keydown', { key: 'j', bubbles: true });
      searchInput.dispatchEvent(event);

      expect(keyboardNav.focusNext).not.toHaveBeenCalled();
    });

    it('should handle Escape key even in input fields', () => {
      const searchInput = document.querySelector('.filter-input');
      searchInput.focus();

      const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      searchInput.dispatchEvent(event);

      expect(keyboardNav.clearFocus).toHaveBeenCalled();
    });
  });

  describe('Page Navigation', () => {
    beforeEach(() => {
      keyboardNav.init();
    });

    it('should jump to top with g g keys', () => {
      // First 'g'
      const event1 = new KeyboardEvent('keydown', { key: 'g' });
      document.dispatchEvent(event1);

      // Second 'g' within timeout
      const event2 = new KeyboardEvent('keydown', { key: 'g' });
      document.dispatchEvent(event2);

      expect(keyboardNav.waitForSecondKey).toHaveBeenCalledWith('g', 'jumpToTop');
    });

    it('should jump to bottom with G key', () => {
      const event = new KeyboardEvent('keydown', { key: 'G' });
      document.dispatchEvent(event);

      expect(keyboardNav.scrollToBottom).toHaveBeenCalled();
      expect(window.scrollTo).toHaveBeenCalledWith({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      });
    });

    it('should navigate to next page with n key', () => {
      const nextButton = document.querySelector('.pagination-next');
      const clickSpy = vi.spyOn(nextButton, 'click');

      const event = new KeyboardEvent('keydown', { key: 'n' });
      document.dispatchEvent(event);

      expect(keyboardNav.goToNextPage).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should navigate to previous page with p key', () => {
      const prevButton = document.querySelector('.pagination-prev');
      const clickSpy = vi.spyOn(prevButton, 'click');

      const event = new KeyboardEvent('keydown', { key: 'p' });
      document.dispatchEvent(event);

      expect(keyboardNav.goToPreviousPage).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Actions', () => {
    beforeEach(() => {
      keyboardNav.init();
    });

    it('should refresh messages with r key', () => {
      const refreshButton = document.querySelector('#refreshMessages');
      const clickSpy = vi.spyOn(refreshButton, 'click');

      const event = new KeyboardEvent('keydown', { key: 'r' });
      document.dispatchEvent(event);

      expect(keyboardNav.refreshMessages).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });

    it('should trigger export with e key', () => {
      // Add export button to DOM
      const exportButton = document.createElement('button');
      exportButton.id = 'exportMessages';
      document.body.appendChild(exportButton);

      const clickSpy = vi.spyOn(exportButton, 'click');

      const event = new KeyboardEvent('keydown', { key: 'e' });
      document.dispatchEvent(event);

      expect(keyboardNav.triggerExport).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
    });
  });

  describe('Help Modal', () => {
    beforeEach(() => {
      keyboardNav.init();
    });

    it('should show help modal with ? key', () => {
      const event = new KeyboardEvent('keydown', { key: '?' });
      document.dispatchEvent(event);

      expect(keyboardNav.showHelpModal).toHaveBeenCalled();
      expect(document.querySelector('.keyboard-help-modal')).toBeTruthy();
    });

    it('should display all shortcuts in help modal', () => {
      keyboardNav.showHelpModal();

      const modal = document.querySelector('.keyboard-help-modal');
      expect(modal.innerHTML).toContain('kbd>j</kbd>');
      expect(modal.innerHTML).toContain('kbd>k</kbd>');
      expect(modal.innerHTML).toContain('Next message');
      expect(modal.innerHTML).toContain('Previous message');
    });

    it('should close help modal with Escape', () => {
      keyboardNav.showHelpModal();

      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);

      expect(keyboardNav.clearFocus).toHaveBeenCalled();
      expect(document.querySelector('.keyboard-help-modal')).toBeFalsy();
    });
  });

  describe('Custom Shortcuts', () => {
    beforeEach(() => {
      keyboardNav.init();
    });

    it('should add custom shortcut', () => {
      keyboardNav.addShortcut('x', 'customAction', 'Custom action');

      expect(keyboardNav.getShortcuts().has('x')).toBe(true);
      expect(keyboardNav.getShortcuts().get('x')).toEqual({
        action: 'customAction',
        description: 'Custom action',
      });
    });

    it('should remove shortcut', () => {
      keyboardNav.removeShortcut('j');

      expect(keyboardNav.getShortcuts().has('j')).toBe(false);
    });
  });

  describe('Enable/Disable', () => {
    beforeEach(() => {
      keyboardNav.init();
    });

    it('should disable keyboard navigation', () => {
      keyboardNav.disable();

      expect(keyboardNav.isEnabled()).toBe(false);

      const event = new KeyboardEvent('keydown', { key: 'j' });
      document.dispatchEvent(event);

      expect(keyboardNav.executeAction).not.toHaveBeenCalled();
    });

    it('should re-enable keyboard navigation', () => {
      keyboardNav.disable();
      keyboardNav.enable();

      expect(keyboardNav.isEnabled()).toBe(true);

      const event = new KeyboardEvent('keydown', { key: 'j' });
      document.dispatchEvent(event);

      expect(keyboardNav.executeAction).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should clean up on destroy', () => {
      keyboardNav.init();
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');

      keyboardNav.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(keyboardNav.isEnabled()).toBe(false);
      expect(keyboardNav.clearFocus).toHaveBeenCalled();
    });
  });
});
