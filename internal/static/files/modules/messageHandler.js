/**
 * Message Handler
 * Manages message display, pagination, and interactions
 */
import { UIComponent } from './uiComponent.js';
import { APIService } from './apiService.js';
import { EnhancedMessageView } from './enhancedMessageView.js';
import { MessageRetry } from './messageRetry.js';
import { MessageFilter } from './messageFilter.js';

export class MessageHandler extends UIComponent {
  constructor(appState) {
    super('#messageList');
    this.appState = appState;
    this.enhancedView = new EnhancedMessageView(appState);
    this.messageRetry = new MessageRetry(appState);
    this.messageFilter = new MessageFilter();

    // Listen for filter changes
    this.messageFilter.onFilterChange((filter) => {
      this.applyFilter(filter);
    });
  }

  async loadMessages() {
    const currentQueue = this.appState.getCurrentQueue();
    if (!currentQueue) return;

    this.setContent('<div class="loading">Loading messages...</div>');

    try {
      const messages = await APIService.getMessages(currentQueue.url, 10);
      this.displayMessages(messages);
    } catch (error) {
      console.error('Error loading messages:', error);
      this.setContent(`<div class="error-message">Failed to load messages: ${error.message}</div>`);
    }
  }

  displayMessages(messages, append = false, prepend = false) {
    // Validate input
    if (!Array.isArray(messages)) {
      return;
    }

    // Ensure we have a valid DOM element
    if (!this.element) {
      return;
    }

    // For initial load (not append, not prepend), clear and rebuild
    if (!append && !prepend) {
      this.setContent('');
      this.appState.setMessages(messages);
      this.removeShowMoreButton();
    } else if (append) {
      // Append mode - add to existing messages
      this.removeShowMoreButton();
      this.appState.setMessages(messages, true);
    } else if (prepend) {
      // Prepend mode - add new messages at the beginning
      const currentMessages = this.appState.getMessages();
      const newMessages = this.deduplicateMessages(messages, currentMessages);
      if (newMessages.length === 0) {
        return; // No new messages to add
      }
      this.appState.setMessages([...newMessages, ...currentMessages]);
    }

    const allMessages = this.appState.getMessages();

    if (allMessages.length === 0 && !append && !prepend) {
      this.setContent('<div class="no-messages">No messages found in this queue</div>');
      return;
    }

    // Sort messages by timestamp (newest first)
    const sortedMessages = [...allMessages].sort((a, b) => {
      const timeA = parseInt(a.attributes?.SentTimestamp || '0');
      const timeB = parseInt(b.attributes?.SentTimestamp || '0');
      return timeB - timeA;
    });

    // Determine which messages to display
    let messagesToShow;
    if (prepend) {
      messagesToShow = this.deduplicateMessages(messages, this.getDisplayedMessages());
    } else if (append) {
      // For append, use all sorted messages to ensure proper order
      messagesToShow = sortedMessages;
    } else {
      // For initial load, use the sorted messages
      messagesToShow = sortedMessages;
    }

    // For initial loads and appends, clear the DOM completely to ensure proper order
    if (!prepend) {
      // Clear all existing message elements but keep other elements like "no messages" text
      const messageItems = this.element.querySelectorAll('.message-item');
      messageItems.forEach((item) => item.remove());
    }

    messagesToShow.forEach((message, index) => {
      try {
        const messageRow = this.createMessageRow(message, index);
        if (messageRow && this.element) {
          if (prepend) {
            // Insert new messages at the top
            const firstMessage = this.element.querySelector('.message-item');
            if (firstMessage) {
              this.element.insertBefore(messageRow, firstMessage);
            } else {
              this.element.appendChild(messageRow);
            }
          } else {
            // For initial load and append, add in sorted order
            this.element.appendChild(messageRow);
          }
        }
      } catch (error) {
        console.error('Error creating message row:', error, message);
      }
    });

    // Add "Show More" button for initial load and append operations
    if (messages.length > 0 && !prepend) {
      this.addShowMoreButton();
    }

    // Attach retry handlers after messages are displayed
    setTimeout(() => {
      this.messageRetry.attachRetryHandlers(this.appState.getMessages());
    }, 100);
  }

  /**
   * Remove duplicate messages based on MessageId
   * @param {Array} newMessages - New messages to check
   * @param {Array} existingMessages - Currently displayed messages
   * @returns {Array} Deduplicated new messages
   */
  deduplicateMessages(newMessages, existingMessages) {
    if (!Array.isArray(existingMessages) || existingMessages.length === 0) {
      return newMessages;
    }

    const existingIds = new Set(existingMessages.map((msg) => msg.messageId));
    return newMessages.filter((msg) => !existingIds.has(msg.messageId));
  }

