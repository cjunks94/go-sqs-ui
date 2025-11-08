// Package websocket provides WebSocket-based real-time updates for SQS queue messages.
package websocket

import (
	"context"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
	internal_sqs "github.com/cjunker/go-sqs-ui/internal/sqs"
	internal_types "github.com/cjunker/go-sqs-ui/internal/types"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// WebSocketManager manages WebSocket connections and real-time SQS message streaming.
type WebSocketManager struct {
	sqsClient     internal_sqs.SQSClientInterface
	connections   map[*websocket.Conn]map[string]context.CancelFunc
	connectionsMu sync.RWMutex
	// Track sent messages per connection per queue
	sentMessages   map[*websocket.Conn]map[string]map[string]bool
	sentMessagesMu sync.RWMutex
}

// NewWebSocketManager creates a new WebSocket manager with the given SQS client.
func NewWebSocketManager(sqsClient internal_sqs.SQSClientInterface) *WebSocketManager {
	return &WebSocketManager{
		sqsClient:    sqsClient,
		connections:  make(map[*websocket.Conn]map[string]context.CancelFunc),
		sentMessages: make(map[*websocket.Conn]map[string]map[string]bool),
	}
}

// HandleWebSocket upgrades HTTP connections to WebSocket and handles message subscriptions.
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

	wsm.sentMessagesMu.Lock()
	wsm.sentMessages[conn] = make(map[string]map[string]bool)
	wsm.sentMessagesMu.Unlock()

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

// cleanupConnection cancels all queue subscriptions and closes the WebSocket connection.
func (wsm *WebSocketManager) cleanupConnection(conn *websocket.Conn) {
	wsm.connectionsMu.Lock()
	if queues, exists := wsm.connections[conn]; exists {
		for _, cancel := range queues {
			cancel()
		}
		delete(wsm.connections, conn)
	}
	wsm.connectionsMu.Unlock()

	wsm.sentMessagesMu.Lock()
	delete(wsm.sentMessages, conn)
	wsm.sentMessagesMu.Unlock()

	if err := conn.Close(); err != nil {
		log.Printf("Error closing connection: %v", err)
	}
}

// pingConnection sends periodic ping messages to keep the WebSocket connection alive.
func (wsm *WebSocketManager) pingConnection(conn *websocket.Conn) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
			return
		}
	}
}

// subscribeToQueue starts polling the specified queue and streaming messages to the WebSocket connection.
func (wsm *WebSocketManager) subscribeToQueue(conn *websocket.Conn, queueURL string) {
	wsm.connectionsMu.Lock()
	defer wsm.connectionsMu.Unlock()

	if queues, exists := wsm.connections[conn]; exists {
		if cancel, subscribed := queues[queueURL]; subscribed {
			cancel()
		}

		// Clear sent messages for this queue when resubscribing
		wsm.sentMessagesMu.Lock()
		if wsm.sentMessages[conn] == nil {
			wsm.sentMessages[conn] = make(map[string]map[string]bool)
		}
		wsm.sentMessages[conn][queueURL] = make(map[string]bool)
		wsm.sentMessagesMu.Unlock()

		ctx, cancel := context.WithCancel(context.Background())
		queues[queueURL] = cancel

		go wsm.pollQueue(ctx, conn, queueURL)
	}
}

// pollQueue continuously polls an SQS queue and sends new messages to the WebSocket connection.
func (wsm *WebSocketManager) pollQueue(ctx context.Context, conn *websocket.Conn, queueURL string) {
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	// Send initial load of messages
	isInitialLoad := true

	// Poll immediately for initial load
	pollFunc := func() bool {
		result, err := wsm.sqsClient.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
			QueueUrl:            aws.String(queueURL),
			MaxNumberOfMessages: 10,
			WaitTimeSeconds:     1,
			AttributeNames:      []types.QueueAttributeName{types.QueueAttributeNameAll},
		})

		if err != nil {
			if ctx.Err() != nil {
				return true // Exit
			}
			log.Printf("Error polling queue %s: %v", queueURL, err)
			return false // Continue
		}

		if len(result.Messages) > 0 {
			wsm.sentMessagesMu.RLock()
			sentMap := wsm.sentMessages[conn][queueURL]
			wsm.sentMessagesMu.RUnlock()

			messages := []internal_types.Message{}
			newMessageIds := []string{}

			for _, msg := range result.Messages {
				messageId := aws.ToString(msg.MessageId)

				// Only include messages we haven't sent before (unless it's the initial load)
				if isInitialLoad || !sentMap[messageId] {
					message := internal_types.Message{
						MessageId:     messageId,
						Body:          aws.ToString(msg.Body),
						ReceiptHandle: aws.ToString(msg.ReceiptHandle),
						Attributes:    make(map[string]string),
					}

					for k, v := range msg.Attributes {
						message.Attributes[k] = v
					}

					messages = append(messages, message)
					newMessageIds = append(newMessageIds, messageId)
				}
			}

			// Only send if we have new messages or it's the initial load
			if len(messages) > 0 {
				messageType := "messages"
				if isInitialLoad {
					messageType = "initial_messages"
				}

				if err := conn.WriteJSON(map[string]interface{}{
					"type":     messageType,
					"queueUrl": queueURL,
					"messages": messages,
				}); err != nil {
					return true // Exit
				}

				// Update sent messages tracking
				wsm.sentMessagesMu.Lock()
				if wsm.sentMessages[conn] != nil && wsm.sentMessages[conn][queueURL] != nil {
					for _, id := range newMessageIds {
						wsm.sentMessages[conn][queueURL][id] = true
					}
				}
				wsm.sentMessagesMu.Unlock()
			}

			isInitialLoad = false
		} else if isInitialLoad {
			// Send empty initial load if no messages
			if err := conn.WriteJSON(map[string]interface{}{
				"type":     "initial_messages",
				"queueUrl": queueURL,
				"messages": []internal_types.Message{},
			}); err != nil {
				return true // Exit
			}
			isInitialLoad = false
		}

		return false // Continue
	}

	// Poll immediately
	if pollFunc() {
		return
	}

	// Then continue polling on timer
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if pollFunc() {
				return
			}
		}
	}
}
