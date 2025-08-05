/**
 * Message Export Module
 * Handles exporting queue messages in various formats (JSON, CSV)
 */
import { APIService } from './apiService.js';

export class MessageExport {
    constructor(appState) {
        this.appState = appState;
    }

    /**
     * Export current view of messages as JSON
     * @returns {Object|null} Download info or null if no messages
     */
    exportCurrentView() {
        const messages = this.appState.getMessages();
        if (!messages || messages.length === 0) {
            console.warn('No messages to export');
            return null;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            queue: this.appState.getCurrentQueue()?.name || 'unknown',
            messageCount: messages.length,
            messages: messages.map(msg => this.sanitizeMessage(msg))
        };

        return this.downloadJSON(exportData, this.generateFilename('queue-messages', 'json'));
    }

    /**
     * Export filtered messages
     * @param {string} filter - Filter string
     * @returns {Object|null} Download info or null if no messages
     */
    exportFiltered(filter) {
        const messages = this.appState.getMessages();
        if (!messages || messages.length === 0) {
            return null;
        }

        const filteredMessages = this.applyFilter(messages, filter);

        const exportData = {
            exportDate: new Date().toISOString(),
            queue: this.appState.getCurrentQueue()?.name || 'unknown',
            filter: filter,
            totalMessages: messages.length,
            filteredCount: filteredMessages.length,
            messages: filteredMessages.map(msg => this.sanitizeMessage(msg))
        };

        return this.downloadJSON(exportData, this.generateFilename('filtered-messages', 'json'));
    }

    /**
     * Export all messages from queue
     * @returns {Promise<Object|null>} Download info or null if failed
     */
    async exportAll() {
        const queue = this.appState.getCurrentQueue();
        if (!queue) return null;

        try {
            // Fetch all messages from queue
            const allMessages = await this.fetchAllMessages(queue.url);

            const exportData = {
                exportDate: new Date().toISOString(),
                queue: queue.name,
                totalMessages: allMessages.length,
                queueAttributes: queue.attributes,
                messages: allMessages.map(msg => this.sanitizeMessage(msg))
            };

            return this.downloadJSON(exportData, this.generateFilename(`all-messages-${queue.name}`, 'json'));
        } catch (error) {
            console.error('Error exporting all messages:', error);
            return null;
        }
    }

    /**
     * Export messages as CSV
     * @returns {Object|null} Download info or null if no messages
     */
    exportAsCSV() {
        const messages = this.appState.getMessages();
        if (!messages || messages.length === 0) {
            return null;
        }

        const csv = this.convertToCSV(messages);
        return this.downloadFile(csv, this.generateFilename('messages', 'csv'), 'text/csv');
    }

    /**
     * Export queue statistics
     * @param {Object} statistics - Statistics object
     * @returns {Object} Download info
     */
    exportStatistics(statistics) {
        const exportData = {
            exportDate: new Date().toISOString(),
            queue: this.appState.getCurrentQueue()?.name || 'unknown',
            statistics: statistics
        };

        return this.downloadJSON(exportData, this.generateFilename('queue-statistics', 'json'));
    }

