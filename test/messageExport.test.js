/**
 * Message Export Tests
 * Tests for exporting queue messages in various formats
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { MessageExport } from '../static/modules/messageExport.js';
import { APIService } from '../static/modules/apiService.js';

// Mock only external dependencies
vi.mock('../static/modules/apiService.js', () => ({
  APIService: {
    getMessages: vi.fn(),
  },
}));

describe('MessageExport', () => {
  let messageExport;
  let mockAppState;
  let mockMessages;
  let mockQueue;

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock messages
    mockMessages = [
      {
        messageId: 'msg-1',
        body: '{"orderId": "12345", "amount": 99.99}',
        attributes: {
          SentTimestamp: '1640995200000',
          ApproximateReceiveCount: '1',
        },
        receiptHandle: 'receipt-1',
      },
      {
        messageId: 'msg-2',
        body: '{"orderId": "12346", "amount": 149.99}',
        attributes: {
          SentTimestamp: '1640995300000',
          ApproximateReceiveCount: '2',
        },
        receiptHandle: 'receipt-2',
      },
    ];

    // Mock queue
    mockQueue = {
      name: 'test-queue',
      url: 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue',
      attributes: {
        ApproximateNumberOfMessages: '150',
      },
    };

    // Mock app state
    mockAppState = {
      getMessages: vi.fn(() => mockMessages),
      getCurrentQueue: vi.fn(() => mockQueue),
    };

    messageExport = new MessageExport(mockAppState);

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    // Clean up any created elements
    document.body.innerHTML = '';
  });

  describe('Initialization', () => {
    it('should initialize with appState', () => {
      expect(messageExport.appState).toBe(mockAppState);
    });
  });

  describe('Export Current View', () => {
    it('should export current messages as JSON', () => {
      const result = messageExport.exportCurrentView();

      expect(result).toBeTruthy();
      expect(result.filename).toMatch(/queue-messages-\d+\.json/);
      expect(result.type).toBe('application/json');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should include export metadata', () => {
      const result = messageExport.exportCurrentView();
      const data = JSON.parse(result.content);

      expect(data).toHaveProperty('exportDate');
      expect(data).toHaveProperty('queue', 'test-queue');
      expect(data).toHaveProperty('messageCount', 2);
      expect(data).toHaveProperty('messages');
    });

    it('should sanitize messages in export', () => {
      const result = messageExport.exportCurrentView();
      const data = JSON.parse(result.content);

      expect(data.messages[0]).toHaveProperty('messageId', 'msg-1');
      expect(data.messages[0]).toHaveProperty('body');
      expect(data.messages[0]).toHaveProperty('attributes');
      expect(data.messages[0]).toHaveProperty('receiptHandle');
    });

    it('should return null when no messages', () => {
      mockAppState.getMessages.mockReturnValue([]);
      const result = messageExport.exportCurrentView();
      expect(result).toBeNull();
    });

    it('should return null when messages is null', () => {
      mockAppState.getMessages.mockReturnValue(null);
      const result = messageExport.exportCurrentView();
      expect(result).toBeNull();
    });
  });

  describe('Export Filtered Messages', () => {
    it('should export filtered messages', () => {
      const result = messageExport.exportFiltered('12345');

      expect(result).toBeTruthy();
      expect(result.filename).toMatch(/filtered-messages-\d+\.json/);
    });

    it('should include filter information', () => {
      const result = messageExport.exportFiltered('12345');
      const data = JSON.parse(result.content);

      expect(data).toHaveProperty('filter', '12345');
      expect(data).toHaveProperty('totalMessages', 2);
      expect(data).toHaveProperty('filteredCount', 1);
    });

    it('should apply filter correctly', () => {
      const result = messageExport.exportFiltered('12345');
      const data = JSON.parse(result.content);

      expect(data.messages).toHaveLength(1);
      expect(data.messages[0].messageId).toBe('msg-1');
    });

    it('should return all messages when filter is empty', () => {
      const result = messageExport.exportFiltered('');
      const data = JSON.parse(result.content);

      expect(data.filteredCount).toBe(2);
      expect(data.messages).toHaveLength(2);
    });

    it('should return null when no messages', () => {
      mockAppState.getMessages.mockReturnValue([]);
      const result = messageExport.exportFiltered('test');
      expect(result).toBeNull();
    });
  });

  describe('Export All Messages', () => {
    beforeEach(() => {
      APIService.getMessages.mockResolvedValue([
        { messageId: 'msg-1', body: 'test1' },
        { messageId: 'msg-2', body: 'test2' },
      ]);
    });

    it('should fetch and export all messages', async () => {
      const result = await messageExport.exportAll();

      expect(result).toBeTruthy();
      expect(result.filename).toMatch(/all-messages-test-queue-\d+\.json/);
      expect(APIService.getMessages).toHaveBeenCalled();
    });

    it('should include queue attributes in export', async () => {
      const result = await messageExport.exportAll();
      const data = JSON.parse(result.content);

      expect(data).toHaveProperty('queueAttributes');
      expect(data.queueAttributes).toEqual(mockQueue.attributes);
    });

    it('should return null when no queue selected', async () => {
      mockAppState.getCurrentQueue.mockReturnValue(null);
      const result = await messageExport.exportAll();
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      APIService.getMessages.mockRejectedValue(new Error('API Error'));

      const result = await messageExport.exportAll();

      // fetchAllMessages catches errors internally and returns empty array,
      // so exportAll succeeds with 0 messages instead of returning null
      expect(result).toBeTruthy();
      expect(result.filename).toBeDefined();
    });
  });

  describe('Export as CSV', () => {
    it('should export messages as CSV', () => {
      const result = messageExport.exportAsCSV();

      expect(result).toBeTruthy();
      expect(result.filename).toMatch(/messages-\d+\.csv/);
      expect(result.type).toBe('text/csv');
    });

    it('should generate valid CSV content', () => {
      const result = messageExport.exportAsCSV();
      const lines = result.content.split('\n');

      // Check header
      expect(lines[0]).toContain('Message ID');
      expect(lines[0]).toContain('Body');
      expect(lines[0]).toContain('Sent Timestamp');
      expect(lines[0]).toContain('Receive Count');

      // Check data rows
      expect(lines[1]).toContain('msg-1');
      expect(lines[2]).toContain('msg-2');
    });

    it('should escape quotes in CSV body', () => {
      mockMessages[0].body = 'Test "quoted" text';
      const result = messageExport.exportAsCSV();

      expect(result.content).toContain('""quoted""');
    });

    it('should return null when no messages', () => {
      mockAppState.getMessages.mockReturnValue([]);
      const result = messageExport.exportAsCSV();
      expect(result).toBeNull();
    });
  });

  describe('Export Statistics', () => {
    it('should export statistics', () => {
      const stats = {
        totalMessages: 150,
        messagesInFlight: 10,
        messageRate: 5.2,
      };

      const result = messageExport.exportStatistics(stats);

      expect(result).toBeTruthy();
      expect(result.filename).toMatch(/queue-statistics-\d+\.json/);
    });

    it('should include statistics in export', () => {
      const stats = {
        totalMessages: 150,
        messagesInFlight: 10,
      };

      const result = messageExport.exportStatistics(stats);
      const data = JSON.parse(result.content);

      expect(data.statistics).toEqual(stats);
      expect(data.statistics.totalMessages).toBe(150);
    });
  });

  describe('Apply Filter', () => {
    it('should filter by body content (case-insensitive)', () => {
      const filtered = messageExport.applyFilter(mockMessages, '12345');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].messageId).toBe('msg-1');
    });

    it('should filter by attribute key:value', () => {
      const filtered = messageExport.applyFilter(mockMessages, 'ApproximateReceiveCount:2');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].messageId).toBe('msg-2');
    });

    it('should filter by attribute value', () => {
      const filtered = messageExport.applyFilter(mockMessages, '1640995200000');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].messageId).toBe('msg-1');
    });

    it('should return all messages when filter is empty', () => {
      const filtered = messageExport.applyFilter(mockMessages, '');
      expect(filtered).toHaveLength(2);
    });

    it('should return all messages when filter is whitespace', () => {
      const filtered = messageExport.applyFilter(mockMessages, '   ');
      expect(filtered).toHaveLength(2);
    });

    it('should handle messages with different property casing', () => {
      const messages = [
        { Body: 'test UPPER', attributes: {} },
        { body: 'test lower', attributes: {} },
      ];

      const filtered = messageExport.applyFilter(messages, 'test');
      expect(filtered).toHaveLength(2);
    });

    it('should return empty array when no matches', () => {
      const filtered = messageExport.applyFilter(mockMessages, 'nonexistent');
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Fetch All Messages', () => {
    it('should fetch messages with pagination', async () => {
      // First batch: 10 messages (triggers another fetch)
      const firstBatch = Array.from({ length: 10 }, (_, i) => ({ id: `${i + 1}` }));
      // Second batch: 3 messages (< 10, so stops)
      const secondBatch = [{ id: '11' }, { id: '12' }, { id: '13' }];

      APIService.getMessages.mockResolvedValueOnce(firstBatch).mockResolvedValueOnce(secondBatch);

      const messages = await messageExport.fetchAllMessages('test-queue-url');

      expect(messages).toHaveLength(13);
      expect(APIService.getMessages).toHaveBeenCalledTimes(2);
    });

    it('should stop when less than 10 messages returned', async () => {
      APIService.getMessages.mockResolvedValue([{ id: '1' }, { id: '2' }]);

      const messages = await messageExport.fetchAllMessages('test-queue-url');

      expect(messages).toHaveLength(2);
      expect(APIService.getMessages).toHaveBeenCalledTimes(1);
    });

    it('should limit to 1000 messages', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockBatch = new Array(100).fill({ id: 'msg' });
      APIService.getMessages.mockResolvedValue(mockBatch);

      const messages = await messageExport.fetchAllMessages('test-queue-url');

      expect(messages.length).toBe(1000);
      expect(consoleSpy).toHaveBeenCalledWith('Limiting export to 1000 messages');
      consoleSpy.mockRestore();
    });

    it('should stop after max attempts', async () => {
      APIService.getMessages.mockResolvedValue(new Array(10).fill({ id: 'msg' }));

      const _messages = await messageExport.fetchAllMessages('test-queue-url');

      expect(APIService.getMessages).toHaveBeenCalledTimes(100); // maxAttempts
    });

    it('should handle API errors gracefully', async () => {
      APIService.getMessages.mockResolvedValueOnce([{ id: '1' }]).mockRejectedValueOnce(new Error('API Error'));

      const messages = await messageExport.fetchAllMessages('test-queue-url');

      expect(messages).toHaveLength(1);
    });

    it('should stop when no messages returned', async () => {
      APIService.getMessages.mockResolvedValue([]);

      const messages = await messageExport.fetchAllMessages('test-queue-url');

      expect(messages).toHaveLength(0);
      expect(APIService.getMessages).toHaveBeenCalledTimes(1);
    });
  });

  describe('Convert to CSV', () => {
    it('should generate CSV with headers', () => {
      const csv = messageExport.convertToCSV(mockMessages);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Message ID,Body,Sent Timestamp,Receive Count');
    });

    it('should convert messages to CSV rows', () => {
      const csv = messageExport.convertToCSV(mockMessages);
      const lines = csv.split('\n');

      expect(lines).toHaveLength(3); // Header + 2 messages
      expect(lines[1]).toContain('msg-1');
      expect(lines[2]).toContain('msg-2');
    });

    it('should escape quotes in body', () => {
      mockMessages[0].body = 'Test "quoted" text';
      const csv = messageExport.convertToCSV(mockMessages);

      expect(csv).toContain('""quoted""');
    });

    it('should handle missing attributes', () => {
      const messages = [{ messageId: 'msg-1', body: 'test' }];
      const csv = messageExport.convertToCSV(messages);

      expect(csv).toContain('msg-1');
      expect(csv.split('\n')).toHaveLength(2);
    });

    it('should handle MessageId vs messageId', () => {
      const messages = [
        { MessageId: 'msg-1', Body: 'test1' },
        { messageId: 'msg-2', body: 'test2' },
      ];

      const csv = messageExport.convertToCSV(messages);
      const lines = csv.split('\n');

      expect(lines[1]).toContain('msg-1');
      expect(lines[2]).toContain('msg-2');
    });
  });

  describe('Sanitize Message', () => {
    it('should normalize message properties', () => {
      const message = {
        MessageId: 'msg-1',
        Body: 'test body',
        Attributes: { key: 'value' },
        ReceiptHandle: 'receipt-1',
      };

      const sanitized = messageExport.sanitizeMessage(message);

      expect(sanitized).toEqual({
        messageId: 'msg-1',
        body: 'test body',
        attributes: { key: 'value' },
        receiptHandle: 'receipt-1',
      });
    });

    it('should handle lowercase properties', () => {
      const message = {
        messageId: 'msg-1',
        body: 'test body',
        attributes: { key: 'value' },
        receiptHandle: 'receipt-1',
      };

      const sanitized = messageExport.sanitizeMessage(message);

      expect(sanitized.messageId).toBe('msg-1');
      expect(sanitized.body).toBe('test body');
    });

    it('should handle mixed case properties', () => {
      const message = {
        MessageId: 'msg-1',
        body: 'test body',
        Attributes: { key: 'value' },
        receiptHandle: 'receipt-1',
      };

      const sanitized = messageExport.sanitizeMessage(message);

      expect(sanitized.messageId).toBe('msg-1');
      expect(sanitized.body).toBe('test body');
    });
  });

  describe('Generate Filename', () => {
    it('should generate filename with prefix and extension', () => {
      const filename = messageExport.generateFilename('test', 'json');
      expect(filename).toMatch(/^test-\d+\.json$/);
    });

    it('should include timestamp in filename', () => {
      const before = Date.now();
      const filename = messageExport.generateFilename('export', 'csv');
      const after = Date.now();

      const timestamp = parseInt(filename.match(/export-(\d+)\.csv/)[1]);
      expect(timestamp).toBeGreaterThanOrEqual(before);
      expect(timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Get Export Formats', () => {
    it('should return available formats', () => {
      const formats = messageExport.getExportFormats();
      expect(formats).toEqual(['json', 'csv']);
    });
  });

  describe('Validate Export', () => {
    it('should validate export with messages', () => {
      const data = { messages: [{ id: '1' }] };
      const result = messageExport.validateExport(data);

      expect(result.valid).toBe(true);
    });

    it('should invalidate null data', () => {
      const result = messageExport.validateExport(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No data to export');
    });

    it('should invalidate data with no messages', () => {
      const data = { messages: [] };
      const result = messageExport.validateExport(data);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No messages to export');
    });

    it('should invalidate data with null messages', () => {
      const data = { messages: null };
      const result = messageExport.validateExport(data);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No messages to export');
    });
  });

  describe('Download File', () => {
    it('should create blob and download link', () => {
      const result = messageExport.downloadFile('test content', 'test.txt', 'text/plain');

      expect(result.filename).toBe('test.txt');
      expect(result.type).toBe('text/plain');
      expect(result.content).toBe('test content');
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should trigger download', () => {
      messageExport.downloadFile('test', 'test.txt', 'text/plain');

      // Link should be created and clicked (mocked in implementation)
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('should clean up object URL after timeout', () => {
      vi.useFakeTimers();
      messageExport.downloadFile('test', 'test.txt', 'text/plain');

      vi.advanceTimersByTime(100);

      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should return download info', () => {
      const result = messageExport.downloadFile('test content', 'file.json', 'application/json');

      expect(result).toHaveProperty('filename', 'file.json');
      expect(result).toHaveProperty('type', 'application/json');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('url');
    });
  });

  describe('Download JSON', () => {
    it('should download data as formatted JSON', () => {
      const data = { test: 'value', number: 123 };
      const result = messageExport.downloadJSON(data, 'test.json');

      expect(result.type).toBe('application/json');
      expect(result.filename).toBe('test.json');

      const parsed = JSON.parse(result.content);
      expect(parsed).toEqual(data);
    });

    it('should format JSON with indentation', () => {
      const data = { test: 'value' };
      const result = messageExport.downloadJSON(data, 'test.json');

      expect(result.content).toContain('\n');
      expect(result.content).toContain('  '); // 2-space indentation
    });
  });

  describe('Show Export Menu', () => {
    it('should create export menu element', () => {
      const menu = messageExport.showExportMenu();

      expect(menu.className).toBe('export-menu');
      expect(menu.querySelector('h3').textContent).toBe('Export Messages');
    });

    it('should have all export options', () => {
      const menu = messageExport.showExportMenu();

      expect(menu.querySelector('[data-action="current-json"]')).toBeTruthy();
      expect(menu.querySelector('[data-action="current-csv"]')).toBeTruthy();
      expect(menu.querySelector('[data-action="filtered"]')).toBeTruthy();
      expect(menu.querySelector('[data-action="all"]')).toBeTruthy();
      expect(menu.querySelector('[data-action="statistics"]')).toBeTruthy();
    });

    it('should have cancel button', () => {
      const menu = messageExport.showExportMenu();
      expect(menu.querySelector('.export-cancel')).toBeTruthy();
    });

    it('should attach click handlers to options', () => {
      const menu = messageExport.showExportMenu();
      const spy = vi.spyOn(messageExport, 'handleExportAction');

      const option = menu.querySelector('[data-action="current-json"]');
      option.click();

      expect(spy).toHaveBeenCalledWith('current-json');
    });

    it('should remove menu when cancel is clicked', () => {
      const menu = messageExport.showExportMenu();
      document.body.appendChild(menu);

      const cancelBtn = menu.querySelector('.export-cancel');
      cancelBtn.click();

      expect(document.body.contains(menu)).toBe(false);
    });
  });

  describe('Handle Export Action', () => {
    it('should call exportCurrentView for current-json action', async () => {
      const spy = vi.spyOn(messageExport, 'exportCurrentView');
      await messageExport.handleExportAction('current-json');
      expect(spy).toHaveBeenCalled();
    });

    it('should call exportAsCSV for current-csv action', async () => {
      const spy = vi.spyOn(messageExport, 'exportAsCSV');
      await messageExport.handleExportAction('current-csv');
      expect(spy).toHaveBeenCalled();
    });

    it('should call exportFiltered for filtered action', async () => {
      document.body.innerHTML = '<input class="filter-input" value="test" />';
      const spy = vi.spyOn(messageExport, 'exportFiltered');

      await messageExport.handleExportAction('filtered');

      expect(spy).toHaveBeenCalledWith('test');
    });

    it('should call exportAll for all action', async () => {
      APIService.getMessages.mockResolvedValue([]);
      const spy = vi.spyOn(messageExport, 'exportAll');

      await messageExport.handleExportAction('all');

      expect(spy).toHaveBeenCalled();
    });

    it('should call exportStatistics for statistics action', async () => {
      const spy = vi.spyOn(messageExport, 'exportStatistics');
      global.window.app = {
        queueStatistics: {
          getStatistics: () => ({ total: 100 }),
        },
      };

      await messageExport.handleExportAction('statistics');

      expect(spy).toHaveBeenCalledWith({ total: 100 });

      delete global.window.app;
    });
  });
});
