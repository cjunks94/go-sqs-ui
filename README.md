# Go SQS UI

[![CI](https://github.com/cjunks94/go-sqs-ui/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/cjunks94/go-sqs-ui/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/cjunks94/go-sqs-ui/branch/master/graph/badge.svg)](https://codecov.io/gh/cjunks94/go-sqs-ui)
[![Go Report Card](https://goreportcard.com/badge/github.com/cjunks94/go-sqs-ui)](https://goreportcard.com/report/github.com/cjunks94/go-sqs-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, web-based UI for managing AWS SQS queues built with Go and vanilla JavaScript.

## Features

### Core Functionality

- 📋 List and filter SQS queues with tag-based filtering
- 📨 View, send, and delete messages with real-time WebSocket updates
- 🔄 Dead Letter Queue (DLQ) management with retry capabilities
- 📊 Queue attributes and statistics dashboard
- 🎨 Clean, responsive UI with collapsible sidebar

### Advanced Capabilities

- 📄 **Message Pagination**: Efficient browsing of large message sets
- 🔍 **Smart Filtering**: Real-time search by content and attributes
- ⌨️ **Keyboard Navigation**: Full keyboard shortcut support (press `?` for help)
- 💾 **Export**: Download messages in JSON/CSV formats
- 🖼️ **Queue Browser**: Full-screen message viewing modal
- ✅ **Batch Operations**: Multi-select for bulk actions
- 🎭 **Demo Mode**: Fully functional demo without AWS credentials

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

## Keyboard Shortcuts

Navigate and control the application efficiently with keyboard shortcuts:

### Navigation

- `j` / `k` - Navigate down/up through messages
- `Enter` - Expand/collapse selected message
- `g g` - Jump to top (press g twice)
- `G` - Jump to bottom

### Actions

- `/` - Focus search/filter box
- `r` - Refresh messages
- `n` / `p` - Next/Previous page
- `e` - Export messages
- `b` - Toggle queue browser
- `s` - Toggle statistics panel

### Utility

- `?` - Show keyboard shortcuts help
- `Escape` - Clear focus/close modals

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
- `GET /api/queues/{queueUrl}/statistics` - Get queue statistics and metrics
- `POST /api/queues/{queueUrl}/messages` - Send a message to a queue
- `POST /api/queues/{queueUrl}/retry` - Retry a message from DLQ to source queue
- `DELETE /api/queues/{queueUrl}/messages/{receiptHandle}` - Delete a message
- `WS /ws` - WebSocket endpoint for real-time updates

## Testing

The application includes comprehensive test coverage with 230+ tests across frontend and backend.

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

## Code Quality

This project maintains high code quality standards with comprehensive testing and linting:

### 🧪 Testing & Coverage

- **Backend**: Go tests with 80%+ coverage target
- **Frontend**: Vitest with 85%+ coverage target
- **Coverage Reports**: HTML, LCOV, and Cobertura formats
- **CI Integration**: Automated testing on every push/PR

### 🔍 Linting & Formatting

- **Go**: golangci-lint with 25+ linters enabled
- **JavaScript**: ESLint 9 with modern flat config
- **Formatting**: Prettier for consistent code style
- **Pre-commit Hooks**: Automatic linting via husky

### 📊 Quality Commands

```bash
# Run all linters
make lint-all

# Auto-fix issues
make fix

# Run tests with coverage
make test-all-coverage

# View coverage reports
make coverage-open

# Format all code
make fmt-all
```

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

Contributions are welcome! Please feel free to submit pull requests or open issues.

### Potential Enhancements

- Support for message attributes
- Queue creation and deletion
- Message visibility timeout adjustment
- CloudWatch metrics integration
- Queue purge functionality

## License

MIT License - see LICENSE file for details
