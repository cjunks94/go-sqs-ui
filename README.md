# Go SQS UI

A lightweight, web-based UI for managing AWS SQS queues built with Go and vanilla JavaScript.

## Features

- 📋 List all SQS queues in your AWS account
- 📨 View messages in queues with real-time updates
- ✉️ Send messages to queues
- 🗑️ Delete messages from queues
- 🔄 Real-time message updates via WebSockets
- 📊 View queue attributes (message counts, retention period, etc.)
- 🎨 Clean, responsive UI inspired by AWS console

## Prerequisites

- Go 1.21 or higher
- AWS credentials configured (via `~/.aws/credentials`, environment variables, or IAM role)
- Appropriate AWS permissions for SQS operations:
  - `sqs:ListQueues`
  - `sqs:GetQueueAttributes`
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
go mod download
# if you are receiving errors regarding the go.sum file
go mod tidy
go mod download
go build
```

## Running the Application

1. Ensure your AWS credentials are configured:
```bash
aws configure
# if you are having trouble go to the AWS accoutn sign in page and copy the access keys and manually export in your console
```

2. Run the application:
```bash
go run main.go
```

3. Open your browser and navigate to:
```
http://localhost:8080
```

### Configuration Options

- **Port**: Set the `PORT` environment variable to use a different port:
  ```bash
  PORT=3000 go run main.go
  ```

- **AWS Region**: The application uses your default AWS region. To use a different region, set the `AWS_REGION` environment variable:
  ```bash
  AWS_REGION=us-west-2 go run main.go
  ```

## Building for Production

To build a standalone binary:

```bash
go build -o sqs-ui main.go
./sqs-ui
```

## Architecture & Design Decisions

### Backend (Go)

1. **AWS SDK v2**: Uses the latest AWS SDK for Go for better performance and smaller binary sizes
2. **Gorilla Mux**: Chosen for its simplicity and powerful routing capabilities
3. **Embedded Static Files**: Frontend assets are embedded in the binary using Go's `embed` package, making deployment simpler
4. **WebSocket Support**: Real-time updates using Gorilla WebSocket for a responsive user experience

### Frontend (Vanilla JavaScript)

1. **No Framework**: Kept simple with vanilla JavaScript to minimize complexity and dependencies
2. **Responsive Design**: CSS Grid and Flexbox for a modern, responsive layout
3. **AWS-Inspired UI**: Design inspired by AWS Console for familiar user experience

### Goals

- **Simplicity**: Easy to understand, modify, and deploy
- **Self-Contained**: Single binary with embedded assets for easy distribution
- **Real-Time**: WebSocket integration for live message updates
- **Secure**: No credentials stored; uses AWS SDK credential chain
- **Lightweight**: Minimal dependencies and resource usage

## API Endpoints

- `GET /api/queues` - List all queues
- `GET /api/queues/{queueUrl}/messages` - Get messages from a queue
- `POST /api/queues/{queueUrl}/messages` - Send a message to a queue
- `DELETE /api/queues/{queueUrl}/messages/{receiptHandle}` - Delete a message
- `WS /ws` - WebSocket endpoint for real-time updates

## Contributing

Feel free to open issues or submit pull requests. Some areas for improvement:

- [ ] Add message filtering and search
- [ ] Support for message attributes
- [ ] Queue creation and deletion
- [ ] Batch operations
- [ ] Message visibility timeout adjustment
- [ ] Dead letter queue management
- [ ] CloudWatch metrics integration

## License

MIT License - see LICENSE file for details
