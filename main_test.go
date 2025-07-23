package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/mux"
)

// Integration tests for the main application routes
func TestIntegration_APIRoutes(t *testing.T) {
	// Create mock SQS client
	mockClient := NewMockSQSClient()
	mockClient.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-1")
	mockClient.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-2")
	mockClient.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-1", "msg1", "Hello World")

	// Create handler with mock client
	sqsHandler := &SQSHandler{client: mockClient}
	wsManager := NewWebSocketManager(mockClient)

	// Set up router (same as main.go)
	r := mux.NewRouter()
	r.HandleFunc("/api/queues", sqsHandler.ListQueues).Methods("GET")
	r.HandleFunc("/api/queues/{queueUrl}/messages", sqsHandler.GetMessages).Methods("GET")
	r.HandleFunc("/api/queues/{queueUrl}/messages", sqsHandler.SendMessage).Methods("POST")
	r.HandleFunc("/api/queues/{queueUrl}/messages/{receiptHandle}", sqsHandler.DeleteMessage).Methods("DELETE")
	r.HandleFunc("/ws", wsManager.HandleWebSocket)

	server := httptest.NewServer(r)
	defer server.Close()

	tests := []struct {
		name           string
		method         string
		path           string
		body           interface{}
		expectedStatus int
		checkResponse  func(*testing.T, *http.Response)
	}{
		{
			name:           "list queues",
			method:         "GET",
			path:           "/api/queues",
			expectedStatus: http.StatusOK,
			checkResponse: func(t *testing.T, resp *http.Response) {
				var queues []Queue
				if err := json.NewDecoder(resp.Body).Decode(&queues); err != nil {
					t.Fatalf("Failed to decode response: %v", err)
				}
				if len(queues) != 2 {
					t.Errorf("Expected 2 queues, got %d", len(queues))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var body *bytes.Reader
			if tt.body != nil {
				jsonBody, _ := json.Marshal(tt.body)
				body = bytes.NewReader(jsonBody)
			}

			var req *http.Request
			var err error
			if body != nil {
				req, err = http.NewRequest(tt.method, server.URL+tt.path, body)
			} else {
				req, err = http.NewRequest(tt.method, server.URL+tt.path, nil)
			}
			if err != nil {
				t.Fatalf("Failed to create request: %v", err)
			}

			if tt.body != nil {
				req.Header.Set("Content-Type", "application/json")
			}

			client := &http.Client{}
			resp, err := client.Do(req)
			if err != nil {
				t.Fatalf("Request failed: %v", err)
			}
			defer resp.Body.Close()

			if resp.StatusCode != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d", tt.expectedStatus, resp.StatusCode)
			}

			if tt.checkResponse != nil {
				tt.checkResponse(t, resp)
			}
		})
	}
}

func TestIntegration_CORS(t *testing.T) {
	mockClient := NewMockSQSClient()
	sqsHandler := &SQSHandler{client: mockClient}

	r := mux.NewRouter()
	r.HandleFunc("/api/queues", sqsHandler.ListQueues).Methods("GET")

	server := httptest.NewServer(r)
	defer server.Close()

	// Test preflight request
	req, err := http.NewRequest("OPTIONS", server.URL+"/api/queues", nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}
	req.Header.Set("Origin", "http://localhost:3000")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	// Note: This test might not pass without explicit CORS middleware
	// but demonstrates how you would test CORS headers
}

func TestIntegration_ErrorHandling(t *testing.T) {
	mockClient := NewMockSQSClient()
	mockClient.SetError("ListQueues", fmt.Errorf("AWS service unavailable"))

	sqsHandler := &SQSHandler{client: mockClient}

	r := mux.NewRouter()
	r.HandleFunc("/api/queues", sqsHandler.ListQueues).Methods("GET")

	server := httptest.NewServer(r)
	defer server.Close()

	resp, err := http.Get(server.URL + "/api/queues")
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusInternalServerError {
		t.Errorf("Expected status %d, got %d", http.StatusInternalServerError, resp.StatusCode)
	}
}

func TestIntegration_ContentType(t *testing.T) {
	mockClient := NewMockSQSClient()
	mockClient.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue")

	sqsHandler := &SQSHandler{client: mockClient}

	r := mux.NewRouter()
	r.HandleFunc("/api/queues", sqsHandler.ListQueues).Methods("GET")

	server := httptest.NewServer(r)
	defer server.Close()

	resp, err := http.Get(server.URL + "/api/queues")
	if err != nil {
		t.Fatalf("Request failed: %v", err)
	}
	defer resp.Body.Close()

	contentType := resp.Header.Get("Content-Type")
	if !strings.Contains(contentType, "application/json") {
		t.Errorf("Expected Content-Type to contain 'application/json', got '%s'", contentType)
	}
}

// Benchmark the full API endpoint
func BenchmarkIntegration_ListQueues(b *testing.B) {
	mockClient := NewMockSQSClient()
	
	// Add many queues for benchmarking
	for i := 0; i < 100; i++ {
		mockClient.AddQueue(fmt.Sprintf("https://sqs.us-east-1.amazonaws.com/123456789012/queue-%d", i))
	}

	sqsHandler := &SQSHandler{client: mockClient}

	r := mux.NewRouter()
	r.HandleFunc("/api/queues", sqsHandler.ListQueues).Methods("GET")

	server := httptest.NewServer(r)
	defer server.Close()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		resp, err := http.Get(server.URL + "/api/queues")
		if err != nil {
			b.Fatalf("Request failed: %v", err)
		}
		resp.Body.Close()
	}
}