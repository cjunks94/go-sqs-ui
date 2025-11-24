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
			"https://sqs.us-east-1.amazonaws.com/123456789012/demo-payments-queue",
			"https://sqs.us-east-1.amazonaws.com/123456789012/demo-analytics-queue",
			"https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue",
		},
		messages: make(map[string][]types.Message),
	}

	// Use dynamic timestamps relative to now
	now := time.Now()

	// Orders Queue - Active processing queue
	demo.messages["https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue"] = []types.Message{
		{
			MessageId:     aws.String("ord-001"),
			Body:          aws.String(`{"orderId": "12345", "customerId": "cust-001", "amount": 99.99, "status": "pending", "items": [{"sku": "WIDGET-001", "quantity": 2}]}`),
			ReceiptHandle: aws.String("receipt-ord-001"),
			Attributes: map[string]string{
				"SentTimestamp":                    fmt.Sprintf("%d", now.Add(-1*time.Hour).UnixMilli()),
				"ApproximateReceiveCount":          "1",
				"ApproximateFirstReceiveTimestamp": fmt.Sprintf("%d", now.Add(-50*time.Minute).UnixMilli()),
			},
			MessageAttributes: map[string]types.MessageAttributeValue{
				"Priority": {
					DataType:    aws.String("String"),
					StringValue: aws.String("high"),
				},
				"Source": {
					DataType:    aws.String("String"),
					StringValue: aws.String("web-app"),
				},
			},
		},
		{
			MessageId:     aws.String("ord-002"),
			Body:          aws.String(`{"orderId": "12346", "customerId": "cust-002", "amount": 149.99, "status": "processing", "items": [{"sku": "GADGET-042", "quantity": 1}]}`),
			ReceiptHandle: aws.String("receipt-ord-002"),
			Attributes: map[string]string{
				"SentTimestamp":                    fmt.Sprintf("%d", now.Add(-2*time.Hour).UnixMilli()),
				"ApproximateReceiveCount":          "1",
				"ApproximateFirstReceiveTimestamp": fmt.Sprintf("%d", now.Add(-110*time.Minute).UnixMilli()),
			},
			MessageAttributes: map[string]types.MessageAttributeValue{
				"Priority": {
					DataType:    aws.String("String"),
					StringValue: aws.String("normal"),
				},
				"Source": {
					DataType:    aws.String("String"),
					StringValue: aws.String("mobile-app"),
				},
			},
		},
		{
			MessageId:     aws.String("ord-003"),
			Body:          aws.String(`{"orderId": "12347", "customerId": "cust-003", "amount": 299.95, "status": "pending", "items": [{"sku": "PREMIUM-789", "quantity": 1}]}`),
			ReceiptHandle: aws.String("receipt-ord-003"),
			Attributes: map[string]string{
				"SentTimestamp":                    fmt.Sprintf("%d", now.Add(-30*time.Minute).UnixMilli()),
				"ApproximateReceiveCount":          "0",
				"ApproximateFirstReceiveTimestamp": fmt.Sprintf("%d", now.Add(-25*time.Minute).UnixMilli()),
			},
			MessageAttributes: map[string]types.MessageAttributeValue{
				"Priority": {
					DataType:    aws.String("String"),
					StringValue: aws.String("high"),
				},
			},
		},
	}

	// Notifications Queue
	demo.messages["https://sqs.us-east-1.amazonaws.com/123456789012/demo-notifications-queue"] = []types.Message{
		{
			MessageId:     aws.String("notif-001"),
			Body:          aws.String(`{"type": "email", "recipient": "user@example.com", "subject": "Order Confirmation", "template": "order-confirmation", "data": {"orderId": "12345"}}`),
			ReceiptHandle: aws.String("receipt-notif-001"),
			Attributes: map[string]string{
				"SentTimestamp":           fmt.Sprintf("%d", now.Add(-30*time.Minute).UnixMilli()),
				"ApproximateReceiveCount": "1",
			},
		},
		{
			MessageId:     aws.String("notif-002"),
			Body:          aws.String(`{"type": "sms", "recipient": "+15551234567", "message": "Your package has shipped!", "trackingNumber": "1Z999AA10123456784"}`),
			ReceiptHandle: aws.String("receipt-notif-002"),
			Attributes: map[string]string{
				"SentTimestamp":           fmt.Sprintf("%d", now.Add(-15*time.Minute).UnixMilli()),
				"ApproximateReceiveCount": "0",
			},
		},
	}

	// Payments Queue - with some complex JSON
	demo.messages["https://sqs.us-east-1.amazonaws.com/123456789012/demo-payments-queue"] = []types.Message{
		{
			MessageId:     aws.String("pay-001"),
			Body:          aws.String(`{"paymentId": "pmt-abc123", "orderId": "12345", "method": "credit_card", "amount": 99.99, "currency": "USD", "status": "authorized", "metadata": {"cardLast4": "4242", "cardBrand": "visa"}}`),
			ReceiptHandle: aws.String("receipt-pay-001"),
			Attributes: map[string]string{
				"SentTimestamp":           fmt.Sprintf("%d", now.Add(-45*time.Minute).UnixMilli()),
				"ApproximateReceiveCount": "2",
			},
			MessageAttributes: map[string]types.MessageAttributeValue{
				"Environment": {
					DataType:    aws.String("String"),
					StringValue: aws.String("production"),
				},
			},
		},
	}

	// Analytics Queue - with event tracking data
	demo.messages["https://sqs.us-east-1.amazonaws.com/123456789012/demo-analytics-queue"] = []types.Message{
		{
			MessageId:     aws.String("ana-001"),
			Body:          aws.String(`{"event": "page_view", "page": "/products/widget-001", "userId": "usr-123", "timestamp": "` + now.Add(-20*time.Minute).Format(time.RFC3339) + `", "metadata": {"referrer": "google.com", "device": "mobile"}}`),
			ReceiptHandle: aws.String("receipt-ana-001"),
			Attributes: map[string]string{
				"SentTimestamp":           fmt.Sprintf("%d", now.Add(-20*time.Minute).UnixMilli()),
				"ApproximateReceiveCount": "0",
			},
		},
		{
			MessageId:     aws.String("ana-002"),
			Body:          aws.String(`{"event": "add_to_cart", "productId": "WIDGET-001", "userId": "usr-456", "quantity": 2, "timestamp": "` + now.Add(-10*time.Minute).Format(time.RFC3339) + `"}`),
			ReceiptHandle: aws.String("receipt-ana-002"),
			Attributes: map[string]string{
				"SentTimestamp":           fmt.Sprintf("%d", now.Add(-10*time.Minute).UnixMilli()),
				"ApproximateReceiveCount": "1",
			},
		},
	}

	// Dead Letter Queue - CRITICAL: Add failed messages to demonstrate DLQ debugging!
	demo.messages["https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue"] = []types.Message{
		{
			MessageId:     aws.String("dlq-001"),
			Body:          aws.String(`{"orderId": "99999", "error": "Invalid payment method", "originalQueue": "demo-orders-queue", "failureReason": "Payment validation failed after 3 retries"}`),
			ReceiptHandle: aws.String("receipt-dlq-001"),
			Attributes: map[string]string{
				"SentTimestamp":                    fmt.Sprintf("%d", now.Add(-6*time.Hour).UnixMilli()),
				"ApproximateReceiveCount":          "5",
				"ApproximateFirstReceiveTimestamp": fmt.Sprintf("%d", now.Add(-5*time.Hour).UnixMilli()),
			},
			MessageAttributes: map[string]types.MessageAttributeValue{
				"OriginalQueue": {
					DataType:    aws.String("String"),
					StringValue: aws.String("demo-orders-queue"),
				},
				"FailureCount": {
					DataType:    aws.String("Number"),
					StringValue: aws.String("3"),
				},
			},
		},
		{
			MessageId:     aws.String("dlq-002"),
			Body:          aws.String(`{"paymentId": "pmt-failed-001", "error": "Gateway timeout", "amount": 1599.99, "retries": 3, "lastError": "Connection timeout to payment processor"}`),
			ReceiptHandle: aws.String("receipt-dlq-002"),
			Attributes: map[string]string{
				"SentTimestamp":                    fmt.Sprintf("%d", now.Add(-12*time.Hour).UnixMilli()),
				"ApproximateReceiveCount":          "8",
				"ApproximateFirstReceiveTimestamp": fmt.Sprintf("%d", now.Add(-11*time.Hour).UnixMilli()),
			},
			MessageAttributes: map[string]types.MessageAttributeValue{
				"OriginalQueue": {
					DataType:    aws.String("String"),
					StringValue: aws.String("demo-payments-queue"),
				},
				"FailureCount": {
					DataType:    aws.String("Number"),
					StringValue: aws.String("3"),
				},
			},
		},
		{
			MessageId:     aws.String("dlq-003"),
			Body:          aws.String(`{"type": "email", "error": "Invalid email address", "recipient": "not-a-valid-email", "subject": "Test", "failedAt": "` + now.Add(-24*time.Hour).Format(time.RFC3339) + `"}`),
			ReceiptHandle: aws.String("receipt-dlq-003"),
			Attributes: map[string]string{
				"SentTimestamp":                    fmt.Sprintf("%d", now.Add(-24*time.Hour).UnixMilli()),
				"ApproximateReceiveCount":          "12",
				"ApproximateFirstReceiveTimestamp": fmt.Sprintf("%d", now.Add(-23*time.Hour).UnixMilli()),
			},
			MessageAttributes: map[string]types.MessageAttributeValue{
				"OriginalQueue": {
					DataType:    aws.String("String"),
					StringValue: aws.String("demo-notifications-queue"),
				},
				"FailureCount": {
					DataType:    aws.String("Number"),
					StringValue: aws.String("3"),
				},
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

	attributes := map[string]string{
		"QueueArn":                    fmt.Sprintf("arn:aws:sqs:us-east-1:123456789012:%s", queueName),
		"ApproximateNumberOfMessages": messageCount,
		"MessageRetentionPeriod":      "1209600",
		"VisibilityTimeout":           "30",
		"CreatedTimestamp":            "1640995000",
		"LastModifiedTimestamp":       "1640995000",
	}

	// Add DLQ-specific attributes for the deadletter queue
	if queueName == "demo-deadletter-queue" {
		// RedriveAllowPolicy indicates this IS a DLQ that can receive messages from source queues
		attributes["RedriveAllowPolicy"] = `{"redrivePermission":"allowAll"}`
	} else if queueName == "demo-orders-queue" || queueName == "demo-payments-queue" || queueName == "demo-notifications-queue" {
		// RedrivePolicy indicates these queues send failed messages TO the DLQ
		attributes["RedrivePolicy"] = `{"deadLetterTargetArn":"arn:aws:sqs:us-east-1:123456789012:demo-deadletter-queue","maxReceiveCount":"3"}`
	}

	return &sqs.GetQueueAttributesOutput{
		Attributes: attributes,
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
