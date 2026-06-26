/**
 * Keyboard Navigation Module
 * Provides keyboard shortcuts and navigation for the application
 */
export class KeyboardNavigation {
  constructor(appState) {
    this.appState = appState;
    this.enabled = false;
    this.shortcuts = new Map();
    this.currentFocus = -1;
    this.focusableElements = [];
    this.multiKeyBuffer = '';
    this.multiKeyTimeout = null;
  }

  /**
   * Initialize keyboard navigation
   */
  init() {
    // Define default shortcuts
    this.defineShortcuts();

    // Attach event listener
    this.handleKeyPress = this.handleKeyPress.bind(this);
    document.addEventListener('keydown', this.handleKeyPress);

    this.enabled = true;
  }

  /**
   * Define keyboard shortcuts
   */
  defineShortcuts() {
    // Navigation shortcuts
    this.shortcuts.set('j', { action: 'nextMessage', description: 'Next message' });
    this.shortcuts.set('k', { action: 'previousMessage', description: 'Previous message' });
    this.shortcuts.set('Enter', { action: 'expandMessage', description: 'Expand/collapse message' });
    this.shortcuts.set('/', { action: 'focusSearch', description: 'Focus search' });
    this.shortcuts.set('g g', { action: 'jumpToTop', description: 'Jump to top' });
    this.shortcuts.set('G', { action: 'jumpToBottom', description: 'Jump to bottom' });

    // Action shortcuts
    this.shortcuts.set('r', { action: 'refresh', description: 'Refresh messages' });
    this.shortcuts.set('n', { action: 'nextPage', description: 'Next page' });
    this.shortcuts.set('p', { action: 'previousPage', description: 'Previous page' });
    this.shortcuts.set('e', { action: 'exportMessages', description: 'Export messages' });
    this.shortcuts.set('b', { action: 'toggleBrowser', description: 'Toggle queue browser' });
    this.shortcuts.set('s', { action: 'toggleStatistics', description: 'Toggle statistics' });

    // Utility shortcuts
    this.shortcuts.set('?', { action: 'showHelp', description: 'Show keyboard shortcuts' });
    this.shortcuts.set('Escape', { action: 'clearFocus', description: 'Clear focus/close modals' });
  }

  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyPress(event) {
    if (!this.enabled) return;

    // Ignore if typing in input/textarea (except Escape)
    if (event.target.matches('input, textarea, select')) {
      if (event.key !== 'Escape') return;
    }

    // Check if modal is open (disable shortcuts except Escape)
    const modalOpen = document.querySelector('.keyboard-help-modal, .queue-browser-modal');
    if (modalOpen && event.key !== 'Escape') {
      return;
    }

    // Handle multi-key shortcuts
    if (event.key === 'g') {
      this.startMultiKeySequence('g');
      event.preventDefault();
      return;
    }

    // Check for multi-key completion
    if (this.multiKeyBuffer) {
      const combo = `${this.multiKeyBuffer} ${event.key}`;
      const shortcut = this.shortcuts.get(combo);
      if (shortcut) {
        event.preventDefault();
        this.executeAction(shortcut.action);
        this.clearMultiKeySequence();
        return;
      }
      this.clearMultiKeySequence();
    }

    // Check for single-key shortcut
    const shortcut = this.shortcuts.get(event.key);
    if (shortcut) {
      event.preventDefault();
      this.executeAction(shortcut.action);
    }
  }

  /**
   * Start multi-key sequence
   * @param {string} firstKey - First key of sequence
   */
  startMultiKeySequence(firstKey) {
    this.multiKeyBuffer = firstKey;

    // Clear after timeout
    if (this.multiKeyTimeout) {
      clearTimeout(this.multiKeyTimeout);
    }

    this.multiKeyTimeout = setTimeout(() => {
      this.clearMultiKeySequence();
    }, 1000);
  }

  /**
   * Clear multi-key sequence
   */
  clearMultiKeySequence() {
    this.multiKeyBuffer = '';
    if (this.multiKeyTimeout) {
      clearTimeout(this.multiKeyTimeout);
      this.multiKeyTimeout = null;
    }
  }

  /**
   * Execute shortcut action
   * @param {string} action - Action to execute
   */
  executeAction(action) {
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
  }

  /**
   * Focus next element
   */
  focusNext() {
    const elements = this.getFocusableElements();
    if (elements.length === 0) return;

    this.currentFocus = (this.currentFocus + 1) % elements.length;
    this.setFocus(elements[this.currentFocus]);
  }

  /**
   * Focus previous element
   */
  focusPrevious() {
    const elements = this.getFocusableElements();
    if (elements.length === 0) return;

    this.currentFocus = this.currentFocus <= 0 ? elements.length - 1 : this.currentFocus - 1;
    this.setFocus(elements[this.currentFocus]);
  }

  /**
   * Get focusable elements
   * @returns {Array<Element>} Array of focusable elements
   */
  getFocusableElements() {
    return Array.from(
      document.querySelectorAll('.message-item, .queue-item, button:not(:disabled), a, input, select, textarea')
    );
  }

