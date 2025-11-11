/**
 * Message Retry Module
 * Handles retrying messages from DLQ to source queues
 */
import { APIService } from './apiService.js';
import { getSourceQueue } from './dlqDetection.js';

export class MessageRetry {
  constructor(appState) {
    this.appState = appState;
  }

  /**
   * Retry a message from DLQ to its source queue
   * @param {Object} message - Message to retry
   * @param {string} targetQueue - Optional target queue URL (defaults to source queue)
   * @returns {Promise<Object>} Result of retry operation
   */
  async retryMessage(message, targetQueue = null) {
    const currentQueue = this.appState.getCurrentQueue();
    if (!currentQueue) {
      throw new Error('No queue selected');
    }

    // If no target queue specified, derive from DLQ name
    if (!targetQueue) {
      targetQueue = this.getSourceQueueUrl(currentQueue.name);
      if (!targetQueue) {
        throw new Error('Could not determine source queue from DLQ name');
      }
    }

    return APIService.retryMessage(currentQueue.url, message, targetQueue);
  }

  /**
   * Get the source queue URL from a DLQ name
   * @param {string} dlqName - Name of the DLQ
   * @returns {string|null} Source queue URL
   */
  getSourceQueueUrl(dlqName) {
    const sourceQueueName = getSourceQueue(dlqName);
    if (!sourceQueueName) return null;

    const currentQueue = this.appState.getCurrentQueue();
    if (!currentQueue) return null;

    // Replace DLQ name with source queue name in URL
    return currentQueue.url.replace(dlqName, sourceQueueName);
  }

  /**
   * Attach retry handlers to all retry buttons in the DOM
   * @param {Array} messages - Array of messages to match with buttons
   */
  attachRetryHandlers(messages) {
    const retryButtons = document.querySelectorAll('.retry-btn');

    retryButtons.forEach((button) => {
      const messageId = button.getAttribute('data-message-id');
      const message = messages.find((m) => m.messageId === messageId);

      if (message) {
        button.onclick = async (e) => {
          e.stopPropagation();
          await this.handleRetryClick(button, message);
        };
      }
    });
  }

  /**
   * Handle retry button click
   * @param {HTMLElement} button - Retry button element
   * @param {Object} message - Message to retry
   */
  async handleRetryClick(button, message) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Retrying...';

    try {
      await this.retryMessage(message);
      this.showRetryStatus(button, 'success', 'Retried!');

      // Refresh messages after successful retry
      setTimeout(() => {
        if (window.app && window.app.messageHandler) {
          window.app.messageHandler.loadMessages();
        }
      }, 1500);
    } catch (error) {
      console.error('Error retrying message:', error);
      this.showRetryStatus(button, 'error', 'Retry failed');

      // Reset button after error
      setTimeout(() => {
        button.textContent = originalText;
        button.disabled = false;
        button.classList.remove('btn-danger');
      }, 3000);
    }
  }

  /**
   * Show retry status on button
   * @param {HTMLElement} button - Button element
   * @param {string} status - 'success' or 'error'
   * @param {string} text - Status text to display
   */
  showRetryStatus(button, status, text) {
    button.textContent = text;

    if (status === 'success') {
      button.classList.remove('btn-primary', 'btn-danger');
      button.classList.add('btn-success');
      button.disabled = true;
    } else {
      button.classList.remove('btn-primary', 'btn-success');
      button.classList.add('btn-danger');
      button.disabled = false;
    }
  }
}
