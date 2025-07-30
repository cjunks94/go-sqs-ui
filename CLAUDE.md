# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the Go SQS UI codebase.

## Core Development Principles

### 1. Test-Driven Development (TDD)
- **ALWAYS** write tests before implementing new features
- Maintain or improve the current test coverage (47+ tests)
- Run both frontend (`npm test`) and backend (`go test ./...`) tests before committing
- Each new module should have a corresponding test file

### 2. Atomic Commits
- Each commit should represent ONE logical change
- Commit messages should clearly describe what changed and why
- Use conventional commit format: `type(scope): description`
  - Examples: `feat(dlq): add retry button`, `fix(websocket): handle connection errors`

### 3. Single Responsibility Principle (SRP)
- Keep files small and focused (max 200-300 lines)
- Each module should do one thing well
- When a file grows too large, refactor into smaller modules
- Current good examples: `apiService.js`, `messageHandler.js`, `webSocketManager.js`

### 4. File Organization
- Backend: Separate concerns into distinct `.go` files
- Frontend: Use the modular architecture in `static/modules/`
- Tests: Mirror the source structure in `test/` directory

## MVP Focus: DLQ Debugging

The immediate priority is building robust DLQ (Dead Letter Queue) debugging capabilities. See `PLAN.md` for detailed feature requirements and implementation roadmap.

Key DLQ features to prioritize:
- Message retry functionality
- Enhanced message viewing for debugging
- Filtering and search capabilities
- Bulk operations for efficiency

## Code Style Guidelines

### Go Backend
- Follow standard Go conventions
- Use meaningful variable names
- Handle errors explicitly
- Add comments for exported functions

### JavaScript Frontend
- Use modern ES6+ features (modules, arrow functions, destructuring)
- Keep the vanilla JavaScript approach (no frameworks)
- Follow the existing module pattern
- Maintain WebSocket real-time updates

## Testing Requirements

### Before ANY commit:
1. Run frontend tests: `npm test`
2. Run backend tests: `go test ./...`
3. Ensure all tests pass
4. Add tests for any new functionality

### Test Coverage Goals:
- Frontend: Maintain 90%+ coverage
- Backend: Aim for 80%+ coverage
- Integration tests for critical paths

## Recent Stability Improvements

### Major Bug Fixes (Latest Release)
The following critical issues have been resolved:

1. **DLQ Detection Logic Fixed** ⚠️ **Breaking Change**
   - **Issue**: Source queues were incorrectly marked as DLQ, actual DLQ queues weren't marked
   - **Root Cause**: Detection logic was using `RedrivePolicy` (source → DLQ) instead of `RedriveAllowPolicy` (DLQ ← source)
   - **Fix**: Updated `dlqDetection.js` to properly identify DLQ queues
   - **Impact**: DLQ badges now appear on correct queues only

2. **Duplicate Filter UI Eliminated**
   - **Issue**: New search filter input added every time user selected a queue
   - **Root Cause**: `addFilterUI()` didn't check for existing filter elements
   - **Fix**: Added cleanup logic to remove existing filters before adding new ones
   - **Impact**: Clean, single search interface per queue

3. **WebSocket Error Handling Enhanced**
   - **Issue**: JavaScript errors when WebSocket received null/invalid message data
   - **Root Cause**: Missing validation in message processing pipeline
   - **Fix**: Added comprehensive data validation and error boundaries
   - **Impact**: Robust real-time updates without console errors

4. **DOM Null Pointer Safety**
   - **Issue**: "Cannot set properties of null" errors in message display
   - **Root Cause**: Attempting to set onclick handlers on non-existent DOM elements
   - **Fix**: Added defensive null checks throughout UI components
   - **Impact**: Error-free message expansion and interaction

## Project References

- **Current TODOs and Planning**: See `PLAN.md`
- **Project Overview**: See `README.md`
- **AWS Permissions**: Ensure proper SQS permissions for DLQ operations

## Important Reminders

1. This is a debugging tool - prioritize developer experience
2. Keep the UI responsive with WebSocket updates
3. Handle AWS API rate limits gracefully
4. Preserve message attributes and metadata during operations
5. Make error messages clear and actionable