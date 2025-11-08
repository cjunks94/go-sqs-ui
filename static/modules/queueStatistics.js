/**
 * Queue Statistics Module
 * Displays queue statistics and analytics including DLQ-specific metrics
 */
import { APIService } from './apiService.js';

export class QueueStatistics {
    constructor(appState) {
        this.appState = appState;
        this.statistics = null;
        this.element = null;
        this.refreshInterval = null;
        this.chartContext = null;
    }

    /**
     * Initialize the statistics panel
     * @returns {HTMLElement} The statistics panel element
     */
    init() {
        this.element = document.createElement('div');
        this.element.className = 'queue-statistics-panel';
        this.element.innerHTML = `
            <div class="stats-header">
                <h3>Queue Statistics</h3>
                <button class="stats-refresh-btn btn btn-secondary">Refresh</button>
            </div>
            <div class="stats-content">
                <div class="stat-item">
                    <span class="stat-label">Total Messages:</span>
                    <span class="stat-value" id="stat-total">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Messages in Flight:</span>
                    <span class="stat-value" id="stat-inflight">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Oldest Message Age:</span>
                    <span class="stat-value" id="stat-oldest">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Newest Message:</span>
                    <span class="stat-value" id="stat-newest">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Message Rate:</span>
                    <span class="stat-value" id="stat-rate">-</span>
                </div>
            </div>
            <div class="stats-dlq-section hidden">
                <h4>DLQ Statistics</h4>
                <div class="stat-item">
                    <span class="stat-label">Average Receive Count:</span>
                    <span class="stat-value" id="stat-avg-receive">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Max Receive Count:</span>
                    <span class="stat-value" id="stat-max-receive">-</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Error Types:</span>
                    <div class="stat-value" id="stat-error-types">-</div>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Retry Failure Rate:</span>
                    <span class="stat-value" id="stat-retry-rate">-</span>
                </div>
            </div>
            <div class="stats-chart-section">
                <canvas id="stats-chart" width="400" height="200"></canvas>
            </div>
        `;
        
        // Attach event handlers
        const refreshBtn = this.element.querySelector('.stats-refresh-btn');
        refreshBtn.onclick = () => this.refresh();
        
        // Get chart context
        const canvas = this.element.querySelector('#stats-chart');
        if (canvas) {
            this.chartContext = canvas.getContext('2d');
        }
        
        return this.element;
    }

    /**
     * Load statistics for the current queue
     * @returns {Promise<boolean>} True if loaded successfully
     */
    async load() {
        const queue = this.appState.getCurrentQueue();
        if (!queue) return false;
        
        try {
            // Get basic statistics from queue attributes
            this.statistics = this.calculateBasicStatistics(queue);
            
            // Try to get enhanced statistics from API
            try {
                const enhancedStats = await APIService.getQueueStatistics?.(queue.url);
                if (enhancedStats) {
                    this.statistics = { ...this.statistics, ...enhancedStats };
                }
            } catch (_error) {
                // API might not be implemented yet, use basic stats
            }
            
            // Update display
            this.updateDisplay();
            
            // Check if DLQ and load DLQ statistics
            if (this.isDLQ(queue)) {
                await this.loadDLQStatistics();
            } else {
                // Hide DLQ section
                const dlqSection = this.element?.querySelector('.stats-dlq-section');
                if (dlqSection) {
                    dlqSection.classList.add('hidden');
                }
            }
            
            // Render chart
            this.renderChart();
            
            return true;
        } catch (error) {
            console.error('Error loading statistics:', error);
            return false;
        }
    }

    /**
     * Calculate basic statistics from queue attributes
     * @param {Object} queue - Queue object
     * @returns {Object} Basic statistics
     */
    calculateBasicStatistics(queue) {
        const attrs = queue.attributes || {};
        const now = Date.now();
        
        // Calculate oldest message age (approximate)
        const oldestTimestamp = attrs.OldestMessageAge ? 
            now - (parseInt(attrs.OldestMessageAge) * 1000) : null;
        
        return {
            totalMessages: parseInt(attrs.ApproximateNumberOfMessages || '0'),
            messagesInFlight: parseInt(attrs.ApproximateNumberOfMessagesNotVisible || '0'),
            messagesDelayed: parseInt(attrs.ApproximateNumberOfMessagesDelayed || '0'),
            oldestMessageAge: oldestTimestamp ? now - oldestTimestamp : null,
            newestMessageTimestamp: attrs.LastModifiedTimestamp ? 
                parseInt(attrs.LastModifiedTimestamp) * 1000 : null,
            messageRate: this.calculateMessageRate(queue),
            queueName: queue.name
        };
    }

