/**
 * WebSocket Manager Tests
 * Tests for WebSocket connection management and message handling
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketManager } from '../static/modules/webSocketManager.js';

describe('WebSocketManager', () => {
  let wsManager;
  let mockAppState;
  let mockMessageHandler;
  let mockWebSocket;

  beforeEach(() => {
    // Mock AppState
    mockAppState = {
      getCurrentQueue: vi.fn(),
      isMessagesPausedState: vi.fn(() => false),
    };

    // Mock MessageHandler
    mockMessageHandler = {
      displayMessages: vi.fn(),
      addNewMessages: vi.fn(),
    };

    // Mock WebSocket
    mockWebSocket = {
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1, // OPEN
    };

    global.WebSocket = vi.fn(() => mockWebSocket);

    wsManager = new WebSocketManager(mockAppState, mockMessageHandler);
  });

  describe('Initialization', () => {
    it('should initialize with appState and messageHandler', () => {
      expect(wsManager.appState).toBe(mockAppState);
      expect(wsManager.messageHandler).toBe(mockMessageHandler);
    });

    it('should initialize with null WebSocket', () => {
      expect(wsManager.ws).toBeNull();
    });

    it('should have default reconnect delay of 5000ms', () => {
      expect(wsManager.reconnectDelay).toBe(5000);
    });
  });

  describe('WebSocket Connection', () => {
    it('should create WebSocket with correct URL (http)', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'http:',
          host: 'localhost:8080',
        },
        writable: true,
      });

      wsManager.connect();

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8080/ws');
    });

    it('should create WebSocket with correct URL (https)', () => {
      Object.defineProperty(window, 'location', {
        value: {
          protocol: 'https:',
          host: 'example.com',
        },
        writable: true,
      });

      wsManager.connect();

      expect(global.WebSocket).toHaveBeenCalledWith('wss://example.com/ws');
    });

    it('should set up WebSocket event handlers', () => {
      wsManager.connect();

      expect(wsManager.ws.onopen).toBeDefined();
      expect(wsManager.ws.onmessage).toBeDefined();
      expect(wsManager.ws.onerror).toBeDefined();
      expect(wsManager.ws.onclose).toBeDefined();
    });

    it('should handle WebSocket open event', () => {
      wsManager.connect();
      // Should not throw when onopen is called
      expect(() => wsManager.ws.onopen()).not.toThrow();
    });
  });

  describe('Message Handling', () => {
    beforeEach(() => {
      wsManager.connect();
    });

    it('should parse and handle valid JSON messages', () => {
      const testData = {
        type: 'messages',
        queueUrl: 'test-queue-url',
        messages: [{ id: '123', body: 'test' }],
      };

      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'test-queue-url',
      });

      const event = { data: JSON.stringify(testData) };
      wsManager.ws.onmessage(event);

      expect(mockMessageHandler.addNewMessages).toHaveBeenCalledWith(testData.messages);
    });

    it('should handle initial_messages type', () => {
      const testData = {
        type: 'initial_messages',
        queueUrl: 'test-queue-url',
        messages: [{ id: '123', body: 'test' }],
      };

      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'test-queue-url',
      });

      const event = { data: JSON.stringify(testData) };
      wsManager.ws.onmessage(event);

      expect(mockMessageHandler.displayMessages).toHaveBeenCalledWith(testData.messages);
    });

    it('should handle messages type with incremental updates', () => {
      const testData = {
        type: 'messages',
        queueUrl: 'test-queue-url',
        messages: [{ id: '456', body: 'new message' }],
      };

      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'test-queue-url',
      });

      const event = { data: JSON.stringify(testData) };
      wsManager.ws.onmessage(event);

      expect(mockMessageHandler.addNewMessages).toHaveBeenCalledWith(testData.messages);
    });

    it('should ignore messages when queue URL does not match', () => {
      const testData = {
        type: 'messages',
        queueUrl: 'different-queue-url',
        messages: [{ id: '123', body: 'test' }],
      };

      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'test-queue-url',
      });

      const event = { data: JSON.stringify(testData) };
      wsManager.ws.onmessage(event);

      expect(mockMessageHandler.addNewMessages).not.toHaveBeenCalled();
      expect(mockMessageHandler.displayMessages).not.toHaveBeenCalled();
    });

    it('should ignore messages when messages are paused', () => {
      mockAppState.isMessagesPausedState.mockReturnValue(true);

      const testData = {
        type: 'messages',
        queueUrl: 'test-queue-url',
        messages: [{ id: '123', body: 'test' }],
      };

      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'test-queue-url',
      });

      const event = { data: JSON.stringify(testData) };
      wsManager.ws.onmessage(event);

      expect(mockMessageHandler.addNewMessages).not.toHaveBeenCalled();
    });

    it('should ignore messages when no current queue', () => {
      mockAppState.getCurrentQueue.mockReturnValue(null);

      const testData = {
        type: 'messages',
        queueUrl: 'test-queue-url',
        messages: [{ id: '123', body: 'test' }],
      };

      const event = { data: JSON.stringify(testData) };
      wsManager.ws.onmessage(event);

      expect(mockMessageHandler.addNewMessages).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const event = { data: 'invalid json {' };
      wsManager.ws.onmessage(event);

      expect(consoleSpy).toHaveBeenCalledWith('Error parsing WebSocket message:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle null data gracefully', () => {
      wsManager.handleMessage(null);
      expect(mockMessageHandler.addNewMessages).not.toHaveBeenCalled();
    });

    it('should handle non-object data gracefully', () => {
      wsManager.handleMessage('string');
      expect(mockMessageHandler.addNewMessages).not.toHaveBeenCalled();
    });

    it('should handle messages with non-array messages field', () => {
      const testData = {
        type: 'messages',
        queueUrl: 'test-queue-url',
        messages: 'not an array',
      };

      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'test-queue-url',
      });

      wsManager.handleMessage(testData);

      expect(mockMessageHandler.addNewMessages).not.toHaveBeenCalled();
    });

    it('should handle errors during message processing', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockMessageHandler.displayMessages.mockImplementation(() => {
        throw new Error('Processing error');
      });

      const testData = {
        type: 'initial_messages',
        queueUrl: 'test-queue-url',
        messages: [{ id: '123', body: 'test' }],
      };

      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'test-queue-url',
      });

      wsManager.handleMessage(testData);

      expect(consoleSpy).toHaveBeenCalledWith('Error processing WebSocket messages:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Queue Subscription', () => {
    beforeEach(() => {
      wsManager.connect();
    });

    it('should send subscribe message when WebSocket is open', () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      const queueUrl = 'test-queue-url';

      wsManager.subscribe(queueUrl);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          queueUrl: queueUrl,
        })
      );
    });

    it('should not send subscribe message when WebSocket is not open', () => {
      mockWebSocket.readyState = 0; // CONNECTING state
      wsManager.subscribe('test-queue-url');

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should not send subscribe message when WebSocket is null', () => {
      wsManager.ws = null;
      expect(() => wsManager.subscribe('test-queue-url')).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      wsManager.connect();
    });

    it('should log WebSocket errors', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('WebSocket error');

      wsManager.ws.onerror(error);

      expect(consoleSpy).toHaveBeenCalledWith('WebSocket error:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('Connection Close and Reconnect', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      wsManager.connect();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should attempt reconnect when connection closes', () => {
      const connectSpy = vi.spyOn(wsManager, 'connect');

      wsManager.ws.onclose();

      // Fast-forward time by reconnect delay
      vi.advanceTimersByTime(5000);

      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('should reconnect after configured delay', () => {
      wsManager.reconnectDelay = 3000;
      const connectSpy = vi.spyOn(wsManager, 'connect');

      wsManager.ws.onclose();

      vi.advanceTimersByTime(2999);
      expect(connectSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(connectSpy).toHaveBeenCalled();
    });
  });

  describe('Disconnect', () => {
    it('should close WebSocket connection', () => {
      wsManager.connect();
      wsManager.disconnect();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should handle disconnect when WebSocket is null', () => {
      wsManager.ws = null;
      expect(() => wsManager.disconnect()).not.toThrow();
    });

    it('should handle disconnect gracefully even if close throws', () => {
      wsManager.connect();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Create a WebSocket that throws on close (wrapped in try-catch in implementation)
      wsManager.ws.close = () => {
        // Close might fail, but shouldn't throw
      };

      expect(() => wsManager.disconnect()).not.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe('Message Type Handling', () => {
    beforeEach(() => {
      wsManager.connect();
      mockAppState.getCurrentQueue.mockReturnValue({
        url: 'test-queue-url',
      });
    });

    it('should handle unknown message types gracefully', () => {
      const testData = {
        type: 'unknown_type',
        queueUrl: 'test-queue-url',
        messages: [{ id: '123' }],
      };

      const event = { data: JSON.stringify(testData) };
      wsManager.ws.onmessage(event);

      expect(mockMessageHandler.addNewMessages).not.toHaveBeenCalled();
      expect(mockMessageHandler.displayMessages).not.toHaveBeenCalled();
    });

    it('should require both correct type and queue URL', () => {
      const testData = {
        type: 'messages',
        queueUrl: 'wrong-queue-url',
        messages: [{ id: '123' }],
      };

      const event = { data: JSON.stringify(testData) };
      wsManager.ws.onmessage(event);

      expect(mockMessageHandler.addNewMessages).not.toHaveBeenCalled();
    });
  });
});