  /**
   * Get currently displayed messages from DOM
   * @returns {Array} Array of message objects currently in DOM
   */
  getDisplayedMessages() {
    const displayedMessages = [];
    const messageElements = this.element.querySelectorAll('.message-item');

    messageElements.forEach((element) => {
      const messageId = element.dataset.messageId;
      if (messageId) {
        // Find the message object in app state
        const message = this.appState.getMessages().find((msg) => msg.messageId === messageId);
        if (message) {
          displayedMessages.push(message);
        }
      }
    });

    return displayedMessages;
  }

  /**
   * Manage scroll position during message updates
   * @param {boolean} scrollToTop - Whether to scroll to top after update
   */
  manageScrollPosition(scrollToTop = false) {
    if (!this.element) return;

    const messageContainer = this.element.closest('.message-list') || this.element;

    if (scrollToTop) {
      // Smooth scroll to top to show newest messages
      messageContainer.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
    // If scrollToTop is false, maintain current scroll position (default behavior)
  }

  /**
   * Check if user is scrolled near the top (within 100px)
   * @returns {boolean} True if user is near the top
   */
  isUserNearTop() {
    if (!this.element) return true;

    const messageContainer = this.element.closest('.message-list') || this.element;
    return messageContainer.scrollTop < 100;
  }

  createMessageRow(message, index) {
    const messageItem = document.createElement('div');
    messageItem.className = `message-item message-row ${index % 2 === 0 ? 'message-row-even' : 'message-row-odd'}`;
    messageItem.setAttribute('data-message-id', message.messageId);

    const collapsedView = this.createCollapsedView(message);
    const expandedView = this.createExpandedView(message);

    collapsedView.onclick = () => this.toggleMessageExpansion(messageItem);

    // Add click handler to expanded view - check if header exists first
    const expandedHeader = expandedView.querySelector('.message-expanded-header');
    if (expandedHeader) {
      expandedHeader.onclick = () => this.toggleMessageExpansion(messageItem);
    } else {
      // If no specific header, make the entire expanded view clickable to collapse
      expandedView.onclick = () => this.toggleMessageExpansion(messageItem);
    }

    messageItem.appendChild(collapsedView);
    messageItem.appendChild(expandedView);

    return messageItem;
  }

  createCollapsedView(message) {
    const collapsedView = document.createElement('div');
    collapsedView.className = 'message-collapsed';

    // Add checkbox for batch selection
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'message-checkbox';
    checkbox.onclick = (e) => e.stopPropagation();

    const expandIcon = document.createElement('span');
    expandIcon.className = 'expand-icon';
    expandIcon.textContent = '▶';

    const messagePreview = document.createElement('div');
    messagePreview.className = 'message-preview';

    const timestamp = this.createTimestamp(message);
    const previewText = this.createPreviewText(message);
    const messageId = this.createMessageId(message);
    const deleteBtn = this.createDeleteButton(message);

    messagePreview.appendChild(timestamp);
    messagePreview.appendChild(previewText);
    messagePreview.appendChild(messageId);

    collapsedView.appendChild(checkbox);
    collapsedView.appendChild(expandIcon);
    collapsedView.appendChild(messagePreview);
    collapsedView.appendChild(deleteBtn);

    return collapsedView;
  }

  createExpandedView(message) {
    const expandedView = document.createElement('div');
    expandedView.className = 'message-expanded hidden';

    // Use enhanced view for better debugging
    const enhancedContent = this.enhancedView.createEnhancedView(message);
    expandedView.appendChild(enhancedContent);

    return expandedView;
  }

  createTimestamp(message) {
    const timestamp = document.createElement('span');
    timestamp.className = 'message-timestamp-compact';
    if (message.attributes && message.attributes.SentTimestamp) {
      const date = new Date(parseInt(message.attributes.SentTimestamp));
      timestamp.textContent = date.toLocaleString();
    }
    return timestamp;
  }

  createPreviewText(message) {
    const messagePreviewText = document.createElement('span');
    messagePreviewText.className = 'message-preview-text';
    const previewText = message.body.length > 100 ? `${message.body.substring(0, 100)}...` : message.body;
    messagePreviewText.textContent = previewText;
    return messagePreviewText;
  }

  createMessageId(message) {
    const messageId = document.createElement('span');
    messageId.className = 'message-id-compact';
    messageId.textContent = `ID: ${message.messageId.substring(0, 8)}...`;
    return messageId;
  }

  createDeleteButton(message) {
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger btn-small';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.deleteMessage(message.receiptHandle);
    };
    return deleteBtn;
  }

