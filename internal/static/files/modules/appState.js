/**
 * Application State Management
 * Centralized state for the SQS UI application
 */
export class AppState {
  constructor() {
    this.currentQueue = null;
    this.allMessages = [];
    this.currentOffset = 0;
    this.currentMessageOffset = 0;
    this.isMessagesPaused = false;
    this.queues = [];
    this.dlqSourceMap = new Map();
  }

  setCurrentQueue(queue) {
    this.currentQueue = queue;
  }

  getCurrentQueue() {
    return this.currentQueue;
  }

  setQueues(queues) {
    this.queues = Array.isArray(queues) ? queues : [];
  }

  getQueues() {
    return this.queues;
  }

  setDlqSourceMap(map) {
    this.dlqSourceMap = map instanceof Map ? map : new Map();
  }

  /**
   * Resolve the source queue URL for a DLQ (for retrying messages back).
   * @param {string} dlqUrl
   * @returns {string|null}
   */
  getSourceQueueUrl(dlqUrl) {
    return this.dlqSourceMap.get(dlqUrl) || null;
  }

  pauseMessages() {
    this.isMessagesPaused = true;
  }

  resumeMessages() {
    this.isMessagesPaused = false;
  }

  toggleMessagesPause() {
    this.isMessagesPaused = !this.isMessagesPaused;
    return this.isMessagesPaused;
  }

  isMessagesPausedState() {
    return this.isMessagesPaused;
  }

  setMessages(messages, append = false) {
    this.allMessages = append ? [...this.allMessages, ...messages] : messages;
  }

  getMessages() {
    return this.allMessages;
  }

  resetOffsets() {
    this.currentOffset = 0;
    this.currentMessageOffset = 0;
  }
}
