/**
 * DLQ Detection Tests
 * Tests for identifying and handling Dead Letter Queues
 */
import { describe, it, expect } from 'vitest';

import {
  isDLQ,
  getSourceQueue,
  getDLQIndicator,
  buildDlqSourceMap,
} from '../internal/static/files/modules/dlqDetection.js';

describe('DLQ Detection', () => {
  describe('isDLQ', () => {
    it('should detect queues ending with -dlq', () => {
      expect(isDLQ({ name: 'payment-processing-dlq' })).toBe(true);
      expect(isDLQ({ name: 'user-notifications-dlq' })).toBe(true);
    });

    it('should detect queues ending with -DLQ', () => {
      expect(isDLQ({ name: 'payment-processing-DLQ' })).toBe(true);
      expect(isDLQ({ name: 'USER-NOTIFICATIONS-DLQ' })).toBe(true);
    });

    it('should detect queues ending with _dlq', () => {
      expect(isDLQ({ name: 'payment_processing_dlq' })).toBe(true);
      expect(isDLQ({ name: 'user_notifications_dlq' })).toBe(true);
    });

    it('should detect queues ending with _DLQ', () => {
      expect(isDLQ({ name: 'payment_processing_DLQ' })).toBe(true);
      expect(isDLQ({ name: 'USER_NOTIFICATIONS_DLQ' })).toBe(true);
    });

    it('should detect queues with dlq in attributes', () => {
      expect(
        isDLQ({
          name: 'failed-messages',
          attributes: {
            RedriveAllowPolicy:
              '{"redrivePermission":"byQueue","sourceQueueArns":["arn:aws:sqs:us-east-1:123456789012:source-queue"]}',
          },
        })
      ).toBe(true);
    });

    it('should not detect regular queues as DLQ', () => {
      expect(isDLQ({ name: 'payment-processing' })).toBe(false);
      expect(isDLQ({ name: 'user-notifications' })).toBe(false);
      expect(isDLQ({ name: 'dlq-monitor' })).toBe(false);
      expect(isDLQ({ name: 'handle-dlq-messages' })).toBe(false);
    });

    it('should not detect source queues with RedrivePolicy as DLQ', () => {
      expect(
        isDLQ({
          name: 'source-queue',
          attributes: {
            RedrivePolicy: '{"deadLetterTargetArn":"arn:aws:sqs:us-east-1:123456789012:my-dlq","maxReceiveCount":3}',
          },
        })
      ).toBe(false);
    });
  });

  describe('getSourceQueue', () => {
    it('should extract source queue from -dlq suffix', () => {
      expect(getSourceQueue('payment-processing-dlq')).toBe('payment-processing');
      expect(getSourceQueue('user-notifications-dlq')).toBe('user-notifications');
    });

    it('should extract source queue from -DLQ suffix', () => {
      expect(getSourceQueue('payment-processing-DLQ')).toBe('payment-processing');
      expect(getSourceQueue('USER-NOTIFICATIONS-DLQ')).toBe('USER-NOTIFICATIONS');
    });

    it('should extract source queue from _dlq suffix', () => {
      expect(getSourceQueue('payment_processing_dlq')).toBe('payment_processing');
      expect(getSourceQueue('user_notifications_dlq')).toBe('user_notifications');
    });

    it('should extract source queue from _DLQ suffix', () => {
      expect(getSourceQueue('payment_processing_DLQ')).toBe('payment_processing');
      expect(getSourceQueue('USER_NOTIFICATIONS_DLQ')).toBe('USER_NOTIFICATIONS');
    });

    it('should return null for non-DLQ queues', () => {
      expect(getSourceQueue('payment-processing')).toBe(null);
      expect(getSourceQueue('user-notifications')).toBe(null);
    });
  });

  describe('getDLQIndicator', () => {
    it('should return DLQ indicator HTML', () => {
      const indicator = getDLQIndicator();
      expect(indicator).toContain('dlq-indicator');
      expect(indicator).toContain('DLQ');
      expect(indicator).toContain('title="Dead Letter Queue"');
    });
  });

  describe('isDLQ via RedriveAllowPolicy', () => {
    it('detects a DLQ with allowAll permission (no sourceQueueArns)', () => {
      // The common case (and what the demo uses) — must be detected.
      expect(
        isDLQ({
          name: 'demo-deadletter-queue',
          attributes: { RedriveAllowPolicy: '{"redrivePermission":"allowAll"}' },
        })
      ).toBe(true);
    });

    it('detects a DLQ with byQueue + sourceQueueArns', () => {
      expect(
        isDLQ({
          name: 'whatever',
          attributes: {
            RedriveAllowPolicy: '{"redrivePermission":"byQueue","sourceQueueArns":["arn:aws:sqs:us-east-1:1:src"]}',
          },
        })
      ).toBe(true);
    });
  });

  describe('buildDlqSourceMap', () => {
    const dlq = {
      name: 'demo-deadletter-queue',
      url: 'https://sqs/dlq',
      attributes: {
        QueueArn: 'arn:aws:sqs:us-east-1:123:demo-deadletter-queue',
        RedriveAllowPolicy: '{"redrivePermission":"allowAll"}',
      },
    };
    const source = {
      name: 'demo-orders-queue',
      url: 'https://sqs/orders',
      attributes: {
        QueueArn: 'arn:aws:sqs:us-east-1:123:demo-orders-queue',
        RedrivePolicy:
          '{"deadLetterTargetArn":"arn:aws:sqs:us-east-1:123:demo-deadletter-queue","maxReceiveCount":"3"}',
      },
    };

    it('maps a DLQ url to its source queue url via RedrivePolicy', () => {
      const map = buildDlqSourceMap([dlq, source]);
      expect(map.get('https://sqs/dlq')).toBe('https://sqs/orders');
    });

    it('keeps the first source when several target the same DLQ', () => {
      const source2 = { ...source, name: 'demo-payments-queue', url: 'https://sqs/payments' };
      const map = buildDlqSourceMap([dlq, source, source2]);
      expect(map.get('https://sqs/dlq')).toBe('https://sqs/orders');
    });

    it('returns an empty map for malformed / missing policies', () => {
      expect(buildDlqSourceMap(null).size).toBe(0);
      expect(buildDlqSourceMap([{ url: 'x', attributes: { RedrivePolicy: 'not json' } }]).size).toBe(0);
    });
  });
});
