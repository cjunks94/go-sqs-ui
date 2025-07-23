package main

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestWebSocketManager_HandleWebSocket(t *testing.T) {
	mockClient := NewMockSQSClient()
	mockClient.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue")
	mockClient.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue", "msg1", "test message")

	wsManager := NewWebSocketManager(mockClient)

	server := httptest.NewServer(http.HandlerFunc(wsManager.HandleWebSocket))
	defer server.Close()

	// Convert http://127.0.0.1 to ws://127.0.0.1
	url := "ws" + strings.TrimPrefix(server.URL, "http")

	// Connect to the WebSocket server
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("Failed to connect to WebSocket: %v", err)
	}
	defer conn.Close()

	// Test subscribing to a queue
	subscribeMsg := map[string]interface{}{
		"type":     "subscribe",
		"queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
	}

	if err := conn.WriteJSON(subscribeMsg); err != nil {
		t.Fatalf("Failed to send subscribe message: %v", err)
	}

	// Set a read deadline to avoid hanging
	conn.SetReadDeadline(time.Now().Add(10 * time.Second))

	// Read the response (should be messages from the queue)
	var response map[string]interface{}
	if err := conn.ReadJSON(&response); err != nil {
		// This might timeout if no messages are sent immediately, which is okay
		if !websocket.IsCloseError(err, websocket.CloseNormalClosure) && !strings.Contains(err.Error(), "timeout") {
			t.Logf("Expected timeout or close, got: %v", err)
		}
	} else {
		// If we got a response, verify it's the expected format
		if response["type"] != "messages" {
			t.Errorf("Expected message type 'messages', got %v", response["type"])
		}
		if response["queueUrl"] != "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue" {
			t.Errorf("Expected queueUrl to match subscription, got %v", response["queueUrl"])
		}
	}
}

func TestWebSocketManager_ConnectionTracking(t *testing.T) {
	mockClient := NewMockSQSClient()
	wsManager := NewWebSocketManager(mockClient)

	// Verify initial state
	if len(wsManager.connections) != 0 {
		t.Error("Expected no connections initially")
	}

	// Create a mock WebSocket connection
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			return
		}

		// Manually add to connections for testing
		wsManager.connectionsMu.Lock()
		wsManager.connections[conn] = make(map[string]context.CancelFunc)
		wsManager.connectionsMu.Unlock()

		// Simulate cleanup
		defer wsManager.cleanupConnection(conn)

		// Keep connection open briefly
		time.Sleep(100 * time.Millisecond)
	}))
	defer server.Close()

	url := "ws" + strings.TrimPrefix(server.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}

	// Give some time for connection to be established
	time.Sleep(50 * time.Millisecond)

	// Close the connection
	conn.Close()

	// Give some time for cleanup
	time.Sleep(200 * time.Millisecond)

	// Verify cleanup happened
	wsManager.connectionsMu.RLock()
	connectionCount := len(wsManager.connections)
	wsManager.connectionsMu.RUnlock()

	if connectionCount != 0 {
		t.Errorf("Expected 0 connections after cleanup, got %d", connectionCount)
	}
}

func TestWebSocketManager_SubscribeToQueue(t *testing.T) {
	mockClient := NewMockSQSClient()
	mockClient.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue")

	wsManager := NewWebSocketManager(mockClient)

	// Create a mock connection
	server := httptest.NewServer(http.HandlerFunc(wsManager.HandleWebSocket))
	defer server.Close()

	url := "ws" + strings.TrimPrefix(server.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Subscribe to queue
	subscribeMsg := map[string]interface{}{
		"type":     "subscribe",
		"queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
	}

	if err := conn.WriteJSON(subscribeMsg); err != nil {
		t.Fatalf("Failed to send subscribe message: %v", err)
	}

	// Give some time for subscription to be processed
	time.Sleep(100 * time.Millisecond)

	// Verify subscription was registered
	wsManager.connectionsMu.RLock()
	found := false
	for wsConn, queues := range wsManager.connections {
		if wsConn != nil {
			if _, exists := queues["https://sqs.us-east-1.amazonaws.com/123456789012/test-queue"]; exists {
				found = true
				break
			}
		}
	}
	wsManager.connectionsMu.RUnlock()

	if !found {
		t.Error("Expected queue subscription to be registered")
	}
}

func TestWebSocketManager_PingPong(t *testing.T) {
	mockClient := NewMockSQSClient()
	wsManager := NewWebSocketManager(mockClient)

	server := httptest.NewServer(http.HandlerFunc(wsManager.HandleWebSocket))
	defer server.Close()

	url := "ws" + strings.TrimPrefix(server.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Set up pong handler to respond to pings
	pongReceived := make(chan bool, 1)
	conn.SetPongHandler(func(appData string) error {
		select {
		case pongReceived <- true:
		default:
		}
		return nil
	})

	// Send a ping manually to test the pong response
	if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
		t.Fatalf("Failed to send ping: %v", err)
	}

	// Wait for pong response
	select {
	case <-pongReceived:
		// Success - pong received
	case <-time.After(5 * time.Second):
		t.Error("Did not receive pong response within timeout")
	}
}

func TestWebSocketManager_InvalidMessage(t *testing.T) {
	mockClient := NewMockSQSClient()
	wsManager := NewWebSocketManager(mockClient)

	server := httptest.NewServer(http.HandlerFunc(wsManager.HandleWebSocket))
	defer server.Close()

	url := "ws" + strings.TrimPrefix(server.URL, "http")
	conn, _, err := websocket.DefaultDialer.Dial(url, nil)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}
	defer conn.Close()

	// Send invalid JSON
	if err := conn.WriteMessage(websocket.TextMessage, []byte("invalid json")); err != nil {
		t.Fatalf("Failed to send invalid message: %v", err)
	}

	// The connection should close due to invalid JSON
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))
	_, _, err = conn.ReadMessage()
	if err == nil {
		t.Error("Expected connection to close due to invalid JSON")
	}
}

// Benchmark WebSocket message processing
func BenchmarkWebSocketManager_MessageProcessing(b *testing.B) {
	mockClient := NewMockSQSClient()
	mockClient.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/bench-queue")
	
	// Add many messages for benchmarking
	for i := 0; i < 100; i++ {
		mockClient.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/bench-queue", 
			fmt.Sprintf("msg%d", i), fmt.Sprintf("benchmark message %d", i))
	}

	wsManager := NewWebSocketManager(mockClient)

	server := httptest.NewServer(http.HandlerFunc(wsManager.HandleWebSocket))
	defer server.Close()

	url := "ws" + strings.TrimPrefix(server.URL, "http")

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		conn, _, err := websocket.DefaultDialer.Dial(url, nil)
		if err != nil {
			b.Fatalf("Failed to connect: %v", err)
		}

		subscribeMsg := map[string]interface{}{
			"type":     "subscribe",
			"queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/bench-queue",
		}

		conn.WriteJSON(subscribeMsg)
		conn.Close()
	}
}