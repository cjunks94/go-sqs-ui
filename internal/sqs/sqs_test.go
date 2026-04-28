package sqs

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/cjunker/go-sqs-ui/internal/types"
	"github.com/cjunker/go-sqs-ui/test/helpers"
	"github.com/gorilla/mux"
)

func TestSQSHandler_ListQueues(t *testing.T) {
	tests := []struct {
		name           string
		setupMock      func(*helpers.MockSQSClient)
		expectedStatus int
		expectedQueues int
	}{
		{
			name: "successful queue listing",
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-1")
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-2")
			},
			expectedStatus: http.StatusOK,
			expectedQueues: 2,
		},
		{
			name: "no queues",
			setupMock: func(mock *helpers.MockSQSClient) {
				// No queues added
			},
			expectedStatus: http.StatusOK,
			expectedQueues: 0,
		},
		{
			name: "sqs error",
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.SetError("ListQueues", fmt.Errorf("AWS error"))
			},
			expectedStatus: http.StatusInternalServerError,
			expectedQueues: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := helpers.NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{Client: mockClient}

			req := httptest.NewRequest("GET", "/api/queues", nil)
			rr := httptest.NewRecorder()

			handler.ListQueues(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.expectedStatus == http.StatusOK {
				var queues []types.Queue
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
		setupMock        func(*helpers.MockSQSClient)
		expectedStatus   int
		expectedMessages int
	}{
		{
			name:     "successful message retrieval",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			setupMock: func(mock *helpers.MockSQSClient) {
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
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/empty-queue")
			},
			expectedStatus:   http.StatusOK,
			expectedMessages: 0,
		},
		{
			name:     "sqs error",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/error-queue",
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.SetError("ReceiveMessage", fmt.Errorf("AWS error"))
			},
			expectedStatus:   http.StatusInternalServerError,
			expectedMessages: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := helpers.NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{Client: mockClient}

			req := httptest.NewRequest("GET", "/api/queues/{queueUrl}/messages", nil)
			req = mux.SetURLVars(req, map[string]string{"queueUrl": tt.queueURL})
			rr := httptest.NewRecorder()

			handler.GetMessages(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.expectedStatus == http.StatusOK {
				var messages []types.Message
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
		setupMock      func(*helpers.MockSQSClient)
		expectedStatus int
	}{
		{
			name:     "successful message send",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			requestBody: map[string]string{
				"body": "test message",
			},
			setupMock:      func(mock *helpers.MockSQSClient) {},
			expectedStatus: http.StatusOK,
		},
		{
			name:           "invalid request body",
			queueURL:       "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			requestBody:    "invalid json",
			setupMock:      func(mock *helpers.MockSQSClient) {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:     "sqs error",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			requestBody: map[string]string{
				"body": "test message",
			},
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.SetError("SendMessage", fmt.Errorf("AWS error"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := helpers.NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{Client: mockClient}

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
		setupMock      func(*helpers.MockSQSClient)
		expectedStatus int
	}{
		{
			name:          "successful message deletion",
			queueURL:      "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			receiptHandle: "receipt-msg1",
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue")
				mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue", "msg1", "test message")
			},
			expectedStatus: http.StatusNoContent,
		},
		{
			name:          "sqs error",
			queueURL:      "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			receiptHandle: "receipt-msg1",
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.SetError("DeleteMessage", fmt.Errorf("AWS error"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := helpers.NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{Client: mockClient}

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

func TestSQSHandler_GetAWSContext(t *testing.T) {
	tests := []struct {
		name            string
		isDemo          bool
		config          aws.Config
		envVars         map[string]string
		expectedMode    string
		expectedRegion  string
		expectedProfile string
	}{
		{
			name:            "demo mode context",
			isDemo:          true,
			config:          aws.Config{},
			envVars:         map[string]string{},
			expectedMode:    "Demo",
			expectedRegion:  "",
			expectedProfile: "",
		},
		{
			name:   "live AWS context with region",
			isDemo: false,
			config: aws.Config{
				Region: "us-east-1",
			},
			envVars:         map[string]string{},
			expectedMode:    "Live AWS",
			expectedRegion:  "us-east-1",
			expectedProfile: "",
		},
		{
			name:   "live AWS context with profile",
			isDemo: false,
			config: aws.Config{
				Region: "us-west-2",
			},
			envVars: map[string]string{
				"AWS_PROFILE": "test-profile",
			},
			expectedMode:    "Live AWS",
			expectedRegion:  "us-west-2",
			expectedProfile: "test-profile",
		},
		{
			name:            "live AWS context with minimal config",
			isDemo:          false,
			config:          aws.Config{},
			envVars:         map[string]string{},
			expectedMode:    "Live AWS",
			expectedRegion:  "",
			expectedProfile: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Set environment variables
			for key, value := range tt.envVars {
				if err := os.Setenv(key, value); err != nil {
					t.Fatalf("failed to set env var %s: %v", key, err)
				}
				defer func(k string) {
					if err := os.Unsetenv(k); err != nil {
						t.Logf("failed to unset env var %s: %v", k, err)
					}
				}(key)
			}

			handler := &SQSHandler{
				Client: helpers.NewMockSQSClient(),
				config: tt.config,
				isDemo: tt.isDemo,
			}

			req := httptest.NewRequest("GET", "/api/aws-context", nil)
			rr := httptest.NewRecorder()

			handler.GetAWSContext(rr, req)

			if rr.Code != http.StatusOK {
				t.Errorf("expected status %d, got %d", http.StatusOK, rr.Code)
			}

			var context struct {
				Mode      string `json:"mode"`
				Region    string `json:"region,omitempty"`
				Profile   string `json:"profile,omitempty"`
				AccountID string `json:"accountId,omitempty"`
			}

			if err := json.NewDecoder(rr.Body).Decode(&context); err != nil {
				t.Fatalf("failed to decode response: %v", err)
			}

			if context.Mode != tt.expectedMode {
				t.Errorf("expected mode %s, got %s", tt.expectedMode, context.Mode)
			}

			if context.Region != tt.expectedRegion {
				t.Errorf("expected region %s, got %s", tt.expectedRegion, context.Region)
			}

			if context.Profile != tt.expectedProfile {
				t.Errorf("expected profile %s, got %s", tt.expectedProfile, context.Profile)
			}

			// For demo mode, region and profile should be empty
			if tt.isDemo {
				if context.Region != "" {
					t.Errorf("demo mode should have empty region, got %s", context.Region)
				}
				if context.Profile != "" {
					t.Errorf("demo mode should have empty profile, got %s", context.Profile)
				}
			}
		})
	}
}

func Test_getTimestampFromMessage(t *testing.T) {
	tests := []struct {
		name     string
		message  types.Message
		expected int64
	}{
		{
			name: "valid timestamp",
			message: types.Message{
				MessageId: "msg1",
				Attributes: map[string]string{
					"SentTimestamp": "1722268800000",
				},
			},
			expected: 1722268800000,
		},
		{
			name: "missing timestamp",
			message: types.Message{
				MessageId:  "msg2",
				Attributes: map[string]string{},
			},
			expected: 0,
		},
		{
			name: "invalid timestamp format",
			message: types.Message{
				MessageId: "msg3",
				Attributes: map[string]string{
					"SentTimestamp": "invalid-timestamp",
				},
			},
			expected: 0,
		},
		{
			name: "zero timestamp",
			message: types.Message{
				MessageId: "msg4",
				Attributes: map[string]string{
					"SentTimestamp": "0",
				},
			},
			expected: 0,
		},
		{
			name: "negative timestamp",
			message: types.Message{
				MessageId: "msg5",
				Attributes: map[string]string{
					"SentTimestamp": "-1000",
				},
			},
			expected: -1000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getTimestampFromMessage(tt.message)
			if result != tt.expected {
				t.Errorf("expected %d, got %d", tt.expected, result)
			}
		})
	}
}

// Test pagination support for GetMessages
func TestSQSHandler_GetMessagesWithPagination(t *testing.T) {
	tests := []struct {
		name           string
		queryParams    string
		setupMock      func(*helpers.MockSQSClient)
		expectedStatus int
		expectedCount  int
		validateBody   func(*testing.T, []byte)
	}{
		{
			name:        "default pagination (10 messages)",
			queryParams: "",
			setupMock: func(mock *helpers.MockSQSClient) {
				// Add 15 messages to mock
				for i := 1; i <= 15; i++ {
					mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
						fmt.Sprintf("msg-%d", i),
						fmt.Sprintf("Message body %d", i))
				}
			},
			expectedStatus: http.StatusOK,
			expectedCount:  10, // Default limit
		},
		{
			name:        "custom limit of 5",
			queryParams: "?limit=5",
			setupMock: func(mock *helpers.MockSQSClient) {
				for i := 1; i <= 10; i++ {
					mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
						fmt.Sprintf("msg-%d", i),
						fmt.Sprintf("Message body %d", i))
				}
			},
			expectedStatus: http.StatusOK,
			expectedCount:  5,
		},
		{
			name:        "limit exceeding max (should cap at 10)",
			queryParams: "?limit=50",
			setupMock: func(mock *helpers.MockSQSClient) {
				for i := 1; i <= 20; i++ {
					mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
						fmt.Sprintf("msg-%d", i),
						fmt.Sprintf("Message body %d", i))
				}
			},
			expectedStatus: http.StatusOK,
			expectedCount:  10, // Should cap at max
		},
		{
			name:        "invalid limit parameter",
			queryParams: "?limit=invalid",
			setupMock: func(mock *helpers.MockSQSClient) {
				for i := 1; i <= 5; i++ {
					mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
						fmt.Sprintf("msg-%d", i),
						fmt.Sprintf("Message body %d", i))
				}
			},
			expectedStatus: http.StatusOK,
			expectedCount:  5, // Should use default
		},
		{
			name:        "negative limit (should use default)",
			queryParams: "?limit=-5",
			setupMock: func(mock *helpers.MockSQSClient) {
				for i := 1; i <= 5; i++ {
					mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
						fmt.Sprintf("msg-%d", i),
						fmt.Sprintf("Message body %d", i))
				}
			},
			expectedStatus: http.StatusOK,
			expectedCount:  5, // Should use default
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := helpers.NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{Client: mockClient}

			req := httptest.NewRequest("GET", "/api/queues/{queueUrl}/messages"+tt.queryParams, nil)
			req = mux.SetURLVars(req, map[string]string{
				"queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			})
			rr := httptest.NewRecorder()

			handler.GetMessages(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.expectedStatus == http.StatusOK {
				var messages []types.Message
				if err := json.NewDecoder(rr.Body).Decode(&messages); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}

				if len(messages) != tt.expectedCount {
					t.Errorf("expected %d messages, got %d", tt.expectedCount, len(messages))
				}

				if tt.validateBody != nil {
					tt.validateBody(t, rr.Body.Bytes())
				}
			}
		})
	}
}

// Test new endpoint for queue statistics
func TestSQSHandler_GetQueueStatistics(t *testing.T) {
	tests := []struct {
		name           string
		queueURL       string
		setupMock      func(*helpers.MockSQSClient)
		expectedStatus int
		validateBody   func(*testing.T, []byte)
	}{
		{
			name:     "get statistics for regular queue",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			setupMock: func(mock *helpers.MockSQSClient) {
				// Add queue with attributes
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue")
				// Add some messages with varying timestamps
				mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
					"msg-1", "Old message")
				mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
					"msg-2", "New message")
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var stats map[string]interface{}
				if err := json.Unmarshal(body, &stats); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}

				// Check for expected statistics fields
				expectedFields := []string{"totalMessages", "messagesInFlight", "queueName"}
				for _, field := range expectedFields {
					if _, ok := stats[field]; !ok {
						t.Errorf("missing expected field: %s", field)
					}
				}
			},
		},
		{
			name:     "get statistics for DLQ",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-dlq",
			setupMock: func(mock *helpers.MockSQSClient) {
				// Add DLQ with redrive allow policy
				mock.AddQueue("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-dlq")
				// Add messages with high receive counts
				for i := 1; i <= 5; i++ {
					mock.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue-dlq",
						fmt.Sprintf("msg-%d", i),
						fmt.Sprintf("Failed message %d", i))
				}
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var stats map[string]interface{}
				if err := json.Unmarshal(body, &stats); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}

				// Check for DLQ-specific statistics
				if _, ok := stats["isDLQ"]; !ok {
					t.Error("missing isDLQ field for DLQ queue")
				}
			},
		},
		{
			name:     "queue not found",
			queueURL: "https://sqs.us-east-1.amazonaws.com/123456789012/non-existent",
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.SetError("GetQueueAttributes", fmt.Errorf("queue not found"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := helpers.NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{Client: mockClient}

			// Note: This assumes we'll add a new endpoint /api/queues/{queueUrl}/statistics
			req := httptest.NewRequest("GET", "/api/queues/{queueUrl}/statistics", nil)
			req = mux.SetURLVars(req, map[string]string{
				"queueUrl": tt.queueURL,
			})
			rr := httptest.NewRecorder()

			// We'll need to implement this handler method
			handler.GetQueueStatistics(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.validateBody != nil && tt.expectedStatus == http.StatusOK {
				tt.validateBody(t, rr.Body.Bytes())
			}
		})
	}
}

// Test enhanced message retrieval with offset for pagination
func TestSQSHandler_GetMessagesWithOffset(t *testing.T) {
	tests := []struct {
		name           string
		queryParams    string
		totalMessages  int
		expectedStatus int
		expectedStart  int
		expectedEnd    int
	}{
		{
			name:           "first page",
			queryParams:    "?limit=10&offset=0",
			totalMessages:  30,
			expectedStatus: http.StatusOK,
			expectedStart:  1,
			expectedEnd:    10,
		},
		{
			name:           "second page",
			queryParams:    "?limit=10&offset=10",
			totalMessages:  30,
			expectedStatus: http.StatusOK,
			expectedStart:  11,
			expectedEnd:    20,
		},
		{
			name:           "last page with partial results",
			queryParams:    "?limit=10&offset=25",
			totalMessages:  30,
			expectedStatus: http.StatusOK,
			expectedStart:  26,
			expectedEnd:    30,
		},
		{
			name:           "offset beyond available messages",
			queryParams:    "?limit=10&offset=50",
			totalMessages:  30,
			expectedStatus: http.StatusOK,
			expectedStart:  0,
			expectedEnd:    0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := helpers.NewMockSQSClient()

			// Add messages to mock
			for i := 1; i <= tt.totalMessages; i++ {
				mockClient.AddMessage("https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
					fmt.Sprintf("msg-%d", i),
					fmt.Sprintf("Message body %d", i))
			}

			handler := &SQSHandler{Client: mockClient}

			req := httptest.NewRequest("GET", "/api/queues/{queueUrl}/messages"+tt.queryParams, nil)
			req = mux.SetURLVars(req, map[string]string{
				"queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/test-queue",
			})
			rr := httptest.NewRecorder()

			handler.GetMessages(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rr.Code)
			}

			if tt.expectedStatus == http.StatusOK {
				var messages []types.Message
				if err := json.NewDecoder(rr.Body).Decode(&messages); err != nil {
					t.Fatalf("failed to decode response: %v", err)
				}

				expectedCount := tt.expectedEnd - tt.expectedStart + 1
				if tt.expectedStart == 0 {
					expectedCount = 0
				}

				if len(messages) != expectedCount {
					t.Errorf("expected %d messages, got %d", expectedCount, len(messages))
				}
			}
		})
	}
}