  /**
   * Set focus on element
   * @param {Element} element - Element to focus
   */
  setFocus(element) {
    // Remove previous focus
    document.querySelectorAll('.keyboard-focused').forEach((el) => {
      el.classList.remove('keyboard-focused');
    });

    // Add focus to new element
    element.classList.add('keyboard-focused');
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Expand current message
   */
  expandCurrentMessage() {
    const focused = document.querySelector('.keyboard-focused.message-item');
    if (focused) {
      focused.click();
    }
  }

  /**
   * Focus search input
   */
  focusSearchInput() {
    const searchInput = document.querySelector('input[type="search"], input.filter-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }

  /**
   * Scroll to top
   */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Focus first message
    const firstMessage = document.querySelector('.message-item');
    if (firstMessage) {
      this.currentFocus = 0;
      this.setFocus(firstMessage);
    }
  }

  /**
   * Scroll to bottom
   */
  scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });

    // Focus last message
    const messages = document.querySelectorAll('.message-item');
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      this.currentFocus = messages.length - 1;
      this.setFocus(lastMessage);
    }
  }

  /**
   * Refresh messages
   */
  refreshMessages() {
    const refreshButton = document.querySelector('#refreshMessages');
    if (refreshButton) {
      refreshButton.click();
    }
  }

  /**
   * Go to next page
   */
  goToNextPage() {
    const nextButton = document.querySelector('.pagination-next, .browser-page-next, .show-more-messages-btn');
    if (nextButton && !nextButton.disabled) {
      nextButton.click();
    }
  }

  /**
   * Go to previous page
   */
  goToPreviousPage() {
    const prevButton = document.querySelector('.pagination-prev, .browser-page-prev');
    if (prevButton && !prevButton.disabled) {
      prevButton.click();
    }
  }

  /**
   * Show help modal
   */
  showHelpModal() {
    // Check if modal already exists
    let modal = document.querySelector('.keyboard-help-modal');
    if (modal) {
      modal.remove();
      return;
    }

    modal = document.createElement('div');
    modal.className = 'keyboard-help-modal';
    modal.innerHTML = `
            <div class="help-modal-content">
                <h3>Keyboard Shortcuts</h3>
                <div class="shortcuts-list">
                    ${Array.from(this.shortcuts.entries())
                      .map(
                        ([key, info]) => `
                        <div class="shortcut-item">
                            <kbd>${key.replace(' ', ' then ')}</kbd>
                            <span>${info.description}</span>
                        </div>
                    `
                      )
                      .join('')}
                </div>
                <button class="close-help btn btn-secondary">Close (ESC)</button>
            </div>
        `;

    // Add close handler
    modal.querySelector('.close-help').onclick = () => modal.remove();

    document.body.appendChild(modal);
  }

  /**
   * Clear focus and close modals
   */
  clearFocus() {
    // Clear keyboard focus
    document.querySelectorAll('.keyboard-focused').forEach((el) => {
      el.classList.remove('keyboard-focused');
    });
    this.currentFocus = -1;

    // Close any open modals
    document.querySelectorAll('.keyboard-help-modal, .queue-browser-modal, .export-menu').forEach((modal) => {
      modal.remove();
    });

    // Blur active element
    if (document.activeElement && document.activeElement.tagName !== 'BODY') {
      document.activeElement.blur();
    }
  }

  /**
   * Trigger export
   */
  triggerExport() {
    const exportButton = document.querySelector('.export-button, #exportMessages, button:has-text("Export")');
    if (exportButton) {
      exportButton.click();
    } else if (window.app?.messageExport) {
      // Direct export if button not found
      window.app.messageExport.exportCurrentView();
    }
  }

  /**
   * Toggle queue browser
   */
  toggleQueueBrowser() {
    const browserButton = document.querySelector('.browse-queue-button, button:has-text("Browse Queue")');
    if (browserButton) {
      browserButton.click();
    } else if (window.app?.queueBrowser) {
      // Direct toggle if button not found
      if (window.app.queueBrowser.isOpen) {
        window.app.queueBrowser.close();
      } else {
        window.app.queueBrowser.open();
      }
    }
  }

  /**
   * Toggle statistics panel
   */
  toggleStatisticsPanel() {
    const statsPanel = document.querySelector('.queue-statistics-panel');
    if (statsPanel) {
      statsPanel.classList.toggle('hidden');
    }
  }

  /**
   * Wait for second key (for multi-key shortcuts)
   * @param {string} expectedKey - Expected second key
   * @param {string} action - Action to execute
   */
  waitForSecondKey(expectedKey, action) {
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
  }

  /**
   * Enable keyboard navigation
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disable keyboard navigation
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Check if enabled
   * @returns {boolean} True if enabled
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get shortcuts
   * @returns {Map} Shortcuts map
   */
  getShortcuts() {
    return this.shortcuts;
  }

  /**
   * Add custom shortcut
   * @param {string} key - Key combination
   * @param {string} action - Action name
   * @param {string} description - Description
   */
  addShortcut(key, action, description) {
    this.shortcuts.set(key, { action, description });
  }

  /**
   * Remove shortcut
   * @param {string} key - Key combination
   */
  removeShortcut(key) {
    this.shortcuts.delete(key);
  }

  /**
   * Destroy keyboard navigation
   */
  destroy() {
    document.removeEventListener('keydown', this.handleKeyPress);
    this.enabled = false;
    this.clearFocus();
    this.clearMultiKeySequence();
  }
}
