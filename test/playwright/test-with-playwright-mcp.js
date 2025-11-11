// Simple test script to verify go-sqs-ui functionality
// This creates a test report that can be used with Playwright MCP

const testResults = {
  timestamp: new Date().toISOString(),
  application: 'go-sqs-ui',
  url: 'http://localhost:8080',
  tests: [],
};

async function _runTest(name, testFn) {
  console.log(`Running: ${name}`);
  try {
    const result = await testFn();
    testResults.tests.push({
      name,
      status: 'passed',
      result,
    });
    console.log('  ✓ Passed');
    return result;
  } catch (error) {
    testResults.tests.push({
      name,
      status: 'failed',
      error: error.message,
    });
    console.log(`  ✗ Failed: ${error.message}`);
    throw error;
  }
}

// Manual test instructions for Playwright MCP
console.log(`
=== Go SQS UI Testing Guide ===

The application is running at: http://localhost:8080

Test Scenarios to Execute with Playwright MCP:

1. BASIC NAVIGATION TEST:
   - Navigate to http://localhost:8080
   - Take screenshot of initial load
   - Verify sidebar shows "AWS SQS UI" title
   - Check AWS Context section exists

2. QUEUE LISTING TEST:
   - Verify queues are listed in sidebar
   - Count number of queues (should be 3 in demo mode)
   - Check for queue names: demo-orders-queue, demo-notifications-queue, demo-deadletter-queue
   - Verify message counts are displayed

3. DLQ DETECTION TEST:
   - Look for DLQ badges (should appear on deadletter queue)
   - Verify DLQ queues have different styling
   - Check if demo-deadletter-queue has DLQ indicator

4. MESSAGE VIEWING TEST:
   - Click on "demo-orders-queue" (has 2 messages)
   - Verify messages are displayed
   - Check message timestamps and IDs
   - Try expanding a message to see details

5. UI FEATURES TEST:
   - Test theme toggle (light/dark mode)
   - Check WebSocket status indicator
   - Verify "Refresh Queues" button exists
   - Test message filtering (if messages exist)

6. DLQ FUNCTIONALITY TEST:
   - Click on demo-deadletter-queue
   - If messages exist, look for "Retry" buttons
   - Check for batch operation controls

Expected Results:
- Demo mode should show 3 queues
- At least one queue should have DLQ badge
- Messages should be viewable and expandable
- UI should be responsive and theme toggle should work

Current Status:
- Server is running on port 8080
- Application is in Demo Mode (no AWS credentials)
- WebSocket connection should be active
`);

// Save test guide
import { writeFileSync } from 'fs';
writeFileSync('test-guide.json', JSON.stringify(testResults, null, 2));
console.log('\nTest guide saved to: test-guide.json');