func TestSQSHandler_RetryMessage(t *testing.T) {
	const sourceQueueURL = "https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue"
	const targetQueueURL = "https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue"

	validPayload := map[string]interface{}{
		"message": map[string]interface{}{
			"messageId":     "dlq-001",
			"body":          `{"orderId":"99999"}`,
			"receiptHandle": "receipt-dlq-001",
		},
		"targetQueueUrl": targetQueueURL,
	}

	tests := []struct {
		name                string
		queueURL            string
		requestBody         interface{}
		setupMock           func(*helpers.MockSQSClient)
		expectedStatus      int
		expectedSendCalls   int
		expectedDeleteCalls int
		expectedSendQueue   string
		expectedDeleteQueue string
	}{
		{
			name:                "should retry successfully when source and target are valid",
			queueURL:            sourceQueueURL,
			requestBody:         validPayload,
			setupMock:           func(mock *helpers.MockSQSClient) {},
			expectedStatus:      http.StatusOK,
			expectedSendCalls:   1,
			expectedDeleteCalls: 1,
			expectedSendQueue:   targetQueueURL,
			expectedDeleteQueue: sourceQueueURL,
		},
		{
			name:     "should fix double-slash mux encoding when queueUrl arrives as https:/...",
			queueURL: "https:/sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue",
			requestBody: map[string]interface{}{
				"message": map[string]interface{}{
					"messageId":     "dlq-001",
					"body":          `{"orderId":"99999"}`,
					"receiptHandle": "receipt-dlq-001",
				},
				"targetQueueUrl": targetQueueURL,
			},
			setupMock:           func(mock *helpers.MockSQSClient) {},
			expectedStatus:      http.StatusOK,
			expectedSendCalls:   1,
			expectedDeleteCalls: 1,
			expectedSendQueue:   targetQueueURL,
			expectedDeleteQueue: sourceQueueURL,
		},
		{
			name:                "should return 400 when payload is malformed JSON",
			queueURL:            sourceQueueURL,
			requestBody:         "not-json",
			setupMock:           func(mock *helpers.MockSQSClient) {},
			expectedStatus:      http.StatusBadRequest,
			expectedSendCalls:   0,
			expectedDeleteCalls: 0,
		},
		{
			name:        "should return 500 and skip delete when SendMessage fails",
			queueURL:    sourceQueueURL,
			requestBody: validPayload,
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.SetError("SendMessage", fmt.Errorf("AWS unavailable"))
			},
			expectedStatus:      http.StatusInternalServerError,
			expectedSendCalls:   1,
			expectedDeleteCalls: 0,
		},
		{
			name:        "should still return 200 when DeleteMessage fails after successful send",
			queueURL:    sourceQueueURL,
			requestBody: validPayload,
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.SetError("DeleteMessage", fmt.Errorf("permission denied"))
			},
			expectedStatus:      http.StatusOK,
			expectedSendCalls:   1,
			expectedDeleteCalls: 1,
			expectedSendQueue:   targetQueueURL,
			expectedDeleteQueue: sourceQueueURL,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := helpers.NewMockSQSClient()
			tt.setupMock(mockClient)

			handler := &SQSHandler{Client: mockClient}

			body, _ := json.Marshal(tt.requestBody)
			req := httptest.NewRequest("POST", "/api/queues/{queueUrl}/retry", bytes.NewReader(body))
			req = mux.SetURLVars(req, map[string]string{"queueUrl": tt.queueURL})
			rr := httptest.NewRecorder()

			handler.RetryMessage(rr, req)

			if rr.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d (body=%s)", tt.expectedStatus, rr.Code, rr.Body.String())
			}

			if got := len(mockClient.SendMessageCalls); got != tt.expectedSendCalls {
				t.Errorf("expected %d SendMessage calls, got %d", tt.expectedSendCalls, got)
			}

			if got := len(mockClient.DeleteMessageCalls); got != tt.expectedDeleteCalls {
				t.Errorf("expected %d DeleteMessage calls, got %d", tt.expectedDeleteCalls, got)
			}

			if tt.expectedSendQueue != "" && len(mockClient.SendMessageCalls) > 0 {
				if got := mockClient.SendMessageCalls[0].QueueURL; got != tt.expectedSendQueue {
					t.Errorf("expected SendMessage queueURL %q, got %q", tt.expectedSendQueue, got)
				}
			}

			if tt.expectedDeleteQueue != "" && len(mockClient.DeleteMessageCalls) > 0 {
				if got := mockClient.DeleteMessageCalls[0].QueueURL; got != tt.expectedDeleteQueue {
					t.Errorf("expected DeleteMessage queueURL %q, got %q", tt.expectedDeleteQueue, got)
				}
			}

			if tt.expectedStatus == http.StatusOK {
				var resp map[string]string
				if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
					t.Fatalf("failed to unmarshal response: %v", err)
				}
				if resp["status"] != "retried" {
					t.Errorf("expected status field to be 'retried', got %q", resp["status"])
				}
				if resp["messageId"] == "" {
					t.Error("response missing messageId")
				}
			}
		})
	}
}

