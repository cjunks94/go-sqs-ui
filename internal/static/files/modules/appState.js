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
    }

    setCurrentQueue(queue) {
        this.currentQueue = queue;
    }

    getCurrentQueue() {
        return this.currentQueue;
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