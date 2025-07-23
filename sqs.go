package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
	"github.com/gorilla/mux"
)

type SQSClientInterface interface {
	ListQueues(ctx context.Context, params *sqs.ListQueuesInput, optFns ...func(*sqs.Options)) (*sqs.ListQueuesOutput, error)
	GetQueueAttributes(ctx context.Context, params *sqs.GetQueueAttributesInput, optFns ...func(*sqs.Options)) (*sqs.GetQueueAttributesOutput, error)
	ReceiveMessage(ctx context.Context, params *sqs.ReceiveMessageInput, optFns ...func(*sqs.Options)) (*sqs.ReceiveMessageOutput, error)
	SendMessage(ctx context.Context, params *sqs.SendMessageInput, optFns ...func(*sqs.Options)) (*sqs.SendMessageOutput, error)
	DeleteMessage(ctx context.Context, params *sqs.DeleteMessageInput, optFns ...func(*sqs.Options)) (*sqs.DeleteMessageOutput, error)
}

type SQSHandler struct {
	client SQSClientInterface
}

func NewSQSHandler() (*SQSHandler, error) {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		return nil, fmt.Errorf("unable to load SDK config: %v", err)
	}

	return &SQSHandler{
		client: sqs.NewFromConfig(cfg),
	}, nil
}

func (h *SQSHandler) ListQueues(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	
	result, err := h.client.ListQueues(ctx, &sqs.ListQueuesInput{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	queues := []Queue{}
	for _, queueURL := range result.QueueUrls {
		attrs, err := h.client.GetQueueAttributes(ctx, &sqs.GetQueueAttributesInput{
			QueueUrl: aws.String(queueURL),
			AttributeNames: []types.QueueAttributeName{types.QueueAttributeNameAll},
		})
		
		queueName := queueURL
		if attrs != nil && attrs.Attributes != nil {
			if name, ok := attrs.Attributes["QueueArn"]; ok {
					for i := len(name) - 1; i >= 0; i-- {
					if name[i] == ':' {
						queueName = name[i+1:]
						break
					}
				}
			}
		}
		
		queue := Queue{
			Name: queueName,
			URL:  queueURL,
		}
		
		if err == nil && attrs.Attributes != nil {
			queue.Attributes = attrs.Attributes
		}
		
		queues = append(queues, queue)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(queues)
}

func (h *SQSHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	queueURL := vars["queueUrl"]
	
	ctx := context.Background()
	
	result, err := h.client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:            aws.String(queueURL),
		MaxNumberOfMessages: 10,
		WaitTimeSeconds:     1,
		AttributeNames:      []types.QueueAttributeName{types.QueueAttributeNameAll},
		MessageAttributeNames: []string{"All"},
	})
	
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	messages := []Message{}
	for _, msg := range result.Messages {
		message := Message{
			MessageId:     aws.ToString(msg.MessageId),
			Body:          aws.ToString(msg.Body),
			ReceiptHandle: aws.ToString(msg.ReceiptHandle),
			Attributes:    make(map[string]string),
		}
		
		for k, v := range msg.Attributes {
			message.Attributes[k] = v
		}
		
		messages = append(messages, message)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func (h *SQSHandler) SendMessage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	queueURL := vars["queueUrl"]
	
	var payload struct {
		Body string `json:"body"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	ctx := context.Background()
	
	result, err := h.client.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    aws.String(queueURL),
		MessageBody: aws.String(payload.Body),
	})
	
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"messageId": aws.ToString(result.MessageId),
	})
}

func (h *SQSHandler) DeleteMessage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	queueURL := vars["queueUrl"]
	receiptHandle := vars["receiptHandle"]
	
	ctx := context.Background()
	
	_, err := h.client.DeleteMessage(ctx, &sqs.DeleteMessageInput{
		QueueUrl:      aws.String(queueURL),
		ReceiptHandle: aws.String(receiptHandle),
	})
	
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}