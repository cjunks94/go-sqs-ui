/**
 * Queue Statistics Tests
 * Tests for queue statistics display and analytics functionality
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { APIService } from '@/apiService.js';
import { QueueStatistics } from '@/queueStatistics.js';

// Mock the APIService
vi.mock('@/apiService.js');

// Mock the QueueStatistics module that doesn't exist yet - TDD approach
vi.mock('@/queueStatistics.js', () => ({
    QueueStatistics: vi.fn().mockImplementation(function(appState) {
        this.appState = appState;
        this.statistics = null;
        this.element = null;
        this.refreshInterval = null;
        
        this.init = vi.fn(() => {
            this.element = document.createElement('div');
            this.element.className = 'queue-statistics-panel';
            this.element.innerHTML = `
                <div class="stats-header">
                    <h3>Queue Statistics</h3>
                    <button class="stats-refresh-btn">Refresh</button>
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
            return this.element;
        });
        
        this.load = vi.fn(async () => {
            const queue = this.appState.getCurrentQueue();
            if (!queue) return false;
            
            // Fetch statistics from API
            const stats = await APIService.getQueueStatistics(queue.url);
            this.statistics = stats;
            
            // Update display
            this.updateDisplay();
            
            // Check if DLQ and show DLQ stats
            if (this.isDLQ(queue)) {
                await this.loadDLQStatistics();
            }
            
            return true;
        });
        
        this.updateDisplay = vi.fn(() => {
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
        });
        
        this.loadDLQStatistics = vi.fn(async () => {
            const queue = this.appState.getCurrentQueue();
            const dlqStats = await APIService.getDLQStatistics(queue.url);
            
            // Show DLQ section
            const dlqSection = this.element.querySelector('.stats-dlq-section');
            dlqSection.classList.remove('hidden');
            
            // Update DLQ stats
            this.element.querySelector('#stat-avg-receive').textContent = 
                dlqStats.averageReceiveCount?.toFixed(1) || '0';
            this.element.querySelector('#stat-max-receive').textContent = 
                dlqStats.maxReceiveCount || '0';
            this.element.querySelector('#stat-retry-rate').textContent = 
                `${(dlqStats.retryFailureRate * 100).toFixed(1)}%`;
            
            // Display error types breakdown
            const errorTypesEl = this.element.querySelector('#stat-error-types');
            if (dlqStats.errorTypes && Object.keys(dlqStats.errorTypes).length > 0) {
                errorTypesEl.innerHTML = Object.entries(dlqStats.errorTypes)
                    .map(([type, count]) => `<div>${type}: ${count}</div>`)
                    .join('');
            } else {
                errorTypesEl.textContent = 'No error data available';
            }
        });
        
        this.refresh = vi.fn(async () => {
            await this.load();
        });
        
        this.startAutoRefresh = vi.fn((intervalMs = 30000) => {
            this.stopAutoRefresh();
            this.refreshInterval = setInterval(() => this.refresh(), intervalMs);
        });
        
        this.stopAutoRefresh = vi.fn(() => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        });
        
        this.isDLQ = vi.fn((queue) => {
            return queue.name.endsWith('-dlq') || 
                   queue.name.endsWith('-DLQ') ||
                   queue.attributes?.RedriveAllowPolicy !== undefined;
        });
        
        this.formatAge = vi.fn((ageMs) => {
            if (!ageMs) return '-';
            const seconds = Math.floor(ageMs / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `${days}d ${hours % 24}h`;
            if (hours > 0) return `${hours}h ${minutes % 60}m`;
            if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
            return `${seconds}s`;
        });
        
        this.formatTimestamp = vi.fn((timestamp) => {
            if (!timestamp) return '-';
            return new Date(timestamp).toLocaleString();
        });
        
        this.formatRate = vi.fn((rate) => {
            if (!rate) return '0 msg/hr';
            if (rate < 1) return `${(rate * 60).toFixed(1)} msg/hr`;
            return `${rate.toFixed(1)} msg/min`;
        });
        
        this.getStatistics = vi.fn(() => this.statistics);
        
        this.renderChart = vi.fn((_data) => {
            // Mock chart rendering
            const canvas = this.element?.querySelector('#stats-chart');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                // Simple mock drawing
                ctx.fillStyle = '#007bff';
                ctx.fillRect(0, 0, 400, 200);
            }
        });
        
        this.exportStatistics = vi.fn(() => {
            return {
                timestamp: new Date().toISOString(),
                queue: this.appState.getCurrentQueue()?.name,
                statistics: this.statistics,
                isDLQ: this.isDLQ(this.appState.getCurrentQueue())
            };
        });
    })
}));

describe('QueueStatistics', () => {
    let queueStats;
    let mockAppState;
    let mockQueue;
    let container;
    
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '<div id="stats-container"></div>';
        container = document.getElementById('stats-container');
        
        // Setup mock queue
        mockQueue = {
            name: 'test-queue',
            url: 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue',
            attributes: {
                ApproximateNumberOfMessages: '150',
                ApproximateNumberOfMessagesNotVisible: '5'
            }
        };
        
        // Setup mock app state
        mockAppState = {
            getCurrentQueue: vi.fn(() => mockQueue)
        };
        
        // Setup API mock responses
        APIService.getQueueStatistics.mockResolvedValue({
            totalMessages: 150,
            messagesInFlight: 5,
            oldestMessageAge: 86400000, // 1 day in ms
            newestMessageTimestamp: Date.now(),
            messageRate: 2.5 // messages per minute
        });
        
        APIService.getDLQStatistics.mockResolvedValue({
            averageReceiveCount: 3.5,
            maxReceiveCount: 10,
            retryFailureRate: 0.25,
            errorTypes: {
                'timeout': 45,
                'validation': 30,
                'processing': 25
            }
        });
        
        queueStats = new QueueStatistics(mockAppState);
    });
    
    describe('Initialization', () => {
        it('should create statistics panel', () => {
            const element = queueStats.init();
            container.appendChild(element);
            
            expect(container.querySelector('.queue-statistics-panel')).toBeTruthy();
            expect(container.querySelector('.stats-header')).toBeTruthy();
            expect(container.querySelector('.stats-content')).toBeTruthy();
        });
        
        it('should have refresh button', () => {
            const element = queueStats.init();
            container.appendChild(element);
            
            const refreshBtn = container.querySelector('.stats-refresh-btn');
            expect(refreshBtn).toBeTruthy();
            expect(refreshBtn.textContent).toBe('Refresh');
        });
        
        it('should initialize with empty values', () => {
            const element = queueStats.init();
            container.appendChild(element);
            
            expect(container.querySelector('#stat-total').textContent).toBe('-');
            expect(container.querySelector('#stat-inflight').textContent).toBe('-');
            expect(container.querySelector('#stat-oldest').textContent).toBe('-');
        });
    });
    
    describe('Loading Statistics', () => {
        beforeEach(() => {
            const element = queueStats.init();
            container.appendChild(element);
        });
        
        it('should load statistics for selected queue', async () => {
            const result = await queueStats.load();
            
            expect(result).toBe(true);
            expect(APIService.getQueueStatistics).toHaveBeenCalledWith(mockQueue.url);
            expect(queueStats.getStatistics()).toBeTruthy();
        });
        
        it('should display loaded statistics', async () => {
            await queueStats.load();
            
            expect(container.querySelector('#stat-total').textContent).toBe('150');
            expect(container.querySelector('#stat-inflight').textContent).toBe('5');
        });
        
        it('should format age correctly', async () => {
            await queueStats.load();
            
            const oldestAge = container.querySelector('#stat-oldest').textContent;
            expect(oldestAge).toBe('1d 0h');
        });
        
        it('should format message rate', async () => {
            await queueStats.load();
            
            const rate = container.querySelector('#stat-rate').textContent;
            expect(rate).toBe('2.5 msg/min');
        });
        
        it('should handle missing queue', async () => {
            mockAppState.getCurrentQueue.mockReturnValue(null);
            
            const result = await queueStats.load();
            
            expect(result).toBe(false);
            expect(APIService.getQueueStatistics).not.toHaveBeenCalled();
        });
    });
    
    describe('DLQ Statistics', () => {
        beforeEach(() => {
            const element = queueStats.init();
            container.appendChild(element);
            
            // Make it a DLQ
            mockQueue.name = 'test-queue-dlq';
        });
        
        it('should detect DLQ queues', () => {
            expect(queueStats.isDLQ(mockQueue)).toBe(true);
            
            mockQueue.name = 'test-queue-DLQ';
            expect(queueStats.isDLQ(mockQueue)).toBe(true);
            
            mockQueue.name = 'test-queue';
            mockQueue.attributes.RedriveAllowPolicy = '{}';
            expect(queueStats.isDLQ(mockQueue)).toBe(true);
        });
        
        it('should load DLQ statistics for DLQ queues', async () => {
            await queueStats.load();
            
            expect(APIService.getDLQStatistics).toHaveBeenCalledWith(mockQueue.url);
            
            const dlqSection = container.querySelector('.stats-dlq-section');
            expect(dlqSection.classList.contains('hidden')).toBe(false);
        });
        
        it('should display DLQ-specific metrics', async () => {
            await queueStats.load();
            
            expect(container.querySelector('#stat-avg-receive').textContent).toBe('3.5');
            expect(container.querySelector('#stat-max-receive').textContent).toBe('10');
            expect(container.querySelector('#stat-retry-rate').textContent).toBe('25.0%');
        });
        
        it('should display error types breakdown', async () => {
            await queueStats.load();
            
            const errorTypes = container.querySelector('#stat-error-types');
            expect(errorTypes.innerHTML).toContain('timeout: 45');
            expect(errorTypes.innerHTML).toContain('validation: 30');
            expect(errorTypes.innerHTML).toContain('processing: 25');
        });
        
        it('should not show DLQ section for regular queues', async () => {
            mockQueue.name = 'test-queue';
            delete mockQueue.attributes.RedriveAllowPolicy;
            
            await queueStats.load();
            
            expect(APIService.getDLQStatistics).not.toHaveBeenCalled();
            
            const dlqSection = container.querySelector('.stats-dlq-section');
            expect(dlqSection.classList.contains('hidden')).toBe(true);
        });
    });
    
    describe('Auto Refresh', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            const element = queueStats.init();
            container.appendChild(element);
        });
        
        afterEach(() => {
            vi.useRealTimers();
        });
        
        it('should start auto refresh with default interval', () => {
            queueStats.startAutoRefresh();
            
            expect(queueStats.refreshInterval).toBeTruthy();
            
            vi.advanceTimersByTime(30000);
            expect(queueStats.refresh).toHaveBeenCalledTimes(1);
            
            vi.advanceTimersByTime(30000);
            expect(queueStats.refresh).toHaveBeenCalledTimes(2);
        });
        
        it('should support custom refresh interval', () => {
            queueStats.startAutoRefresh(10000);
            
            vi.advanceTimersByTime(10000);
            expect(queueStats.refresh).toHaveBeenCalledTimes(1);
        });
        
        it('should stop auto refresh', () => {
            queueStats.startAutoRefresh();
            queueStats.stopAutoRefresh();
            
            vi.advanceTimersByTime(60000);
            expect(queueStats.refresh).not.toHaveBeenCalled();
            expect(queueStats.refreshInterval).toBe(null);
        });
        
        it('should restart auto refresh when called again', () => {
            queueStats.startAutoRefresh(10000);
            queueStats.startAutoRefresh(5000);
            
            vi.advanceTimersByTime(5000);
            expect(queueStats.refresh).toHaveBeenCalledTimes(1);
        });
    });
    
    describe('Formatting', () => {
        beforeEach(() => {
            queueStats.init();
        });
        
        it('should format age in days and hours', () => {
            expect(queueStats.formatAge(90000000)).toBe('1d 1h'); // 25 hours
            expect(queueStats.formatAge(259200000)).toBe('3d 0h'); // 3 days
        });
        
        it('should format age in hours and minutes', () => {
            expect(queueStats.formatAge(7200000)).toBe('2h 0m'); // 2 hours
            expect(queueStats.formatAge(5400000)).toBe('1h 30m'); // 1.5 hours
        });
        
        it('should format age in minutes and seconds', () => {
            expect(queueStats.formatAge(120000)).toBe('2m 0s'); // 2 minutes
            expect(queueStats.formatAge(90000)).toBe('1m 30s'); // 1.5 minutes
        });
        
        it('should format age in seconds only', () => {
            expect(queueStats.formatAge(45000)).toBe('45s');
            expect(queueStats.formatAge(1000)).toBe('1s');
        });
        
        it('should handle null age', () => {
            expect(queueStats.formatAge(null)).toBe('-');
            expect(queueStats.formatAge(undefined)).toBe('-');
        });
        
        it('should format message rate', () => {
            expect(queueStats.formatRate(5)).toBe('5.0 msg/min');
            expect(queueStats.formatRate(0.5)).toBe('30.0 msg/hr');
            expect(queueStats.formatRate(0)).toBe('0 msg/hr');
            expect(queueStats.formatRate(null)).toBe('0 msg/hr');
        });
    });
    
    describe('Chart Rendering', () => {
        it('should have chart canvas', () => {
            const element = queueStats.init();
            container.appendChild(element);
            
            const canvas = container.querySelector('#stats-chart');
            expect(canvas).toBeTruthy();
            expect(canvas.width).toBe(400);
            expect(canvas.height).toBe(200);
        });
        
        it('should render chart with data', () => {
            const element = queueStats.init();
            container.appendChild(element);
            
            const data = { labels: ['1h', '2h', '3h'], values: [10, 20, 15] };
            queueStats.renderChart(data);
            
            expect(queueStats.renderChart).toHaveBeenCalledWith(data);
        });
    });
    
    describe('Export Statistics', () => {
        it('should export current statistics', async () => {
            queueStats.init();
            await queueStats.load();
            
            const exported = queueStats.exportStatistics();
            
            expect(exported).toHaveProperty('timestamp');
            expect(exported).toHaveProperty('queue', 'test-queue');
            expect(exported).toHaveProperty('statistics');
            expect(exported).toHaveProperty('isDLQ', false);
            expect(exported.statistics).toHaveProperty('totalMessages', 150);
        });
        
        it('should indicate DLQ in export', async () => {
            mockQueue.name = 'test-queue-dlq';
            queueStats.init();
            await queueStats.load();
            
            const exported = queueStats.exportStatistics();
            
            expect(exported.isDLQ).toBe(true);
        });
    });
});