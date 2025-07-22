package main

import (
	"context"
	"embed"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

//go:embed static/*
var staticFiles embed.FS

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type SQSHandler struct {
	client *sqs.Client
}

type Queue struct {
	Name string `json:"name"`
	URL  string `json:"url"`
	Attributes map[string]string `json:"attributes"`
}

type Message struct {
	MessageId     string `json:"messageId"`
	Body          string `json:"body"`
	ReceiptHandle string `json:"receiptHandle"`
	Attributes    map[string]string `json:"attributes"`
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

func (h *SQSHandler) listQueues(w http.ResponseWriter, r *http.Request) {
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
			AttributeNames: []string{"All"},
		})
		
		queueName := queueURL
		if attrs != nil && attrs.Attributes != nil {
			if name, ok := attrs.Attributes["QueueArn"]; ok {
				parts := []string{}
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

func (h *SQSHandler) getMessages(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	queueURL := vars["queueUrl"]
	
	ctx := context.Background()
	
	result, err := h.client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:            aws.String(queueURL),
		MaxNumberOfMessages: 10,
		WaitTimeSeconds:     1,
		AttributeNames:      []string{"All"},
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

func (h *SQSHandler) sendMessage(w http.ResponseWriter, r *http.Request) {
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

func (h *SQSHandler) deleteMessage(w http.ResponseWriter, r *http.Request) {
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

func (h *SQSHandler) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	for {
		var msg struct {
			Type     string `json:"type"`
			QueueURL string `json:"queueUrl"`
		}
		
		if err := conn.ReadJSON(&msg); err != nil {
			log.Println("WebSocket read error:", err)
			break
		}

		if msg.Type == "subscribe" && msg.QueueURL != "" {
			go h.pollQueue(conn, msg.QueueURL)
		}
	}
}

func (h *SQSHandler) pollQueue(conn *websocket.Conn, queueURL string) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		ctx := context.Background()
		
		result, err := h.client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
			QueueUrl:            aws.String(queueURL),
			MaxNumberOfMessages: 10,
			WaitTimeSeconds:     1,
			AttributeNames:      []string{"All"},
		})
		
		if err != nil {
			log.Printf("Error polling queue %s: %v", queueURL, err)
			continue
		}

		if len(result.Messages) > 0 {
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

			if err := conn.WriteJSON(map[string]interface{}{
				"type":     "messages",
				"queueUrl": queueURL,
				"messages": messages,
			}); err != nil {
				log.Println("WebSocket write error:", err)
				break
			}
		}
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	sqsHandler, err := NewSQSHandler()
	if err != nil {
		log.Fatal("Failed to create SQS handler:", err)
	}

	r := mux.NewRouter()
	
	r.HandleFunc("/api/queues", sqsHandler.listQueues).Methods("GET")
	r.HandleFunc("/api/queues/{queueUrl}/messages", sqsHandler.getMessages).Methods("GET")
	r.HandleFunc("/api/queues/{queueUrl}/messages", sqsHandler.sendMessage).Methods("POST")
	r.HandleFunc("/api/queues/{queueUrl}/messages/{receiptHandle}", sqsHandler.deleteMessage).Methods("DELETE")
	r.HandleFunc("/ws", sqsHandler.handleWebSocket)
	
	r.PathPrefix("/").Handler(http.FileServer(http.FS(staticFiles)))

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}