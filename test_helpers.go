package main

import (
	"context"
	"fmt"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
)

// MockSQSClient implements the SQSClientInterface for testing
type MockSQSClient struct {
	queues   []string
	messages map[string][]types.Message
	errors   map[string]error
}

func NewMockSQSClient() *MockSQSClient {
	return &MockSQSClient{
		queues:   []string{},
		messages: make(map[string][]types.Message),
		errors:   make(map[string]error),
	}
}

func (m *MockSQSClient) AddQueue(url string) {
	m.queues = append(m.queues, url)
	if m.messages[url] == nil {
		m.messages[url] = []types.Message{}
	}
}

func (m *MockSQSClient) AddMessage(queueURL, messageID, body string) {
	msg := types.Message{
		MessageId: aws.String(messageID),
		Body:      aws.String(body),
		ReceiptHandle: aws.String(fmt.Sprintf("receipt-%s", messageID)),
		Attributes: map[string]string{
			"SentTimestamp": "1640995200000",
		},
	}
	m.messages[queueURL] = append(m.messages[queueURL], msg)
}

func (m *MockSQSClient) SetError(operation string, err error) {
	m.errors[operation] = err
}

func (m *MockSQSClient) ListQueues(ctx context.Context, params *sqs.ListQueuesInput, optFns ...func(*sqs.Options)) (*sqs.ListQueuesOutput, error) {
	if err, exists := m.errors["ListQueues"]; exists {
		return nil, err
	}
	
	return &sqs.ListQueuesOutput{
		QueueUrls: m.queues,
	}, nil
}

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
			"QueueArn": fmt.Sprintf("arn:aws:sqs:us-east-1:123456789012:%s", queueName),
			"ApproximateNumberOfMessages": "5",
			"MessageRetentionPeriod": "1209600",
			"VisibilityTimeout": "30",
		},
	}, nil
}

func (m *MockSQSClient) ReceiveMessage(ctx context.Context, params *sqs.ReceiveMessageInput, optFns ...func(*sqs.Options)) (*sqs.ReceiveMessageOutput, error) {
	if err, exists := m.errors["ReceiveMessage"]; exists {
		return nil, err
	}
	
	queueURL := aws.ToString(params.QueueUrl)
	messages := m.messages[queueURL]
	
	maxMessages := int(params.MaxNumberOfMessages)
	if maxMessages > len(messages) {
		maxMessages = len(messages)
	}
	
	return &sqs.ReceiveMessageOutput{
		Messages: messages[:maxMessages],
	}, nil
}

func (m *MockSQSClient) SendMessage(ctx context.Context, params *sqs.SendMessageInput, optFns ...func(*sqs.Options)) (*sqs.SendMessageOutput, error) {
	if err, exists := m.errors["SendMessage"]; exists {
		return nil, err
	}
	
	messageID := "test-message-id"
	return &sqs.SendMessageOutput{
		MessageId: aws.String(messageID),
	}, nil
}

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