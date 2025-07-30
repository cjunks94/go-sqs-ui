# PLAN.md

This document contains the development roadmap, TODOs, and planning outputs for the Go SQS UI project.

## MVP: DLQ Debugging Features

### Priority 1 - Core DLQ Functionality (Immediate)

#### 1. DLQ Detection & Identification ✅
- [x] Auto-detect DLQ queues (ending with `-dlq`, `-DLQ`, or tagged as DLQ)
- [x] Visual indicator for DLQ queues (different color/icon)
- [x] Display source queue relationship

#### 2. Enhanced Message View for Debugging ✅
- [x] Expandable message detail view showing:
  - [x] Full message body (formatted JSON)
  - [x] All message attributes
  - [x] Message metadata (MessageId, ReceiptHandle, etc.)
  - [x] Approximate receive count
  - [x] First receive timestamp
- [x] Syntax highlighting for JSON payloads
- [x] Copy button for message content

#### 3. Single Message Retry ✅
- [x] "Retry" button for each DLQ message
- [x] Option to retry to original queue or different queue
- [x] Preserve original message attributes
- [x] Show retry status in real-time via WebSocket

#### 4. Bulk DLQ Operations
- [ ] "Retry All" button for entire DLQ
- [ ] Batch retry with configurable batch size
- [ ] Progress indicator for bulk operations
- [ ] Ability to pause/resume bulk retry

#### 5. Message Filtering & Search ✅
- [x] Filter messages by content (substring search)
- [x] Filter by message attributes
- [x] Filter by error type/reason (if available in attributes)
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
- DLQ-specific features implemented ✓
  - DLQ detection and visual identification ✓
  - Enhanced message view with all metadata ✓
  - Single message retry functionality ✓
  - Message filtering and search ✓

## Completed Features (MVP Ready)

1. **DLQ Detection** - Automatically identifies DLQ queues with visual indicators
2. **Enhanced Message View** - Detailed debugging information including:
   - Receive count badges (normal/warning/danger)
   - All message attributes
   - JSON syntax highlighting
   - Copy functionality
3. **Message Retry** - One-click retry from DLQ to source queue with status feedback
4. **Message Filtering** - Real-time search by content or attributes (e.g., "ApproximateReceiveCount:5")

Total test coverage: 93 tests passing

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