  createMessageDetails(message) {
    const messageDetails = document.createElement('div');
    messageDetails.className = 'message-details';

    const timestamp = this.createTimestamp(message);
    messageDetails.innerHTML = `
            <div><strong>Message ID:</strong> ${message.messageId}</div>
            <div><strong>Sent:</strong> ${timestamp.textContent}</div>
            <div><strong>Receipt Handle:</strong> ${message.receiptHandle.substring(0, 50)}...</div>
        `;
    return messageDetails;
  }

  createMessageBody(message) {
    const messageBody = document.createElement('div');
    messageBody.className = 'message-body-expanded';

    let formattedBody;
    let isJSON = false;
    try {
      const parsed = JSON.parse(message.body);
      formattedBody = JSON.stringify(parsed, null, 4);
      isJSON = true;
    } catch {
      formattedBody = message.body;
    }

    const pre = document.createElement('pre');
    pre.className = isJSON ? 'message-json json-formatted' : 'message-json plain-text';
    pre.textContent = formattedBody;
    messageBody.appendChild(pre);

    return messageBody;
  }

  toggleMessageExpansion(messageItem) {
    const collapsed = messageItem.querySelector('.message-collapsed');
    const expanded = messageItem.querySelector('.message-expanded');

    if (expanded.classList.contains('hidden')) {
      collapsed.classList.add('hidden');
      expanded.classList.remove('hidden');
      messageItem.classList.add('expanded');
    } else {
      expanded.classList.add('hidden');
      collapsed.classList.remove('hidden');
      messageItem.classList.remove('expanded');
    }
  }

  addShowMoreButton() {
    // Remove any existing buttons first to prevent duplicates
    this.removeShowMoreButton();

    const showMoreBtn = document.createElement('button');
    showMoreBtn.className = 'btn btn-secondary show-more-messages-btn';
    showMoreBtn.textContent = 'Show More Messages';
    showMoreBtn.style.width = '100%';
    showMoreBtn.style.marginTop = '1rem';
    showMoreBtn.onclick = () => this.loadMoreMessages();
    this.element.appendChild(showMoreBtn);
  }

  removeShowMoreButton() {
    // Remove all show more buttons to prevent duplicates
    const existingShowMore = this.element.querySelectorAll('.show-more-messages-btn');
    existingShowMore.forEach((button) => button.remove());
  }

