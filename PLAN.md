# PLAN.md

This document contains the development roadmap, TODOs, and planning outputs for the Go SQS UI project.

## MVP: DLQ Debugging Features

### Priority 1 - Core DLQ Functionality (Immediate)

#### 1. DLQ Detection & Identification
- [ ] Auto-detect DLQ queues (ending with `-dlq`, `-DLQ`, or tagged as DLQ)
- [ ] Visual indicator for DLQ queues (different color/icon)
- [ ] Display source queue relationship

#### 2. Enhanced Message View for Debugging
- [ ] Expandable message detail view showing:
  - [ ] Full message body (formatted JSON)
  - [ ] All message attributes
  - [ ] Message metadata (MessageId, ReceiptHandle, etc.)
  - [ ] Approximate receive count
  - [ ] First receive timestamp
- [ ] Syntax highlighting for JSON payloads
- [ ] Copy button for message content

#### 3. Single Message Retry
- [ ] "Retry" button for each DLQ message
- [ ] Option to retry to original queue or different queue
- [ ] Preserve original message attributes
- [ ] Show retry status in real-time via WebSocket

#### 4. Bulk DLQ Operations
- [ ] "Retry All" button for entire DLQ
- [ ] Batch retry with configurable batch size
- [ ] Progress indicator for bulk operations
- [ ] Ability to pause/resume bulk retry

#### 5. Message Filtering & Search
- [ ] Filter messages by content (substring search)
- [ ] Filter by message attributes
- [ ] Filter by error type/reason (if available in attributes)
- [ ] Save/load filter presets

### Priority 2 - Advanced DLQ Features

#### 6. Retry Configuration
- [ ] Configurable retry delay
- [ ] Max retry attempts setting
- [ ] Dead letter threshold warnings

#### 7. Message Modification
- [ ] Edit message body before retry
- [ ] Add/modify message attributes
- [ ] Preview changes before sending

#### 8. DLQ Analytics
- [ ] Message age distribution
- [ ] Error type breakdown
- [ ] Retry success/failure rates
- [ ] Time-based message arrival patterns

### Priority 3 - Developer Experience

#### 9. Export & Import
- [ ] Export DLQ messages to JSON file
- [ ] Import messages from file for testing
- [ ] Export filtered subset of messages

#### 10. Testing Support
- [ ] "Clone to Test Queue" functionality
- [ ] Message template library
- [ ] Simulate failure scenarios

## Technical Implementation Notes

### Backend Changes Required

1. **sqs.go**
   - Add DLQ detection logic
   - Implement retry message endpoint
   - Add batch retry support
   - Enhanced message attribute handling

2. **types.go**
   - Add DLQ-specific types
   - Retry status tracking structures

3. **websocket.go**
   - Real-time retry status updates
   - Bulk operation progress streaming

### Frontend Changes Required

1. **New Modules**
   - `dlqHandler.js` - Core DLQ functionality
   - `messageRetry.js` - Retry logic and UI
   - `messageFilter.js` - Filtering implementation
   - `bulkOperations.js` - Batch processing

2. **Enhanced Modules**
   - `messageHandler.js` - Add detailed view
   - `queueManager.js` - DLQ identification
   - `uiComponent.js` - DLQ-specific UI elements

### Testing Strategy

1. **Unit Tests**
   - Test each new module independently
   - Mock AWS SQS responses
   - Test error scenarios

2. **Integration Tests**
   - End-to-end DLQ retry flow
   - WebSocket update verification
   - Bulk operation handling

## Future Enhancements (Post-MVP)

- CloudWatch metrics integration
- Automated retry policies
- Message replay with time delay
- DLQ alerting and notifications
- Queue relationship visualization
- Message flow tracing
- Performance analytics dashboard

## Current Status

- Project setup complete ✓
- Modular architecture in place ✓
- WebSocket infrastructure ready ✓
- Need to implement DLQ-specific features

## Planning Session Outputs

### Session 1: DLQ Debugging Requirements
- Focus on developer debugging workflow
- Priority on quick iteration and retry
- Must preserve message fidelity
- Real-time feedback essential

### Architecture Decisions
- Keep vanilla JavaScript (no framework overhead)
- Leverage existing WebSocket infrastructure
- Maintain modular architecture
- Backend remains lightweight Go handlers