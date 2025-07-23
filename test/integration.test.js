import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SQSApp } from '../static/modules/sqsApp.js';

// Mock all external dependencies
global.fetch = vi.fn();
global.WebSocket = vi.fn(() => ({
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1
}));

describe('SQSApp Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up comprehensive DOM structure
    document.body.innerHTML = `
      <div id="awsContextDetails"></div>
      <div id="queueList"></div>
      <div id="queueAttributes"></div>
      <div id="messageList"></div>
      <button id="refreshQueues">Refresh Queues</button>
      <button id="sendMessage">Send Message</button>
      <button id="refreshMessages">Refresh Messages</button>
      <button id="pauseMessages">⏸️ Pause</button>
      <button id="sidebarToggle">Toggle Sidebar</button>
      <button id="sidebarClose">Close</button>
      <textarea id="messageBody"></textarea>
      <div id="sidebar"></div>
      <div id="noQueueSelected" class="hidden"></div>
      <div id="queueDetails" class="hidden"></div>
      <h1 id="queueName"></h1>
    `;
  });

  describe('Application Initialization', () => {
    it('should initialize all components', () => {
      const app = new SQSApp();
      
      expect(app.appState).toBeDefined();
      expect(app.awsContextHandler).toBeDefined();
      expect(app.queueManager).toBeDefined();
      expect(app.queueAttributesHandler).toBeDefined();
      expect(app.messageHandler).toBeDefined();
      expect(app.messageSender).toBeDefined();
      expect(app.webSocketManager).toBeDefined();
    });

    it('should set up event listeners', () => {
      const app = new SQSApp();
      
      // Mock successful API calls
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });
      
      app.setupEventListeners();
      
      // Verify global functions are available
      expect(window.toggleAWSContext).toBeDefined();
      expect(window.toggleQueuesSection).toBeDefined();
      expect(window.toggleQueueAttributes).toBeDefined();
      expect(window.toggleSendMessage).toBeDefined();
    });
  });

  describe('Component Integration', () => {
    it('should handle queue selection workflow', async () => {
      const app = new SQSApp();
      
      // Mock API responses
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{
          name: 'test-queue',
          url: 'https://test.com/queue',
          attributes: { ApproximateNumberOfMessages: '5' }
        }])
      });
      
      await app.init();
      
      // Simulate queue selection
      const queue = { name: 'test-queue', url: 'https://test.com/queue' };
      app.appState.setCurrentQueue(queue);
      
      expect(app.appState.getCurrentQueue()).toEqual(queue);
    });

    it('should handle message pause/resume', () => {
      const app = new SQSApp();
      app.setupEventListeners();
      
      // Initial state should be unpaused
      expect(app.appState.isMessagesPausedState()).toBe(false);
      
      // Simulate pause button click
      document.getElementById('pauseMessages').click();
      
      expect(app.appState.isMessagesPausedState()).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization errors gracefully', async () => {
      const app = new SQSApp();
      
      // Mock API failure
      fetch.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await app.init();
      
      expect(consoleSpy).toHaveBeenCalledWith('API request failed for /api/aws-context:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('WebSocket Integration', () => {
    it('should connect WebSocket on initialization', async () => {
      const app = new SQSApp();
      
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });
      
      await app.init();
      
      expect(WebSocket).toHaveBeenCalled();
    });

    it('should cleanup WebSocket on app cleanup', () => {
      const app = new SQSApp();
      const mockWs = { close: vi.fn() };
      app.webSocketManager.ws = mockWs;
      
      app.cleanup();
      
      expect(mockWs.close).toHaveBeenCalled();
    });
  });
});