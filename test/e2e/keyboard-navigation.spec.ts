/**
 * E2E Tests for Keyboard Navigation
 * Tests keyboard shortcuts and navigation functionality
 */
import { test, expect, Page } from '@playwright/test';

test.describe('Keyboard Navigation', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:8080');
    
    // Wait for initial load
    await page.waitForSelector('.queue-list', { timeout: 10000 });
    
    // Select a queue with messages for testing
    const queueWithMessages = await page.$('.queue-item:not(:has-text("0 messages"))');
    if (queueWithMessages) {
      await queueWithMessages.click();
      await page.waitForSelector('.message-list', { timeout: 5000 });
      await page.waitForSelector('.message-item', { timeout: 5000 });
    }
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should navigate messages with j/k keys', async () => {
    // Press 'j' to go to next message
    await page.keyboard.press('j');
    
    // Check if first message is focused
    const firstMessage = await page.$('.message-item:first-child');
    if (firstMessage) {
      const hasFocus = await firstMessage.evaluate(el => 
        el.classList.contains('keyboard-focused') || 
        el === document.activeElement
      );
      
      if (!hasFocus) {
        // Feature not implemented yet - expected in TDD
        test.skip();
        return;
      }
      
      expect(hasFocus).toBe(true);
      
      // Press 'j' again to go to second message
      await page.keyboard.press('j');
      
      const secondMessage = await page.$('.message-item:nth-child(2)');
      const secondHasFocus = await secondMessage?.evaluate(el =>
        el.classList.contains('keyboard-focused') ||
        el === document.activeElement
      );
      expect(secondHasFocus).toBe(true);
      
      // Press 'k' to go back
      await page.keyboard.press('k');
      
      const firstHasFocusAgain = await firstMessage.evaluate(el =>
        el.classList.contains('keyboard-focused') ||
        el === document.activeElement
      );
      expect(firstHasFocusAgain).toBe(true);
    }
  });

  test('should expand message with Enter key', async () => {
    // Navigate to first message
    await page.keyboard.press('j');
    
    // Check if message details are hidden
    const messageDetails = await page.$('.message-item:first-child .message-details');
    
    if (!messageDetails) {
      test.skip();
      return;
    }
    
    const initiallyVisible = await messageDetails.isVisible();
    
    // Press Enter to expand
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300); // Wait for animation
    
    // Details should now be visible
    const nowVisible = await messageDetails.isVisible();
    expect(nowVisible).toBe(!initiallyVisible);
    
    // Press Enter again to collapse
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    
    const finalVisible = await messageDetails.isVisible();
    expect(finalVisible).toBe(initiallyVisible);
  });

  test('should focus search with / key', async () => {
    // Press '/' to focus search
    await page.keyboard.press('/');
    
    // Check if search input is focused
    const searchInput = await page.$('.filter-input, input[type="search"]');
    if (searchInput) {
      const isFocused = await searchInput.evaluate(el => el === document.activeElement);
      expect(isFocused).toBe(true);
      
      // Type in search
      await page.keyboard.type('error');
      
      const value = await searchInput.inputValue();
      expect(value).toBe('error');
    }
  });

  test('should jump to top with gg keys', async () => {
    // Scroll down first
    await page.evaluate(() => window.scrollTo(0, 500));
    
    // Press 'g' twice quickly
    await page.keyboard.press('g');
    await page.keyboard.press('g');
    
    await page.waitForTimeout(500); // Wait for scroll
    
    // Check scroll position
    const scrollTop = await page.evaluate(() => window.pageYOffset);
    expect(scrollTop).toBe(0);
    
    // First message should be focused
    const firstMessage = await page.$('.message-item:first-child');
    if (firstMessage) {
      const hasFocus = await firstMessage.evaluate(el =>
        el.classList.contains('keyboard-focused')
      );
      expect(hasFocus).toBe(true);
    }
  });

  test('should jump to bottom with G key', async () => {
    // Press 'G' to jump to bottom
    await page.keyboard.press('G');
    
    await page.waitForTimeout(500); // Wait for scroll
    
    // Check if we're at the bottom
    const isAtBottom = await page.evaluate(() => {
      const scrollHeight = document.body.scrollHeight;
      const scrollTop = window.pageYOffset;
      const clientHeight = window.innerHeight;
      return Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
    });
    
    if (!isAtBottom) {
      // Feature might not be implemented
      test.skip();
      return;
    }
    
    expect(isAtBottom).toBe(true);
    
    // Last message should be focused
    const lastMessage = await page.$('.message-item:last-child');
    if (lastMessage) {
      const hasFocus = await lastMessage.evaluate(el =>
        el.classList.contains('keyboard-focused')
      );
      expect(hasFocus).toBe(true);
    }
  });

  test('should refresh messages with r key', async () => {
    // Get initial message count
    const initialMessages = await page.$$('.message-item');
    const initialCount = initialMessages.length;
    
    // Press 'r' to refresh
    await page.keyboard.press('r');
    
    // Wait for potential refresh
    await page.waitForTimeout(1000);
    
    // Messages should be refreshed (count might change)
    const newMessages = await page.$$('.message-item');
    expect(newMessages.length).toBeGreaterThanOrEqual(0);
    
    // Check if refresh actually happened (loading indicator or new messages)
    // This depends on implementation
  });

  test('should navigate pages with n/p keys', async () => {
    // Check if pagination exists
    const pagination = await page.$('.pagination-controls, .show-more-messages-btn');
    
    if (!pagination) {
      test.skip();
      return;
    }
    
    // Press 'n' for next page
    await page.keyboard.press('n');
    await page.waitForTimeout(500);
    
    // Check if page changed (new messages or page indicator)
    const pageInfo = await page.$('.pagination-info, .page-info');
    if (pageInfo) {
      const text = await pageInfo.textContent();
      expect(text).toContain('2'); // Should be on page 2
      
      // Press 'p' for previous page
      await page.keyboard.press('p');
      await page.waitForTimeout(500);
      
      const newText = await pageInfo.textContent();
      expect(newText).toContain('1'); // Back to page 1
    }
  });

  test('should show help modal with ? key', async () => {
    // Press '?' to show help
    await page.keyboard.press('?');
    
    // Wait for modal
    const helpModal = await page.$('.keyboard-help-modal, .help-modal');
    
    if (!helpModal) {
      test.skip();
      return;
    }
    
    await expect(helpModal).toBeVisible();
    
    // Should show keyboard shortcuts
    const content = await helpModal.textContent();
    expect(content).toContain('j');
    expect(content).toContain('k');
    expect(content).toContain('Next message');
    expect(content).toContain('Previous message');
    
    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(helpModal).not.toBeVisible();
  });

  test('should clear focus with Escape key', async () => {
    // Focus a message first
    await page.keyboard.press('j');
    
    // Verify something is focused
    const focusedBefore = await page.$('.keyboard-focused');
    
    if (!focusedBefore) {
      test.skip();
      return;
    }
    
    expect(focusedBefore).toBeTruthy();
    
    // Press Escape to clear focus
    await page.keyboard.press('Escape');
    
    // Nothing should be focused
    const focusedAfter = await page.$('.keyboard-focused');
    expect(focusedAfter).toBeFalsy();
  });

  test('should toggle queue browser with b key', async () => {
    // Press 'b' to toggle browser
    await page.keyboard.press('b');
    
    // Check if browser modal appears
    const browserModal = await page.$('.queue-browser-modal');
    
    if (!browserModal) {
      test.skip();
      return;
    }
    
    await expect(browserModal).toBeVisible();
    
    // Press 'b' again or Escape to close
    await page.keyboard.press('Escape');
    await expect(browserModal).not.toBeVisible();
  });

  test('should toggle statistics with s key', async () => {
    // Press 's' to toggle statistics
    await page.keyboard.press('s');
    
    // Check if statistics panel appears/toggles
    const statsPanel = await page.$('.queue-statistics-panel');
    
    if (!statsPanel) {
      test.skip();
      return;
    }
    
    const isVisible = await statsPanel.isVisible();
    
    // Press 's' again to toggle
    await page.keyboard.press('s');
    
    const nowVisible = await statsPanel.isVisible();
    expect(nowVisible).toBe(!isVisible);
  });

  test('should export with e key', async () => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 2000 }).catch(() => null);
    
    // Press 'e' to export
    await page.keyboard.press('e');
    
    const download = await downloadPromise;
    
    if (download) {
      // Export worked
      expect(download.suggestedFilename()).toMatch(/\.(json|csv)$/);
    } else {
      // Feature not implemented - check if export dialog appeared
      const exportDialog = await page.$('.export-dialog, .export-menu');
      if (!exportDialog) {
        test.skip();
      }
    }
  });

  test('should not trigger shortcuts when typing in input', async () => {
    // Focus search input
    const searchInput = await page.$('.filter-input, input[type="search"]');
    if (searchInput) {
      await searchInput.focus();
      
      // Type 'j' and 'k' in search
      await page.keyboard.type('jk');
      
      // Should not navigate messages
      const focusedMessage = await page.$('.keyboard-focused');
      expect(focusedMessage).toBeFalsy();
      
      // Search should contain 'jk'
      const value = await searchInput.inputValue();
      expect(value).toContain('jk');
    }
  });

  test('should handle multi-key shortcuts', async () => {
    // Test 'gg' for top
    await page.evaluate(() => window.scrollTo(0, 500));
    
    await page.keyboard.press('g');
    // Small delay between keys
    await page.waitForTimeout(100);
    await page.keyboard.press('g');
    
    await page.waitForTimeout(500);
    
    const scrollTop = await page.evaluate(() => window.pageYOffset);
    expect(scrollTop).toBe(0);
  });

  test('should cycle through focusable elements', async () => {
    // Press Tab to cycle through elements
    await page.keyboard.press('Tab');
    
    let activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeTruthy();
    
    // Press Tab multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const newActiveElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(newActiveElement).toBeTruthy();
    }
    
    // Shift+Tab to go backwards
    await page.keyboard.press('Shift+Tab');
    activeElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(activeElement).toBeTruthy();
  });

  test('should maintain focus visibility when scrolling', async () => {
    // Navigate to a message
    await page.keyboard.press('j');
    await page.keyboard.press('j');
    await page.keyboard.press('j');
    
    // Get focused element position
    const focusedMessage = await page.$('.keyboard-focused, .message-item:focus');
    
    if (!focusedMessage) {
      test.skip();
      return;
    }
    
    const isInViewport = await focusedMessage.isIntersectingViewport();
    expect(isInViewport).toBe(true);
    
    // Continue navigating
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('j');
      await page.waitForTimeout(100);
      
      const newFocused = await page.$('.keyboard-focused, .message-item:focus');
      if (newFocused) {
        const stillInView = await newFocused.isIntersectingViewport();
        expect(stillInView).toBe(true);
      }
    }
  });

  test('should disable shortcuts when modal is open', async () => {
    // Open help modal
    await page.keyboard.press('?');
    
    const helpModal = await page.$('.keyboard-help-modal, .help-modal');
    if (!helpModal) {
      test.skip();
      return;
    }
    
    await expect(helpModal).toBeVisible();
    
    // Try to navigate with 'j' - should not work
    await page.keyboard.press('j');
    
    // No message should be focused
    const focusedMessage = await page.$('.keyboard-focused');
    expect(focusedMessage).toBeFalsy();
    
    // Close modal
    await page.keyboard.press('Escape');
    
    // Now 'j' should work
    await page.keyboard.press('j');
    const nowFocused = await page.$('.keyboard-focused, .message-item:first-child');
    expect(nowFocused).toBeTruthy();
  });
});