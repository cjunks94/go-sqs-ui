.PHONY: build test lint fmt clean run help

# Build the application
build:
	go build -o go-sqs-ui

# Run tests
test:
	go test -v ./...

# Run tests with coverage
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

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

# Kill running processes
kill:
	@pkill -f "go run" 2>/dev/null || true
	@lsof -ti:8080 | xargs kill -9 2>/dev/null || true
	@ps aux | grep "go-sqs-ui" | grep -v grep | awk '{print $$2}' | xargs kill -9 2>/dev/null || true
	@echo "Stopped all go-sqs-ui processes"

# Run the application
run:
	go run .

# Install development tools
install-tools:
	go install golang.org/x/tools/cmd/goimports@latest

# Pre-commit checks (lint + test)
check: fmt lint test

# Help
help:
	@echo "Available targets:"
	@echo "  build         - Build the application"
	@echo "  test          - Run tests"
	@echo "  test-coverage - Run tests with coverage report"
	@echo "  lint          - Run golangci-lint"
	@echo "  fmt           - Format code with go fmt and goimports"
	@echo "  clean         - Clean build artifacts"
	@echo "  kill          - Stop all running go-sqs-ui processes"
	@echo "  run           - Run the application"
	@echo "  install-tools - Install development tools"
	@echo "  check         - Run fmt, lint, and test (pre-commit)"
	@echo "  help          - Show this help"