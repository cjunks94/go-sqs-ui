/**
 * XSS Escaping Regression Tests
 *
 * These import the REAL modules (not the mocked reimplementations used in the
 * sibling suites) to verify that untrusted SQS message content and DLQ error
 * data are neutralized before being written to the DOM.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { APIService } from '@/apiService.js';
import { QueueBrowser } from '@/queueBrowser.js';
import { QueueStatistics } from '@/queueStatistics.js';
import { MessageFilter } from '@/messageFilter.js';

vi.mock('@/apiService.js');

const XSS = '<img src=x onerror="window.__pwned=1">';

describe('XSS escaping (real modules)', () => {
  beforeEach(() => {
    delete window.__pwned;
    vi.clearAllMocks();
  });

  describe('QueueBrowser.createMessageElement', () => {
    it('escapes a malicious message body instead of rendering it as HTML', () => {
      const browser = new QueueBrowser({ getCurrentQueue: () => null });

      const el = browser.createMessageElement({ messageId: 'm1', body: XSS }, 0);

      // The payload must not have been parsed into a live DOM node...
      expect(el.querySelector('img')).toBeNull();
      // ...and the literal text must be preserved for the user to see.
      expect(el.querySelector('.browser-message-body').textContent).toContain(XSS);
    });

    it('escapes a malicious message id', () => {
      const browser = new QueueBrowser({ getCurrentQueue: () => null });

      const el = browser.createMessageElement({ messageId: XSS, body: 'ok' }, 0);

      expect(el.querySelector('img')).toBeNull();
      expect(el.querySelector('.browser-message-id').textContent).toContain(XSS);
    });
  });

  describe('QueueStatistics DLQ error types', () => {
    it('escapes a malicious error-type label', async () => {
      // happy-dom's canvas has no 2D context; init() only needs a stub.
      globalThis.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({}));

      const stats = new QueueStatistics({
        getCurrentQueue: () => ({ url: 'https://sqs/q-dlq', name: 'q-dlq' }),
      });
      stats.init();

      APIService.getDLQStatistics = vi.fn().mockResolvedValue({
        errorTypes: { [XSS]: 2 },
      });

      await stats.loadDLQStatistics();

      const errorTypesEl = stats.element.querySelector('#stat-error-types');
      expect(errorTypesEl.querySelector('img')).toBeNull();
      expect(errorTypesEl.querySelector('.error-type-item').textContent).toBe(`${XSS}: 2`);
      expect(window.__pwned).toBeUndefined();
    });
  });

  describe('MessageFilter.highlightMatches', () => {
    it('escapes HTML in the message text (output is assigned to innerHTML)', () => {
      const filter = new MessageFilter();
      const out = filter.highlightMatches(XSS, 'src');

      // No live markup: the raw tag must be escaped...
      expect(out).not.toContain('<img');
      expect(out).toContain('&lt;img');
      // ...and the literal match is still highlighted.
      expect(out).toContain('<mark>');
    });

    it('treats a regex-special search term literally (no SyntaxError)', () => {
      const filter = new MessageFilter();
      expect(() => filter.highlightMatches('a[b]c', '[')).not.toThrow();
      const out = filter.highlightMatches('a[b]c', '[');
      expect(out).toContain('<mark>[</mark>');
    });

    it('escapes text even when there is no search term', () => {
      const filter = new MessageFilter();
      expect(filter.highlightMatches('<b>x</b>', '')).toBe('&lt;b&gt;x&lt;/b&gt;');
    });
  });
});