    /**
     * Apply filter to messages
     * @param {Array} messages - Array of messages
     * @param {string} filter - Filter string
     * @returns {Array} Filtered messages
     */
    applyFilter(messages, filter) {
        if (!filter || filter.trim() === '') {
            return messages;
        }

        const filterLower = filter.toLowerCase();

        return messages.filter(msg => {
            // Check message body
            if (msg.body && msg.body.toLowerCase().includes(filterLower)) {
                return true;
            }
            if (msg.Body && msg.Body.toLowerCase().includes(filterLower)) {
                return true;
            }

            // Check attributes
            if (msg.attributes) {
                // Handle attribute:value filtering
                if (filter.includes(':')) {
                    const [filterKey, filterValue] = filter.split(':').map(s => s.trim());
                    for (const [key, value] of Object.entries(msg.attributes)) {
                        if (key.toLowerCase() === filterKey.toLowerCase() && 
                            value.toString().toLowerCase().includes(filterValue.toLowerCase())) {
                            return true;
                        }
                    }
                } else {
                    // Check all attribute values
                    for (const value of Object.values(msg.attributes)) {
                        if (value.toString().toLowerCase().includes(filterLower)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        });
    }

    /**
     * Fetch all messages from queue (pagination support)
     * @param {string} queueUrl - Queue URL
     * @returns {Promise<Array>} All messages
     */
    async fetchAllMessages(queueUrl) {
        const allMessages = [];
        let hasMore = true;
        let attempts = 0;
        const maxAttempts = 100; // Prevent infinite loops

        while (hasMore && attempts < maxAttempts) {
            try {
                const messages = await APIService.getMessages(queueUrl, 10);
                
                if (messages && messages.length > 0) {
                    allMessages.push(...messages);
                    
                    // Check if we've fetched all messages
                    // This is simplified - in production you'd use proper pagination
                    if (messages.length < 10) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
                
                attempts++;
                
                // Limit total messages to prevent memory issues
                if (allMessages.length >= 1000) {
                    console.warn('Limiting export to 1000 messages');
                    break;
                }
            } catch (error) {
                console.error('Error fetching messages:', error);
                hasMore = false;
            }
        }

        return allMessages;
    }

    /**
     * Convert messages to CSV format
     * @param {Array} messages - Array of messages
     * @returns {string} CSV string
     */
    convertToCSV(messages) {
        const headers = ['Message ID', 'Body', 'Sent Timestamp', 'Receive Count'];
        
        const rows = messages.map(msg => {
            const messageId = msg.messageId || msg.MessageId || '';
            const body = msg.body || msg.Body || '';
            const timestamp = msg.attributes?.SentTimestamp || '';
            const receiveCount = msg.attributes?.ApproximateReceiveCount || '';
            
            // Escape quotes in body
            const escapedBody = `"${body.replace(/"/g, '""')}"`;
            
            return [messageId, escapedBody, timestamp, receiveCount];
        });

        // Combine headers and rows
        const csvRows = [headers, ...rows];
        return csvRows.map(row => row.join(',')).join('\n');
    }

    /**
     * Download JSON data as file
     * @param {Object} data - Data to download
     * @param {string} filename - Filename
     * @returns {Object} Download info
     */
    downloadJSON(data, filename) {
        const json = JSON.stringify(data, null, 2);
        return this.downloadFile(json, filename, 'application/json');
    }

    /**
     * Download file
     * @param {string} content - File content
     * @param {string} filename - Filename
     * @param {string} mimeType - MIME type
     * @returns {Object} Download info
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
        
        return {
            filename: filename,
            size: blob.size,
            type: mimeType,
            content: content,
            url: url
        };
    }

    /**
     * Get available export formats
     * @returns {Array<string>} Available formats
     */
    getExportFormats() {
        return ['json', 'csv'];
    }

    /**
     * Validate export data
     * @param {Object} data - Data to validate
     * @returns {Object} Validation result
     */
    validateExport(data) {
        if (!data) {
            return { valid: false, error: 'No data to export' };
        }
        
        if (!data.messages || data.messages.length === 0) {
            return { valid: false, error: 'No messages to export' };
        }
        
        return { valid: true };
    }

    /**
     * Sanitize message for export
     * @param {Object} message - Message object
     * @returns {Object} Sanitized message
     */
    sanitizeMessage(message) {
        return {
            messageId: message.messageId || message.MessageId,
            body: message.body || message.Body,
            attributes: message.attributes || message.Attributes,
            receiptHandle: message.receiptHandle || message.ReceiptHandle
        };
    }

    /**
     * Generate filename with timestamp
     * @param {string} prefix - Filename prefix
     * @param {string} extension - File extension
     * @returns {string} Generated filename
     */
    generateFilename(prefix, extension) {
        const timestamp = Date.now();
        return `${prefix}-${timestamp}.${extension}`;
    }

    /**
     * Show export menu
     * @returns {HTMLElement} Export menu element
     */
    showExportMenu() {
        const menu = document.createElement('div');
        menu.className = 'export-menu';
        menu.innerHTML = `
            <div class="export-options">
                <h3>Export Messages</h3>
                <button class="export-option" data-action="current-json">
                    Export Current View (JSON)
                </button>
                <button class="export-option" data-action="current-csv">
                    Export Current View (CSV)
                </button>
                <button class="export-option" data-action="filtered">
                    Export Filtered Messages
                </button>
                <button class="export-option" data-action="all">
                    Export All Messages
                </button>
                <button class="export-option" data-action="statistics">
                    Export Statistics
                </button>
                <button class="export-cancel">Cancel</button>
            </div>
        `;

        // Attach event handlers
        menu.querySelectorAll('.export-option').forEach(btn => {
            btn.onclick = (e) => {
                const action = e.target.dataset.action;
                this.handleExportAction(action);
                menu.remove();
            };
        });

        menu.querySelector('.export-cancel').onclick = () => menu.remove();

        return menu;
    }

    /**
     * Handle export action
     * @param {string} action - Export action
     */
    async handleExportAction(action) {
        switch (action) {
            case 'current-json':
                this.exportCurrentView();
                break;
            case 'current-csv':
                this.exportAsCSV();
                break;
            case 'filtered':
                const filter = document.querySelector('.filter-input')?.value || '';
                this.exportFiltered(filter);
                break;
            case 'all':
                await this.exportAll();
                break;
            case 'statistics':
                // Get statistics from statistics module if available
                const stats = window.app?.queueStatistics?.getStatistics();
                if (stats) {
                    this.exportStatistics(stats);
                }
                break;
        }
    }
}