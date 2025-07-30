#!/bin/bash

# Development server management script for Go SQS UI
# Usage: ./scripts/dev-server.sh [start|stop|restart|status]

set -e

PORT=${PORT:-8080}
PID_FILE="/tmp/go-sqs-ui.pid"

function cleanup() {
    echo "🧹 Cleaning up..."
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "   Stopping server (PID: $PID)"
            kill -TERM "$PID" 2>/dev/null || true
            sleep 2
            if kill -0 "$PID" 2>/dev/null; then
                echo "   Force stopping server"
                kill -KILL "$PID" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi
    
    # Kill any process using the port
    if lsof -ti:$PORT >/dev/null 2>&1; then
        echo "   Killing processes on port $PORT"
        lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
    fi
}

function start_server() {
    echo "🚀 Starting Go SQS UI server on port $PORT..."
    
    # Ensure clean state
    cleanup
    
    # Start server in background
    nohup go run . > /tmp/go-sqs-ui.log 2>&1 &
    SERVER_PID=$!
    
    # Save PID
    echo $SERVER_PID > "$PID_FILE"
    
    # Wait a moment and check if server started successfully
    sleep 2
    if kill -0 "$SERVER_PID" 2>/dev/null; then
        echo "✅ Server started successfully (PID: $SERVER_PID)"
        echo "   Server running at: http://localhost:$PORT"
        echo "   Logs: tail -f /tmp/go-sqs-ui.log"
        echo "   Stop with: $0 stop"
    else
        echo "❌ Server failed to start"
        cat /tmp/go-sqs-ui.log
        rm -f "$PID_FILE"
        exit 1
    fi
}

function stop_server() {
    echo "🛑 Stopping Go SQS UI server..."
    cleanup
    echo "✅ Server stopped"
}

function server_status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "✅ Server is running (PID: $PID) on port $PORT"
            echo "   URL: http://localhost:$PORT"
            return 0
        else
            echo "❌ Server PID file exists but process is not running"
            rm -f "$PID_FILE"
            return 1
        fi
    else
        echo "❌ Server is not running"
        return 1
    fi
}

function restart_server() {
    echo "🔄 Restarting Go SQS UI server..."
    stop_server
    sleep 1
    start_server
}

# Set up trap to cleanup on script exit
trap cleanup EXIT INT TERM

case "${1:-start}" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        server_status
        ;;
    logs)
        if [ -f /tmp/go-sqs-ui.log ]; then
            tail -f /tmp/go-sqs-ui.log
        else
            echo "❌ No log file found. Server may not be running."
            exit 1
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the development server"
        echo "  stop    - Stop the development server"
        echo "  restart - Restart the development server"
        echo "  status  - Check server status"
        echo "  logs    - Tail server logs"
        echo ""
        echo "Environment variables:"
        echo "  PORT    - Server port (default: 8080)"
        exit 1
        ;;
esac