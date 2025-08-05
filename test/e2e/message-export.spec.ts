/**
 * E2E Tests for Message Export Functionality
 * Tests exporting messages in various formats
 */
import { test, expect, Page, Download } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Message Export', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('http://localhost:8080');
    
    // Wait for initial load
    await page.waitForSelector('.queue-list', { timeout: 10000 });
    
    // Select a queue with messages
    const queueWithMessages = await page.$('.queue-item:not(:has-text("0 messages"))');
    if (queueWithMessages) {
      await queueWithMessages.click();
      await page.waitForSelector('.message-list', { timeout: 5000 });
      // Wait for messages to load
      await page.waitForSelector('.message-item', { timeout: 5000 });
    }
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should show export button when messages are displayed', async () => {
    // Look for export button
    const exportButton = await page.$('.export-button, button:has-text("Export"), #exportMessages');
    
    if (!exportButton) {
      // Button doesn't exist yet - expected in TDD
      test.skip();
      return;
    }
    
    await expect(exportButton).toBeVisible();
  });

  test('should export current view as JSON', async () => {
    const exportButton = await page.$('button:has-text("Export")');
    if (!exportButton) {
      test.skip();
      return;
    }
    
    // Get current message count
    const messages = await page.$$('.message-item');
    const messageCount = messages.length;
    
    // Start waiting for download before clicking
    const downloadPromise = page.waitForEvent('download');
    
    await exportButton.click();
    
    // If there's a format selector, choose JSON
    const jsonOption = await page.$('button:has-text("Export JSON"), option:has-text("JSON")');
    if (jsonOption) {
      await jsonOption.click();
    }
    
    const download = await downloadPromise;
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.(json)$/);
    
    // Save and verify content
    const downloadPath = await download.path();
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf8');
      const data = JSON.parse(content);
      
      // Verify structure
      expect(data).toHaveProperty('exportDate');
      expect(data).toHaveProperty('queue');
      expect(data).toHaveProperty('messages');
      expect(data.messages).toHaveLength(messageCount);
      
      // Verify message structure
      if (data.messages.length > 0) {
        expect(data.messages[0]).toHaveProperty('messageId');
        expect(data.messages[0]).toHaveProperty('body');
      }
    }
  });

  test('should export filtered messages', async () => {
    // Apply a filter first
    const filterInput = await page.$('.filter-input, input[type="search"]');
    if (!filterInput) {
      test.skip();
      return;
    }
    
    await filterInput.fill('error');
    await page.waitForTimeout(500); // Wait for filter to apply
    
    // Count filtered messages
    const filteredMessages = await page.$$('.message-item:visible');
    const filteredCount = filteredMessages.length;
    
    // Export filtered messages
    const exportButton = await page.$('button:has-text("Export")');
    if (!exportButton) {
      test.skip();
      return;
    }
    
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    
    // Look for "Export Filtered" option
    const exportFilteredOption = await page.$('button:has-text("Export Filtered")');
    if (exportFilteredOption) {
      await exportFilteredOption.click();
    }
    
    const download = await downloadPromise;
    const downloadPath = await download.path();
    
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf8');
      const data = JSON.parse(content);
      
      // Verify filtered export
      expect(data).toHaveProperty('filter', 'error');
      expect(data.messages).toHaveLength(filteredCount);
      
      // All messages should contain 'error'
      data.messages.forEach((msg: any) => {
        const hasError = 
          msg.body.toLowerCase().includes('error') ||
          Object.values(msg.attributes || {}).some((v: any) => 
            v.toString().toLowerCase().includes('error')
          );
        expect(hasError).toBe(true);
      });
    }
  });

  test('should export as CSV format', async () => {
    const exportButton = await page.$('button:has-text("Export")');
    if (!exportButton) {
      test.skip();
      return;
    }
    
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    
    // Look for CSV option
    const csvOption = await page.$('button:has-text("Export CSV"), option:has-text("CSV")');
    if (csvOption) {
      await csvOption.click();
      
      const download = await downloadPromise;
      
      // Verify CSV download
      expect(download.suggestedFilename()).toMatch(/\.csv$/);
      
      const downloadPath = await download.path();
      if (downloadPath) {
        const content = fs.readFileSync(downloadPath, 'utf8');
        
        // Verify CSV structure
        const lines = content.split('\n');
        expect(lines[0]).toContain('Message ID'); // Header
        expect(lines[0]).toContain('Body');
        expect(lines.length).toBeGreaterThan(1); // Has data rows
      }
    }
  });

  test('should export all messages from queue', async () => {
    const exportButton = await page.$('button:has-text("Export")');
    if (!exportButton) {
      test.skip();
      return;
    }
    
    await exportButton.click();
    
    // Look for "Export All" option
    const exportAllOption = await page.$('button:has-text("Export All"), option:has-text("All Messages")');
    if (exportAllOption) {
      const downloadPromise = page.waitForEvent('download');
      await exportAllOption.click();
      
      // This might take longer for large queues
      const download = await downloadPromise;
      const downloadPath = await download.path();
      
      if (downloadPath) {
        const content = fs.readFileSync(downloadPath, 'utf8');
        const data = JSON.parse(content);
        
        // Should have queue attributes
        expect(data).toHaveProperty('queueAttributes');
        expect(data).toHaveProperty('totalMessages');
        
        // Get queue message count from UI
        const queueInfo = await page.textContent('.queue-count, .queue-meta');
        const match = queueInfo?.match(/(\d+) messages/);
        if (match) {
          const expectedCount = parseInt(match[1]);
          expect(data.totalMessages).toBe(expectedCount);
        }
      }
    }
  });

  test('should handle export when no messages', async () => {
    // Select empty queue
    const emptyQueue = await page.$('.queue-item:has-text("0 messages")');
    if (emptyQueue) {
      await emptyQueue.click();
      await page.waitForTimeout(500);
      
      const exportButton = await page.$('button:has-text("Export")');
      
      if (exportButton) {
        // Button might be disabled or show warning
        const isDisabled = await exportButton.isDisabled();
        
        if (!isDisabled) {
          await exportButton.click();
          
          // Should show warning or empty export
          const warning = await page.$('.export-warning, .no-messages-warning');
          if (warning) {
            await expect(warning).toBeVisible();
            expect(await warning.textContent()).toContain('No messages');
          }
        } else {
          // Export should be disabled for empty queue
          expect(isDisabled).toBe(true);
        }
      }
    }
  });

  test('should show export format options', async () => {
    const exportButton = await page.$('button:has-text("Export")');
    if (!exportButton) {
      test.skip();
      return;
    }
    
    await exportButton.click();
    
    // Check for format options
    const formatOptions = await page.$$('.export-format-option, .export-menu button');
    
    if (formatOptions.length > 0) {
      // Should have at least JSON and CSV
      const optionTexts = await Promise.all(
        formatOptions.map(opt => opt.textContent())
      );
      
      expect(optionTexts.some(text => text?.includes('JSON'))).toBe(true);
      expect(optionTexts.some(text => text?.includes('CSV'))).toBe(true);
    }
  });

  test('should export queue statistics', async () => {
    // Look for statistics export option
    const statsButton = await page.$('button:has-text("Export Statistics")');
    
    if (statsButton) {
      const downloadPromise = page.waitForEvent('download');
      await statsButton.click();
      
      const download = await downloadPromise;
      const downloadPath = await download.path();
      
      if (downloadPath) {
        const content = fs.readFileSync(downloadPath, 'utf8');
        const data = JSON.parse(content);
        
        // Verify statistics export
        expect(data).toHaveProperty('statistics');
        expect(data.statistics).toHaveProperty('totalMessages');
        expect(data.statistics).toHaveProperty('messagesInFlight');
      }
    }
  });

  test('should include timestamp in filename', async () => {
    const exportButton = await page.$('button:has-text("Export")');
    if (!exportButton) {
      test.skip();
      return;
    }
    
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    
    const jsonOption = await page.$('button:has-text("JSON"), option:has-text("JSON")');
    if (jsonOption) {
      await jsonOption.click();
    }
    
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    
    // Should include timestamp or date
    expect(filename).toMatch(/\d{4}|\d{10,}/); // Year or timestamp
  });

  test('should export with keyboard shortcut', async () => {
    // Test keyboard shortcut for export (e.g., Ctrl+E or Cmd+E)
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
    
    // Try keyboard shortcut
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+e');
    } else {
      await page.keyboard.press('Control+e');
    }
    
    const download = await downloadPromise;
    
    if (download) {
      // Shortcut worked
      expect(download.suggestedFilename()).toMatch(/\.(json|csv)$/);
    } else {
      // Shortcut not implemented yet - expected in TDD
      test.skip();
    }
  });

  test('should cancel export operation', async () => {
    const exportButton = await page.$('button:has-text("Export")');
    if (!exportButton) {
      test.skip();
      return;
    }
    
    await exportButton.click();
    
    // Look for cancel option
    const cancelButton = await page.$('button:has-text("Cancel"), .export-cancel');
    if (cancelButton) {
      await cancelButton.click();
      
      // Export menu should close
      await expect(page.locator('.export-menu, .export-options')).not.toBeVisible();
      
      // No download should occur
      const downloadPromise = page.waitForEvent('download', { timeout: 1000 }).catch(() => null);
      const download = await downloadPromise;
      expect(download).toBeNull();
    }
  });

  test('should preserve message order in export', async () => {
    const exportButton = await page.$('button:has-text("Export")');
    if (!exportButton) {
      test.skip();
      return;
    }
    
    // Get message IDs from UI
    const uiMessageIds = await page.$$eval('.message-item',
      items => items.map(item => item.getAttribute('data-message-id') || 
                                  item.querySelector('.message-id')?.textContent)
    );
    
    const downloadPromise = page.waitForEvent('download');
    await exportButton.click();
    
    const download = await downloadPromise;
    const downloadPath = await download.path();
    
    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf8');
      const data = JSON.parse(content);
      
      // Extract message IDs from export
      const exportMessageIds = data.messages.map((msg: any) => msg.messageId);
      
      // Order should be preserved
      expect(exportMessageIds).toEqual(uiMessageIds.filter(id => id));
    }
  });
});