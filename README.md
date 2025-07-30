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
- 📅 **Message Ordering**: Consistent chronological ordering (newest first) with backend sorting
- 🔍 **Enhanced DLQ Debugging**: Advanced filtering, search, and retry functionality for Dead Letter Queues
- 🎭 **Demo Mode**: Built-in demo mode with realistic recent timestamps for development without AWS credentials

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

1. Ensure your AWS credentials are configured:
```bash
aws configure
# if you are having trouble go to the AWS account sign in page and copy the access keys and manually export in your console
```

2. Run the application:
```bash
# With automatic cleanup of any existing processes
make run

# Or directly (less safe)
go run .
```

3. Open your browser and navigate to:
```
http://localhost:8080
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

- **Port**: Set the `PORT` environment variable to use a different port:
  ```bash
  PORT=3000 go run .
  ```

- **AWS Region**: The application uses your default AWS region. To use a different region, set the `AWS_REGION` environment variable:
  ```bash
  AWS_REGION=us-west-2 go run .
  ```

## AWS Context Switching

The application automatically detects your AWS configuration and switches between modes:

### Demo Mode
- **Triggers**: When AWS credentials are not configured or AWS SQS is unreachable
- **Features**: 
  - Uses built-in demo data with realistic timestamps
  - Perfect for development and testing
  - No AWS credentials required
  - All UI features functional with mock data

### Live AWS Mode  
- **Triggers**: When valid AWS credentials are detected and SQS is accessible
- **Features**:
  - Connects to real AWS SQS queues
  - Displays actual queue and message data
  - Uses your configured AWS profile and region
  - All operations affect real AWS resources

### Context Information
The UI displays current context in the sidebar:
- **Mode**: Demo or Live AWS
- **Region**: Current AWS region (if applicable)
- **Profile**: Active AWS profile (if set via `AWS_PROFILE`)
- **Account**: Account type indicator

### Testing Both Modes
```bash
# Test Demo Mode (no AWS credentials)
unset AWS_PROFILE AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY
go run .

# Test Live AWS Mode (with credentials)
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1
go run .
```

## Building for Production

To build a standalone binary:

```bash
# verify this
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

- [ ] Add message filtering and search
- [ ] Support for message attributes
- [ ] Queue creation and deletion
- [ ] Batch operations
- [ ] Message visibility timeout adjustment
- [ ] Dead letter queue management
- [ ] CloudWatch metrics integration
- [ ] Add end-to-end tests

## License

MIT License - see LICENSE file for details
