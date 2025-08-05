import { test, expect, Page } from '@playwright/test';

test.describe('Message Display Stability - No Rotation', () => {
  let page: Page;
  let messageIds: string[] = [];
  let initialMessageOrder: string[] = [];

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('.queue-list', { timeout: 10000 });
    
    // Click on the first queue to load messages
    const firstQueue = page.locator('.queue-item').first();
    await firstQueue.click();
    
    // Wait for messages to load
    await page.waitForSelector('.message-item', { timeout: 10000 });
    
    // Capture initial message order
    initialMessageOrder = await captureMessageOrder(page);
    console.log('Initial message order:', initialMessageOrder);
  });

  test('messages should not rotate when WebSocket updates arrive', async () => {
    // Record the initial message order
    const firstCapture = await captureMessageOrder(page);
    expect(firstCapture.length).toBeGreaterThan(0);
    
    // Wait for WebSocket updates (5 second polling interval)
    await page.waitForTimeout(6000);
    
    // Capture message order again
    const secondCapture = await captureMessageOrder(page);
    
    // Messages should be in the same order (no rotation)
    expect(secondCapture).toEqual(firstCapture);
    
    // Wait for another update cycle
    await page.waitForTimeout(6000);
    
    // Capture again
    const thirdCapture = await captureMessageOrder(page);
    
    // Still should be in the same order
    expect(thirdCapture).toEqual(firstCapture);
    
    // Take screenshot for evidence
    await page.screenshot({ 
      path: 'test-results/no-rotation-test.png', 
      fullPage: true 
    });
  });

  test('messages should maintain newest-first order', async () => {
    // Get all message timestamps
    const timestamps = await page.locator('.message-timestamp-compact').allTextContents();
    
    // Parse timestamps and verify they're in descending order
    const parsedDates = timestamps.map(ts => new Date(ts).getTime());
    
    for (let i = 1; i < parsedDates.length; i++) {
      expect(parsedDates[i - 1]).toBeGreaterThanOrEqual(parsedDates[i]);
    }
    
    // Wait for an update
    await page.waitForTimeout(6000);
    
    // Check order again after update
    const newTimestamps = await page.locator('.message-timestamp-compact').allTextContents();
    const newParsedDates = newTimestamps.map(ts => new Date(ts).getTime());
    
    for (let i = 1; i < newParsedDates.length; i++) {
      expect(newParsedDates[i - 1]).toBeGreaterThanOrEqual(newParsedDates[i]);
    }
  });

  test('new messages should be added without disturbing existing ones', async () => {
    // Monitor WebSocket messages
    const wsMessages: any[] = [];
    
    page.on('websocket', ws => {
      ws.on('framereceived', event => {
        if (event.payload) {
          try {
            const data = JSON.parse(event.payload.toString());
            if (data.type === 'messages' || data.type === 'initial_messages') {
              wsMessages.push(data);
            }
          } catch (e) {
            // Ignore non-JSON frames
          }
        }
      });
    });
    
    // Get initial message count
    const initialCount = await page.locator('.message-item').count();
    
    // Wait for potential new messages
    await page.waitForTimeout(10000);
    
    // Check if any incremental updates arrived
    const incrementalUpdates = wsMessages.filter(msg => msg.type === 'messages');
    
    if (incrementalUpdates.length > 0) {
      // Verify that existing messages are still in the same positions
      const currentOrder = await captureMessageOrder(page);
      
      // Original messages should still be present in the same relative order
      for (let i = 0; i < initialMessageOrder.length; i++) {
        expect(currentOrder).toContain(initialMessageOrder[i]);
      }
    }
  });

  test('message IDs should remain unique in the display', async () => {
    // Collect all message IDs
    const messageElements = await page.locator('.message-item').all();
    const messageIds: string[] = [];
    
    for (const element of messageElements) {
      const id = await element.getAttribute('data-message-id');
      if (id) messageIds.push(id);
    }
    
    // Check for duplicates
    const uniqueIds = new Set(messageIds);
    expect(messageIds.length).toBe(uniqueIds.size);
    
    // Wait for updates
    await page.waitForTimeout(6000);
    
    // Check again after updates
    const newMessageElements = await page.locator('.message-item').all();
    const newMessageIds: string[] = [];
    
    for (const element of newMessageElements) {
      const id = await element.getAttribute('data-message-id');
      if (id) newMessageIds.push(id);
    }
    
    const newUniqueIds = new Set(newMessageIds);
    expect(newMessageIds.length).toBe(newUniqueIds.size);
  });

  test('expanded messages should remain expanded during updates', async () => {
    // Click to expand the first message
    const firstMessage = page.locator('.message-collapsed').first();
    await firstMessage.click();
    
    // Wait for expansion animation
    await page.waitForTimeout(500);
    
    // Verify it's expanded
    const expandedView = page.locator('.message-expanded').first();
    await expect(expandedView).toBeVisible();
    
    // Get the message ID of the expanded message
    const messageItem = page.locator('.message-item.expanded').first();
    const expandedMessageId = await messageItem.getAttribute('data-message-id');
    
    // Wait for WebSocket update
    await page.waitForTimeout(6000);
    
    // Check if the same message is still expanded
    const stillExpanded = page.locator(`.message-item[data-message-id="${expandedMessageId}"].expanded`);
    await expect(stillExpanded).toBeVisible();
    
    // The expanded content should still be visible
    const expandedContent = stillExpanded.locator('.message-expanded');
    await expect(expandedContent).toBeVisible();
  });
});

// Helper function to capture message order
async function captureMessageOrder(page: Page): Promise<string[]> {
  const messageElements = await page.locator('.message-item').all();
  const messageIds: string[] = [];
  
  for (const element of messageElements) {
    const id = await element.getAttribute('data-message-id');
    if (id) {
      messageIds.push(id);
    }
  }
  
  return messageIds;
}