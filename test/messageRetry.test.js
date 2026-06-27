/**
 * Message Retry Tests
 * Tests for retrying DLQ messages
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { MessageRetry } from '../internal/static/files/modules/messageRetry.js';
import { APIService } from '../internal/static/files/modules/apiService.js';

vi.mock('../internal/static/files/modules/apiService.js');

describe('MessageRetry', () => {
  let messageRetry;
  let mockAppState;

  beforeEach(() => {
    mockAppState = {
      getCurrentQueue: vi.fn().mockReturnValue({
        url: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-dlq',
        name: 'test-queue-dlq',
      }),
    };
    messageRetry = new MessageRetry(mockAppState);
    vi.clearAllMocks();
  });

  describe('retryMessage', () => {
    it('should retry a message to the source queue', async () => {
      const mockMessage = {
        messageId: '123',
        body: '{"test": "data"}',
        receiptHandle: 'receipt-123',
      };
      const targetQueue = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

      APIService.retryMessage.mockResolvedValue({ messageId: 'new-123' });

      const result = await messageRetry.retryMessage(mockMessage, targetQueue);

      expect(APIService.retryMessage).toHaveBeenCalledWith(
        mockAppState.getCurrentQueue().url,
        mockMessage,
        targetQueue
      );
      expect(result.messageId).toBe('new-123');
    });

    it('prefers the queue.sourceQueueUrl (RedrivePolicy-derived) over the name', async () => {
      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue',
        name: 'demo-deadletter-queue', // would NOT resolve via name heuristic
        sourceQueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue',
      });
      APIService.retryMessage.mockResolvedValue({ messageId: 'new-1' });

      await messageRetry.retryMessage({ messageId: '1', body: '{}', receiptHandle: 'r1' });

      expect(APIService.retryMessage).toHaveBeenCalledWith(
        'https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue',
        expect.any(Object),
        'https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue'
      );
    });

    it('falls back to the live DLQ map when sourceQueueUrl was not cached', async () => {
      // DLQ selected before its source page loaded → sourceQueueUrl is null,
      // but appState's map has since been rebuilt.
      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue',
        name: 'demo-deadletter-queue',
        sourceQueueUrl: null,
      });
      mockAppState.getSourceQueueUrl = vi
        .fn()
        .mockReturnValue('https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue');
      APIService.retryMessage.mockResolvedValue({ messageId: 'new-1' });

      await messageRetry.retryMessage({ messageId: '1', body: '{}', receiptHandle: 'r1' });

      expect(mockAppState.getSourceQueueUrl).toHaveBeenCalledWith(
        'https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue'
      );
      expect(APIService.retryMessage).toHaveBeenCalledWith(
        'https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue',
        expect.any(Object),
        'https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue'
      );
    });

    it('should handle retry errors', async () => {
      const mockMessage = {
        messageId: '123',
        body: '{"test": "data"}',
        receiptHandle: 'receipt-123',
      };

      APIService.retryMessage.mockRejectedValue(new Error('Retry failed'));

      await expect(messageRetry.retryMessage(mockMessage)).rejects.toThrow('Retry failed');
    });
  });

  describe('getSourceQueueUrl', () => {
    it('should derive source queue URL from DLQ name', () => {
      const sourceUrl = messageRetry.getSourceQueueUrl('test-queue-dlq');
      expect(sourceUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue');
    });

    it('should handle _dlq suffix', () => {
      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'https://sqs.us-east-1.amazonaws.com/123456789012/test_queue_dlq',
        name: 'test_queue_dlq',
      });
      const retry = new MessageRetry(mockAppState);
      const sourceUrl = retry.getSourceQueueUrl('test_queue_dlq');
      expect(sourceUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789012/test_queue');
    });

    it('should handle uppercase DLQ suffix', () => {
      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-DLQ',
        name: 'test-queue-DLQ',
      });
      const retry = new MessageRetry(mockAppState);
      const sourceUrl = retry.getSourceQueueUrl('test-queue-DLQ');
      expect(sourceUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue');
    });
  });

  describe('attachRetryHandlers', () => {
    it('should attach click handlers to retry buttons', () => {
      document.body.innerHTML = `
                <button class="retry-btn" data-message-id="123">Retry</button>
                <button class="retry-btn" data-message-id="456">Retry</button>
            `;

      const mockMessages = [
        { messageId: '123', body: '{"test": 1}' },
        { messageId: '456', body: '{"test": 2}' },
      ];

      messageRetry.attachRetryHandlers(mockMessages);

      const buttons = document.querySelectorAll('.retry-btn');
      expect(buttons.length).toBe(2);

      // Test that handlers are attached
      buttons.forEach((btn) => {
        expect(btn.onclick).toBeTruthy();
      });
    });
  });

  describe('showRetryStatus', () => {
    it('should show success status', () => {
      const button = document.createElement('button');
      messageRetry.showRetryStatus(button, 'success', 'Message retried!');

      expect(button.textContent).toBe('Message retried!');
      expect(button.classList.contains('btn-success')).toBe(true);
      expect(button.disabled).toBe(true);
    });

    it('should show error status', () => {
      const button = document.createElement('button');
      messageRetry.showRetryStatus(button, 'error', 'Retry failed');

      expect(button.textContent).toBe('Retry failed');
      expect(button.classList.contains('btn-danger')).toBe(true);
      expect(button.disabled).toBe(false);
    });
  });
});
