/**
 * Regression tests for mounting the QueueStatistics panel (issue #33).
 * Uses the real SQSApp + QueueStatistics modules.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SQSApp } from '@/sqsApp.js';

describe('SQSApp.mountStatisticsPanel', () => {
  beforeEach(() => {
    // DOM anchors required by the UIComponent-based modules SQSApp constructs.
    document.body.innerHTML = `
      <ul id="queueList"></ul>
      <div id="awsContextDetails"></div>
      <div id="messageList"></div>
      <div id="queueAttributes"></div>
      <div class="queue-statistics-panel hidden" id="queueStatisticsPanel">
        <h3>Queue Statistics</h3>
        <div class="statistics-content"><div class="loading">Loading statistics...</div></div>
      </div>
    `;
    // QueueStatistics.init() grabs a 2D canvas context.
    globalThis.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({}));
  });

  it('replaces the placeholder with the functional statistics panel', () => {
    const app = new SQSApp();
    app.mountStatisticsPanel();

    const panels = document.querySelectorAll('.queue-statistics-panel');
    expect(panels).toHaveLength(1); // placeholder replaced, not duplicated

    const panel = panels[0];
    expect(panel.id).toBe('queueStatisticsPanel');
    expect(panel.classList.contains('hidden')).toBe(true);
    // The real module structure is present (the static placeholder lacked these).
    expect(panel.querySelector('#stat-total')).toBeTruthy();
    expect(panel.querySelector('.stats-dlq-section')).toBeTruthy();
    // The module now has a live element, so load()/updateDisplay() can work.
    expect(app.queueStatistics.element).toBe(panel);
  });

  it('toggleStatisticsPanel shows the mounted panel', () => {
    const app = new SQSApp();
    app.mountStatisticsPanel();

    app.keyboardNavigation.toggleStatisticsPanel();
    expect(document.querySelector('.queue-statistics-panel').classList.contains('hidden')).toBe(false);
  });

  it('is a no-op when the placeholder is absent', () => {
    document.getElementById('queueStatisticsPanel').remove();
    const app = new SQSApp();
    expect(() => app.mountStatisticsPanel()).not.toThrow();
  });
});
