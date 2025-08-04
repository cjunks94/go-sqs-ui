# PLAN.md

This document contains the development roadmap, TODOs, and planning outputs for the Go SQS UI project.

## MVP: DLQ Debugging Features

### Priority 1 - Core DLQ Functionality (Immediate)

#### 1. DLQ Detection & Identification ✅ **STABLE**
- [x] Auto-detect DLQ queues (ending with `-dlq`, `-DLQ`, or tagged as DLQ)
- [x] Visual indicator for DLQ queues (different color/icon)
- [x] Display source queue relationship
- [x] **BUG FIX**: Corrected DLQ detection logic to use `RedriveAllowPolicy` instead of `RedrivePolicy`
- [x] **BUG FIX**: Fixed inverted DLQ badge display (DLQ queues now properly marked)

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

#### 4. Bulk DLQ Operations ✅
- [x] Select multiple messages with checkboxes
- [x] "Select All" / "Deselect All" buttons
- [x] Batch delete selected messages
- [x] Batch retry selected messages (DLQ only)
- [ ] Progress indicator for bulk operations
- [ ] Ability to pause/resume bulk retry

#### 5. Message Filtering & Search ✅
- [x] Filter messages by content (substring search)
- [x] Filter by message attributes
- [x] Filter by error type/reason (if available in attributes)
- [ ] Save/load filter presets

## Recent Stability Improvements ✅ **STABLE**

### Bug Fixes (Latest Release)
- [x] **DLQ Detection Logic Fix**: Corrected fundamental issue where source queues were incorrectly marked as DLQ
  - Fixed detection to use `RedriveAllowPolicy` (DLQ characteristic) instead of `RedrivePolicy` (source queue characteristic)
  - Updated tests to reflect correct behavior
- [x] **Duplicate Filter UI Fix**: Prevented multiple search filter inputs from being added on queue selection
- [x] **WebSocket Error Handling**: Added comprehensive error handling for WebSocket message processing
  - Null/undefined data validation
  - Array type checking for message data
  - DOM element existence validation
- [x] **UI Null Pointer Safety**: Added defensive programming to prevent null pointer exceptions
  - Safe DOM element access with null checks
  - Try/catch blocks around DOM manipulation
  - Graceful fallback for missing elements
- [x] **Queue Display Styling Fix**: Fixed sidebar queue items to use proper HTML structure with CSS classes
  - Added queue-link, queue-name, and queue-meta elements
  - Properly styled hover effects and visual separation
  - Fixed DLQ badge positioning
- [x] **Message Rotation Fix**: Eliminated constant message cycling that made tracking difficult
  - Implemented intelligent message merging instead of replacement
  - Preserves UI state (expanded messages, scroll position)
  - Messages now sorted oldest-first for stability

### Test Coverage
- [x] All 112 frontend tests passing (updated)
- [x] All Go backend tests passing
- [x] Added test for corrected DLQ detection behavior
- [x] Added tests for message ordering (oldest first)
- [x] Full test coverage for all new features

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
- **Testing Infrastructure** ✓
  - 112+ frontend tests passing ✓
  - Backend tests comprehensive ✓
  - Playwright test scripts created ✓
  - UI automation framework ready ✓
  - Test documentation complete ✓

## Completed Features (MVP Ready)

1. **DLQ Detection** - Automatically identifies DLQ queues with visual indicators
2. **Enhanced Message View** - Detailed debugging information including:
   - Receive count badges (normal/warning/danger)
   - All message attributes
   - JSON syntax highlighting
   - Copy functionality
3. **Message Retry** - One-click retry from DLQ to source queue with status feedback
4. **Message Filtering** - Real-time search by content or attributes (e.g., "ApproximateReceiveCount:5")
5. **Batch Operations** - Select multiple messages for bulk delete or retry operations
6. **Stable Message Display** - Messages sorted oldest-first with intelligent merging to prevent rotation
7. **Improved Queue Styling** - Professional sidebar with proper hover effects and message counts

Total test coverage: 112 tests passing

## Testing Infrastructure (Added 2025-08-04)

### Playwright Integration
- Created comprehensive UI automation test scripts
- Addressed Playwright MCP version compatibility issues
- Developed workarounds for browser automation
- Generated test guide for manual and automated testing

### Test Artifacts
- `TEST_REPORT.md` - Comprehensive testing documentation
- `test/playwright/` - UI automation test scripts
- `test-guide.json` - Structured test scenarios
- Screenshots captured for visual verification

### Known Issues
- Playwright MCP expects chromium v1179, npm installs v1178/1181
- Workaround: Use standalone Playwright scripts or manual testing
- All features verified working through alternative testing methods

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