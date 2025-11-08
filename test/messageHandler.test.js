import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MessageHandler } from '../static/modules/messageHandler.js';
import { APIService } from '../static/modules/apiService.js';
import { EnhancedMessageView } from '../static/modules/enhancedMessageView.js';

// Mock dependencies
vi.mock('../static/modules/apiService.js');
vi.mock('../static/modules/enhancedMessageView.js');

describe('MessageHandler', () => {
  let messageHandler;
  let mockElement;
  let mockAppState;
  let mockEnhancedView;

  beforeEach(() => {
    // Create mock DOM element
    mockElement = document.createElement('div');
    mockElement.id = 'message-list';
    document.body.appendChild(mockElement);

    // Mock app state
    mockAppState = {
      getCurrentQueue: vi.fn(),
      getMessages: vi.fn(),
      setMessages: vi.fn(),
      isMessagesPausedState: vi.fn(() => false),
    };

    // Mock enhanced view
    mockEnhancedView = {
      render: vi.fn(),
    };
    EnhancedMessageView.mockImplementation(() => mockEnhancedView);

    // Create message handler instance
    messageHandler = new MessageHandler('message-list', mockAppState);
  });

  describe('loadMessages', () => {
    it('should load messages for current queue', async () => {
      const mockQueue = { url: 'queue-url', name: 'test-queue' };
      const mockMessages = [
        { messageId: '1', body: 'Message 1', attributes: { SentTimestamp: '1000' } },
        { messageId: '2', body: 'Message 2', attributes: { SentTimestamp: '2000' } },
      ];

      mockAppState.getCurrentQueue.mockReturnValue(mockQueue);
      APIService.getMessages = vi.fn().mockResolvedValue(mockMessages);

      await messageHandler.loadMessages();

      expect(APIService.getMessages).toHaveBeenCalledWith('queue-url', 10);
      expect(mockElement.innerHTML).toContain('message-row');
    });

    it('should show error when loading fails', async () => {
      const mockQueue = { url: 'queue-url', name: 'test-queue' };
      mockAppState.getCurrentQueue.mockReturnValue(mockQueue);
      APIService.getMessages = vi.fn().mockRejectedValue(new Error('Network error'));

      await messageHandler.loadMessages();

      expect(mockElement.innerHTML).toContain('Failed to load messages');
      expect(mockElement.innerHTML).toContain('Network error');
    });

    it('should show message when no queue is selected', async () => {
      mockAppState.getCurrentQueue.mockReturnValue(null);

      await messageHandler.loadMessages();

      expect(mockElement.innerHTML).toContain('Please select a queue');
      expect(APIService.getMessages).not.toHaveBeenCalled();
    });

    it('should show loading state while fetching', async () => {
      const mockQueue = { url: 'queue-url', name: 'test-queue' };
      mockAppState.getCurrentQueue.mockReturnValue(mockQueue);

      let resolvePromise;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      APIService.getMessages = vi.fn().mockReturnValue(promise);

      const loadPromise = messageHandler.loadMessages();
      expect(mockElement.innerHTML).toContain('Loading messages');

      resolvePromise([]);
      await loadPromise;
    });
  });

  describe('displayMessages', () => {
    it('should display messages correctly', () => {
      const messages = [
        { 
          messageId: 'msg-1', 
          body: 'Test message 1',
          receiptHandle: 'receipt-1',
          attributes: { SentTimestamp: '1000' }
        },
        { 
          messageId: 'msg-2', 
          body: 'Test message 2',
          receiptHandle: 'receipt-2',
          attributes: { SentTimestamp: '2000' }
        },
      ];

      mockAppState.getMessages.mockReturnValue(messages);
      messageHandler.displayMessages(messages);

      const rows = mockElement.querySelectorAll('.message-row');
      expect(rows.length).toBe(2);
      expect(mockElement.innerHTML).toContain('Test message 1');
      expect(mockElement.innerHTML).toContain('Test message 2');
    });

    it('should handle empty message list', () => {
      messageHandler.displayMessages([]);

      expect(mockElement.innerHTML).toContain('No messages found');
      expect(mockElement.querySelectorAll('.message-row').length).toBe(0);
    });

    it('should ignore non-array input', () => {
      messageHandler.displayMessages(null);
      messageHandler.displayMessages('not an array');
      messageHandler.displayMessages(123);

      // Should not throw and element should remain unchanged or empty
      expect(mockElement.querySelectorAll('.message-row').length).toBe(0);
    });

    it('should handle append mode', () => {
      const initialMessages = [
        { messageId: '1', body: 'Message 1', attributes: { SentTimestamp: '1000' } }
      ];
      const newMessages = [
        { messageId: '2', body: 'Message 2', attributes: { SentTimestamp: '2000' } }
      ];

      mockAppState.getMessages.mockReturnValue(initialMessages);
      messageHandler.displayMessages(initialMessages);

      mockAppState.getMessages.mockReturnValue([...initialMessages, ...newMessages]);
      messageHandler.displayMessages(newMessages, true); // append mode

      const rows = mockElement.querySelectorAll('.message-row');
      expect(rows.length).toBe(2);
    });

    it('should handle prepend mode for real-time updates', () => {
      const initialMessages = [
        { messageId: '1', body: 'Message 1', attributes: { SentTimestamp: '1000' } }
      ];
      const newMessages = [
        { messageId: '2', body: 'Message 2', attributes: { SentTimestamp: '2000' } }
      ];

      mockAppState.getMessages.mockReturnValue(initialMessages);
      messageHandler.displayMessages(initialMessages);

      mockAppState.getMessages.mockReturnValue([...newMessages, ...initialMessages]);
      messageHandler.displayMessages(newMessages, false, true); // prepend mode

      const rows = mockElement.querySelectorAll('.message-row');
      expect(rows.length).toBe(2);
    });

    it('should sort messages by timestamp (newest first)', () => {
      const messages = [
        { messageId: '1', body: 'Old', attributes: { SentTimestamp: '1000' } },
        { messageId: '2', body: 'New', attributes: { SentTimestamp: '3000' } },
        { messageId: '3', body: 'Middle', attributes: { SentTimestamp: '2000' } },
      ];

      mockAppState.getMessages.mockReturnValue(messages);
      messageHandler.displayMessages(messages);

      const rows = mockElement.querySelectorAll('.message-row');
      expect(rows[0].textContent).toContain('New');
      expect(rows[1].textContent).toContain('Middle');
      expect(rows[2].textContent).toContain('Old');
    });
  });

  describe('createMessageRow', () => {
    it('should create message row with all elements', () => {
      const message = {
        messageId: 'test-123',
        body: 'Test message body that is longer than 100 characters to test truncation functionality in the preview text display',
        receiptHandle: 'receipt-456',
        attributes: {
          SentTimestamp: Date.now().toString(),
          ApproximateReceiveCount: '3',
        }
      };

      const row = messageHandler.createMessageRow(message);

      expect(row.classList.contains('message-row')).toBe(true);
      expect(row.dataset.messageId).toBe('test-123');
      expect(row.querySelector('.message-preview-text').textContent).toContain('...');
      expect(row.querySelector('.message-id-compact').textContent).toContain('test-123');
      expect(row.querySelector('.message-receive-count')).toBeTruthy();
    });

    it('should handle DLQ messages with retry button', () => {
      const message = {
        messageId: 'dlq-msg',
        body: 'Failed message',
        receiptHandle: 'dlq-receipt',
        attributes: {
          SentTimestamp: Date.now().toString(),
          ApproximateReceiveCount: '5',
        }
      };

      const mockQueue = { name: 'test-dlq', url: 'dlq-url' };
      mockAppState.getCurrentQueue.mockReturnValue(mockQueue);

      const row = messageHandler.createMessageRow(message);
      const retryButton = row.querySelector('.retry-button');

      expect(retryButton).toBeTruthy();
      if (retryButton) {
        expect(retryButton.textContent).toContain('Retry');
      }
    });

    it('should handle message click to expand', () => {
      const message = {
        messageId: 'click-test',
        body: 'Clickable message',
        receiptHandle: 'click-receipt',
        attributes: { SentTimestamp: '1000' }
      };

      const row = messageHandler.createMessageRow(message);
      const clickSpy = vi.spyOn(messageHandler, 'toggleMessageDetails');

      // Simulate click
      row.click();

      expect(clickSpy).toHaveBeenCalledWith(row, message);
    });
  });

  describe('toggleMessageDetails', () => {
    it('should toggle message expansion', () => {
      const message = {
        messageId: 'toggle-test',
        body: '{"key": "value"}',
        receiptHandle: 'toggle-receipt',
        attributes: { SentTimestamp: '1000' }
      };

      const row = messageHandler.createMessageRow(message);
      mockElement.appendChild(row);

      // Initial state - collapsed
      expect(row.classList.contains('expanded')).toBe(false);

      // First toggle - expand
      messageHandler.toggleMessageDetails(row, message);
      expect(row.classList.contains('expanded')).toBe(true);
      expect(row.querySelector('.message-details')).toBeTruthy();

      // Second toggle - collapse
      messageHandler.toggleMessageDetails(row, message);
      expect(row.classList.contains('expanded')).toBe(false);
      expect(row.querySelector('.message-details')).toBeFalsy();
    });

    it('should render enhanced view when expanded', () => {
      const message = {
        messageId: 'enhance-test',
        body: '{"data": "test"}',
        receiptHandle: 'enhance-receipt',
        attributes: { SentTimestamp: '1000' }
      };

      const row = messageHandler.createMessageRow(message);
      messageHandler.toggleMessageDetails(row, message);

      expect(EnhancedMessageView).toHaveBeenCalled();
      expect(mockEnhancedView.render).toHaveBeenCalledWith(message);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      const receiptHandle = 'delete-receipt';
      const mockQueue = { url: 'queue-url' };
      mockAppState.getCurrentQueue.mockReturnValue(mockQueue);
      APIService.deleteMessage = vi.fn().mockResolvedValue({ success: true });

      await messageHandler.deleteMessage(receiptHandle);

      expect(APIService.deleteMessage).toHaveBeenCalledWith('queue-url', receiptHandle);
    });

    it('should handle delete failure', async () => {
      const receiptHandle = 'delete-receipt';
      const mockQueue = { url: 'queue-url' };
      mockAppState.getCurrentQueue.mockReturnValue(mockQueue);
      APIService.deleteMessage = vi.fn().mockRejectedValue(new Error('Delete failed'));

      await messageHandler.deleteMessage(receiptHandle);

      expect(mockElement.querySelector('.error-banner')).toBeTruthy();
    });
  });

  describe('loadMoreMessages', () => {
    it('should load additional messages', async () => {
      const mockQueue = { url: 'queue-url' };
      const existingMessages = [
        { messageId: '1', body: 'Existing', attributes: { SentTimestamp: '1000' } }
      ];
      const newMessages = [
        { messageId: '2', body: 'New', attributes: { SentTimestamp: '2000' } }
      ];

      mockAppState.getCurrentQueue.mockReturnValue(mockQueue);
      mockAppState.getMessages.mockReturnValue(existingMessages);
      APIService.getMessages = vi.fn().mockResolvedValue(newMessages);

      await messageHandler.loadMoreMessages();

      expect(APIService.getMessages).toHaveBeenCalled();
      expect(mockAppState.setMessages).toHaveBeenCalledWith(newMessages, true);
    });

    it('should handle no more messages', async () => {
      const mockQueue = { url: 'queue-url' };
      mockAppState.getCurrentQueue.mockReturnValue(mockQueue);
      APIService.getMessages = vi.fn().mockResolvedValue([]);

      await messageHandler.loadMoreMessages();

      const showMoreBtn = mockElement.querySelector('.show-more-btn');
      if (showMoreBtn) {
        expect(showMoreBtn.textContent).toContain('No more messages');
        expect(showMoreBtn.disabled).toBe(true);
      }
    });
  });

  describe('addNewMessages', () => {
    it('should add new messages without duplicates', () => {
      const existingMessages = [
        { messageId: '1', body: 'Existing', attributes: { SentTimestamp: '1000' } }
      ];
      const newMessages = [
        { messageId: '1', body: 'Duplicate', attributes: { SentTimestamp: '1000' } },
        { messageId: '2', body: 'New', attributes: { SentTimestamp: '2000' } }
      ];

      mockAppState.getMessages.mockReturnValue(existingMessages);
      messageHandler.displayMessages(existingMessages);

      messageHandler.addNewMessages(newMessages);

      // Should only add the truly new message
      const rows = mockElement.querySelectorAll('.message-row');
      expect(rows.length).toBe(2); // 1 existing + 1 new (not 3)
    });
  });

  describe('UI interactions', () => {
    it('should show error banner', () => {
      messageHandler.showErrorBanner('Test error message');

      const banner = mockElement.querySelector('.error-banner');
      expect(banner).toBeTruthy();
      expect(banner.textContent).toContain('Test error message');
    });

    it('should refresh messages', async () => {
      const mockQueue = { url: 'queue-url' };
      mockAppState.getCurrentQueue.mockReturnValue(mockQueue);
      APIService.getMessages = vi.fn().mockResolvedValue([]);

      await messageHandler.refreshMessages();

      expect(APIService.getMessages).toHaveBeenCalled();
    });

    it('should handle keyboard navigation selection', () => {
      const messages = [
        { messageId: '1', body: 'Message 1', attributes: { SentTimestamp: '1000' } },
        { messageId: '2', body: 'Message 2', attributes: { SentTimestamp: '2000' } }
      ];

      mockAppState.getMessages.mockReturnValue(messages);
      messageHandler.displayMessages(messages);

      const rows = mockElement.querySelectorAll('.message-row');
      
      // Select first message
      messageHandler.selectMessage(0);
      expect(rows[0].classList.contains('selected')).toBe(true);

      // Select second message
      messageHandler.selectMessage(1);
      expect(rows[0].classList.contains('selected')).toBe(false);
      expect(rows[1].classList.contains('selected')).toBe(true);
    });
  });

  describe('message formatting', () => {
    it('should format timestamps correctly', () => {
      const timestamp = messageHandler.createTimestamp({
        attributes: { SentTimestamp: '1609459200000' } // 2021-01-01 00:00:00 UTC
      });

      expect(timestamp.className).toBe('message-timestamp');
      expect(timestamp.textContent).toBeTruthy();
    });

    it('should truncate long message previews', () => {
      const longMessage = 'a'.repeat(150);
      const preview = messageHandler.createPreviewText({
        body: longMessage,
        messageId: 'long',
        attributes: {}
      });

      expect(preview.textContent.length).toBeLessThan(longMessage.length);
      expect(preview.textContent).toContain('...');
    });

    it('should handle JSON body formatting', () => {
      const jsonBody = JSON.stringify({ key: 'value', nested: { data: 'test' } });
      const message = {
        messageId: 'json-msg',
        body: jsonBody,
        attributes: { SentTimestamp: '1000' }
      };

      const row = messageHandler.createMessageRow(message);
      messageHandler.toggleMessageDetails(row, message);

      expect(mockEnhancedView.render).toHaveBeenCalled();
    });
  });
});