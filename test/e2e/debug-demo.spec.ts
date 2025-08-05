import { test, expect } from '@playwright/test';

test('Debug demo mode', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:8080');
  
  // Take screenshot of initial state
  await page.screenshot({ path: 'test-results/debug-1-initial.png' });
  
  // Wait for queues to load
  await page.waitForSelector('.queue-item', { timeout: 5000 });
  console.log('✓ Queues loaded');
  
  // Get all queue names
  const queueNames = await page.locator('.queue-name').allTextContents();
  console.log('Queue names:', queueNames);
  
  // Click on the first queue
  await page.locator('.queue-item').first().click();
  console.log('✓ Clicked first queue');
  
  // Take screenshot after clicking queue
  await page.screenshot({ path: 'test-results/debug-2-after-click.png' });
  
  // Wait a bit for messages to potentially load
  await page.waitForTimeout(2000);
  
  // Check for error messages
  const errorMessages = await page.locator('.error-message').count();
  if (errorMessages > 0) {
    const errorText = await page.locator('.error-message').textContent();
    console.log('ERROR found:', errorText);
  }
  
  // Check for "no messages" text
  const noMessages = await page.locator('.no-messages').count();
  if (noMessages > 0) {
    const noMessagesText = await page.locator('.no-messages').textContent();
    console.log('No messages text:', noMessagesText);
  }
  
  // Check if any messages are present
  const messageCount = await page.locator('.message-item').count();
  console.log('Message count:', messageCount);
  
  // Take final screenshot
  await page.screenshot({ path: 'test-results/debug-3-final.png' });
  
  // Log the full page HTML for debugging
  const pageContent = await page.content();
  console.log('Page content length:', pageContent.length);
});