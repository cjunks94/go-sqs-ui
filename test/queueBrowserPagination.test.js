/**
 * Regression tests for queue browser pagination offset (issue #34).
 * Uses the real QueueBrowser module (the sibling suite mocks it).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { APIService } from '@/apiService.js';
import { QueueBrowser } from '@/queueBrowser.js';

vi.mock('@/apiService.js', () => ({
  APIService: { getMessages: vi.fn() },
}));

const QUEUE = {
  url: 'https://sqs.us-east-1.amazonaws.com/123/test-queue',
  name: 'test-queue',
  attributes: { ApproximateNumberOfMessages: '30' },
};

describe('QueueBrowser pagination offset', () => {
  let browser;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    APIService.getMessages.mockResolvedValue([{ messageId: 'm1', body: 'b1' }]);
    browser = new QueueBrowser({ getCurrentQueue: () => QUEUE });
    browser.createBrowserUI(QUEUE);
    document.body.appendChild(browser.element);
  });

  it('passes the computed offset to APIService.getMessages', async () => {
    await browser.loadPage(2); // page 2, itemsPerPage 10 -> offset 10
    expect(APIService.getMessages).toHaveBeenCalledWith(QUEUE.url, 10, 10);
  });

  it('page 1 uses offset 0', async () => {
    await browser.loadPage(1);
    expect(APIService.getMessages).toHaveBeenCalledWith(QUEUE.url, 10, 0);
  });

  it('clamps the page size to the SQS per-fetch cap (10)', async () => {
    await browser.setItemsPerPage(100);
    expect(browser.itemsPerPage).toBe(10);
    // offset for page 1 is 0, limit clamped to 10
    expect(APIService.getMessages).toHaveBeenLastCalledWith(QUEUE.url, 10, 0);
  });
});