    /**
     * Calculate message rate
     * @param {Object} queue - Queue object
     * @returns {number} Messages per minute
     */
    calculateMessageRate(queue) {
        // This is a simplified calculation
        // In production, you'd track message counts over time
        const totalMessages = parseInt(queue.attributes?.ApproximateNumberOfMessages || '0');
        const createdTimestamp = parseInt(queue.attributes?.CreatedTimestamp || '0') * 1000;
        
        if (createdTimestamp && totalMessages > 0) {
            const ageInMinutes = (Date.now() - createdTimestamp) / (1000 * 60);
            if (ageInMinutes > 0) {
                return totalMessages / ageInMinutes;
            }
        }
        
        return 0;
    }

    /**
     * Update the statistics display
     */
    updateDisplay() {
        if (!this.statistics || !this.element) return;
        
        // Update basic stats
        this.element.querySelector('#stat-total').textContent = 
            this.statistics.totalMessages || '0';
        this.element.querySelector('#stat-inflight').textContent = 
            this.statistics.messagesInFlight || '0';
        this.element.querySelector('#stat-oldest').textContent = 
            this.formatAge(this.statistics.oldestMessageAge);
        this.element.querySelector('#stat-newest').textContent = 
            this.formatTimestamp(this.statistics.newestMessageTimestamp);
        this.element.querySelector('#stat-rate').textContent = 
            this.formatRate(this.statistics.messageRate);
    }

    /**
     * Load DLQ-specific statistics
     * @returns {Promise<void>}
     */
    async loadDLQStatistics() {
        const queue = this.appState.getCurrentQueue();
        if (!queue) return;
        
        try {
            // Try to get DLQ statistics from API
            let dlqStats = {};
            try {
                dlqStats = await APIService.getDLQStatistics?.(queue.url) || {};
            } catch (_error) {
                // API might not be implemented yet, calculate from messages
                dlqStats = await this.calculateDLQStatistics();
            }
            
            // Show DLQ section
            const dlqSection = this.element?.querySelector('.stats-dlq-section');
            if (dlqSection) {
                dlqSection.classList.remove('hidden');
            }
            
            // Update DLQ stats
            this.element.querySelector('#stat-avg-receive').textContent = 
                dlqStats.averageReceiveCount?.toFixed(1) || '0';
            this.element.querySelector('#stat-max-receive').textContent = 
                dlqStats.maxReceiveCount || '0';
            this.element.querySelector('#stat-retry-rate').textContent = 
                `${((dlqStats.retryFailureRate || 0) * 100).toFixed(1)}%`;
            
            // Display error types breakdown
            const errorTypesEl = this.element.querySelector('#stat-error-types');
            if (dlqStats.errorTypes && Object.keys(dlqStats.errorTypes).length > 0) {
                errorTypesEl.innerHTML = Object.entries(dlqStats.errorTypes)
                    .map(([type, count]) => `<div class="error-type-item">${type}: ${count}</div>`)
                    .join('');
            } else {
                errorTypesEl.textContent = 'No error data available';
            }
        } catch (error) {
            console.error('Error loading DLQ statistics:', error);
        }
    }

