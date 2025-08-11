/**
 * Enhanced Message View Tests
 * Tests for improved message debugging features
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { EnhancedMessageView } from '../static/modules/enhancedMessageView.js';

describe('EnhancedMessageView', () => {
    let enhancedView;
    let mockMessage;

    beforeEach(() => {
        enhancedView = new EnhancedMessageView();
        mockMessage = {
            messageId: '123e4567-e89b-12d3-a456-426614174000',
            body: '{"event":"payment.processed","amount":99.99,"currency":"USD"}',
            receiptHandle: 'AQEBwJnKyrHigUMZj6rYigCgxlaS...',
            attributes: {
                SentTimestamp: '1643723400000',
                ApproximateReceiveCount: '3',
                ApproximateFirstReceiveTimestamp: '1643723500000',
                MessageDeduplicationId: 'dedup-123',
                MessageGroupId: 'group-456'
            }
        };
    });

    describe('createEnhancedView', () => {
        it('should create enhanced message view with all sections', () => {
            const view = enhancedView.createEnhancedView(mockMessage);
            
            expect(view.classList.contains('enhanced-message-view')).toBe(true);
            expect(view.querySelector('.message-metadata')).toBeTruthy();
            expect(view.querySelector('.message-attributes')).toBeTruthy();
            expect(view.querySelector('.message-body-section')).toBeTruthy();
            expect(view.querySelector('.message-actions')).toBeTruthy();
        });

        it('should display formatted JSON with syntax highlighting', () => {
            const view = enhancedView.createEnhancedView(mockMessage);
            const bodySection = view.querySelector('.message-body-content');
            
            expect(bodySection.classList.contains('json-highlighted')).toBe(true);
            expect(bodySection.textContent).toContain('"event"');
            expect(bodySection.textContent).toContain('"payment.processed"');
        });

        it('should handle plain text messages', () => {
            mockMessage.body = 'This is a plain text message';
            const view = enhancedView.createEnhancedView(mockMessage);
            const bodySection = view.querySelector('.message-body-content');
            
            expect(bodySection.classList.contains('plain-text')).toBe(true);
            expect(bodySection.textContent).toBe('This is a plain text message');
        });

        it('should show receive count badge for DLQ messages', () => {
            const view = enhancedView.createEnhancedView(mockMessage);
            const receiveCountBadge = view.querySelector('.receive-count-badge');
            
            expect(receiveCountBadge).toBeTruthy();
            expect(receiveCountBadge.textContent).toContain('3');
            expect(receiveCountBadge.classList.contains('warning')).toBe(true);
        });

        it('should include copy button for message body', () => {
            const view = enhancedView.createEnhancedView(mockMessage);
            const copyButton = view.querySelector('.copy-body-btn');
            
            expect(copyButton).toBeTruthy();
            expect(copyButton.textContent).toContain('Copy');
        });

        it('should show all message attributes', () => {
            const view = enhancedView.createEnhancedView(mockMessage);
            const attributes = view.querySelector('.attributes-list');
            
            expect(attributes.textContent).toContain('ApproximateReceiveCount');
            expect(attributes.textContent).toContain('3');
            expect(attributes.textContent).toContain('MessageDeduplicationId');
            expect(attributes.textContent).toContain('dedup-123');
        });
    });

    describe('formatTimestamp', () => {
        it('should format timestamp correctly', () => {
            const formatted = enhancedView.formatTimestamp('1643723400000');
            expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
        });

        it('should handle invalid timestamps', () => {
            const formatted = enhancedView.formatTimestamp('invalid');
            expect(formatted).toBe('Invalid date');
        });
    });

    describe('copyToClipboard', () => {
        it('should copy text to clipboard', async () => {
            const mockClipboard = {
                writeText: vi.fn().mockResolvedValue()
            };
            Object.defineProperty(navigator, 'clipboard', {
                value: mockClipboard,
                writable: true
            });

            await enhancedView.copyToClipboard('test text', document.createElement('button'));
            expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
        });
    });

    describe('getReceiveCountStatus', () => {
        it('should return normal for low receive counts', () => {
            expect(enhancedView.getReceiveCountStatus(1)).toBe('normal');
            expect(enhancedView.getReceiveCountStatus(2)).toBe('normal');
        });

        it('should return warning for medium receive counts', () => {
            expect(enhancedView.getReceiveCountStatus(3)).toBe('warning');
            expect(enhancedView.getReceiveCountStatus(4)).toBe('warning');
        });

        it('should return danger for high receive counts', () => {
            expect(enhancedView.getReceiveCountStatus(5)).toBe('danger');
            expect(enhancedView.getReceiveCountStatus(10)).toBe('danger');
        });
    });
});