.PHONY: build test test-frontend test-backend test-all lint fmt clean run kill dev-start dev-stop dev-restart dev-status help

# Build the application
build:
	go build -o go-sqs-ui ./cmd/sqs-ui

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

# Run Go tests with coverage
test-coverage:
	go test -v -race -coverprofile=coverage.out -covermode=atomic ./...
	go tool cover -func=coverage.out
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Run frontend tests with coverage
test-frontend-coverage:
	npm run test:coverage
	@echo "Coverage report generated: coverage/index.html"

# Run all tests with coverage
test-all-coverage: test-coverage test-frontend-coverage

# Show Go coverage in terminal
coverage-report:
	@go tool cover -func=coverage.out | grep -E '^total:' || echo "No coverage data. Run 'make test-coverage' first."

# Open coverage reports in browser
coverage-open:
	@if [ -f coverage.html ]; then open coverage.html; else echo "No Go coverage report. Run 'make test-coverage' first."; fi
	@if [ -f coverage/index.html ]; then open coverage/index.html; else echo "No JS coverage report. Run 'make test-frontend-coverage' first."; fi

# Run Go linter with config
lint:
	golangci-lint run

# Run JavaScript linter
lint-js:
	npx eslint --max-warnings 0 'static/**/*.js' 'test/**/*.js'

# Run all linters
lint-all: lint lint-js

# Format Go code
fmt:
	go fmt ./...
	goimports -w .

# Format JavaScript code
fmt-js:
	npx prettier --write 'static/**/*.{js,html,css}' 'test/**/*.js' '*.{json,yml,yaml,md}'

# Format all code
fmt-all: fmt fmt-js

# Fix linting issues automatically
fix:
	golangci-lint run --fix
	npx eslint --fix 'static/**/*.js' 'test/**/*.js'
	npx prettier --write .

# Clean build artifacts
clean:
	rm -f go-sqs-ui sqs-ui coverage.out coverage.html
	rm -rf coverage/ .nyc_output/
	rm -f /tmp/go-sqs-ui.log /tmp/go-sqs-ui.pid
	rm -rf test-results/ playwright-report/

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
	go run ./cmd/sqs-ui

# Install development tools
install-tools:
	go install golang.org/x/tools/cmd/goimports@latest

# Coverage enforcement - fail if below threshold
coverage-check:
	@echo "Checking Go coverage threshold (>= 90%)..."
	@go test -coverprofile=coverage.tmp.out ./... > /dev/null 2>&1 || true
	@COVERAGE=$$(go tool cover -func=coverage.tmp.out | grep total | awk '{print $$3}' | sed 's/%//'); \
	rm -f coverage.tmp.out; \
	echo "Current Go coverage: $$COVERAGE%"; \
	if [ $$(echo "$$COVERAGE < 90" | bc -l) -eq 1 ]; then \
		echo "❌ Coverage $$COVERAGE% is below threshold 90%"; \
		exit 1; \
	fi; \
	echo "✅ Go coverage meets threshold"
	@echo "Checking JavaScript coverage threshold (>= 90%)..."
	@npm run test:coverage -- --run --reporter=json --coverage.reporter=json > /dev/null 2>&1 || true
	@if [ -f coverage/coverage-final.json ]; then \
		COVERAGE=$$(node -e "const c=require('./coverage/coverage-final.json');const t=Object.values(c).reduce((a,f)=>{const s=f.s||{};const lines=Object.values(s);const total=lines.length;const covered=lines.filter(n=>n>0).length;return {t:a.t+total,c:a.c+covered}},{t:0,c:0});console.log(((t.c/t.t)*100).toFixed(1))"); \
		echo "Current JavaScript coverage: $$COVERAGE%"; \
		if [ $$(echo "$$COVERAGE < 90" | bc -l) -eq 1 ]; then \
			echo "❌ Coverage $$COVERAGE% is below threshold 90%"; \
			exit 1; \
		fi; \
		echo "✅ JavaScript coverage meets threshold"; \
	fi

# Run tests in parallel (requires GNU parallel)
test-parallel:
	@command -v parallel >/dev/null 2>&1 || (echo "Installing GNU parallel..." && brew install parallel)
	@echo "Running tests in parallel..."
	@parallel --jobs 2 --halt now,fail=1 ::: "make test-backend" "make test-frontend"

# Full CI simulation locally
ci-local: clean
	@echo "🚀 Running local CI simulation..."
	@echo "Step 1: Formatting code..."
	@make fmt-all
	@echo "Step 2: Running linters..."
	@make lint-all
	@echo "Step 3: Running tests in parallel..."
	@make test-parallel
	@echo "Step 4: Checking coverage thresholds..."
	@make coverage-check
	@echo "✅ Local CI simulation passed!"

# Pre-commit checks (lint + all tests + coverage)
check: fmt-all lint-all test-all coverage-check

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
	@echo "  test-all-coverage  - Run all tests with coverage"
	@echo "  coverage-report    - Show Go coverage summary"
	@echo "  coverage-open      - Open coverage reports in browser"
	@echo "  coverage-check     - Enforce 90% coverage threshold"
	@echo "  test-parallel      - Run tests in parallel"
	@echo "  ci-local           - Simulate full CI pipeline locally"
	@echo ""
	@echo "Development Server:"
	@echo "  dev-start          - Start development server (with cleanup)"
	@echo "  dev-stop           - Stop development server"
	@echo "  dev-restart        - Restart development server"
	@echo "  dev-status         - Check development server status"
	@echo "  dev-logs           - Tail development server logs"
	@echo ""
	@echo "Code Quality:"
	@echo "  lint               - Run Go linter (golangci-lint)"
	@echo "  lint-js            - Run JavaScript linter (ESLint)"
	@echo "  lint-all           - Run all linters"
	@echo "  fmt                - Format Go code"
	@echo "  fmt-js             - Format JavaScript code (Prettier)"
	@echo "  fmt-all            - Format all code"
	@echo "  fix                - Auto-fix linting issues"
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