package demo

import (
	"context"
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
)

func TestNewDemoSQSClient(t *testing.T) {
	client := NewDemoSQSClient()
	if client == nil {
		t.Fatal("NewDemoSQSClient returned nil")
	}

	if len(client.queues) != 3 {
		t.Errorf("Expected 3 demo queues, got %d", len(client.queues))
	}

	expectedQueues := []string{
		"demo-orders-queue",
		"demo-notifications-queue",
		"demo-deadletter-queue",
	}

	for _, expectedName := range expectedQueues {
		found := false
		for _, queueURL := range client.queues {
			if strings.Contains(queueURL, expectedName) {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected queue %s not found", expectedName)
		}
	}
}

func TestDemoSQSClient_ListQueues(t *testing.T) {
	client := NewDemoSQSClient()
	ctx := context.Background()

	output, err := client.ListQueues(ctx, &sqs.ListQueuesInput{})
	if err != nil {
		t.Fatalf("ListQueues failed: %v", err)
	}

	if len(output.QueueUrls) != 3 {
		t.Errorf("Expected 3 queue URLs, got %d", len(output.QueueUrls))
	}

	for _, url := range output.QueueUrls {
		if !strings.Contains(url, "https://sqs.us-east-1.amazonaws.com/123456789012/") {
			t.Errorf("Invalid queue URL format: %s", url)
		}
	}
}

func TestDemoSQSClient_GetQueueAttributes(t *testing.T) {
	client := NewDemoSQSClient()
	ctx := context.Background()

	// Test each queue
	for _, queue := range client.queues {
		queueURL := "https://sqs.us-east-1.amazonaws.com/123456789012/" + queue
		output, err := client.GetQueueAttributes(ctx, &sqs.GetQueueAttributesInput{
			QueueUrl: aws.String(queueURL),
		})

		if err != nil {
			t.Errorf("GetQueueAttributes failed for %s: %v", queue, err)
			continue
		}

		// Check required attributes
		requiredAttrs := []string{
			"ApproximateNumberOfMessages",
			"CreatedTimestamp",
			"QueueArn",
			"VisibilityTimeout",
		}

		for _, attr := range requiredAttrs {
			if _, exists := output.Attributes[attr]; !exists {
				t.Errorf("Queue %s missing attribute %s", queue, attr)
			}
		}

		// Check DLQ-specific attributes
		if strings.Contains(queue, "dlq") {
			if _, exists := output.Attributes["RedriveAllowPolicy"]; !exists {
				t.Errorf("DLQ %s missing RedriveAllowPolicy", queue)
			}
		}
	}
}

func TestDemoSQSClient_ListQueueTags(t *testing.T) {
	client := NewDemoSQSClient()
	ctx := context.Background()

	queueURL := "https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue"
	output, err := client.ListQueueTags(ctx, &sqs.ListQueueTagsInput{
		QueueUrl: aws.String(queueURL),
	})

	if err != nil {
		t.Fatalf("ListQueueTags failed: %v", err)
	}

	// Check required tags
	requiredTags := map[string]string{
		"businessunit": "degrees",
		"product":      "amt",
		"env":          "stg",
	}

	for key, expectedValue := range requiredTags {
		if value, exists := output.Tags[key]; !exists {
			t.Errorf("Missing tag %s", key)
		} else if value != expectedValue {
			t.Errorf("Tag %s: expected %s, got %s", key, expectedValue, value)
		}
	}
}

func TestDemoSQSClient_ReceiveMessage(t *testing.T) {
	client := NewDemoSQSClient()
	ctx := context.Background()

	queueURL := "https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue"
	output, err := client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:            aws.String(queueURL),
		MaxNumberOfMessages: 10,
	})

	if err != nil {
		t.Fatalf("ReceiveMessage failed: %v", err)
	}

	if len(output.Messages) < 1 {
		t.Error("Expected at least one message in demo-orders-queue")
	}

	for i, msg := range output.Messages {
		// Check message ID
		if msg.MessageId == nil || *msg.MessageId == "" {
			t.Errorf("Message %d has empty MessageId", i)
		}

		// Check receipt handle
		if msg.ReceiptHandle == nil || *msg.ReceiptHandle == "" {
			t.Errorf("Message %d has empty ReceiptHandle", i)
		}

		// Check body
		if msg.Body == nil || *msg.Body == "" {
			t.Errorf("Message %d has empty Body", i)
		}

		// Check attributes
		if msg.Attributes == nil {
			t.Errorf("Message %d has nil Attributes", i)
		} else {
			if _, exists := msg.Attributes["SentTimestamp"]; !exists {
				t.Errorf("Message %d missing SentTimestamp", i)
			}
		}
	}
}