func TestSQSHandler_RetryMessage_PreservesBody(t *testing.T) {
	const targetQueueURL = "https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue"
	const originalBody = `{"orderId":"99999","retryAttempt":3}`

	mockClient := helpers.NewMockSQSClient()
	handler := &SQSHandler{Client: mockClient}

	payload := map[string]interface{}{
		"message": map[string]interface{}{
			"messageId":     "dlq-001",
			"body":          originalBody,
			"receiptHandle": "receipt-dlq-001",
		},
		"targetQueueUrl": targetQueueURL,
	}

	body, _ := json.Marshal(payload)
	req := httptest.NewRequest("POST", "/api/queues/{queueUrl}/retry", bytes.NewReader(body))
	req = mux.SetURLVars(req, map[string]string{
		"queueUrl": "https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue",
	})
	rr := httptest.NewRecorder()

	handler.RetryMessage(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	if len(mockClient.SendMessageCalls) != 1 {
		t.Fatalf("expected 1 SendMessage call, got %d", len(mockClient.SendMessageCalls))
	}
	if got := mockClient.SendMessageCalls[0].Body; got != originalBody {
		t.Errorf("retry must preserve original body verbatim; expected %q, got %q", originalBody, got)
	}
}

func TestSQSHandler_ListQueues_TagFilters(t *testing.T) {
	const matchingQueue = "https://sqs.us-east-1.amazonaws.com/123456789012/matching-queue"
	const nonMatchingQueue = "https://sqs.us-east-1.amazonaws.com/123456789012/non-matching-queue"

	tests := []struct {
		name           string
		envVars        map[string]string
		setupMock      func(*helpers.MockSQSClient)
		expectedQueues int
	}{
		{
			name: "should return all queues when DISABLE_TAG_FILTER is true",
			envVars: map[string]string{
				"DISABLE_TAG_FILTER": "true",
			},
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.AddQueue(matchingQueue)
				mock.AddQueue(nonMatchingQueue)
			},
			expectedQueues: 2,
		},
		{
			name: "should respect custom FILTER_BUSINESS_UNIT (mock returns degrees, filter expects different)",
			envVars: map[string]string{
				"FILTER_BUSINESS_UNIT": "marketing",
			},
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.AddQueue(matchingQueue)
			},
			expectedQueues: 0,
		},
		{
			name: "should respect custom FILTER_PRODUCT (mock returns amt, filter expects amt,other)",
			envVars: map[string]string{
				"FILTER_PRODUCT": "amt,other",
			},
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.AddQueue(matchingQueue)
			},
			expectedQueues: 1,
		},
		{
			name: "should respect custom FILTER_ENV (mock returns stg, filter expects prod)",
			envVars: map[string]string{
				"FILTER_ENV": "prod",
			},
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.AddQueue(matchingQueue)
			},
			expectedQueues: 0,
		},
		{
			name: "should match when custom FILTER_ENV includes mock's tag value",
			envVars: map[string]string{
				"FILTER_ENV": "stg,prod,dev",
			},
			setupMock: func(mock *helpers.MockSQSClient) {
				mock.AddQueue(matchingQueue)
			},
			expectedQueues: 1,
		},
	}

	tagFilterEnvVars := []string{
		"DISABLE_TAG_FILTER",
		"FILTER_BUSINESS_UNIT",
		"FILTER_PRODUCT",
		"FILTER_ENV",
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, key := range tagFilterEnvVars {
				if err := os.Unsetenv(key); err != nil {
					t.Fatalf("failed to unset %s: %v", key, err)
				}
			}
			for key, value := range tt.envVars {
				if err := os.Setenv(key, value); err != nil {
					t.Fatalf("failed to set %s: %v", key, err)
				}
			}
			t.Cleanup(func() {
				for _, key := range tagFilterEnvVars {
					_ = os.Unsetenv(key)
				}
			})

			mockClient := helpers.NewMockSQSClient()
			tt.setupMock(mockClient)
			handler := &SQSHandler{Client: mockClient}

			req := httptest.NewRequest("GET", "/api/queues", nil)
			rr := httptest.NewRecorder()
			handler.ListQueues(rr, req)

			if rr.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d", rr.Code)
			}

			var queues []types.Queue
			if err := json.Unmarshal(rr.Body.Bytes(), &queues); err != nil {
				t.Fatalf("failed to unmarshal: %v", err)
			}

			if len(queues) != tt.expectedQueues {
				t.Errorf("expected %d queues, got %d", tt.expectedQueues, len(queues))
			}
		})
	}
}
