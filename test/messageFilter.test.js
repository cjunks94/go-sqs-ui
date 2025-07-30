/**
 * Message Filter Tests
 * Tests for filtering and searching messages
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { MessageFilter } from '../static/modules/messageFilter.js';

describe('MessageFilter', () => {
    let messageFilter;
    let mockMessages;

    beforeEach(() => {
        messageFilter = new MessageFilter();
        mockMessages = [
            {
                messageId: '123',
                body: '{"event":"payment.processed","amount":99.99}',
                attributes: {
                    SentTimestamp: '1643723400000',
                    ApproximateReceiveCount: '3'
                }
            },
            {
                messageId: '456',
                body: '{"event":"user.created","email":"test@example.com"}',
                attributes: {
                    SentTimestamp: '1643723500000',
                    ApproximateReceiveCount: '1'
                }
            },
            {
                messageId: '789',
                body: 'Plain text error message: Payment failed',
                attributes: {
                    SentTimestamp: '1643723600000',
                    ApproximateReceiveCount: '5'
                }
            }
        ];
    });

    describe('filterMessages', () => {
        it('should filter by message body content', () => {
            const filtered = messageFilter.filterMessages(mockMessages, 'payment');
            expect(filtered).toHaveLength(2);
            expect(filtered[0].messageId).toBe('123');
            expect(filtered[1].messageId).toBe('789');
        });

        it('should be case insensitive', () => {
            const filtered = messageFilter.filterMessages(mockMessages, 'PAYMENT');
            expect(filtered).toHaveLength(2);
        });

        it('should filter by message ID', () => {
            const filtered = messageFilter.filterMessages(mockMessages, '456');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].messageId).toBe('456');
        });

        it('should filter by attribute values', () => {
            const filtered = messageFilter.filterMessages(mockMessages, 'ApproximateReceiveCount:5');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].messageId).toBe('789');
        });

        it('should return all messages for empty filter', () => {
            const filtered = messageFilter.filterMessages(mockMessages, '');
            expect(filtered).toHaveLength(3);
        });

        it('should handle JSON content search', () => {
            const filtered = messageFilter.filterMessages(mockMessages, 'email');
            expect(filtered).toHaveLength(1);
            expect(filtered[0].messageId).toBe('456');
        });
    });

    describe('createFilterUI', () => {
        it('should create filter input element', () => {
            const filterUI = messageFilter.createFilterUI();
            expect(filterUI.classList.contains('message-filter-container')).toBe(true);
            expect(filterUI.querySelector('input')).toBeTruthy();
            expect(filterUI.querySelector('.filter-clear')).toBeTruthy();
        });

        it('should have placeholder text', () => {
            const filterUI = messageFilter.createFilterUI();
            const input = filterUI.querySelector('input');
            expect(input.placeholder).toContain('Search messages');
        });
    });

    describe('highlightMatches', () => {
        it('should highlight matching text', () => {
            const text = 'Payment processing failed';
            const highlighted = messageFilter.highlightMatches(text, 'payment');
            expect(highlighted).toContain('<mark>');
            expect(highlighted).toContain('Payment');
        });

        it('should handle case insensitive highlighting', () => {
            const text = 'PAYMENT processing failed';
            const highlighted = messageFilter.highlightMatches(text, 'payment');
            expect(highlighted).toContain('<mark>PAYMENT</mark>');
        });

        it('should return original text if no match', () => {
            const text = 'User created successfully';
            const highlighted = messageFilter.highlightMatches(text, 'payment');
            expect(highlighted).toBe(text);
        });
    });

    describe('parseFilterQuery', () => {
        it('should parse attribute filters', () => {
            const parsed = messageFilter.parseFilterQuery('ApproximateReceiveCount:3');
            expect(parsed.attributeFilters).toHaveLength(1);
            expect(parsed.attributeFilters[0]).toEqual({
                key: 'ApproximateReceiveCount',
                value: '3'
            });
        });

        it('should parse multiple filters', () => {
            const parsed = messageFilter.parseFilterQuery('payment ApproximateReceiveCount:3');
            expect(parsed.textFilter).toBe('payment');
            expect(parsed.attributeFilters).toHaveLength(1);
        });

        it('should handle plain text filters', () => {
            const parsed = messageFilter.parseFilterQuery('payment failed');
            expect(parsed.textFilter).toBe('payment failed');
            expect(parsed.attributeFilters).toHaveLength(0);
        });
    });
});