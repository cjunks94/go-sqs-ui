import { chromium } from '@playwright/test';

(async () => {
  console.log('Starting Playwright test for go-sqs-ui...');
  
  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500 // Slow down actions to see what's happening
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log('1. Navigating to http://localhost:8080...');
  await page.goto('http://localhost:8080');
  
  // Take initial screenshot
  await page.screenshot({ path: 'test-screenshots/01-initial-load.png', fullPage: true });
  console.log('   ✓ Screenshot saved: 01-initial-load.png');
  
  // Check AWS context
  const awsContext = await page.locator('.aws-context').textContent();
  console.log('2. AWS Context:', awsContext);
  
  // Wait for queues to load
  console.log('3. Waiting for queues to load...');
  await page.waitForSelector('.queue-item', { timeout: 10000 });
  
  // Count queues
  const queueCount = await page.locator('.queue-item').count();
  console.log(`   ✓ Found ${queueCount} queues`);
  
  // Check for DLQ badges
  const dlqCount = await page.locator('.dlq-badge').count();
  console.log(`   ✓ Found ${dlqCount} DLQ queues`);
  
  // Take screenshot of queue list
  await page.screenshot({ path: 'test-screenshots/02-queue-list.png', fullPage: true });
  console.log('   ✓ Screenshot saved: 02-queue-list.png');
  
  // Click on a DLQ if exists
  if (dlqCount > 0) {
    console.log('4. Clicking on first DLQ...');
    const firstDLQ = page.locator('.dlq-queue').first();
    await firstDLQ.click();
    
    // Wait for messages to load
    await page.waitForSelector('.message-item', { timeout: 10000 });
    
    const messageCount = await page.locator('.message-item').count();
    console.log(`   ✓ Found ${messageCount} messages in DLQ`);
    
    // Take screenshot of messages
    await page.screenshot({ path: 'test-screenshots/03-dlq-messages.png', fullPage: true });
    console.log('   ✓ Screenshot saved: 03-dlq-messages.png');
    
    // Try expanding a message
    if (messageCount > 0) {
      console.log('5. Expanding first message...');
      await page.locator('.message-toggle').first().click();
      await page.waitForTimeout(1000);
      
      // Take screenshot of expanded message
      await page.screenshot({ path: 'test-screenshots/04-expanded-message.png', fullPage: true });
      console.log('   ✓ Screenshot saved: 04-expanded-message.png');
      
      // Check for retry button
      const retryButton = await page.locator('.retry-button').count();
      console.log(`   ✓ Retry button ${retryButton > 0 ? 'found' : 'not found'}`);
    }
  } else {
    console.log('4. No DLQ queues found, clicking on first regular queue...');
    await page.locator('.queue-item').first().click();
    
    // Wait for potential messages
    await page.waitForTimeout(2000);
    
    const messageCount = await page.locator('.message-item').count();
    console.log(`   ✓ Found ${messageCount} messages`);
    
    await page.screenshot({ path: 'test-screenshots/03-queue-messages.png', fullPage: true });
    console.log('   ✓ Screenshot saved: 03-queue-messages.png');
  }
  
  // Test WebSocket connection
  console.log('6. Checking WebSocket status...');
  const wsStatus = await page.locator('.websocket-status').textContent();
  console.log('   ✓ WebSocket status:', wsStatus);
  
  // Test theme toggle
  console.log('7. Testing theme toggle...');
  await page.locator('.theme-toggle').click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'test-screenshots/05-dark-theme.png', fullPage: true });
  console.log('   ✓ Screenshot saved: 05-dark-theme.png');
  
  console.log('\nTest completed successfully!');
  console.log('Screenshots saved in test-screenshots/ directory');
  
  await browser.close();
})().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});