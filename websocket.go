package main

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

type WebSocketManager struct {
	sqsClient     SQSClientInterface
	connections   map[*websocket.Conn]map[string]context.CancelFunc
	connectionsMu sync.RWMutex
}

func NewWebSocketManager(sqsClient SQSClientInterface) *WebSocketManager {
	return &WebSocketManager{
		sqsClient:   sqsClient,
		connections: make(map[*websocket.Conn]map[string]context.CancelFunc),
	}
}

func (wsm *WebSocketManager) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("WebSocket upgrade error:", err)
		return
	}
	defer wsm.cleanupConnection(conn)

	wsm.connectionsMu.Lock()
	wsm.connections[conn] = make(map[string]context.CancelFunc)
	wsm.connectionsMu.Unlock()

	if err := conn.SetReadDeadline(time.Now().Add(60 * time.Second)); err != nil {
		log.Printf("Error setting read deadline: %v", err)
		return
	}
	conn.SetPongHandler(func(string) error {
		if err := conn.SetReadDeadline(time.Now().Add(60 * time.Second)); err != nil {
			log.Printf("Error setting read deadline in pong handler: %v", err)
		}
		return nil
	})

	go wsm.pingConnection(conn)

	for {
		var msg struct {
			Type     string `json:"type"`
			QueueURL string `json:"queueUrl"`
		}

		if err := conn.ReadJSON(&msg); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket unexpected close: %v", err)
			}
			break
		}

		if err := conn.SetReadDeadline(time.Now().Add(60 * time.Second)); err != nil {
			log.Printf("Error setting read deadline: %v", err)
			break
		}

		if msg.Type == "subscribe" && msg.QueueURL != "" {
			wsm.subscribeToQueue(conn, msg.QueueURL)
		}
	}
}

func (wsm *WebSocketManager) cleanupConnection(conn *websocket.Conn) {
	wsm.connectionsMu.Lock()
	defer wsm.connectionsMu.Unlock()

	if queues, exists := wsm.connections[conn]; exists {
		for _, cancel := range queues {
			cancel()
		}
		delete(wsm.connections, conn)
	}
	if err := conn.Close(); err != nil {
		log.Printf("Error closing connection: %v", err)
	}
}

func (wsm *WebSocketManager) pingConnection(conn *websocket.Conn) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
			return
		}
	}
}

func (wsm *WebSocketManager) subscribeToQueue(conn *websocket.Conn, queueURL string) {
	wsm.connectionsMu.Lock()
	defer wsm.connectionsMu.Unlock()

	if queues, exists := wsm.connections[conn]; exists {
		if cancel, subscribed := queues[queueURL]; subscribed {
			cancel()
		}

		ctx, cancel := context.WithCancel(context.Background())
		queues[queueURL] = cancel

		go wsm.pollQueue(ctx, conn, queueURL)
	}
}

func (wsm *WebSocketManager) pollQueue(ctx context.Context, conn *websocket.Conn, queueURL string) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			result, err := wsm.sqsClient.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
				QueueUrl:            aws.String(queueURL),
				MaxNumberOfMessages: 10,
				WaitTimeSeconds:     1,
				AttributeNames:      []types.QueueAttributeName{types.QueueAttributeNameAll},
			})

			if err != nil {
				if ctx.Err() != nil {
					return
				}
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
					return
				}
			}
		}
	}
}
