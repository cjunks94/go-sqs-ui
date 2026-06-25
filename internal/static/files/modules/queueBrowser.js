/**
 * Queue Browser Module
 * Provides a dedicated browser mode for viewing all messages in a queue with pagination
 */
import { APIService } from './apiService.js';
import { Pagination } from './pagination.js';
import { EnhancedMessageView } from './enhancedMessageView.js';

export class QueueBrowser {
  constructor(appState) {
    this.appState = appState;
    this.isOpen = false;
    this.currentPage = 1;
    this.itemsPerPage = 50;
    this.totalItems = 0;
    this.messages = [];
    this.element = null;
    this.pagination = null;
    this.enhancedView = new EnhancedMessageView(appState);
  }

  /**
   * Open the queue browser modal
   * @returns {Promise<boolean>} True if opened successfully
   */
  async open() {
    const queue = this.appState.getCurrentQueue();
    if (!queue) {
      console.error('No queue selected');
      return false;
    }

    this.isOpen = true;
    this.createBrowserUI(queue);
    document.body.appendChild(this.element);

    // Load first page
    await this.loadPage(1);

    // Add keyboard handler for Escape
    this.handleEscape = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this.handleEscape);

    return true;
  }

  /**
   * Close the queue browser modal
   */
  close() {
    this.isOpen = false;
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    if (this.handleEscape) {
      document.removeEventListener('keydown', this.handleEscape);
    }
  }

  /**
   * Create the browser UI
   * @param {Object} queue - Queue object
   */
  createBrowserUI(queue) {
    this.element = document.createElement('div');
    this.element.className = 'queue-browser-modal';
    this.element.innerHTML = `
            <div class="queue-browser-content">
                <div class="queue-browser-header">
                    <h2>Browse Queue: ${queue.name}</h2>
                    <button class="queue-browser-close btn-close">×</button>
                </div>
                <div class="queue-browser-controls">
                    <div class="queue-browser-stats">
                        <span class="message-count-display">Loading...</span>
                    </div>
                    <div class="items-per-page-control">
                        <label>Items per page:</label>
                        <select class="items-per-page-select">
                            <option value="25">25</option>
                            <option value="50" selected>50</option>
                            <option value="100">100</option>
                        </select>
                    </div>
                </div>
                <div class="queue-browser-messages"></div>
                <div class="queue-browser-pagination"></div>
            </div>
        `;

    // Attach event handlers
    const closeBtn = this.element.querySelector('.queue-browser-close');
    closeBtn.onclick = () => this.close();

    const itemsSelect = this.element.querySelector('.items-per-page-select');
    itemsSelect.onchange = (e) => this.setItemsPerPage(parseInt(e.target.value));
  }

  /**
   * Load a specific page of messages
   * @param {number} page - Page number to load
   * @returns {Promise<boolean>} True if loaded successfully
   */
  async loadPage(page) {
    const queue = this.appState.getCurrentQueue();
    if (!queue) return false;

    try {
      // Show loading state
      const messagesContainer = this.element.querySelector('.queue-browser-messages');
      messagesContainer.innerHTML = '<div class="loading">Loading messages...</div>';

      // Calculate offset
      const offset = (page - 1) * this.itemsPerPage;

      // Fetch messages with pagination
      const response = await this.fetchMessagesWithPagination(queue.url, this.itemsPerPage, offset);

      this.messages = response.messages || [];
      this.totalItems = response.totalCount || this.getTotalFromQueue(queue);
      this.currentPage = page;

      // Update displays
      this.updateMessageDisplay();
      this.updatePagination();
      this.updateStats();

      return true;
    } catch (error) {
      console.error('Error loading messages:', error);
      const messagesContainer = this.element.querySelector('.queue-browser-messages');
      messagesContainer.innerHTML = `<div class="error">Failed to load messages: ${error.message}</div>`;
      return false;
    }
  }

  /**
   * Fetch messages with pagination support
   * @param {string} queueUrl - Queue URL
   * @param {number} limit - Number of messages to fetch
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Response with messages and total count
   */
  async fetchMessagesWithPagination(queueUrl, limit, _offset) {
    // First, try to get messages with the standard API
    const messages = await APIService.getMessages(queueUrl, limit);

    // For now, simulate pagination since backend might not support it yet
    // In production, this would be a single API call with offset
    const queue = this.appState.getCurrentQueue();
    const totalCount = parseInt(queue.attributes?.ApproximateNumberOfMessages || '0');

    return {
      messages: messages,
      totalCount: totalCount,
    };
  }

  /**
   * Get total message count from queue attributes
   * @param {Object} queue - Queue object
   * @returns {number} Total message count
   */
  getTotalFromQueue(queue) {
    return parseInt(queue.attributes?.ApproximateNumberOfMessages || '0');
  }

  /**
   * Update the message display
   */
  updateMessageDisplay() {
    if (!this.element) return;

    const container = this.element.querySelector('.queue-browser-messages');

    if (this.messages.length === 0) {
      container.innerHTML = '<div class="no-messages">No messages in this queue</div>';
      return;
    }

    container.innerHTML = '';

    this.messages.forEach((message, index) => {
      const messageEl = this.createMessageElement(message, index);
      container.appendChild(messageEl);
    });
  }

  /**
   * Create a message element for display
   * @param {Object} message - Message object
   * @param {number} index - Message index
   * @returns {HTMLElement} Message element
   */
  createMessageElement(message, index) {
    const messageItem = document.createElement('div');
    messageItem.className = 'browser-message-item';
    messageItem.setAttribute('data-index', index);

    const timestamp = message.attributes?.SentTimestamp
      ? new Date(parseInt(message.attributes.SentTimestamp)).toLocaleString()
      : '';

    messageItem.innerHTML = `
            <div class="browser-message-header">
                <span class="browser-message-id">${message.messageId || message.MessageId}</span>
                <span class="browser-message-time">${timestamp}</span>
            </div>
            <div class="browser-message-body">${this.truncateBody(message.body || message.Body)}</div>
        `;

    // Click to expand
    messageItem.onclick = () => this.expandMessage(messageItem, message);

    return messageItem;
  }

  /**
   * Truncate message body for preview
   * @param {string} body - Message body
   * @returns {string} Truncated body
   */
  truncateBody(body) {
    if (!body) return '';
    const maxLength = 100;
    if (body.length <= maxLength) return body;
    return `${body.substring(0, maxLength)}...`;
  }

  /**
   * Expand a message to show full details
   * @param {HTMLElement} messageItem - Message element
   * @param {Object} message - Message object
   */
  expandMessage(messageItem, message) {
    // Toggle expansion
    if (messageItem.classList.contains('expanded')) {
      messageItem.classList.remove('expanded');
      const details = messageItem.querySelector('.browser-message-details');
      if (details) details.remove();
    } else {
      messageItem.classList.add('expanded');
      const detailsEl = this.enhancedView.createEnhancedView(message);
      detailsEl.className = 'browser-message-details';
      messageItem.appendChild(detailsEl);
    }
  }

  /**
   * Update pagination controls
   */
  updatePagination() {
    if (!this.element) return;

    const container = this.element.querySelector('.queue-browser-pagination');
    container.innerHTML = '';

    // Create pagination component
    this.pagination = new Pagination({
      totalItems: this.totalItems,
      itemsPerPage: this.itemsPerPage,
      currentPage: this.currentPage,
      onPageChange: (page) => this.loadPage(page),
    });

    container.appendChild(this.pagination.render());
  }

  /**
   * Update statistics display
   */
  updateStats() {
    if (!this.element) return;

    const startItem = this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);

    const display = this.element.querySelector('.message-count-display');
    if (display) {
      display.textContent =
        this.totalItems === 0 ? 'No messages' : `Showing ${startItem}-${endItem} of ${this.totalItems} messages`;
    }
  }

  /**
   * Navigate to next page
   * @returns {Promise<boolean>} True if navigation successful
   */
  async nextPage() {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    if (this.currentPage < totalPages) {
      await this.loadPage(this.currentPage + 1);
      return true;
    }
    return false;
  }

  /**
   * Navigate to previous page
   * @returns {Promise<boolean>} True if navigation successful
   */
  async previousPage() {
    if (this.currentPage > 1) {
      await this.loadPage(this.currentPage - 1);
      return true;
    }
    return false;
  }

  /**
   * Go to a specific page
   * @param {number} page - Page number
   * @returns {Promise<boolean>} True if navigation successful
   */
  async goToPage(page) {
    const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    if (page >= 1 && page <= totalPages) {
      await this.loadPage(page);
      return true;
    }
    return false;
  }

  /**
   * Set items per page and reload
   * @param {number} count - Number of items per page
   * @returns {Promise<void>}
   */
  async setItemsPerPage(count) {
    this.itemsPerPage = count;
    this.currentPage = 1;
    await this.loadPage(1);
  }

  /**
   * Get current state
   * @returns {Object} Current browser state
   */
  getState() {
    return {
      isOpen: this.isOpen,
      currentPage: this.currentPage,
      itemsPerPage: this.itemsPerPage,
      totalItems: this.totalItems,
      messages: this.messages,
    };
  }
}
