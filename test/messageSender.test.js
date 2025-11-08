import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock toast manager
vi.mock('../static/modules/toastManager.js', () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    confirm: vi.fn(),
  },
}));

// Mock APIService methods
vi.mock('../static/modules/apiService.js', () => ({
  APIService: {
    sendMessage: vi.fn(),
  },
}));

import { MessageSender } from '../static/modules/messageSender.js';
import { AppState } from '../static/modules/appState.js';
import { APIService } from '../static/modules/apiService.js';
import { toast } from '../static/modules/toastManager.js';

// Mock MessageHandler
const mockMessageHandler = {
  loadMessages: vi.fn(),
  showError: vi.fn(),
};

describe('MessageSender', () => {
  let appState;
  let messageSender;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up DOM
    document.body.innerHTML = `
      <textarea id="messageBody"></textarea>
    `;

    appState = new AppState();
    messageSender = new MessageSender(appState, mockMessageHandler);
  });

  describe('sendMessage', () => {
    it('should return early if no queue selected', async () => {
      await messageSender.sendMessage();

      expect(APIService.sendMessage).not.toHaveBeenCalled();
      expect(mockMessageHandler.loadMessages).not.toHaveBeenCalled();
    });

    it('should show warning toast if message body is empty', async () => {
      appState.setCurrentQueue({ url: 'test-queue', name: 'Test Queue' });
      document.getElementById('messageBody').value = '';

      await messageSender.sendMessage();

      expect(toast.warning).toHaveBeenCalledWith('Please enter a message body');
      expect(APIService.sendMessage).not.toHaveBeenCalled();
    });

    it('should show warning toast if message body is only whitespace', async () => {
      appState.setCurrentQueue({ url: 'test-queue', name: 'Test Queue' });
      document.getElementById('messageBody').value = '   ';

      await messageSender.sendMessage();

      expect(toast.warning).toHaveBeenCalledWith('Please enter a message body');
      expect(APIService.sendMessage).not.toHaveBeenCalled();
    });

    it('should send message and reload messages on success', async () => {
      const queue = { url: 'test-queue', name: 'Test Queue' };
      const messageBody = 'Test message body';

      appState.setCurrentQueue(queue);
      document.getElementById('messageBody').value = messageBody;

      APIService.sendMessage.mockResolvedValueOnce({ messageId: '123' });

      await messageSender.sendMessage();

      expect(APIService.sendMessage).toHaveBeenCalledWith(queue.url, messageBody);
      expect(document.getElementById('messageBody').value).toBe('');
      expect(mockMessageHandler.loadMessages).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
      const queue = { url: 'test-queue', name: 'Test Queue' };
      const messageBody = 'Test message body';
      const error = new Error('API Error');

      appState.setCurrentQueue(queue);
      document.getElementById('messageBody').value = messageBody;

      APIService.sendMessage.mockRejectedValueOnce(error);

      await messageSender.sendMessage();

      expect(APIService.sendMessage).toHaveBeenCalledWith(queue.url, messageBody);
      expect(mockMessageHandler.showError).toHaveBeenCalledWith('Failed to send message');
      expect(mockMessageHandler.loadMessages).not.toHaveBeenCalled();
    });
  });
});
