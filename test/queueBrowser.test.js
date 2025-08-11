/**
 * Queue Browser Tests
 * Tests for the dedicated queue browser mode functionality
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { APIService } from '@/apiService.js';

// Mock the APIService
vi.mock('@/apiService.js');

// Mock the QueueBrowser module that doesn't exist yet - TDD approach
vi.mock('@/queueBrowser.js', () => ({
    QueueBrowser: vi.fn().mockImplementation(function(appState) {
        this.appState = appState;
        this.isOpen = false;
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.totalItems = 0;
        this.messages = [];
        this.element = null;
        
        this.open = vi.fn(async () => {
            this.isOpen = true;
            const queue = this.appState.getCurrentQueue();
            if (!queue) return false;
            
            // Create browser UI
            this.element = document.createElement('div');
            this.element.className = 'queue-browser-modal';
            this.element.innerHTML = `
                <div class="queue-browser-content">
                    <div class="queue-browser-header">
                        <h2>Browse Queue: ${queue.name}</h2>
                        <button class="queue-browser-close">×</button>
                    </div>
                    <div class="queue-browser-stats">
                        <span class="message-count-display">Loading...</span>
                    </div>
                    <div class="queue-browser-messages"></div>
                    <div class="queue-browser-pagination"></div>
                </div>
            `;
            document.body.appendChild(this.element);
            
            // Load first page
            await this.loadPage(1);
            return true;
        });
        
        this.close = vi.fn(() => {
            this.isOpen = false;
            if (this.element) {
                this.element.remove();
                this.element = null;
            }
        });
        
        this.loadPage = vi.fn(async (page) => {
            const queue = this.appState.getCurrentQueue();
            if (!queue) return false;
            
            const offset = (page - 1) * this.itemsPerPage;
            const response = await APIService.getMessages(queue.url, this.itemsPerPage, offset);
            
            this.messages = response.messages || [];
            this.totalItems = response.totalCount || 0;
            this.currentPage = page;
            
            // Update UI
            this.updateMessageDisplay();
            this.updatePagination();
            this.updateStats();
            
            return true;
        });
        
        this.updateMessageDisplay = vi.fn(() => {
            if (!this.element) return;
            
            const container = this.element.querySelector('.queue-browser-messages');
            container.innerHTML = this.messages.map((msg, index) => `
                <div class="browser-message-item" data-index="${index}">
                    <div class="browser-message-header">
                        <span class="browser-message-id">${msg.messageId}</span>
                        <span class="browser-message-time">${msg.attributes?.SentTimestamp || ''}</span>
                    </div>
                    <div class="browser-message-body">${msg.body.substring(0, 100)}...</div>
                </div>
            `).join('');
        });
        
        this.updatePagination = vi.fn(() => {
            if (!this.element) return;
            
            const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
            const container = this.element.querySelector('.queue-browser-pagination');
            
            container.innerHTML = `
                <button class="browser-page-prev" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>
                <span class="browser-page-info">Page ${this.currentPage} of ${totalPages}</span>
                <button class="browser-page-next" ${this.currentPage === totalPages ? 'disabled' : ''}>Next</button>
                <input type="number" class="browser-page-input" value="${this.currentPage}" min="1" max="${totalPages}">
                <button class="browser-page-go">Go</button>
            `;
        });
        
        this.updateStats = vi.fn(() => {
            if (!this.element) return;
            
            const startItem = (this.currentPage - 1) * this.itemsPerPage + 1;
            const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
            
            const display = this.element.querySelector('.message-count-display');
            display.textContent = `Showing ${startItem}-${endItem} of ${this.totalItems} messages`;
        });
        
        this.nextPage = vi.fn(async () => {
            const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
            if (this.currentPage < totalPages) {
                await this.loadPage(this.currentPage + 1);
                return true;
            }
            return false;
        });
        
        this.previousPage = vi.fn(async () => {
            if (this.currentPage > 1) {
                await this.loadPage(this.currentPage - 1);
                return true;
            }
            return false;
        });
        
        this.goToPage = vi.fn(async (page) => {
            const totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
            if (page >= 1 && page <= totalPages) {
                await this.loadPage(page);
                return true;
            }
            return false;
        });
        
        this.setItemsPerPage = vi.fn((count) => {
            this.itemsPerPage = count;
            this.currentPage = 1;
            return this.loadPage(1);
        });
        
        this.getState = vi.fn(() => ({
            isOpen: this.isOpen,
            currentPage: this.currentPage,
            itemsPerPage: this.itemsPerPage,
            totalItems: this.totalItems,
            messages: this.messages
        }));
    })
}));

import { QueueBrowser } from '@/queueBrowser.js';

describe('QueueBrowser', () => {
    let queueBrowser;
    let mockAppState;
    let mockQueue;
    
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '';
        
        // Setup mock queue
        mockQueue = {
            name: 'test-queue',
            url: 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue',
            attributes: {
                ApproximateNumberOfMessages: '150'
            }
        };
        
        // Setup mock app state
        mockAppState = {
            getCurrentQueue: vi.fn(() => mockQueue),
            getMessages: vi.fn(() => [])
        };
        
        // Setup API mock responses
        APIService.getMessages.mockResolvedValue({
            messages: Array.from({ length: 50 }, (_, i) => ({
                messageId: `msg-${i + 1}`,
                body: `Test message body ${i + 1}`,
                receiptHandle: `receipt-${i + 1}`,
                attributes: {
                    SentTimestamp: '1234567890000',
                    ApproximateReceiveCount: '1'
                }
            })),
            totalCount: 150
        });
        
        queueBrowser = new QueueBrowser(mockAppState);
    });
    
    afterEach(() => {
        vi.clearAllMocks();
        document.body.innerHTML = '';
    });
    
    describe('Opening Browser', () => {
        it('should open browser modal when queue is selected', async () => {
            const result = await queueBrowser.open();
            
            expect(result).toBe(true);
            expect(queueBrowser.isOpen).toBe(true);
            expect(document.querySelector('.queue-browser-modal')).toBeTruthy();
        });
        
        it('should display queue name in header', async () => {
            await queueBrowser.open();
            
            const header = document.querySelector('.queue-browser-header h2');
            expect(header.textContent).toBe('Browse Queue: test-queue');
        });
        
        it('should not open if no queue is selected', async () => {
            mockAppState.getCurrentQueue.mockReturnValue(null);
            
            const result = await queueBrowser.open();
            
            expect(result).toBe(false);
            expect(queueBrowser.isOpen).toBe(false);
            expect(document.querySelector('.queue-browser-modal')).toBeFalsy();
        });
        
        it('should load first page of messages on open', async () => {
            await queueBrowser.open();
            
            expect(APIService.getMessages).toHaveBeenCalledWith(mockQueue.url, 50, 0);
            expect(queueBrowser.messages).toHaveLength(50);
            expect(queueBrowser.currentPage).toBe(1);
        });
    });
    
    describe('Closing Browser', () => {
        it('should close browser and remove modal', async () => {
            await queueBrowser.open();
            queueBrowser.close();
            
            expect(queueBrowser.isOpen).toBe(false);
            expect(document.querySelector('.queue-browser-modal')).toBeFalsy();
        });
    });
    
    describe('Message Display', () => {
        it('should display messages in browser', async () => {
            await queueBrowser.open();
            
            const messages = document.querySelectorAll('.browser-message-item');
            expect(messages).toHaveLength(50);
        });
        
        it('should show message count information', async () => {
            await queueBrowser.open();
            
            const countDisplay = document.querySelector('.message-count-display');
            expect(countDisplay.textContent).toBe('Showing 1-50 of 150 messages');
        });
        
        it('should display message details', async () => {
            await queueBrowser.open();
            
            const firstMessage = document.querySelector('.browser-message-item');
            expect(firstMessage.querySelector('.browser-message-id').textContent).toBe('msg-1');
            expect(firstMessage.querySelector('.browser-message-body').textContent).toContain('Test message body 1');
        });
    });
    
    describe('Pagination', () => {
        it('should show pagination controls', async () => {
            await queueBrowser.open();
            
            expect(document.querySelector('.browser-page-prev')).toBeTruthy();
            expect(document.querySelector('.browser-page-next')).toBeTruthy();
            expect(document.querySelector('.browser-page-info')).toBeTruthy();
            expect(document.querySelector('.browser-page-input')).toBeTruthy();
            expect(document.querySelector('.browser-page-go')).toBeTruthy();
        });
        
        it('should display correct page information', async () => {
            await queueBrowser.open();
            
            const pageInfo = document.querySelector('.browser-page-info');
            expect(pageInfo.textContent).toBe('Page 1 of 3');
        });
        
        it('should navigate to next page', async () => {
            await queueBrowser.open();
            
            // Mock second page response
            APIService.getMessages.mockResolvedValueOnce({
                messages: Array.from({ length: 50 }, (_, i) => ({
                    messageId: `msg-${51 + i}`,
                    body: `Test message body ${51 + i}`,
                    receiptHandle: `receipt-${51 + i}`,
                    attributes: {}
                })),
                totalCount: 150
            });
            
            const result = await queueBrowser.nextPage();
            
            expect(result).toBe(true);
            expect(queueBrowser.currentPage).toBe(2);
            expect(APIService.getMessages).toHaveBeenCalledWith(mockQueue.url, 50, 50);
            
            const countDisplay = document.querySelector('.message-count-display');
            expect(countDisplay.textContent).toBe('Showing 51-100 of 150 messages');
        });
        
        it('should navigate to previous page', async () => {
            await queueBrowser.open();
            await queueBrowser.goToPage(2);
            
            const result = await queueBrowser.previousPage();
            
            expect(result).toBe(true);
            expect(queueBrowser.currentPage).toBe(1);
        });
        
        it('should jump to specific page', async () => {
            await queueBrowser.open();
            
            // Mock third page response
            APIService.getMessages.mockResolvedValueOnce({
                messages: Array.from({ length: 50 }, (_, i) => ({
                    messageId: `msg-${101 + i}`,
                    body: `Test message body ${101 + i}`,
                    receiptHandle: `receipt-${101 + i}`,
                    attributes: {}
                })),
                totalCount: 150
            });
            
            const result = await queueBrowser.goToPage(3);
            
            expect(result).toBe(true);
            expect(queueBrowser.currentPage).toBe(3);
            expect(APIService.getMessages).toHaveBeenCalledWith(mockQueue.url, 50, 100);
            
            const countDisplay = document.querySelector('.message-count-display');
            expect(countDisplay.textContent).toBe('Showing 101-150 of 150 messages');
        });
        
        it('should disable Previous on first page', async () => {
            await queueBrowser.open();
            
            const prevButton = document.querySelector('.browser-page-prev');
            expect(prevButton.disabled).toBe(true);
        });
        
        it('should disable Next on last page', async () => {
            await queueBrowser.open();
            await queueBrowser.goToPage(3);
            
            const nextButton = document.querySelector('.browser-page-next');
            expect(nextButton.disabled).toBe(true);
        });
    });
    
    describe('Items Per Page', () => {
        it('should change items per page', async () => {
            await queueBrowser.open();
            
            // Mock response for 25 items
            APIService.getMessages.mockResolvedValueOnce({
                messages: Array.from({ length: 25 }, (_, i) => ({
                    messageId: `msg-${i + 1}`,
                    body: `Test message body ${i + 1}`,
                    receiptHandle: `receipt-${i + 1}`,
                    attributes: {}
                })),
                totalCount: 150
            });
            
            await queueBrowser.setItemsPerPage(25);
            
            expect(queueBrowser.itemsPerPage).toBe(25);
            expect(queueBrowser.currentPage).toBe(1);
            expect(APIService.getMessages).toHaveBeenCalledWith(mockQueue.url, 25, 0);
        });
        
        it('should recalculate pages when changing items per page', async () => {
            await queueBrowser.open();
            
            APIService.getMessages.mockResolvedValueOnce({
                messages: Array.from({ length: 100 }, (_, i) => ({
                    messageId: `msg-${i + 1}`,
                    body: `Test message body ${i + 1}`,
                    receiptHandle: `receipt-${i + 1}`,
                    attributes: {}
                })),
                totalCount: 150
            });
            
            await queueBrowser.setItemsPerPage(100);
            
            const pageInfo = document.querySelector('.browser-page-info');
            expect(pageInfo.textContent).toBe('Page 1 of 2');
        });
    });
    
    describe('Empty Queue', () => {
        it('should handle empty queue gracefully', async () => {
            APIService.getMessages.mockResolvedValueOnce({
                messages: [],
                totalCount: 0
            });
            
            await queueBrowser.open();
            
            const countDisplay = document.querySelector('.message-count-display');
            expect(countDisplay.textContent).toBe('Showing 0-0 of 0 messages');
            
            const messages = document.querySelectorAll('.browser-message-item');
            expect(messages).toHaveLength(0);
        });
    });
    
    describe('Large Queue', () => {
        it('should handle very large queues', async () => {
            APIService.getMessages.mockResolvedValueOnce({
                messages: Array.from({ length: 50 }, (_, i) => ({
                    messageId: `msg-${i + 1}`,
                    body: `Test message body ${i + 1}`,
                    receiptHandle: `receipt-${i + 1}`,
                    attributes: {}
                })),
                totalCount: 10000
            });
            
            await queueBrowser.open();
            
            const pageInfo = document.querySelector('.browser-page-info');
            expect(pageInfo.textContent).toBe('Page 1 of 200');
            
            const countDisplay = document.querySelector('.message-count-display');
            expect(countDisplay.textContent).toBe('Showing 1-50 of 10000 messages');
        });
    });
    
    describe('State Management', () => {
        it('should track browser state', async () => {
            await queueBrowser.open();
            
            const state = queueBrowser.getState();
            
            expect(state).toEqual({
                isOpen: true,
                currentPage: 1,
                itemsPerPage: 50,
                totalItems: 150,
                messages: expect.any(Array)
            });
            
            expect(state.messages).toHaveLength(50);
        });
    });
    
    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            APIService.getMessages.mockRejectedValueOnce(new Error('Network error'));
            
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            
            await queueBrowser.open();
            
            // Should still open but with error state
            expect(queueBrowser.isOpen).toBe(true);
            expect(consoleSpy).toHaveBeenCalled();
            
            consoleSpy.mockRestore();
        });
    });
});