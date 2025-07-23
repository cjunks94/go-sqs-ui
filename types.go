package main

type Queue struct {
	Name       string            `json:"name"`
	URL        string            `json:"url"`
	Attributes map[string]string `json:"attributes"`
}

type Message struct {
	MessageId     string            `json:"messageId"`
	Body          string            `json:"body"`
	ReceiptHandle string            `json:"receiptHandle"`
	Attributes    map[string]string `json:"attributes"`
}
