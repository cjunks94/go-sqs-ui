// Package demo provides a mock SQS client for demonstration and development without AWS credentials.
package demo

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
)

// DemoSQSClient provides mock data for demonstration when AWS isn't configured
type DemoSQSClient struct {
	queues   []string
	messages map[string][]types.Message
}

// NewDemoSQSClient creates a new demo SQS client with pre-populated queues and sample messages.
func NewDemoSQSClient() *DemoSQSClient {
	demo := &DemoSQSClient{
		queues: []string{
			"https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue",
			"https://sqs.us-east-1.amazonaws.com/123456789012/demo-notifications-queue",
			"https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue",
		},
		messages: make(map[string][]types.Message),
	}

	// Add some demo messages with recent timestamps (August 2025)
	now := time.Now()
	demo.messages["https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue"] = []types.Message{
		{
			MessageId:     aws.String("msg-001"),
			Body:          aws.String(`{"orderId": "12345", "customerId": "cust-001", "amount": 99.99, "status": "pending"}`),
			ReceiptHandle: aws.String("receipt-001"),
			Attributes: map[string]string{
				"SentTimestamp":                    fmt.Sprintf("%d", now.Add(-1*time.Hour).UnixMilli()),
				"ApproximateReceiveCount":          "1",
				"ApproximateFirstReceiveTimestamp": fmt.Sprintf("%d", now.Add(-50*time.Minute).UnixMilli()),
			},
		},
		{
			MessageId:     aws.String("msg-002"),
			Body:          aws.String(`{"orderId": "12346", "customerId": "cust-002", "amount": 149.99, "status": "processing"}`),
			ReceiptHandle: aws.String("receipt-002"),
			Attributes: map[string]string{
				"SentTimestamp":                    fmt.Sprintf("%d", now.Add(-2*time.Hour).UnixMilli()),
				"ApproximateReceiveCount":          "1",
				"ApproximateFirstReceiveTimestamp": fmt.Sprintf("%d", now.Add(-110*time.Minute).UnixMilli()),
			},
		},
	}

	demo.messages["https://sqs.us-east-1.amazonaws.com/123456789012/demo-notifications-queue"] = []types.Message{
		{
			MessageId:     aws.String("notif-001"),
			Body:          aws.String(`{"type": "email", "recipient": "user@example.com", "subject": "Order Confirmation", "template": "order-confirmation"}`),
			ReceiptHandle: aws.String("receipt-notif-001"),
			Attributes: map[string]string{
				"SentTimestamp":           fmt.Sprintf("%d", now.Add(-30*time.Minute).UnixMilli()),
				"ApproximateReceiveCount": "1",
			},
		},
	}

	return demo
}

// ListQueues returns the list of demo SQS queues.
func (d *DemoSQSClient) ListQueues(ctx context.Context, params *sqs.ListQueuesInput, optFns ...func(*sqs.Options)) (*sqs.ListQueuesOutput, error) {
	log.Printf("Demo: ListQueues called, returning %d demo queues", len(d.queues))
	return &sqs.ListQueuesOutput{
		QueueUrls: d.queues,
	}, nil
}

// ListQueueTags returns demo tags for the specified queue.
func (d *DemoSQSClient) ListQueueTags(ctx context.Context, params *sqs.ListQueueTagsInput, optFns ...func(*sqs.Options)) (*sqs.ListQueueTagsOutput, error) {
	log.Printf("Demo: ListQueueTags called for queue %s", aws.ToString(params.QueueUrl))

	// Return demo tags that match your filter criteria
	return &sqs.ListQueueTagsOutput{
		Tags: map[string]string{
			"businessunit": "degrees",
			"product":      "amt",
			"env":          "stg",
		},
	}, nil
}

// GetQueueAttributes returns demo attributes for the specified queue including message count and ARN.
func (d *DemoSQSClient) GetQueueAttributes(ctx context.Context, params *sqs.GetQueueAttributesInput, optFns ...func(*sqs.Options)) (*sqs.GetQueueAttributesOutput, error) {
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

	var messageCount string
	if messages, exists := d.messages[queueURL]; exists {
		messageCount = fmt.Sprintf("%d", len(messages))
	} else {
		messageCount = "0"
	}

	return &sqs.GetQueueAttributesOutput{
		Attributes: map[string]string{
			"QueueArn":                    fmt.Sprintf("arn:aws:sqs:us-east-1:123456789012:%s", queueName),
			"ApproximateNumberOfMessages": messageCount,
			"MessageRetentionPeriod":      "1209600",
			"VisibilityTimeout":           "30",
			"CreatedTimestamp":            "1640995000",
			"LastModifiedTimestamp":       "1640995000",
		},
	}, nil
}

// ReceiveMessage retrieves demo messages from the specified queue.
func (d *DemoSQSClient) ReceiveMessage(ctx context.Context, params *sqs.ReceiveMessageInput, optFns ...func(*sqs.Options)) (*sqs.ReceiveMessageOutput, error) {
	queueURL := aws.ToString(params.QueueUrl)
	messages := d.messages[queueURL]

	log.Printf("Demo: ReceiveMessage called for queue %s, found %d messages", queueURL, len(messages))

	if len(messages) == 0 {
		return &sqs.ReceiveMessageOutput{
			Messages: []types.Message{},
		}, nil
	}

	maxMessages := int(params.MaxNumberOfMessages)
	if maxMessages > len(messages) {
		maxMessages = len(messages)
	}

	return &sqs.ReceiveMessageOutput{
		Messages: messages[:maxMessages],
	}, nil
}

// SendMessage adds a new demo message to the specified queue.
func (d *DemoSQSClient) SendMessage(ctx context.Context, params *sqs.SendMessageInput, optFns ...func(*sqs.Options)) (*sqs.SendMessageOutput, error) {
	queueURL := aws.ToString(params.QueueUrl)
	messageBody := aws.ToString(params.MessageBody)

	// Generate a new message ID
	messageID := fmt.Sprintf("demo-msg-%d", len(d.messages[queueURL])+1)

	// Add the message to our demo storage
	newMessage := types.Message{
		MessageId:     aws.String(messageID),
		Body:          aws.String(messageBody),
		ReceiptHandle: aws.String(fmt.Sprintf("receipt-%s", messageID)),
		Attributes: map[string]string{
			"SentTimestamp":           fmt.Sprintf("%d", 1722268800000+int64(len(d.messages[queueURL]))*60000), // July 30, 2025 base + minutes
			"ApproximateReceiveCount": "0",
		},
	}

	if d.messages[queueURL] == nil {
		d.messages[queueURL] = []types.Message{}
	}
	d.messages[queueURL] = append(d.messages[queueURL], newMessage)

	return &sqs.SendMessageOutput{
		MessageId: aws.String(messageID),
	}, nil
}

// DeleteMessage removes a message from the specified demo queue using its receipt handle.
func (d *DemoSQSClient) DeleteMessage(ctx context.Context, params *sqs.DeleteMessageInput, optFns ...func(*sqs.Options)) (*sqs.DeleteMessageOutput, error) {
	queueURL := aws.ToString(params.QueueUrl)
	receiptHandle := aws.ToString(params.ReceiptHandle)

	// Remove message with matching receipt handle
	messages := d.messages[queueURL]
	for i, msg := range messages {
		if aws.ToString(msg.ReceiptHandle) == receiptHandle {
			d.messages[queueURL] = append(messages[:i], messages[i+1:]...)
			break
		}
	}

	return &sqs.DeleteMessageOutput{}, nil
}
