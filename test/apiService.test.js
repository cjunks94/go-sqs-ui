import { describe, it, expect, beforeEach, vi } from 'vitest';

import { APIService } from '../static/modules/apiService.js';

// Mock fetch globally
global.fetch = vi.fn();

describe('APIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('request method', () => {
    it('should make successful API request', async () => {
      const mockResponse = { data: 'test' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await APIService.request('/test');

      expect(fetch).toHaveBeenCalledWith('/test', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(APIService.request('/test')).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(APIService.request('/test')).rejects.toThrow('Network error');
    });

    it('should merge custom headers', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await APIService.request('/test', {
        headers: { Authorization: 'Bearer token' },
      });

      const [url, options] = fetch.mock.calls[0];
      expect(url).toBe('/test');
      expect(options.headers).toEqual({
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      });
    });
  });

  describe('AWS Context API', () => {
    it('should call getAWSContext endpoint', async () => {
      const mockContext = { mode: 'Live AWS', region: 'us-east-1' };
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContext),
      });

      const result = await APIService.getAWSContext();

      expect(fetch).toHaveBeenCalledWith('/api/aws-context', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockContext);
    });
  });

  describe('Queue API', () => {
    it('should call getQueues with default limit', async () => {
      const mockQueues = [{ name: 'queue1' }, { name: 'queue2' }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockQueues),
      });

      const result = await APIService.getQueues();

      expect(fetch).toHaveBeenCalledWith('/api/queues?limit=20', {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockQueues);
    });

    it('should call getQueues with custom limit', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      await APIService.getQueues(50);

      expect(fetch).toHaveBeenCalledWith('/api/queues?limit=50', {
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });

  describe('Message API', () => {
    it('should call getMessages with encoded queue URL', async () => {
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const mockMessages = [{ messageId: '1', body: 'test' }];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      });

      const result = await APIService.getMessages(queueUrl);

      expect(fetch).toHaveBeenCalledWith(`/api/queues/${encodeURIComponent(queueUrl)}/messages?limit=10`, {
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockMessages);
    });

    it('should send message with POST request', async () => {
      const queueUrl = 'https://test.com/queue';
      const messageBody = 'test message';
      const mockResponse = { messageId: '123' };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await APIService.sendMessage(queueUrl, messageBody);

      expect(fetch).toHaveBeenCalledWith(`/api/queues/${encodeURIComponent(queueUrl)}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: messageBody }),
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should delete message with DELETE request', async () => {
      const queueUrl = 'https://test.com/queue';
      const receiptHandle = 'receipt123';

      fetch.mockResolvedValueOnce({ ok: true });

      await APIService.deleteMessage(queueUrl, receiptHandle);

      expect(fetch).toHaveBeenCalledWith(
        `/api/queues/${encodeURIComponent(queueUrl)}/messages/${encodeURIComponent(receiptHandle)}`,
        { method: 'DELETE' }
      );
    });

    it('should throw error on delete message failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(APIService.deleteMessage('url', 'handle')).rejects.toThrow('HTTP 500: Internal Server Error');
    });
  });
});
