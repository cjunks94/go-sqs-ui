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

export class SQSApp {
    constructor() {
        this.appState = new AppState();
        this.awsContextHandler = new AWSContextHandler();
        this.queueManager = new QueueManager(this.appState);
        this.queueAttributesHandler = new QueueAttributesHandler();
        this.messageHandler = new MessageHandler(this.appState);
        this.messageSender = new MessageSender(this.appState, this.messageHandler);
        this.webSocketManager = new WebSocketManager(this.appState, this.messageHandler);
    }

    async init() {
        try {
            await this.awsContextHandler.load();
            await this.queueManager.loadQueues();
            this.setupEventListeners();
            this.webSocketManager.connect();
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
    }

    cleanup() {
        this.webSocketManager.disconnect();
    }
}