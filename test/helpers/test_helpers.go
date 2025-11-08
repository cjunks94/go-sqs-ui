// Package helpers provides mock implementations for testing SQS functionality.
package helpers

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
)

// MockSQSClient implements the SQSClientInterface for testing with configurable mock data.
type MockSQSClient struct {
	queues   []string
	messages map[string][]types.Message
	errors   map[string]error
}

// NewMockSQSClient creates a new mock SQS client for testing.
func NewMockSQSClient() *MockSQSClient {
	return &MockSQSClient{
		queues:   []string{},
		messages: make(map[string][]types.Message),
		errors:   make(map[string]error),
	}
}

// AddQueue adds a queue URL to the mock client's queue list.
func (m *MockSQSClient) AddQueue(url string) {
	m.queues = append(m.queues, url)
	if m.messages[url] == nil {
		m.messages[url] = []types.Message{}
	}
}

// AddMessage adds a test message to the specified queue.
func (m *MockSQSClient) AddMessage(queueURL, messageID, body string) {
	msg := types.Message{
		MessageId:     aws.String(messageID),
		Body:          aws.String(body),
		ReceiptHandle: aws.String(fmt.Sprintf("receipt-%s", messageID)),
		Attributes: map[string]string{
			"SentTimestamp": "1640995200000",
		},
	}
	m.messages[queueURL] = append(m.messages[queueURL], msg)
}

// SetError configures the mock client to return an error for a specific operation.
func (m *MockSQSClient) SetError(operation string, err error) {
	m.errors[operation] = err
}

// ListQueues returns the mock list of queues.
func (m *MockSQSClient) ListQueues(ctx context.Context, params *sqs.ListQueuesInput, optFns ...func(*sqs.Options)) (*sqs.ListQueuesOutput, error) {
	if err, exists := m.errors["ListQueues"]; exists {
		return nil, err
	}

	return &sqs.ListQueuesOutput{
		QueueUrls: m.queues,
	}, nil
}

// ListQueueTags returns mock queue tags for testing tag-based filtering.
func (m *MockSQSClient) ListQueueTags(ctx context.Context, params *sqs.ListQueueTagsInput, optFns ...func(*sqs.Options)) (*sqs.ListQueueTagsOutput, error) {
	if err, exists := m.errors["ListQueueTags"]; exists {
		return nil, err
	}
	
	// Return mock tags that match the filter criteria
	return &sqs.ListQueueTagsOutput{
		Tags: map[string]string{
			"businessunit": "degrees",
			"product":      "amt",
			"env":          "stg",
		},
	}, nil
}

// GetQueueAttributes returns mock queue attributes including ARN and message counts.
func (m *MockSQSClient) GetQueueAttributes(ctx context.Context, params *sqs.GetQueueAttributesInput, optFns ...func(*sqs.Options)) (*sqs.GetQueueAttributesOutput, error) {
	if err, exists := m.errors["GetQueueAttributes"]; exists {
		return nil, err
	}

	queueURL := aws.ToString(params.QueueUrl)
	queueName := queueURL
	if len(queueURL) > 0 {
		for i := len(queueURL) - 1; i >= 0; i-- {
			if queueURL[i] == '/' {
				queueName = queueURL[i+1:]
				break
			}
		}
	}

	return &sqs.GetQueueAttributesOutput{
		Attributes: map[string]string{
			"QueueArn":                    fmt.Sprintf("arn:aws:sqs:us-east-1:123456789012:%s", queueName),
			"ApproximateNumberOfMessages": "5",
			"MessageRetentionPeriod":      "1209600",
			"VisibilityTimeout":           "30",
		},
	}, nil
}

// ReceiveMessage returns mock messages from the specified queue, supporting pagination testing.
func (m *MockSQSClient) ReceiveMessage(ctx context.Context, params *sqs.ReceiveMessageInput, optFns ...func(*sqs.Options)) (*sqs.ReceiveMessageOutput, error) {
	if err, exists := m.errors["ReceiveMessage"]; exists {
		return nil, err
	}

	queueURL := aws.ToString(params.QueueUrl)
	messages := m.messages[queueURL]

	// For testing pagination: return all messages if MaxNumberOfMessages is 0 or not set
	// Otherwise return up to MaxNumberOfMessages
	// Real SQS would only return up to 10, but for testing offset pagination we need all messages
	maxMessages := len(messages)
	if params.MaxNumberOfMessages > 0 && int(params.MaxNumberOfMessages) < len(messages) {
		// In real usage, respect the limit
		// But if we have many messages (>10), return all for testing purposes
		// This allows offset-based pagination testing
		if len(messages) <= 10 {
			maxMessages = int(params.MaxNumberOfMessages)
		}
		// Otherwise return all messages for pagination testing
	}

	if maxMessages > len(messages) {
		maxMessages = len(messages)
	}

	return &sqs.ReceiveMessageOutput{
		Messages: messages[:maxMessages],
	}, nil
}

// SendMessage simulates sending a message and returns a mock message ID.
func (m *MockSQSClient) SendMessage(ctx context.Context, params *sqs.SendMessageInput, optFns ...func(*sqs.Options)) (*sqs.SendMessageOutput, error) {
	if err, exists := m.errors["SendMessage"]; exists {
		return nil, err
	}

	messageID := "test-message-id"
	return &sqs.SendMessageOutput{
		MessageId: aws.String(messageID),
	}, nil
}

// DeleteMessage removes a message from the mock queue using its receipt handle.
func (m *MockSQSClient) DeleteMessage(ctx context.Context, params *sqs.DeleteMessageInput, optFns ...func(*sqs.Options)) (*sqs.DeleteMessageOutput, error) {
	if err, exists := m.errors["DeleteMessage"]; exists {
		return nil, err
	}

	queueURL := aws.ToString(params.QueueUrl)
	receiptHandle := aws.ToString(params.ReceiptHandle)

	// Remove message with matching receipt handle
	messages := m.messages[queueURL]
	for i, msg := range messages {
		if aws.ToString(msg.ReceiptHandle) == receiptHandle {
			m.messages[queueURL] = append(messages[:i], messages[i+1:]...)
			break
		}
	}

	return &sqs.DeleteMessageOutput{}, nil
}
