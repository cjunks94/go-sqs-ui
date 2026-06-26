/**
 * Regression test: QueueManager must cancel pending staggered-append timers
 * when a new render starts, so a refresh can't reappend stale items.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { QueueManager } from '@/queueManager.js';

vi.mock('@/apiService.js', () => ({ APIService: { getQueues: vi.fn() } }));

const q = (name) => ({ name, url: `https://sqs/${name}`, attributes: {} });

describe('QueueManager render timer cancellation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<ul id="queueList"></ul>';
  });
  afterEach(() => vi.useRealTimers());

  it('cancels pending timers when a full re-render starts', () => {
    const qm = new QueueManager({});
    qm.renderQueues([q('a'), q('b'), q('c')]); // schedules 3 deferred appends
    qm.renderQueues([q('z')]); // full render: must clear the 3 and reset before scheduling 1
    vi.runAllTimers();

    const names = Array.from(document.querySelectorAll('#queueList .queue-name')).map((el) => el.textContent);
    expect(names).toEqual(['z']); // stale a/b/c never appended
  });

  it('does NOT cancel pending timers during an append (Load More)', () => {
    const qm = new QueueManager({});
    qm.renderQueues([q('a'), q('b'), q('c')]); // first-page timers still pending
    qm.renderQueues([q('d')], true); // append before they fire — must keep all
    vi.runAllTimers();

    const names = Array.from(document.querySelectorAll('#queueList .queue-name'))
      .map((el) => el.textContent)
      .sort();
    expect(names).toEqual(['a', 'b', 'c', 'd']); // nothing dropped
  });
});
