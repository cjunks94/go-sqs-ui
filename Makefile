.PHONY: build test test-frontend test-backend test-all lint fmt clean run kill dev-start dev-stop dev-restart dev-status help

# Build the application
build:
	go build -o go-sqs-ui

# Run Go tests
test:
	go test -v ./...

test-backend:
	go test -v ./...

# Run frontend tests  
test-frontend:
	npm test

# Run all tests (backend + frontend)
test-all: test-backend test-frontend

# Run tests with coverage
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Run frontend tests with coverage
test-frontend-coverage:
	npm run test:coverage

# Run linter
lint:
	golangci-lint run --no-config

# Format code
fmt:
	go fmt ./...
	$(shell go env GOPATH)/bin/goimports -w .

# Clean build artifacts
clean:
	rm -f go-sqs-ui coverage.out coverage.html
	rm -f /tmp/go-sqs-ui.log /tmp/go-sqs-ui.pid

# Kill running processes and clean up
kill:
	@echo "🛑 Stopping all Go SQS UI processes..."
	@pkill -f "go run" 2>/dev/null || true
	@lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@ps aux | grep "go-sqs-ui" | grep -v grep | awk '{print $$2}' | xargs kill -9 2>/dev/null || true
	@rm -f /tmp/go-sqs-ui.pid /tmp/go-sqs-ui.log
	@echo "✅ Stopped all go-sqs-ui processes and cleaned up"

# Development server management
dev-start: kill
	@./scripts/dev-server.sh start

dev-stop:
	@./scripts/dev-server.sh stop

dev-restart:
	@./scripts/dev-server.sh restart

dev-status:
	@./scripts/dev-server.sh status

dev-logs:
	@./scripts/dev-server.sh logs

# Run the application (with cleanup)
run: kill
	go run .

# Install development tools
install-tools:
	go install golang.org/x/tools/cmd/goimports@latest

# Pre-commit checks (lint + all tests)
check: fmt lint test-all

# Install Node.js dependencies
install:
	npm install
	go mod download

# Help
help:
	@echo "Go SQS UI - Available Make Targets"
	@echo "=================================="
	@echo "Building:"
	@echo "  build              - Build the Go binary"
	@echo "  install            - Install Node.js and Go dependencies"
	@echo ""
	@echo "Testing:"
	@echo "  test               - Run Go tests only"
	@echo "  test-backend       - Run Go tests (alias for test)"
	@echo "  test-frontend      - Run JavaScript/frontend tests"
	@echo "  test-all           - Run both backend and frontend tests"
	@echo "  test-coverage      - Run Go tests with coverage report"
	@echo "  test-frontend-coverage - Run frontend tests with coverage"
	@echo ""
	@echo "Development Server:"
	@echo "  dev-start          - Start development server (with cleanup)"
	@echo "  dev-stop           - Stop development server"
	@echo "  dev-restart        - Restart development server"
	@echo "  dev-status         - Check development server status"
	@echo "  dev-logs           - Tail development server logs"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint               - Run golangci-lint"
	@echo "  fmt                - Format code with go fmt and goimports"
	@echo "  check              - Run fmt, lint, and all tests (pre-commit)"
	@echo ""
	@echo "Cleanup:"
	@echo "  clean              - Clean build artifacts and temp files"
	@echo "  kill               - Stop all running go-sqs-ui processes"
	@echo ""
	@echo "Other:"
	@echo "  run                - Run the application directly (with cleanup)"
	@echo "  install-tools      - Install Go development tools"
	@echo "  help               - Show this help"