# Go SQS UI User Guide

A comprehensive guide for using Go SQS UI to debug and manage AWS SQS queues, with a focus on Dead Letter Queue (DLQ) debugging.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Understanding the Interface](#understanding-the-interface)
3. [DLQ Debugging Workflow](#dlq-debugging-workflow)
4. [Advanced Features](#advanced-features)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## Getting Started

### Setting Up for Different Environments

#### Development Mode (No AWS)
```bash
# Start without AWS credentials for demo mode
make dev-start
```

#### Staging Environment
```bash
# Set staging credentials
export AWS_PROFILE=staging-profile
export AWS_REGION=us-east-1

# Start the server
make dev-start
```

#### Production Environment
```bash
# Use production profile (with caution!)
export AWS_PROFILE=prod-profile
export AWS_REGION=us-east-1

# Start the server
make dev-start
```

### First Launch

1. Navigate to http://localhost:8080
2. Check the AWS Context indicator in the sidebar:
   - **Demo Mode**: Using mock data (safe for testing)
   - **Live AWS**: Connected to real AWS account
3. Verify your queues are listed with proper tags

## Understanding the Interface

### Sidebar Components

#### AWS Context Section
Shows your current connection status:
- **Mode**: Demo or Live AWS
- **Region**: Current AWS region
- **Profile**: Active AWS profile
- **Account**: Account type (Session/IAM)

#### Queue List
Displays filtered queues with:
- Queue name
- Message count
- DLQ badge (for Dead Letter Queues)
- Hover effects for easy navigation

### Main Content Area

#### Message List View
When you select a queue:
- Messages sorted chronologically (oldest first)
- Real-time updates via WebSocket
- Expandable message details
- Batch selection checkboxes

#### Message Detail View
Click the arrow to expand a message:
- Full JSON body with syntax highlighting
- All message attributes
- Receive count with color coding:
  - Green (1-2 receives): Normal
  - Yellow (3-4 receives): Warning
  - Red (5+ receives): Danger
- Copy button for message content

## DLQ Debugging Workflow

### Step 1: Identify Failed Messages

1. Look for queues with the **DLQ** badge
2. Click on the DLQ to view failed messages
3. Note the message counts and receive counts

### Step 2: Analyze Failure Reasons

1. Expand messages to view full details
2. Check the `ApproximateReceiveCount` attribute
3. Look for error patterns in message bodies
4. Use the search/filter feature to find specific errors

### Step 3: Fix and Retry Messages

#### Single Message Retry
1. Click the **Retry** button on a message
2. Confirm the target queue (defaults to source queue)
3. Monitor the retry status in real-time

#### Bulk Retry Operations
1. Select multiple messages using checkboxes
2. Click **Select All** for all visible messages
3. Click **Retry Selected** button
4. Monitor progress via WebSocket updates

### Step 4: Verify Success

1. Check the source queue for retried messages
2. Confirm messages are processing correctly
3. Monitor the DLQ for any new failures

## Advanced Features

### Message Filtering

Filter messages by content or attributes:
```
# Search in message body
error: timeout

# Filter by attribute
ApproximateReceiveCount:5

# Complex searches
payment AND failed
```

### Batch Operations

#### Select Messages
- Click individual checkboxes
- Use **Select All** for visible messages
- Use **Deselect All** to clear selection

#### Available Actions
- **Delete Selected**: Remove messages permanently
- **Retry Selected**: Send back to source queue (DLQ only)

### Real-Time Updates

#### WebSocket Features
- Automatic message refresh
- Pause/Resume button for control
- Connection status indicator
- Preserves UI state during updates

### Theme Management

Toggle between light and dark themes:
- Click the theme toggle button (sun/moon icon)
- Theme preference is saved locally
- Optimized for long debugging sessions

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `r` | Refresh current queue |
| `/` | Focus search box |
| `Escape` | Clear search/selection |
| `Space` | Toggle message expansion |
| `t` | Toggle theme |

## Troubleshooting

### Common Issues

#### "No queues found"
- Verify AWS credentials are set correctly
- Check queue tags match filter criteria:
  - businessunit: degrees
  - product: amt
  - env: stg or prod
- Ensure you have ListQueues permission

#### "Cannot retry messages"
- Verify the source queue exists
- Check SendMessage permissions
- Ensure message hasn't expired

#### "WebSocket disconnected"
- Check network connectivity
- Refresh the page
- Check browser console for errors

### AWS Permission Requirements

Minimum required permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:ListQueues",
        "sqs:ListQueueTags",
        "sqs:GetQueueAttributes",
        "sqs:ReceiveMessage",
        "sqs:SendMessage",
        "sqs:DeleteMessage"
      ],
      "Resource": "*"
    }
  ]
}
```

## Best Practices

### DLQ Management

1. **Regular Monitoring**: Check DLQs daily to catch issues early
2. **Batch Processing**: Use bulk operations for efficiency
3. **Root Cause Analysis**: Investigate why messages failed before retrying
4. **Incremental Retry**: Start with a few messages to verify fixes

### Performance Tips

1. **Use Filters**: Narrow down to relevant messages
2. **Pause Updates**: When analyzing specific messages
3. **Batch Operations**: More efficient than individual actions
4. **Clean Up**: Delete successfully processed messages

### Security Considerations

1. **Use Read-Only Credentials**: When possible for investigation
2. **Avoid Production**: Unless absolutely necessary
3. **Audit Actions**: All operations affect real AWS resources
4. **Clear Credentials**: After debugging sessions

## Examples

### Example 1: Debug Payment Processing Failures

```bash
# 1. Set staging environment
export AWS_PROFILE=payments-staging
export AWS_REGION=us-east-1

# 2. Start application
make dev-start

# 3. Navigate to payment-processing-dlq
# 4. Filter messages by "payment_failed"
# 5. Analyze error patterns
# 6. Fix payment service
# 7. Retry failed messages in batches
```

### Example 2: Investigate Timeout Errors

```bash
# 1. Look for timeout patterns in DLQ
# 2. Use filter: "timeout" or "timed out"
# 3. Check ApproximateReceiveCount > 3
# 4. Identify services causing timeouts
# 5. Increase timeout or optimize service
# 6. Retry affected messages
```

## Additional Resources

- [README.md](README.md) - Project overview and setup
- [PLAN.md](PLAN.md) - Feature roadmap and development plans
- [TEST_REPORT.md](TEST_REPORT.md) - Testing documentation
- [AWS SQS Documentation](https://docs.aws.amazon.com/sqs/) - Official AWS docs

## Support

For issues or feature requests:
1. Check existing GitHub issues
2. Create a new issue with detailed description
3. Include screenshots for UI issues
4. Provide AWS region and queue details (sanitized)