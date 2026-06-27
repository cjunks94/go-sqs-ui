# Go SQS UI

[![CI](https://github.com/cjunks94/go-sqs-ui/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/cjunks94/go-sqs-ui/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/cjunks94/go-sqs-ui/branch/master/graph/badge.svg)](https://codecov.io/gh/cjunks94/go-sqs-ui)
[![Go Report Card](https://goreportcard.com/badge/github.com/cjunks94/go-sqs-ui)](https://goreportcard.com/report/github.com/cjunks94/go-sqs-ui)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, web-based UI for inspecting and debugging AWS SQS queues — built with Go and vanilla JavaScript, shipped as a single self-contained binary.

## Quick Start

```bash
git clone https://github.com/cjunks94/go-sqs-ui.git
cd go-sqs-ui
go run ./cmd/sqs-ui            # http://localhost:8080
```

With no AWS credentials it runs in **demo mode** (sample queues, no AWS needed). With credentials on your environment (`AWS_PROFILE` / `AWS_REGION` / `~/.aws/...`) it connects to live SQS. Requires **Go 1.25+**.

## Features

- 📋 List queues (tag-based filtering) with DLQ detection
- 📨 View, send, delete, and **retry** messages (DLQ → source queue)
- 🔌 Real-time updates over WebSocket (with pause/resume)
- 🔍 Search/filter by body or attribute; ⌨️ keyboard navigation (press `?`)
- 📊 Queue statistics panel · 🖼️ full-screen queue browser
- 💾 Export (JSON/CSV) · ✅ multi-select batch delete/retry
- 🌗 Light/dark theme · 🎭 demo mode without AWS

## Configuration

All optional, via environment variables:

| Variable                                                 | Purpose                                                  |
| -------------------------------------------------------- | -------------------------------------------------------- |
| `PORT`                                                   | Server port (default `8080`)                             |
| `AWS_REGION` / `AWS_PROFILE`                             | AWS connection (default: from AWS config)                |
| `FORCE_DEMO_MODE=true`                                   | Always use demo mode                                     |
| `FORCE_LIVE_MODE=true`                                   | Require live AWS (fail if unavailable)                   |
| `DISABLE_TAG_FILTER=true`                                | Show all queues (skip tag filtering)                     |
| `FILTER_BUSINESS_UNIT` / `FILTER_PRODUCT` / `FILTER_ENV` | Custom tag filters (comma-separated)                     |
| `ALLOWED_WEBSOCKET_ORIGINS`                              | Extra WebSocket `Origin` allow-list (default: localhost) |

```bash
FORCE_DEMO_MODE=true go run ./cmd/sqs-ui      # demo
DISABLE_TAG_FILTER=true go run ./cmd/sqs-ui   # all queues
```

For staging DLQ-debugging workflows, see the **[User Guide](USER_GUIDE.md)**.

### Local SQS (no AWS account)

Exercise live mode against a local SQS-compatible server (ElasticMQ in Docker — needs Docker/Colima):

```bash
make local-sqs-up     # start ElasticMQ + sample queues/DLQs
make local-sqs-run    # run the app against it (SQS_ENDPOINT_URL=http://localhost:9324)
make local-sqs-down   # stop it
```

## Required AWS permissions (live mode)

`sqs:ListQueues`, `sqs:GetQueueAttributes`, `sqs:ListQueueTags`, `sqs:ReceiveMessage`, `sqs:SendMessage`, `sqs:DeleteMessage`.

## Build & test

```bash
make dev-start     # run with auto-cleanup (make help for all targets)
make test-all      # backend (go test) + frontend (vitest)
make lint-all      # golangci-lint + eslint + prettier

go build -o sqs-ui ./cmd/sqs-ui   # production binary (assets embedded)
```

Requires Node 18+ for the frontend test/lint tooling.

## API

- `GET /api/aws-context` — connection mode/region/account
- `GET /api/queues?limit=20` — list queues (tag-filtered)
- `GET /api/queues/{queueUrl}/messages?limit=10&offset=0` — messages (offset paging is bounded by SQS's 10-per-fetch cap on live queues)
- `POST /api/queues/{queueUrl}/messages` — send · `DELETE .../messages/{receiptHandle}` — delete
- `POST /api/queues/{queueUrl}/retry` — retry a DLQ message to its source
- `GET /api/queues/{queueUrl}/statistics` — queue metrics
- `WS /ws` — real-time message stream

## Project layout

```
cmd/sqs-ui/          Application entry point & routing
internal/
  sqs/               SQS operations + HTTP handlers
  websocket/         WebSocket management
  demo/              Demo-mode client
  types/             Shared types
  static/files/      Embedded frontend (app.js, index.html, css/, modules/)
test/                Vitest specs + Go integration tests
```

The frontend is modular ES6 (no framework); the Go binary embeds it via `go:embed`. AWS SDK v2 + Gorilla mux/websocket.

## Contributing

PRs and issues welcome. Add tests for new behavior and run `make test-all` before pushing. License: [MIT](LICENSE).
