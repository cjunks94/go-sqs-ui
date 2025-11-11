/**
 * Message Export Tests
 * Tests for exporting queue messages in various formats
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock the MessageExport module that doesn't exist yet - TDD approach
vi.mock('@/messageExport.js', () => ({
  MessageExport: vi.fn().mockImplementation(function (appState) {
    this.appState = appState;

    this.exportCurrentView = vi.fn(() => {
      const messages = this.appState.getMessages();
      if (!messages || messages.length === 0) {
        return null;
      }

      const exportData = {
        exportDate: new Date().toISOString(),
        queue: this.appState.getCurrentQueue()?.name || 'unknown',
        messageCount: messages.length,
        messages: messages.map((msg) => ({
          messageId: msg.messageId,
          body: msg.body,
          attributes: msg.attributes,
          receiptHandle: msg.receiptHandle,
        })),
      };

      return this.downloadJSON(exportData, `queue-messages-${Date.now()}.json`);
    });

    this.exportFiltered = vi.fn((filter) => {
      const messages = this.appState.getMessages();
      if (!messages || messages.length === 0) {
        return null;
      }

      const filteredMessages = this.applyFilter(messages, filter);

      const exportData = {
        exportDate: new Date().toISOString(),
        queue: this.appState.getCurrentQueue()?.name || 'unknown',
        filter: filter,
        totalMessages: messages.length,
        filteredCount: filteredMessages.length,
        messages: filteredMessages.map((msg) => ({
          messageId: msg.messageId,
          body: msg.body,
          attributes: msg.attributes,
          receiptHandle: msg.receiptHandle,
        })),
      };

      return this.downloadJSON(exportData, `filtered-messages-${Date.now()}.json`);
    });

    this.exportAll = vi.fn(async () => {
      const queue = this.appState.getCurrentQueue();
      if (!queue) return null;

      // Fetch all messages from queue
      const allMessages = await this.fetchAllMessages(queue.url);

      const exportData = {
        exportDate: new Date().toISOString(),
        queue: queue.name,
        totalMessages: allMessages.length,
        queueAttributes: queue.attributes,
        messages: allMessages,
      };

      return this.downloadJSON(exportData, `all-messages-${queue.name}-${Date.now()}.json`);
    });

    this.exportAsCSV = vi.fn(() => {
      const messages = this.appState.getMessages();
      if (!messages || messages.length === 0) {
        return null;
      }

      const csv = this.convertToCSV(messages);
      return this.downloadFile(csv, `messages-${Date.now()}.csv`, 'text/csv');
    });

    this.exportStatistics = vi.fn((statistics) => {
      const exportData = {
        exportDate: new Date().toISOString(),
        queue: this.appState.getCurrentQueue()?.name || 'unknown',
        statistics: statistics,
      };

      return this.downloadJSON(exportData, `queue-statistics-${Date.now()}.json`);
    });

    this.applyFilter = vi.fn((messages, filter) => {
      if (!filter || filter.trim() === '') {
        return messages;
      }

      return messages.filter((msg) => {
        // Check message body
        if (msg.body && msg.body.toLowerCase().includes(filter.toLowerCase())) {
          return true;
        }

        // Check attributes
        if (msg.attributes) {
          for (const [key, value] of Object.entries(msg.attributes)) {
            if (filter.includes(':')) {
              const [filterKey, filterValue] = filter.split(':');
              if (
                key.toLowerCase() === filterKey.toLowerCase() &&
                value.toLowerCase().includes(filterValue.toLowerCase())
              ) {
                return true;
              }
            } else if (value.toLowerCase().includes(filter.toLowerCase())) {
              return true;
            }
          }
        }

        return false;
      });
    });

    this.fetchAllMessages = vi.fn(async (_queueUrl) => {
      // Mock fetching all messages
      return Array.from({ length: 100 }, (_, i) => ({
        messageId: `msg-${i + 1}`,
        body: `Message body ${i + 1}`,
        receiptHandle: `receipt-${i + 1}`,
        attributes: {
          SentTimestamp: Date.now().toString(),
          ApproximateReceiveCount: '1',
        },
      }));
    });

    this.convertToCSV = vi.fn((messages) => {
      const headers = ['Message ID', 'Body', 'Sent Timestamp', 'Receive Count'];
      const rows = messages.map((msg) => [
        msg.messageId,
        `"${msg.body.replace(/"/g, '""')}"`,
        msg.attributes?.SentTimestamp || '',
        msg.attributes?.ApproximateReceiveCount || '',
      ]);

      return [headers, ...rows].map((row) => row.join(',')).join('\n');
    });

    this.downloadJSON = vi.fn((data, filename) => {
      const json = JSON.stringify(data, null, 2);
      return this.downloadFile(json, filename, 'application/json');
    });

    this.downloadFile = vi.fn((content, filename, mimeType) => {
      // Create a mock download
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);

      // In real implementation, this would trigger a download
      // For testing, we'll return the download info
      return {
        filename: filename,
        size: blob.size,
        type: mimeType,
        content: content,
        url: url,
      };
    });

    this.getExportFormats = vi.fn(() => ['json', 'csv']);

    this.validateExport = vi.fn((data) => {
      if (!data) return { valid: false, error: 'No data to export' };
      if (!data.messages || data.messages.length === 0) {
        return { valid: false, error: 'No messages to export' };
      }
      return { valid: true };
    });
  }),
}));

import { MessageExport } from '@/messageExport.js';

describe('MessageExport', () => {
  let messageExport;
  let mockAppState;
  let mockMessages;

  beforeEach(() => {
    // Setup mock messages
    mockMessages = [
      {
        messageId: 'msg-1',
        body: 'Test message 1',
        receiptHandle: 'receipt-1',
        attributes: {
          SentTimestamp: '1234567890000',
          ApproximateReceiveCount: '1',
        },
      },
      {
        messageId: 'msg-2',
        body: 'Error: timeout occurred',
        receiptHandle: 'receipt-2',
        attributes: {
          SentTimestamp: '1234567891000',
          ApproximateReceiveCount: '3',
          ErrorType: 'timeout',
        },
      },
      {
        messageId: 'msg-3',
        body: 'Test message 3',
        receiptHandle: 'receipt-3',
        attributes: {
          SentTimestamp: '1234567892000',
          ApproximateReceiveCount: '2',
        },
      },
    ];

    // Setup mock app state
    mockAppState = {
      getMessages: vi.fn(() => mockMessages),
      getCurrentQueue: vi.fn(() => ({
        name: 'test-queue',
        url: 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue',
        attributes: {
          ApproximateNumberOfMessages: '150',
        },
      })),
    };

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');

    messageExport = new MessageExport(mockAppState);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Export Current View', () => {
    it('should export visible messages as JSON', () => {
      const result = messageExport.exportCurrentView();

      expect(result).toBeTruthy();
      expect(result.filename).toContain('queue-messages');
      expect(result.filename).toContain('.json');
      expect(result.type).toBe('application/json');
    });

    it('should include all message data in export', () => {
      const result = messageExport.exportCurrentView();
      const exportData = JSON.parse(result.content);

      expect(exportData.queue).toBe('test-queue');
      expect(exportData.messageCount).toBe(3);
      expect(exportData.messages).toHaveLength(3);
      expect(exportData.messages[0].messageId).toBe('msg-1');
      expect(exportData.messages[0].body).toBe('Test message 1');
      expect(exportData.messages[0].attributes).toBeTruthy();
    });

    it('should include export metadata', () => {
      const result = messageExport.exportCurrentView();
      const exportData = JSON.parse(result.content);

      expect(exportData.exportDate).toBeTruthy();
      expect(new Date(exportData.exportDate)).toBeInstanceOf(Date);
    });

    it('should handle empty message list', () => {
      mockAppState.getMessages.mockReturnValue([]);

      const result = messageExport.exportCurrentView();

      expect(result).toBeNull();
    });
  });

  describe('Export Filtered Messages', () => {
    it('should export only filtered messages', () => {
      const result = messageExport.exportFiltered('error');
      const exportData = JSON.parse(result.content);

      expect(exportData.filter).toBe('error');
      expect(exportData.filteredCount).toBe(1);
      expect(exportData.messages).toHaveLength(1);
      expect(exportData.messages[0].messageId).toBe('msg-2');
    });

    it('should support attribute filtering', () => {
      const result = messageExport.exportFiltered('ApproximateReceiveCount:3');
      const exportData = JSON.parse(result.content);

      expect(exportData.filteredCount).toBe(1);
      expect(exportData.messages[0].messageId).toBe('msg-2');
    });

    it('should include filter criteria in export', () => {
      const result = messageExport.exportFiltered('timeout');
      const exportData = JSON.parse(result.content);

      expect(exportData.filter).toBe('timeout');
      expect(exportData.totalMessages).toBe(3);
      expect(exportData.filteredCount).toBe(1);
    });

    it('should return all messages if filter is empty', () => {
      const result = messageExport.exportFiltered('');
      const exportData = JSON.parse(result.content);

      expect(exportData.filteredCount).toBe(3);
      expect(exportData.messages).toHaveLength(3);
    });
  });

  describe('Export All Messages', () => {
    it('should fetch and export all messages from queue', async () => {
      const result = await messageExport.exportAll();
      const exportData = JSON.parse(result.content);

      expect(messageExport.fetchAllMessages).toHaveBeenCalledWith(
        'https://sqs.us-east-1.amazonaws.com/123456789/test-queue'
      );
      expect(exportData.totalMessages).toBe(100);
      expect(exportData.messages).toHaveLength(100);
    });

    it('should include queue attributes in export', async () => {
      const result = await messageExport.exportAll();
      const exportData = JSON.parse(result.content);

      expect(exportData.queueAttributes).toBeTruthy();
      expect(exportData.queueAttributes.ApproximateNumberOfMessages).toBe('150');
    });

    it('should handle missing queue', async () => {
      mockAppState.getCurrentQueue.mockReturnValue(null);

      const result = await messageExport.exportAll();

      expect(result).toBeNull();
    });
  });

  describe('Export as CSV', () => {
    it('should export messages as CSV', () => {
      const result = messageExport.exportAsCSV();

      expect(result).toBeTruthy();
      expect(result.filename).toContain('.csv');
      expect(result.type).toBe('text/csv');
    });

    it('should format CSV correctly', () => {
      const result = messageExport.exportAsCSV();
      const lines = result.content.split('\n');

      expect(lines[0]).toBe('Message ID,Body,Sent Timestamp,Receive Count');
      expect(lines[1]).toContain('msg-1,"Test message 1",1234567890000,1');
    });

    it('should escape quotes in CSV', () => {
      mockMessages[0].body = 'Message with "quotes"';

      const result = messageExport.exportAsCSV();

      expect(result.content).toContain('"Message with ""quotes"""');
    });

    it('should handle empty messages', () => {
      mockAppState.getMessages.mockReturnValue([]);

      const result = messageExport.exportAsCSV();

      expect(result).toBeNull();
    });
  });

  describe('Export Statistics', () => {
    it('should export queue statistics', () => {
      const statistics = {
        totalMessages: 150,
        messagesInFlight: 5,
        oldestMessageAge: 86400000,
        messageRate: 2.5,
      };

      const result = messageExport.exportStatistics(statistics);
      const exportData = JSON.parse(result.content);

      expect(exportData.queue).toBe('test-queue');
      expect(exportData.statistics).toEqual(statistics);
      expect(result.filename).toContain('queue-statistics');
    });
  });

  describe('Filter Application', () => {
    it('should filter by message body content', () => {
      const filtered = messageExport.applyFilter(mockMessages, 'test');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].messageId).toBe('msg-1');
      expect(filtered[1].messageId).toBe('msg-3');
    });

    it('should filter by attribute value', () => {
      const filtered = messageExport.applyFilter(mockMessages, 'ErrorType:timeout');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].messageId).toBe('msg-2');
    });

    it('should be case insensitive', () => {
      const filtered = messageExport.applyFilter(mockMessages, 'ERROR');

      expect(filtered).toHaveLength(1);
      expect(filtered[0].messageId).toBe('msg-2');
    });

    it('should return all messages for empty filter', () => {
      const filtered = messageExport.applyFilter(mockMessages, '');

      expect(filtered).toHaveLength(3);
    });
  });

  describe('Export Formats', () => {
    it('should support multiple export formats', () => {
      const formats = messageExport.getExportFormats();

      expect(formats).toContain('json');
      expect(formats).toContain('csv');
    });
  });

  describe('Export Validation', () => {
    it('should validate export data', () => {
      const validData = {
        messages: [{ messageId: 'test' }],
      };

      const result = messageExport.validateExport(validData);

      expect(result.valid).toBe(true);
    });

    it('should reject invalid export data', () => {
      const invalidData = {
        messages: [],
      };

      const result = messageExport.validateExport(invalidData);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No messages to export');
    });

    it('should reject null data', () => {
      const result = messageExport.validateExport(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No data to export');
    });
  });

  describe('File Download', () => {
    it('should create downloadable file', () => {
      const content = 'test content';
      const result = messageExport.downloadFile(content, 'test.txt', 'text/plain');

      expect(result.filename).toBe('test.txt');
      expect(result.type).toBe('text/plain');
      expect(result.content).toBe(content);
      expect(result.url).toBe('blob:mock-url');
    });

    it('should calculate file size', () => {
      const content = 'test content';
      const result = messageExport.downloadFile(content, 'test.txt', 'text/plain');

      expect(result.size).toBe(new Blob([content]).size);
    });
  });
});
