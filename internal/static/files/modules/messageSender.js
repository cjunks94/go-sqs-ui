/**
 * Message Sender
 * Handles sending messages to SQS queues
 */
import { APIService } from './apiService.js';
import { toast } from './toastManager.js';

export class MessageSender {
  constructor(appState, messageHandler) {
    this.appState = appState;
    this.messageHandler = messageHandler;
  }

  async sendMessage() {
    const currentQueue = this.appState.getCurrentQueue();
    if (!currentQueue) return;

    const messageBody = document.getElementById('messageBody').value;
    if (!messageBody.trim()) {
      toast.warning('Please enter a message body');
      return;
    }

    try {
      await APIService.sendMessage(currentQueue.url, messageBody);
      document.getElementById('messageBody').value = '';
      this.messageHandler.loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      this.messageHandler.showError('Failed to send message');
    }
  }
}
