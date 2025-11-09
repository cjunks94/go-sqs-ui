/**
 * Message Ordering Tests
 * Tests for ensuring messages are properly sorted by timestamp (oldest first)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MessageHandler } from '../static/modules/messageHandler.js';
import { AppState } from '../static/modules/appState.js';

// Mock the dependencies
vi.mock('../static/modules/apiService.js', () => ({
  APIService: {
    deleteMessage: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../static/modules/messageRetry.js', () => ({
  MessageRetry: class {
    attachRetryHandlers() {}
  },
}));

vi.mock('../static/modules/messageFilter.js', () => ({
  MessageFilter: class {
    constructor() {
      this.callbacks = [];
    }
    createFilterUI() {
      return document.createElement('div');
    }
    hasActiveFilters() {
      return false;
    }
    onFilterChange(callback) {
      this.callbacks.push(callback);
    }
    filterMessages(messages) {
      return messages;
    }
  },
}));

vi.mock('../static/modules/enhancedMessageView.js', () => ({
  EnhancedMessageView: class {
    createEnhancedView() {
      return document.createElement('div');
    }
  },
}));

describe('Message Timestamp Ordering', () => {
  let messageHandler;
  let appState;
  let mockElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '<div id="messageList"></div>';
    mockElement = document.getElementById('messageList');

    // Setup dependencies
    appState = new AppState();
    messageHandler = new MessageHandler(appState);
  });

  it('should sort messages by SentTimestamp in descending order (newest first)', () => {
    // Create test messages with different timestamps (current realistic dates)
    const messages = [
      {
        messageId: 'msg1',
        attributes: { SentTimestamp: '1722182400000' }, // July 29, 2025 00:00:00 UTC
        body: 'Message from July 29',
      },
      {
        messageId: 'msg2',
        attributes: { SentTimestamp: '1722355200000' }, // July 30, 2025 24:00:00 UTC (newest)
        body: 'Message from July 30 evening',
      },
      {
        messageId: 'msg3',
        attributes: { SentTimestamp: '1722096000000' }, // July 28, 2025 00:00:00 UTC (oldest)
        body: 'Message from July 28',
      },
      {
        messageId: 'msg4',
        attributes: { SentTimestamp: '1722268800000' }, // July 30, 2025 00:00:00 UTC (middle)
        body: 'Message from July 30 morning',
      },
      {
        messageId: 'msg5',
        attributes: { SentTimestamp: '1722139200000' }, // July 28, 2025 12:00:00 UTC (middle-old)
        body: 'Message from July 28 afternoon',
      },
    ];

    // Display messages
    messageHandler.displayMessages(messages);

    // Get the displayed message elements
    const messageElements = mockElement.querySelectorAll('.message-item');

    // Verify we have all messages
    expect(messageElements).toHaveLength(5);

    // Extract the message IDs in display order
    const displayedOrder = Array.from(messageElements).map((el) => el.dataset.messageId);

    // Expected order: newest to oldest timestamp
    // July 30 evening (msg2) -> July 30 morning (msg4) -> July 29 (msg1) -> July 28 afternoon (msg5) -> July 28 morning (msg3)
    const expectedOrder = ['msg2', 'msg4', 'msg1', 'msg5', 'msg3'];

    expect(displayedOrder).toEqual(expectedOrder);
  });

  it('should handle messages with missing SentTimestamp', () => {
    const messages = [
      {
        messageId: 'msg1',
        attributes: { SentTimestamp: '1722268800000' }, // July 30, 2025 00:00:00 UTC
        body: 'Message with timestamp',
      },
      {
        messageId: 'msg2',
        attributes: {}, // No SentTimestamp
        body: 'Message without timestamp',
      },
      {
        messageId: 'msg3',
        attributes: { SentTimestamp: '1722182400000' }, // July 29, 2025 00:00:00 UTC
        body: 'Another message with timestamp',
      },
    ];

    messageHandler.displayMessages(messages);

    const messageElements = mockElement.querySelectorAll('.message-item');
    expect(messageElements).toHaveLength(3);

    // Messages with timestamps should come first (newest first), then messages without (treated as timestamp 0)
    const displayedOrder = Array.from(messageElements).map((el) => el.dataset.messageId);

    // Expected: msg1 (July 30), msg3 (July 29), msg2 (no timestamp - treated as 0, comes last)
    const expectedOrder = ['msg1', 'msg3', 'msg2'];
    expect(displayedOrder).toEqual(expectedOrder);
  });

  it('should handle string vs number timestamp formats', () => {
    const messages = [
      {
        messageId: 'msg1',
        attributes: { SentTimestamp: '1722268800000' }, // String format - July 30, 2025
        body: 'String timestamp',
      },
      {
        messageId: 'msg2',
        attributes: { SentTimestamp: 1722182400000 }, // Number format - July 29, 2025
        body: 'Number timestamp',
      },
    ];

    messageHandler.displayMessages(messages);

    const messageElements = mockElement.querySelectorAll('.message-item');
    expect(messageElements).toHaveLength(2);

    // Should handle both formats correctly
    const displayedOrder = Array.from(messageElements).map((el) => el.dataset.messageId);

    // msg1 (July 30) should come before msg2 (July 29) - newest first
    expect(displayedOrder).toEqual(['msg1', 'msg2']);
  });

  it('should maintain sort order when messages have identical timestamps', () => {
    const messages = [
      {
        messageId: 'msg1',
        attributes: { SentTimestamp: '1722268800000' }, // July 30, 2025
        body: 'First message',
      },
      {
        messageId: 'msg2',
        attributes: { SentTimestamp: '1722268800000' }, // Same timestamp - July 30, 2025
        body: 'Second message',
      },
      {
        messageId: 'msg3',
        attributes: { SentTimestamp: '1722182400000' }, // Older - July 29, 2025
        body: 'Third message',
      },
    ];

    messageHandler.displayMessages(messages);

    const messageElements = mockElement.querySelectorAll('.message-item');
    expect(messageElements).toHaveLength(3);

    // Messages with same timestamp should maintain relative order, both after older message
    const displayedOrder = Array.from(messageElements).map((el) => el.dataset.messageId);

    // msg1 and msg2 (July 30) should come before msg3 (July 29) - newest first
    expect(displayedOrder.indexOf('msg1')).toBeLessThan(displayedOrder.indexOf('msg3'));
    expect(displayedOrder.indexOf('msg2')).toBeLessThan(displayedOrder.indexOf('msg3'));
  });

  it('should sort messages correctly on append operations', () => {
    // Initial messages
    const initialMessages = [
      {
        messageId: 'msg1',
        attributes: { SentTimestamp: '1722182400000' }, // July 29, 2025
        body: 'Initial message',
      },
    ];

    messageHandler.displayMessages(initialMessages);

    // Append more messages with various timestamps
    const appendMessages = [
      {
        messageId: 'msg2',
        attributes: { SentTimestamp: '1722268800000' }, // July 30, 2025 (newer)
        body: 'Newer message',
      },
      {
        messageId: 'msg3',
        attributes: { SentTimestamp: '1722096000000' }, // July 28, 2025 (older)
        body: 'Older message',
      },
    ];

    messageHandler.displayMessages(appendMessages, true); // append = true

    const messageElements = mockElement.querySelectorAll('.message-item');
    expect(messageElements).toHaveLength(3);

    // Should be sorted newest first across all messages
    const displayedOrder = Array.from(messageElements).map((el) => el.dataset.messageId);

    // Expected: msg2 (July 30) -> msg1 (July 29) -> msg3 (July 28)
    expect(displayedOrder).toEqual(['msg2', 'msg1', 'msg3']);
  });
});
