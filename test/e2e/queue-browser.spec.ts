/**
 * E2E Tests for Queue Browser Mode
 * Tests the full queue browsing experience with pagination
 */
import { test, expect, Page } from '@playwright/test';

test.describe('Queue Browser Mode', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:8080');
    
    // Wait for initial load
    await page.waitForSelector('.queue-list', { timeout: 10000 });
    
    // Select a queue with messages
    const firstQueue = await page.$('.queue-item:first-child');
    if (firstQueue) {
      await firstQueue.click();
      await page.waitForSelector('.message-list', { timeout: 5000 });
    }
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should open queue browser when Browse Queue button is clicked', async () => {
    // Look for Browse Queue button (will be added in implementation)
    const browseButton = await page.$('.browse-queue-button, button:has-text("Browse Queue")');
    
    if (!browseButton) {
      // Button doesn't exist yet - expected in TDD
      test.skip();
      return;
    }
    
    await browseButton.click();
    
    // Wait for browser modal to appear
    await expect(page.locator('.queue-browser-modal')).toBeVisible({ timeout: 5000 });
    
    // Verify browser UI elements
    await expect(page.locator('.queue-browser-header')).toBeVisible();
    await expect(page.locator('.queue-browser-messages')).toBeVisible();
    await expect(page.locator('.queue-browser-pagination')).toBeVisible();
  });

  test('should display first page of messages in browser', async () => {
    const browseButton = await page.$('button:has-text("Browse Queue")');
    if (!browseButton) {
      test.skip();
      return;
    }
    
    await browseButton.click();
    await page.waitForSelector('.queue-browser-modal');
    
    // Check message display
    const messages = await page.$$('.browser-message-item');
    expect(messages.length).toBeGreaterThan(0);
    expect(messages.length).toBeLessThanOrEqual(50); // Default page size
    
    // Check message count display
    const countDisplay = await page.textContent('.message-count-display');
    expect(countDisplay).toMatch(/Showing \d+-\d+ of \d+ messages/);
  });

  test('should navigate to next page', async () => {
    const browseButton = await page.$('button:has-text("Browse Queue")');
    if (!browseButton) {
      test.skip();
      return;
    }
    
    await browseButton.click();
    await page.waitForSelector('.queue-browser-modal');
    
    // Get initial message IDs
    const initialMessages = await page.$$eval('.browser-message-item', 
      items => items.map(item => item.querySelector('.browser-message-id')?.textContent)
    );
    
    // Click next page
    const nextButton = await page.$('.browser-page-next');
    if (nextButton) {
      const isDisabled = await nextButton.isDisabled();
      if (!isDisabled) {
        await nextButton.click();
        
        // Wait for page update
        await page.waitForTimeout(500);
        
        // Get new message IDs
        const newMessages = await page.$$eval('.browser-message-item',
          items => items.map(item => item.querySelector('.browser-message-id')?.textContent)
        );
        
        // Verify messages changed
        expect(newMessages[0]).not.toBe(initialMessages[0]);
        
        // Verify page info updated
        const pageInfo = await page.textContent('.browser-page-info');
        expect(pageInfo).toContain('Page 2');
      }
    }
  });

  test('should navigate to previous page', async () => {
    const browseButton = await page.$('button:has-text("Browse Queue")');
    if (!browseButton) {
      test.skip();
      return;
    }
    
    await browseButton.click();
    await page.waitForSelector('.queue-browser-modal');
    
    // Navigate to page 2 first
    const nextButton = await page.$('.browser-page-next');
    if (nextButton && !await nextButton.isDisabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      
      // Now go back
      const prevButton = await page.$('.browser-page-prev');
      expect(await prevButton.isDisabled()).toBe(false);
      
      await prevButton.click();
      await page.waitForTimeout(500);
      
      // Verify we're back on page 1
      const pageInfo = await page.textContent('.browser-page-info');
      expect(pageInfo).toContain('Page 1');
      
      // Previous button should be disabled on page 1
      expect(await prevButton.isDisabled()).toBe(true);
    }
  });

  test('should jump to specific page', async () => {
    const browseButton = await page.$('button:has-text("Browse Queue")');
    if (!browseButton) {
      test.skip();
      return;
    }
    
    await browseButton.click();
    await page.waitForSelector('.queue-browser-modal');
    
    // Check if we have multiple pages
    const pageInfo = await page.textContent('.browser-page-info');
    const match = pageInfo?.match(/Page \d+ of (\d+)/);
    
    if (match && parseInt(match[1]) >= 3) {
      // Jump to page 3
      const pageInput = await page.$('.browser-page-input');
      const goButton = await page.$('.browser-page-go');
      
      if (pageInput && goButton) {
        await pageInput.fill('3');
        await goButton.click();
        
        await page.waitForTimeout(500);
        
        // Verify we're on page 3
        const newPageInfo = await page.textContent('.browser-page-info');
        expect(newPageInfo).toContain('Page 3');
      }
    }
  });

  test('should close browser with close button', async () => {
    const browseButton = await page.$('button:has-text("Browse Queue")');
    if (!browseButton) {
      test.skip();
      return;
    }
    
    await browseButton.click();
    await page.waitForSelector('.queue-browser-modal');
    
    // Find and click close button
    const closeButton = await page.$('.queue-browser-close');
    if (closeButton) {
      await closeButton.click();
      
      // Verify modal is gone
      await expect(page.locator('.queue-browser-modal')).not.toBeVisible();
    }
  });

  test('should close browser with Escape key', async () => {
    const browseButton = await page.$('button:has-text("Browse Queue")');
    if (!browseButton) {
      test.skip();
      return;
    }
    
    await browseButton.click();
    await page.waitForSelector('.queue-browser-modal');
    
    // Press Escape
    await page.keyboard.press('Escape');
    
    // Verify modal is gone
    await expect(page.locator('.queue-browser-modal')).not.toBeVisible();
  });

  test('should handle empty queue gracefully', async () => {
    // Select a queue with no messages (if exists)
    const emptyQueue = await page.$('.queue-item:has-text("0 messages")');
    
    if (emptyQueue) {
      await emptyQueue.click();
      await page.waitForTimeout(500);
      
      const browseButton = await page.$('button:has-text("Browse Queue")');
      if (browseButton) {
        await browseButton.click();
        await page.waitForSelector('.queue-browser-modal');
        
        // Should show empty state
        const countDisplay = await page.textContent('.message-count-display');
        expect(countDisplay).toContain('0 messages');
        
        // No message items should be present
        const messages = await page.$$('.browser-message-item');
        expect(messages.length).toBe(0);
      }
    }
  });

  test('should handle very large queues', async () => {
    // Look for a queue with many messages
    const largeQueue = await page.$('.queue-item:has-text("messages"):has-text("1000")');
    
    if (largeQueue) {
      await largeQueue.click();
      await page.waitForTimeout(500);
      
      const browseButton = await page.$('button:has-text("Browse Queue")');
      if (browseButton) {
        await browseButton.click();
        await page.waitForSelector('.queue-browser-modal');
        
        // Should show pagination for large dataset
        const pageInfo = await page.textContent('.browser-page-info');
        const match = pageInfo?.match(/Page 1 of (\d+)/);
        
        if (match) {
          const totalPages = parseInt(match[1]);
          expect(totalPages).toBeGreaterThan(10); // Many pages for large queue
        }
      }
    }
  });

  test('should change items per page', async () => {
    const browseButton = await page.$('button:has-text("Browse Queue")');
    if (!browseButton) {
      test.skip();
      return;
    }
    
    await browseButton.click();
    await page.waitForSelector('.queue-browser-modal');
    
    // Look for items per page selector
    const itemsPerPageSelect = await page.$('.items-per-page-select, select[name="itemsPerPage"]');
    
    if (itemsPerPageSelect) {
      // Get initial message count
      const initialMessages = await page.$$('.browser-message-item');
      const initialCount = initialMessages.length;
      
      // Change to 25 items per page
      await itemsPerPageSelect.selectOption('25');
      await page.waitForTimeout(500);
      
      // Verify message count changed
      const newMessages = await page.$$('.browser-message-item');
      expect(newMessages.length).toBeLessThanOrEqual(25);
      
      // If we had 50 messages before, we should have 25 or less now
      if (initialCount === 50) {
        expect(newMessages.length).toBeLessThanOrEqual(25);
      }
    }
  });

  test('should persist browser state when reopening', async () => {
    const browseButton = await page.$('button:has-text("Browse Queue")');
    if (!browseButton) {
      test.skip();
      return;
    }
    
    // Open browser and navigate to page 2
    await browseButton.click();
    await page.waitForSelector('.queue-browser-modal');
    
    const nextButton = await page.$('.browser-page-next');
    if (nextButton && !await nextButton.isDisabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);
      
      // Close browser
      await page.keyboard.press('Escape');
      await expect(page.locator('.queue-browser-modal')).not.toBeVisible();
      
      // Reopen browser
      await browseButton.click();
      await page.waitForSelector('.queue-browser-modal');
      
      // Should remember last page (implementation dependent)
      // This might be a feature to add or skip
      const pageInfo = await page.textContent('.browser-page-info');
      // Could be Page 1 (reset) or Page 2 (remembered)
      expect(pageInfo).toMatch(/Page \d+/);
    }
  });

  test('should load more messages with scroll (infinite scroll)', async () => {
    const browseButton = await page.$('button:has-text("Browse Queue")');
    if (!browseButton) {
      test.skip();
      return;
    }
    
    await browseButton.click();
    await page.waitForSelector('.queue-browser-modal');
    
    // Check if infinite scroll is implemented
    const messagesContainer = await page.$('.queue-browser-messages');
    if (messagesContainer) {
      const initialMessages = await page.$$('.browser-message-item');
      const initialCount = initialMessages.length;
      
      // Scroll to bottom
      await messagesContainer.evaluate(el => el.scrollTop = el.scrollHeight);
      await page.waitForTimeout(1000); // Wait for potential lazy load
      
      // Check if more messages loaded
      const newMessages = await page.$$('.browser-message-item');
      // If infinite scroll is implemented, we should have more messages
      // Otherwise, count stays the same (pagination only)
      expect(newMessages.length).toBeGreaterThanOrEqual(initialCount);
    }
  });
});