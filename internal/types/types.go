// Package types provides common data structures for SQS queue and message representation.
package types

// Queue represents an AWS SQS queue with its metadata and attributes.
type Queue struct {
	Name       string            `json:"name"`
	URL        string            `json:"url"`
	Attributes map[string]string `json:"attributes"`
}

// Message represents an AWS SQS message with its body, ID, receipt handle, and attributes.
type Message struct {
	MessageId     string            `json:"messageId"`
	Body          string            `json:"body"`
	ReceiptHandle string            `json:"receiptHandle"`
	Attributes    map[string]string `json:"attributes"`
}
