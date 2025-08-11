package main

import (
	"encoding/json"
	"testing"
)

func TestQueueType(t *testing.T) {
	queue := Queue{
		Name:       "test-queue",
		URL:        "https://sqs.us-east-1.amazonaws.com/123456789/test-queue",
		Attributes: map[string]string{
			"ApproximateNumberOfMessages": "10",
			"CreatedTimestamp":             "1234567890",
		},
	}

	// Test JSON marshaling
	jsonData, err := json.Marshal(queue)
	if err != nil {
		t.Fatalf("Failed to marshal Queue: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaledQueue Queue
	err = json.Unmarshal(jsonData, &unmarshaledQueue)
	if err != nil {
		t.Fatalf("Failed to unmarshal Queue: %v", err)
	}

	// Verify fields
	if unmarshaledQueue.Name != queue.Name {
		t.Errorf("Name mismatch: got %s, want %s", unmarshaledQueue.Name, queue.Name)
	}

	if unmarshaledQueue.URL != queue.URL {
		t.Errorf("URL mismatch: got %s, want %s", unmarshaledQueue.URL, queue.URL)
	}

	// Check attributes
	if len(unmarshaledQueue.Attributes) != len(queue.Attributes) {
		t.Errorf("Attributes count mismatch: got %d, want %d", 
			len(unmarshaledQueue.Attributes), len(queue.Attributes))
	}

	for key, value := range queue.Attributes {
		if unmarshaledQueue.Attributes[key] != value {
			t.Errorf("Attribute %s mismatch: got %s, want %s", 
				key, unmarshaledQueue.Attributes[key], value)
		}
	}

}

func TestMessageType(t *testing.T) {
	message := Message{
		MessageId:     "msg-123",
		ReceiptHandle: "receipt-456",
		Body:          `{"action": "test", "data": "sample"}`,
		Attributes: map[string]string{
			"SentTimestamp":           "1234567890",
			"ApproximateReceiveCount": "1",
		},
	}

	// Test JSON marshaling
	jsonData, err := json.Marshal(message)
	if err != nil {
		t.Fatalf("Failed to marshal Message: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaledMessage Message
	err = json.Unmarshal(jsonData, &unmarshaledMessage)
	if err != nil {
		t.Fatalf("Failed to unmarshal Message: %v", err)
	}

	// Verify fields
	if unmarshaledMessage.MessageId != message.MessageId {
		t.Errorf("MessageId mismatch: got %s, want %s", 
			unmarshaledMessage.MessageId, message.MessageId)
	}

	if unmarshaledMessage.ReceiptHandle != message.ReceiptHandle {
		t.Errorf("ReceiptHandle mismatch: got %s, want %s", 
			unmarshaledMessage.ReceiptHandle, message.ReceiptHandle)
	}

	if unmarshaledMessage.Body != message.Body {
		t.Errorf("Body mismatch: got %s, want %s", 
			unmarshaledMessage.Body, message.Body)
	}

	// Check attributes
	if len(unmarshaledMessage.Attributes) != len(message.Attributes) {
		t.Errorf("Attributes count mismatch: got %d, want %d", 
			len(unmarshaledMessage.Attributes), len(message.Attributes))
	}

	for key, value := range message.Attributes {
		if unmarshaledMessage.Attributes[key] != value {
			t.Errorf("Attribute %s mismatch: got %s, want %s", 
				key, unmarshaledMessage.Attributes[key], value)
		}
	}
}

func TestEmptyStructs(t *testing.T) {
	// Test empty Queue
	emptyQueue := Queue{}
	jsonData, err := json.Marshal(emptyQueue)
	if err != nil {
		t.Fatalf("Failed to marshal empty Queue: %v", err)
	}

	var unmarshaledQueue Queue
	err = json.Unmarshal(jsonData, &unmarshaledQueue)
	if err != nil {
		t.Fatalf("Failed to unmarshal empty Queue: %v", err)
	}

	// Test empty Message
	emptyMessage := Message{}
	jsonData, err = json.Marshal(emptyMessage)
	if err != nil {
		t.Fatalf("Failed to marshal empty Message: %v", err)
	}

	var unmarshaledMessage Message
	err = json.Unmarshal(jsonData, &unmarshaledMessage)
	if err != nil {
		t.Fatalf("Failed to unmarshal empty Message: %v", err)
	}
}

func TestQueueWithNilMaps(t *testing.T) {
	queue := Queue{
		Name:       "test-queue",
		URL:        "https://sqs.us-east-1.amazonaws.com/123456789/test-queue",
		Attributes: nil,
	}

	// Should marshal without error
	jsonData, err := json.Marshal(queue)
	if err != nil {
		t.Fatalf("Failed to marshal Queue with nil maps: %v", err)
	}

	// Should unmarshal without error
	var unmarshaledQueue Queue
	err = json.Unmarshal(jsonData, &unmarshaledQueue)
	if err != nil {
		t.Fatalf("Failed to unmarshal Queue with nil maps: %v", err)
	}

	// Nil maps should remain nil after unmarshaling
	if unmarshaledQueue.Attributes != nil {
		t.Error("Expected Attributes to be nil after unmarshaling")
	}
}

func TestMessageWithSpecialCharacters(t *testing.T) {
	specialBody := `{"text": "Hello \"World\"", "emoji": "🚀", "unicode": "你好"}`
	message := Message{
		MessageId:     "special-msg",
		ReceiptHandle: "special-receipt",
		Body:          specialBody,
		Attributes: map[string]string{
			"Special-Char": "Test&Value=123",
		},
	}

	// Test JSON marshaling with special characters
	jsonData, err := json.Marshal(message)
	if err != nil {
		t.Fatalf("Failed to marshal Message with special characters: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaledMessage Message
	err = json.Unmarshal(jsonData, &unmarshaledMessage)
	if err != nil {
		t.Fatalf("Failed to unmarshal Message with special characters: %v", err)
	}

	// Verify body is preserved correctly
	if unmarshaledMessage.Body != specialBody {
		t.Errorf("Body with special characters mismatch:\ngot:  %s\nwant: %s", 
			unmarshaledMessage.Body, specialBody)
	}

	// Verify attributes with special characters
	if unmarshaledMessage.Attributes["Special-Char"] != message.Attributes["Special-Char"] {
		t.Errorf("Attribute with special characters mismatch: got %s, want %s", 
			unmarshaledMessage.Attributes["Special-Char"], message.Attributes["Special-Char"])
	}
}

func TestLargeMessage(t *testing.T) {
	// Create a large message body (near SQS limit of 256KB)
	largeBody := make([]byte, 250*1024) // 250KB
	for i := range largeBody {
		largeBody[i] = byte('A' + (i % 26))
	}

	message := Message{
		MessageId:     "large-msg",
		ReceiptHandle: "large-receipt",
		Body:          string(largeBody),
		Attributes: map[string]string{
			"Size": "250KB",
		},
	}

	// Should handle large messages
	jsonData, err := json.Marshal(message)
	if err != nil {
		t.Fatalf("Failed to marshal large Message: %v", err)
	}

	var unmarshaledMessage Message
	err = json.Unmarshal(jsonData, &unmarshaledMessage)
	if err != nil {
		t.Fatalf("Failed to unmarshal large Message: %v", err)
	}

	// Verify size is preserved
	if len(unmarshaledMessage.Body) != len(message.Body) {
		t.Errorf("Large message body size mismatch: got %d, want %d", 
			len(unmarshaledMessage.Body), len(message.Body))
	}
}