package main

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing/fstest"

	"testing"

	"github.com/cjunks94/go-sqs-ui/internal/sqs"
	"github.com/cjunks94/go-sqs-ui/internal/websocket"
	"github.com/cjunks94/go-sqs-ui/test/helpers"
)

// TestNewRouter_SendToEmbeddedQueueURL guards the SkipClean(true) fix: a POST to
// a path with a URL-encoded queue URL must reach SendMessage with its body
// intact, NOT be 301-redirected (which would drop the POST body). Without
// SkipClean the request is redirected and SendMessage is never called.
func TestNewRouter_SendToEmbeddedQueueURL(t *testing.T) {
	mock := helpers.NewMockSQSClient()
	queueURL := "https://sqs.us-east-1.amazonaws.com/123456789012/orders-queue"
	mock.AddQueue(queueURL)

	sqsHandler := &sqs.SQSHandler{Client: mock}
	wsManager := websocket.NewWebSocketManager(mock)
	router := newRouter(sqsHandler, wsManager, fstest.MapFS{})

	server := httptest.NewServer(router)
	defer server.Close()

	// Encode the queue URL exactly as the frontend does (encodeURIComponent).
	encoded := "https%3A%2F%2Fsqs.us-east-1.amazonaws.com%2F123456789012%2Forders-queue"
	url := server.URL + "/api/queues/" + encoded + "/messages"

	resp, err := http.Post(url, "application/json", bytes.NewReader([]byte(`{"body":"hello"}`)))
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
	// The POST body must have survived (no redirect): SendMessage ran with it.
	if len(mock.SendMessageCalls) != 1 {
		t.Fatalf("expected SendMessage to be called once, got %d calls", len(mock.SendMessageCalls))
	}
	if got := mock.SendMessageCalls[0].Body; got != "hello" {
		t.Errorf("expected body %q, got %q", "hello", got)
	}
	// And it must have been sent to the decoded queue URL (scheme restored).
	if got := mock.SendMessageCalls[0].QueueURL; got != queueURL {
		t.Errorf("expected queue URL %q, got %q", queueURL, got)
	}
}
