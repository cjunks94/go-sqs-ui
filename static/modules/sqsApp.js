/**
 * Main Application Class
 * Orchestrates all components and manages application lifecycle
 */
import { AppState } from './appState.js';
import { AWSContextHandler } from './awsContextHandler.js';
import { QueueManager } from './queueManager.js';
import { QueueAttributesHandler } from './queueAttributesHandler.js';
import { MessageHandler } from './messageHandler.js';
import { MessageSender } from './messageSender.js';
import { WebSocketManager } from './webSocketManager.js';
import { UIToggleManager } from './uiToggleManager.js';
import { APIService } from './apiService.js';
import { QueueBrowser } from './queueBrowser.js';
import { QueueStatistics } from './queueStatistics.js';
import { MessageExport } from './messageExport.js';
import { KeyboardNavigation } from './keyboardNavigation.js';

export class SQSApp {
    constructor() {
        this.appState = new AppState();
        this.awsContextHandler = new AWSContextHandler();
        this.queueManager = new QueueManager(this.appState);
        this.queueAttributesHandler = new QueueAttributesHandler();
        this.messageHandler = new MessageHandler(this.appState);
        this.messageSender = new MessageSender(this.appState, this.messageHandler);
        this.webSocketManager = new WebSocketManager(this.appState, this.messageHandler);
        
        // New enhanced modules
        this.pagination = null; // Will be initialized when needed
        this.queueBrowser = new QueueBrowser(this.appState);
        this.queueStatistics = new QueueStatistics(this.appState);
        this.messageExport = new MessageExport(this.appState);
        this.keyboardNavigation = new KeyboardNavigation(this.appState);
    }

    async init() {
        try {
            await this.awsContextHandler.load();
            await this.queueManager.loadQueues();
            this.setupEventListeners();
            this.webSocketManager.connect();
            
            // Initialize keyboard navigation
            this.keyboardNavigation.init();
        } catch (error) {
            console.error('Error initializing application:', error);
        }
    }

    setupEventListeners() {
        // Queue management
        document.getElementById('refreshQueues').addEventListener('click', () => {
            this.queueManager.refreshQueues();
        });

        // Message management
        document.getElementById('sendMessage').addEventListener('click', () => {
            this.messageSender.sendMessage();
        });

        document.getElementById('refreshMessages').addEventListener('click', () => {
            this.messageHandler.loadMessages();
        });

        document.getElementById('pauseMessages').addEventListener('click', () => {
            UIToggleManager.toggleMessagesPause(this.appState);
        });
        
        // Export button
        const exportBtn = document.getElementById('exportMessages');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.messageExport.exportCurrentView();
            });
        }
        
        // Browse queue button
        const browseBtn = document.querySelector('.browse-queue-button');
        if (browseBtn) {
            browseBtn.addEventListener('click', () => {
                this.queueBrowser.open();
            });
        }

        // UI toggles
        document.getElementById('sidebarToggle').addEventListener('click', () => {
            UIToggleManager.toggleSidebar();
        });

        document.getElementById('sidebarClose').addEventListener('click', () => {
            UIToggleManager.closeSidebar();
        });

        // Global toggle functions for HTML onclick handlers
        window.toggleAWSContext = () => UIToggleManager.toggleSection('awsContextDetails', 'awsToggleIcon');
        window.toggleQueuesSection = () => UIToggleManager.toggleSection('queuesContent', 'queuesToggleIcon');
        window.toggleQueueAttributes = () => UIToggleManager.toggleSection('queueAttributes', 'queueToggleIcon');
        window.toggleSendMessage = () => UIToggleManager.toggleSection('sendMessageSection', 'sendToggleIcon');

        // Batch operations
        window.addEventListener('batchDelete', async (event) => {
            const { messageIds } = event.detail;
            await this.handleBatchDelete(messageIds);
        });

        window.addEventListener('batchRetry', async (event) => {
            const { messageIds } = event.detail;
            await this.handleBatchRetry(messageIds);
        });
    }

    async handleBatchDelete(messageIds) {
        const currentQueue = this.appState.getCurrentQueue();
        if (!currentQueue || messageIds.length === 0) return;

        try {
            // Get messages from app state to find receipt handles
            const messages = this.appState.getMessages();
            const messagesToDelete = messages.filter(msg => messageIds.includes(msg.messageId));
            
            // Delete messages one by one (could be optimized with batch API in future)
            for (const message of messagesToDelete) {
                await APIService.deleteMessage(currentQueue.url, message.receiptHandle);
            }
            
            // Refresh message list
            await this.messageHandler.loadMessages();
            
            // Deselect all checkboxes
            const checkboxes = document.querySelectorAll('.message-checkbox');
            checkboxes.forEach(checkbox => checkbox.checked = false);
        } catch (error) {
            console.error('Error deleting messages:', error);
            alert('Failed to delete some messages');
        }
    }

    async handleBatchRetry(messageIds) {
        const currentQueue = this.appState.getCurrentQueue();
        if (!currentQueue || messageIds.length === 0) return;

        try {
            // Get messages from app state
            const messages = this.appState.getMessages();
            const messagesToRetry = messages.filter(msg => messageIds.includes(msg.messageId));
            
            // Get source queue URL from redrive policy
            const sourceQueueUrl = currentQueue.sourceQueueUrl;
            if (!sourceQueueUrl) {
                alert('Could not determine source queue for retry');
                return;
            }
            
            // Retry messages one by one
            for (const message of messagesToRetry) {
                await APIService.retryMessage(currentQueue.url, message, sourceQueueUrl);
            }
            
            // Refresh message list
            await this.messageHandler.loadMessages();
            
            // Deselect all checkboxes
            const checkboxes = document.querySelectorAll('.message-checkbox');
            checkboxes.forEach(checkbox => checkbox.checked = false);
        } catch (error) {
            console.error('Error retrying messages:', error);
            alert('Failed to retry some messages');
        }
    }

    cleanup() {
        this.webSocketManager.disconnect();
    }
}