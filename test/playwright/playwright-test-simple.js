import { chromium } from '@playwright/test';

(async () => {
  console.log('Starting Playwright test for go-sqs-ui...\n');

  const browser = await chromium.launch({
    headless: true,
    slowMo: 100,
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // 1. Navigate to the app
    console.log('1. Testing initial page load...');
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
    console.log('   ✓ Page loaded successfully');

    // 2. Check AWS context
    const awsMode = await page.locator('.aws-context').first().textContent();
    console.log(`   ✓ AWS Mode: ${awsMode.includes('Demo') ? 'Demo Mode' : 'Live AWS'}`);

    // 3. Check queue list
    console.log('\n2. Testing queue listing...');
    const queues = await page.locator('.queue-item').all();
    console.log(`   ✓ Found ${queues.length} queues:`);

    for (const queue of queues) {
      const name = await queue.locator('.queue-name').textContent();
      const messages = await queue.locator('.queue-meta').textContent();
      const isDLQ = (await queue.locator('.dlq-badge').count()) > 0;
      console.log(`     - ${name} (${messages})${isDLQ ? ' [DLQ]' : ''}`);
    }

    // 4. Check for DLQ queues
    console.log('\n3. Testing DLQ detection...');
    const dlqQueues = await page.locator('.dlq-badge').count();
    console.log(`   ✓ Found ${dlqQueues} DLQ queue(s)`);

    // 5. Click on a queue to view messages
    console.log('\n4. Testing message viewing...');
    if (queues.length > 0) {
      await queues[0].click();
      await page.waitForTimeout(1000);

      // Check if messages loaded or empty state shown
      const messages = await page.locator('.message-item').count();
      const emptyState = await page.locator('text=/no messages/i').count();

      if (messages > 0) {
        console.log(`   ✓ Found ${messages} messages in the queue`);

        // Try expanding first message
        const toggleButton = page.locator('.message-toggle').first();
        if ((await toggleButton.count()) > 0) {
          await toggleButton.click();
          console.log('   ✓ Successfully expanded message details');
        }
      } else if (emptyState > 0) {
        console.log('   ✓ Queue is empty (showing empty state)');
      }
    }

    // 6. Check WebSocket status
    console.log('\n5. Testing WebSocket connection...');
    const wsIndicator = await page.locator('.websocket-indicator').count();
    if (wsIndicator > 0) {
      console.log('   ✓ WebSocket indicator present');
    }

    // 7. Take final screenshot
    await page.screenshot({
      path: 'test-screenshots/final-state.png',
      fullPage: true,
    });
    console.log('\n✓ All tests completed successfully!');
    console.log('  Screenshot saved: test-screenshots/final-state.png');
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
})();