    /**
     * Calculate DLQ statistics from messages
     * @returns {Promise<Object>} DLQ statistics
     */
    async calculateDLQStatistics() {
        // Fetch some messages to analyze
        const queue = this.appState.getCurrentQueue();
        if (!queue) return {};
        
        try {
            const messages = await APIService.getMessages(queue.url, 10);
            
            if (!messages || messages.length === 0) {
                return {};
            }
            
            // Calculate statistics from messages
            let totalReceiveCount = 0;
            let maxReceiveCount = 0;
            const errorTypes = {};
            
            messages.forEach(msg => {
                const receiveCount = parseInt(msg.attributes?.ApproximateReceiveCount || '0');
                totalReceiveCount += receiveCount;
                maxReceiveCount = Math.max(maxReceiveCount, receiveCount);
                
                // Try to extract error type from message body or attributes
                const errorType = msg.attributes?.ErrorType || 'unknown';
                errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
            });
            
            return {
                averageReceiveCount: messages.length > 0 ? totalReceiveCount / messages.length : 0,
                maxReceiveCount: maxReceiveCount,
                retryFailureRate: maxReceiveCount > 5 ? 0.8 : 0.2, // Simplified calculation
                errorTypes: errorTypes
            };
        } catch (error) {
            console.error('Error calculating DLQ statistics:', error);
            return {};
        }
    }

    /**
     * Refresh statistics
     * @returns {Promise<void>}
     */
    async refresh() {
        await this.load();
    }

    /**
     * Start auto-refresh
     * @param {number} intervalMs - Refresh interval in milliseconds
     */
    startAutoRefresh(intervalMs = 30000) {
        this.stopAutoRefresh();
        this.refreshInterval = setInterval(() => this.refresh(), intervalMs);
    }

    /**
     * Stop auto-refresh
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * Check if queue is a DLQ
     * @param {Object} queue - Queue object
     * @returns {boolean} True if DLQ
     */
    isDLQ(queue) {
        return queue.name.endsWith('-dlq') || 
               queue.name.endsWith('-DLQ') ||
               queue.attributes?.RedriveAllowPolicy !== undefined;
    }

    /**
     * Format age in human-readable format
     * @param {number} ageMs - Age in milliseconds
     * @returns {string} Formatted age
     */
    formatAge(ageMs) {
        if (!ageMs || ageMs < 0) return '-';
        
        const seconds = Math.floor(ageMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    /**
     * Format timestamp
     * @param {number} timestamp - Timestamp in milliseconds
     * @returns {string} Formatted timestamp
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return '-';
        return new Date(timestamp).toLocaleString();
    }

    /**
     * Format message rate
     * @param {number} rate - Messages per minute
     * @returns {string} Formatted rate
     */
    formatRate(rate) {
        if (!rate || rate === 0) return '0 msg/hr';
        if (rate < 1) return `${(rate * 60).toFixed(1)} msg/hr`;
        return `${rate.toFixed(1)} msg/min`;
    }

    /**
     * Render statistics chart
     * @param {Object} data - Chart data
     */
    renderChart(_data) {
        if (!this.chartContext) return;
        
        // Simple bar chart for message counts
        const ctx = this.chartContext;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw a simple bar chart
        ctx.fillStyle = '#007bff';
        
        const stats = this.statistics;
        if (stats) {
            const barWidth = width / 4;
            const maxValue = Math.max(stats.totalMessages, stats.messagesInFlight, 1);
            
            // Total messages bar
            const totalHeight = (stats.totalMessages / maxValue) * (height - 40);
            ctx.fillRect(barWidth * 0.5, height - totalHeight - 20, barWidth * 0.8, totalHeight);
            
            // In-flight messages bar
            ctx.fillStyle = '#ffc107';
            const inflightHeight = (stats.messagesInFlight / maxValue) * (height - 40);
            ctx.fillRect(barWidth * 2, height - inflightHeight - 20, barWidth * 0.8, inflightHeight);
            
            // Labels
            ctx.fillStyle = '#333';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Total', barWidth, height - 5);
            ctx.fillText('In Flight', barWidth * 2.5, height - 5);
        }
    }

    /**
     * Get current statistics
     * @returns {Object} Current statistics
     */
    getStatistics() {
        return this.statistics;
    }

    /**
     * Export statistics
     * @returns {Object} Exportable statistics object
     */
    exportStatistics() {
        return {
            timestamp: new Date().toISOString(),
            queue: this.appState.getCurrentQueue()?.name,
            statistics: this.statistics,
            isDLQ: this.isDLQ(this.appState.getCurrentQueue())
        };
    }
}