# Go SQS UI

A lightweight, web-based UI for managing AWS SQS queues built with Go and vanilla JavaScript.

## Features

- 📋 List SQS queues with tag-based filtering (businessunit:degrees, product:amt, env:stg|prod)
- 📨 View messages in queues with real-time updates and pagination
- ✉️ Send messages to queues
- 🗑️ Delete messages from queues
- 🔄 Real-time message updates via WebSockets with pause/resume functionality
- 📊 View queue attributes (message counts, retention period, etc.)
- 🎨 Clean, responsive UI with collapsible sidebar and DataDog-style message lists
- ⚡ Modern ES6+ modular JavaScript architecture
- 🧪 Comprehensive test suite with 112+ tests
- 🔀 **AWS Context Switching**: Automatic detection and switching between demo and live AWS modes
- 📅 **Message Ordering**: Consistent chronological ordering (oldest first) for stable message viewing
- 🔍 **Enhanced DLQ Debugging**: Advanced filtering, search, and retry functionality for Dead Letter Queues
- 🎭 **Demo Mode**: Built-in demo mode with realistic recent timestamps for development without AWS credentials
- ✅ **Batch Operations**: Select multiple messages for batch delete or retry operations
- 🔧 **Smart Message Updates**: WebSocket updates preserve UI state (expanded messages, scroll position)

## Prerequisites

- Go 1.21 or higher
- Node.js 18+ (for frontend testing and development)
- AWS credentials configured (via `~/.aws/credentials`, environment variables, or IAM role)
- Appropriate AWS permissions for SQS operations:
  - `sqs:ListQueues`
  - `sqs:GetQueueAttributes`
  - `sqs:ListQueueTags` (for tag-based filtering)
  - `sqs:ReceiveMessage`
  - `sqs:SendMessage`
  - `sqs:DeleteMessage`

## Installation

1. Clone the repository:
```bash
git clone https://github.com/cjunker/go-sqs-ui.git
cd go-sqs-ui
```

2. Install dependencies:
```bash
# Go dependencies
go mod download
# if you are receiving errors regarding the go.sum file
go mod tidy
go mod download
go build

# Frontend dependencies (for testing and development)
npm install
```

## Quick Start: DLQ Debugging

If you're here to debug Dead Letter Queues in your staging environment, follow these steps:

```bash
# 1. Set your AWS credentials for staging
export AWS_PROFILE=staging-profile
export AWS_REGION=us-east-1

# 2. Start the application
make dev-start

# 3. Open http://localhost:8080
```

The UI will automatically:
- Filter queues by your configured tags (businessunit:degrees, product:amt, env:stg|prod)
- Identify and mark DLQ queues with visual badges
- Enable one-click retry for failed messages
- Provide real-time updates via WebSocket

See the [User Guide](USER_GUIDE.md) for detailed DLQ debugging workflows.

## Running the Application

### Quick Start (Development Server)

The recommended way to run during development:

```bash
# Start development server with automatic cleanup
make dev-start

# Check server status
make dev-status

# View server logs
make dev-logs

# Stop server
make dev-stop

# Or restart server
make dev-restart
```

### Manual Start

```bash
# With automatic cleanup of any existing processes
make run

# Or directly
go run .

# Then open http://localhost:8080
```

### Development Commands

```bash
# Install dependencies
make install

# Run all tests (backend + frontend)
make test-all

# Run only backend tests
make test

# Run only frontend tests  
make test-frontend

# Kill any running processes
make kill

# Clean up build artifacts
make clean

# View all available commands
make help
```

### Configuration Options

#### Basic Configuration
- `PORT` - Server port (default: 8080)
- `AWS_REGION` - AWS region (default: from AWS config)
- `AWS_PROFILE` - AWS profile to use

#### Mode Control
- `FORCE_DEMO_MODE=true` - Always use demo mode, even with AWS credentials
- `FORCE_LIVE_MODE=true` - Force live mode (fails if no AWS credentials)

#### Queue Filtering
- `DISABLE_TAG_FILTER=true` - Show all queues without tag filtering
- `FILTER_BUSINESS_UNIT` - Custom businessunit values (comma-separated)
- `FILTER_PRODUCT` - Custom product values (comma-separated)
- `FILTER_ENV` - Custom env values (comma-separated)

Example:
```bash
# Force demo mode
FORCE_DEMO_MODE=true make dev-start

# Show all queues without filtering
DISABLE_TAG_FILTER=true make dev-start

# Custom tag filters
FILTER_BUSINESS_UNIT=myunit FILTER_PRODUCT=myapp FILTER_ENV=dev,test make dev-start
```

## AWS Context Switching