  async loadMoreMessages() {
    const currentQueue = this.appState.getCurrentQueue();
    if (!currentQueue) return;

    const showMoreBtn = this.element.querySelector('.show-more-messages-btn');
    if (showMoreBtn) {
      showMoreBtn.textContent = 'Loading...';
      showMoreBtn.disabled = true;
    }

    try {
      const messages = await APIService.getMessages(currentQueue.url, 10);

      if (messages.length > 0) {
        this.displayMessages(messages, true);
      } else {
        if (showMoreBtn) {
          showMoreBtn.textContent = 'No more messages';
          showMoreBtn.disabled = true;
        }
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
      this.showErrorBanner(`Failed to load more messages: ${error.message}`);
      if (showMoreBtn) {
        showMoreBtn.textContent = 'Show More Messages';
        showMoreBtn.disabled = false;
      }
    }
  }

  async deleteMessage(receiptHandle) {
    const currentQueue = this.appState.getCurrentQueue();
    if (!currentQueue) return;

    try {
      await APIService.deleteMessage(currentQueue.url, receiptHandle);
      this.loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      this.showError('Failed to delete message');
    }
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;

    const content = document.querySelector('.content');
    content.insertBefore(errorDiv, content.firstChild);

    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  /**
   * Apply filter to messages
   * @param {string} filter - Filter query
   */
  applyFilter(filter) {
    const allMessages = this.appState.getMessages();
    const filteredMessages = this.messageFilter.filterMessages(allMessages, filter);

    // Clear current display
    this.setContent('');
    this.removeShowMoreButton();

    if (filteredMessages.length === 0) {
      this.setContent('<div class="no-results">No messages match your filter</div>');
      return;
    }

    // Display filtered messages
    filteredMessages.forEach((message, index) => {
      const messageRow = this.createMessageRow(message, index);

      // Highlight matches if there's a filter
      if (filter) {
        this.highlightMessageContent(messageRow, filter);
      }

      this.element.appendChild(messageRow);
    });

    // Re-attach retry handlers
    setTimeout(() => {
      this.messageRetry.attachRetryHandlers(filteredMessages);
    }, 100);
  }

  /**
   * Highlight matching content in message row
   * @param {HTMLElement} messageRow - Message row element
   * @param {string} filter - Filter query
   */
  highlightMessageContent(messageRow, filter) {
    const { textFilter } = this.messageFilter.parseFilterQuery(filter);
    if (!textFilter) return;

    // Highlight in preview text
    const previewText = messageRow.querySelector('.message-preview-text');
    if (previewText) {
      previewText.innerHTML = this.messageFilter.highlightMatches(previewText.textContent, textFilter);
    }
  }

  /**
   * Add filter UI to messages section
   */
  addFilterUI() {
    const messagesSection = document.querySelector('.messages-section');
    if (!messagesSection) return;

    // Remove any existing filter UI to prevent duplicates
    const existingFilter = messagesSection.querySelector('.message-filter-container');
    if (existingFilter) {
      existingFilter.remove();
    }

    const filterUI = this.messageFilter.createFilterUI();
    const messagesHeader = messagesSection.querySelector('.messages-header');

    if (messagesHeader) {
      messagesSection.insertBefore(filterUI, messagesHeader.nextSibling);
    }

    // Check if current queue is DLQ and show/hide retry button
    const currentQueue = this.appState.getCurrentQueue();
    if (currentQueue) {
      const isDLQ = currentQueue.isDLQ || false;
      this.messageFilter.setDLQMode(isDLQ);
    }
  }

  /**
   * Add new messages that weren't previously displayed
   * @param {Array} newMessages - New messages from WebSocket
   */
  addNewMessages(newMessages) {
    if (!Array.isArray(newMessages) || newMessages.length === 0) return;

    const currentMessages = this.appState.getMessages();

    // Create a map of current messages by ID for quick lookup
    const currentMap = new Map(currentMessages.map((msg) => [msg.messageId, msg]));

    // Filter out messages we already have
    const reallyNewMessages = newMessages.filter((msg) => !currentMap.has(msg.messageId));

    if (reallyNewMessages.length === 0) return;

    // Add new messages to state
    const updatedMessages = [...reallyNewMessages, ...currentMessages];
    this.appState.setMessages(updatedMessages);

    // Sort all messages by timestamp (newest first)
    const sortedMessages = updatedMessages.sort((a, b) => {
      const timeA = parseInt(a.attributes?.SentTimestamp || '0');
      const timeB = parseInt(b.attributes?.SentTimestamp || '0');
      return timeB - timeA;
    });

    // Clear and redisplay all messages in proper order
    this.element.innerHTML = '';
    sortedMessages.forEach((message, index) => {
      const messageRow = this.createMessageRow(message, index);
      this.element.appendChild(messageRow);
    });

    // Re-attach handlers and add show more button
    setTimeout(() => {
      this.messageRetry.attachRetryHandlers(sortedMessages);
    }, 100);

    if (sortedMessages.length > 0) {
      this.addShowMoreButton();
    }
  }

  /**
   * Merge new messages with existing ones, preserving UI state
   * @param {Array} newMessages - New messages from WebSocket
   */
  mergeMessages(newMessages) {
    if (!Array.isArray(newMessages)) return;

    const currentMessages = this.appState.getMessages();

    // Track which messages are expanded
    const expandedMessageIds = new Set();
    document.querySelectorAll('.message-item.expanded').forEach((item) => {
      const messageId = item.getAttribute('data-message-id');
      if (messageId) expandedMessageIds.add(messageId);
    });

    // Track current scroll position
    const messageContainer = this.element.closest('.message-list') || this.element;
    const scrollTop = messageContainer.scrollTop;

    // Create merged message list
    const mergedMessages = [];
    const seenIds = new Set();

    // Add all new messages, updating existing ones
    newMessages.forEach((newMsg) => {
      seenIds.add(newMsg.messageId);
      mergedMessages.push(newMsg);
    });

    // Add existing messages that aren't in the new set (deleted from queue)
    currentMessages.forEach((msg) => {
      if (!seenIds.has(msg.messageId)) {
        // Message was deleted from queue, don't include it
        return;
      }
    });

    // Update state
    this.appState.setMessages(mergedMessages);

    // Sort messages by timestamp (newest first)
    const sortedMessages = [...mergedMessages].sort((a, b) => {
      const timeA = parseInt(a.attributes?.SentTimestamp || '0');
      const timeB = parseInt(b.attributes?.SentTimestamp || '0');
      return timeB - timeA;
    });

    // Clear and rebuild the display
    this.element.innerHTML = '';

    // Render messages
    sortedMessages.forEach((message, index) => {
      const messageRow = this.createMessageRow(message, index);
      this.element.appendChild(messageRow);

      // Restore expanded state
      if (expandedMessageIds.has(message.messageId)) {
        const messageItem = messageRow;
        messageItem.classList.add('expanded');
        const expandedView = messageItem.querySelector('.message-expanded');
        if (expandedView) {
          expandedView.classList.remove('hidden');
        }
      }
    });

    // Apply filters if any
    const currentFilter = this.messageFilter.getCurrentFilter();
    if (currentFilter) {
      this.applyFilter(currentFilter);
    }

    // Restore scroll position
    messageContainer.scrollTop = scrollTop;
  }
}
