package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
)

func TestSQSHandler_ListQueues(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(*MockSQSClient)
		expectedStatus int
		expectedQueues int
	}{
		{
			name: "successful queue listing",
			setupMock: func(mock *MockSQSClient) {
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-1")
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-2")
			},
			expectedStatus: http.StatusOK,
			expectedQueues: 2,
		},
		{
			name: "no queues",
			setupMock: func(mock *MockSQSClient) {
				// No queues added
			},
			expectedStatus: http.StatusOK,
			expectedQueues: 0,
		},
		{
			name: "sqs error",
			setupMock: func(mock *MockSQSClient) {
				mock.SetError("ListQueues", fmt.Errorf("AWS error"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectedQueues: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{client: mockClient}

			req := httptest.NewRequest("GET", "/api/queues", nil)
			rr := httptest.NewRecorder()

			handler.ListQueues(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.expectedStatus == http.StatusOK {
				var queues []Queue
				if err := json.Unmarshal(rr.Body.Bytes(), &queues); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}

				if len(queues) != tt.expectedQueues {
					t.Errorf("expected %d queues, got %d", tt.expectedQueues, len(queues))
				}

				for _, queue := range queues {
					if queue.Name == "" || queue.URL == "" {
						t.Error("queue missing name or URL")
					}
				}
			}
		})
	}
}

func TestSQSHandler_GetMessages(t *testing.T) {
	tests := []struct {
		name             string
		queueURL         string
		setupMock        func(*MockSQSClient)
		expectedStatus   int
		expectedMessages int
	}{
		{
			name:     "successful message retrieval",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			setupMock: func(mock *MockSQSClient) {
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue")
				mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue", "msg1", "test message 1")
				mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue", "msg2", "test message 2")
			},
			expectedStatus:   http.StatusOK,
			expectedMessages: 2,
		},
		{
			name:     "no messages",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/empty-queue",
			setupMock: func(mock *MockSQSClient) {
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/empty-queue")
			},
			expectedStatus:   http.StatusOK,
			expectedMessages: 0,
		},
		{
			name:     "sqs error",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/error-queue",
			setupMock: func(mock *MockSQSClient) {
				mock.SetError("ReceiveMessage", fmt.Errorf("AWS error"))
			},
			expectedStatus:   http.StatusInternalServerError,
			expectedMessages: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{client: mockClient}

			req := httptest.NewRequest("GET", "/api/queues/{queueUrl}/messages", nil)
			req = mux.SetURLVars(req, map[string]string{"queueUrl": tt.queueURL})
			rr := httptest.NewRecorder()

			handler.GetMessages(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.expectedStatus == http.StatusOK {
				var messages []Message
				if err := json.Unmarshal(rr.Body.Bytes(), &messages); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}

				if len(messages) != tt.expectedMessages {
					t.Errorf("expected %d messages, got %d", tt.expectedMessages, len(messages))
				}

				for _, msg := range messages {
					if msg.MessageId == "" || msg.Body == "" || msg.ReceiptHandle == "" {
						t.Error("message missing required fields")
					}
				}
			}
		})
	}
}

func TestSQSHandler_SendMessage(t *testing.T) {
	tests := []struct {
		name           string
		queueURL       string
		requestBody    interface{}
		setupMock      func(*MockSQSClient)
		expectedStatus int
	}{
		{
			name:     "successful message send",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			requestBody: map[string]string{
				"body": "test message",
			},
			setupMock:      func(mock *MockSQSClient) {},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid request body",
			queueURL:       "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			requestBody:    "invalid json",
			setupMock:      func(mock *MockSQSClient) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "sqs error",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			requestBody: map[string]string{
				"body": "test message",
			},
			setupMock: func(mock *MockSQSClient) {
				mock.SetError("SendMessage", fmt.Errorf("AWS error"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{client: mockClient}

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest("POST", "/api/queues/{queueUrl}/messages", bytes.NewReader(body))
			req = mux.SetURLVars(req, map[string]string{"queueUrl": tt.queueURL})
			rr := httptest.NewRecorder()

			handler.SendMessage(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.expectedStatus == http.StatusOK {
				var response map[string]string
				if err := json.Unmarshal(rr.Body.Bytes(), &response); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}

				if response["messageId"] == "" {
					t.Error("response missing messageId")
				}
			}
		})
	}
}

func TestSQSHandler_DeleteMessage(t *testing.T) {
	tests := []struct {
		name           string
		queueURL       string
		receiptHandle  string
		setupMock      func(*MockSQSClient)
		expectedStatus int
	}{
		{
			name:          "successful message deletion",
			queueURL:      "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			receiptHandle: "receipt-msg1",
			setupMock: func(mock *MockSQSClient) {
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue")
				mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue", "msg1", "test message")
			},
			expectedStatus: http.StatusNoContent,
		},
		{
			name:          "sqs error",
			queueURL:      "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			receiptHandle: "receipt-msg1",
			setupMock: func(mock *MockSQSClient) {
				mock.SetError("DeleteMessage", fmt.Errorf("AWS error"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{client: mockClient}

			req := httptest.NewRequest("DELETE", "/api/queues/{queueUrl}/messages/{receiptHandle}", nil)
			req = mux.SetURLVars(req, map[string]string{
				"queueUrl":      tt.queueURL,
				"receiptHandle": tt.receiptHandle,
			})
			rr := httptest.NewRecorder()

			handler.DeleteMessage(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}
		})
	}
}