func TestDemoSQSClient_ReceiveMessage_DLQ(t *testing.T) {
	client := NewDemoSQSClient()
	ctx := context.Background()

	queueURL := "https://sqs.us-east-1.amazonaws.com/123456789012/demo-deadletter-queue"
	output, err := client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:            aws.String(queueURL),
		MaxNumberOfMessages: 10,
	})

	if err != nil {
		t.Fatalf("ReceiveMessage failed for DLQ: %v", err)
	}

	// DLQ might be empty in demo mode, which is okay
	for i, msg := range output.Messages {
		// DLQ messages should have ApproximateReceiveCount >= 1 if any exist
		if receiveCount, exists := msg.Attributes["ApproximateReceiveCount"]; exists {
			if receiveCount == "0" {
				t.Errorf("DLQ message %d has invalid ApproximateReceiveCount: %s", i, receiveCount)
			}
		}
	}
}

func TestDemoSQSClient_SendMessage(t *testing.T) {
	client := NewDemoSQSClient()
	ctx := context.Background()

	queueURL := "https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue"
	messageBody := `{"test": "message", "timestamp": "2024-01-01T00:00:00Z"}`

	output, err := client.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    aws.String(queueURL),
		MessageBody: aws.String(messageBody),
	})

	if err != nil {
		t.Fatalf("SendMessage failed: %v", err)
	}

	if output.MessageId == nil || *output.MessageId == "" {
		t.Error("SendMessage returned empty MessageId")
	}

	// MD5OfMessageBody is optional in demo mode
	// Some SQS implementations return it, some don't

	// Verify the message was added to the queue
	found := false
	for _, msg := range client.messages[queueURL] {
		if msg.Body != nil && *msg.Body == messageBody {
			found = true
			break
		}
	}

	if !found {
		t.Error("Sent message not found in queue")
	}
}

func TestDemoSQSClient_DeleteMessage(t *testing.T) {
	client := NewDemoSQSClient()
	ctx := context.Background()

	queueURL := "https://sqs.us-east-1.amazonaws.com/123456789012/demo-orders-queue"

	// First, get a message to delete
	receiveOutput, err := client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:            aws.String(queueURL),
		MaxNumberOfMessages: 1,
	})

	if err != nil {
		t.Fatalf("ReceiveMessage failed: %v", err)
	}

	if len(receiveOutput.Messages) == 0 {
		t.Skip("No messages available in demo queue for deletion test")
	}

	msg := receiveOutput.Messages[0]
	initialCount := len(client.messages[queueURL])

	// Delete the message
	_, err = client.DeleteMessage(ctx, &sqs.DeleteMessageInput{
		QueueUrl:      aws.String(queueURL),
		ReceiptHandle: msg.ReceiptHandle,
	})

	if err != nil {
		t.Fatalf("DeleteMessage failed: %v", err)
	}

	// Verify the message was removed
	finalCount := len(client.messages[queueURL])
	if finalCount >= initialCount {
		t.Error("Message count did not decrease after deletion")
	}

	// Verify the specific message is gone
	for _, remainingMsg := range client.messages[queueURL] {
		if remainingMsg.MessageId != nil && msg.MessageId != nil &&
			*remainingMsg.MessageId == *msg.MessageId {
			t.Error("Deleted message still exists in queue")
		}
	}
}

func TestDemoSQSClient_InvalidQueue(t *testing.T) {
	client := NewDemoSQSClient()
	ctx := context.Background()

	invalidURL := "https://sqs.us-east-1.amazonaws.com/123456789012/non-existent-queue"

	// Test GetQueueAttributes with invalid queue
	_, err := client.GetQueueAttributes(ctx, &sqs.GetQueueAttributesInput{
		QueueUrl: aws.String(invalidURL),
	})

	if err != nil {
		t.Fatalf("GetQueueAttributes should handle invalid queue gracefully, got error: %v", err)
	}

	// Test ReceiveMessage with invalid queue
	output, err := client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl: aws.String(invalidURL),
	})

	if err != nil {
		t.Fatalf("ReceiveMessage should handle invalid queue gracefully, got error: %v", err)
	}

	if len(output.Messages) != 0 {
		t.Error("Invalid queue should return no messages")
	}
}