The application automatically detects AWS credentials and switches between Demo and Live modes. The current mode is displayed in the sidebar.

- **Demo Mode**: Used when AWS credentials are unavailable or `FORCE_DEMO_MODE=true`
- **Live AWS Mode**: Used when valid AWS credentials are detected
- **Force Mode**: Use environment variables to override automatic detection

## Building for Production

```bash
go build -o sqs-ui .
./sqs-ui
```

## Architecture & Design Decisions

### Backend (Go)

1. **AWS SDK v2**: Uses the latest AWS SDK for Go for better performance and smaller binary sizes
2. **Gorilla Mux**: Chosen for its simplicity and powerful routing capabilities
3. **Embedded Static Files**: Frontend assets are embedded in the binary using Go's `embed` package, making deployment simpler
4. **WebSocket Support**: Real-time updates using Gorilla WebSocket for a responsive user experience

### Frontend (Modern JavaScript)

1. **Modular ES6+ Architecture**: Individual module files with single responsibility principle
2. **No Framework**: Kept simple with vanilla JavaScript to minimize complexity and dependencies
3. **Responsive Design**: CSS Grid and Flexbox for a modern, responsive layout
4. **AWS-Inspired UI**: Design inspired by AWS Console and DataDog for familiar user experience
5. **Comprehensive Testing**: 112+ tests using Vitest with full coverage of all modules

### Goals

- **Simplicity**: Easy to understand, modify, and deploy
- **Self-Contained**: Single binary with embedded assets for easy distribution
- **Real-Time**: WebSocket integration for live message updates
- **Secure**: No credentials stored; uses AWS SDK credential chain
- **Lightweight**: Minimal dependencies and resource usage

## API Endpoints

- `GET /api/aws-context` - Get AWS connection context information
- `GET /api/queues?limit=20` - List queues with tag-based filtering and pagination
- `GET /api/queues/{queueUrl}/messages?limit=10` - Get messages from a queue with pagination
- `POST /api/queues/{queueUrl}/messages` - Send a message to a queue
- `DELETE /api/queues/{queueUrl}/messages/{receiptHandle}` - Delete a message
- `WS /ws` - WebSocket endpoint for real-time updates

## Testing

The application has comprehensive test coverage with 112+ tests covering all functionality.

### Frontend Tests

Run the comprehensive JavaScript test suite:

```bash
# Run all tests (112+ tests)
npm test

# Run tests in watch mode during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests with UI (browser interface)
npm run test:ui
```

**Test Coverage Includes:**
- Message ordering and chronological sorting
- AWS context switching (demo vs live modes)
- DLQ detection and retry functionality  
- Message filtering and search
- Enhanced message view with JSON formatting
- API service error handling
- WebSocket real-time updates
- UI component interactions

### Backend Tests

Run Go tests:

```bash
# Run all Go tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run specific test file
go test -v ./sqs_test.go
```

### UI Automation Tests (Playwright)

The project includes Playwright test scripts for UI automation:

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run Playwright tests
node test/playwright/playwright-test.js

# Run simplified test suite
node test/playwright/playwright-test-simple.js
```

See [TEST_REPORT.md](TEST_REPORT.md) for comprehensive testing documentation.

## Development

### Project Structure

```
├── main.go                 # Application entry point
├── sqs.go                 # SQS operations and handlers
├── websocket.go           # WebSocket management
├── types.go               # Type definitions
├── demo.go                # Demo mode for development
├── static/
│   ├── app.js            # Main application entry
│   ├── index.html        # HTML template
│   ├── styles.css        # Application styles
│   └── modules/          # Modular JavaScript architecture
│       ├── appState.js
│       ├── apiService.js
│       ├── webSocketManager.js
│       └── ...
├── test/                 # Frontend tests
│   ├── appState.test.js
│   ├── apiService.test.js
│   └── ...
├── package.json          # Node.js dependencies and scripts
└── vitest.config.js      # Test configuration
```

### Adding New Features

1. **Backend**: Add handlers in appropriate `.go` files
2. **Frontend**: Create new modules in `static/modules/`
3. **Tests**: Add corresponding test files in `test/`
4. **Run tests**: `npm test && go test ./...`

## Contributing

Feel free to open issues or submit pull requests. Some areas for improvement:

- [x] Add message filtering and search (Completed)
- [ ] Support for message attributes
- [ ] Queue creation and deletion
- [x] Batch operations (Completed)
- [ ] Message visibility timeout adjustment
- [x] Dead letter queue management (Completed)
- [ ] CloudWatch metrics integration
- [ ] Add end-to-end tests
- [ ] Export messages to CSV/JSON
- [ ] Queue purge functionality

## License

MIT License - see LICENSE file for details
