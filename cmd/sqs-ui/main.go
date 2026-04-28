package main

import (
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/cjunker/go-sqs-ui/internal/sqs"
	"github.com/cjunker/go-sqs-ui/internal/static"
	"github.com/cjunker/go-sqs-ui/internal/websocket"
	"github.com/gorilla/mux"
)

const (
	defaultPort = "8080"
	portRetries = 10
)

func main() {
	requestedPort, portFromEnv := os.LookupEnv("PORT")
	if requestedPort == "" {
		requestedPort = defaultPort
		portFromEnv = false
	}

	listener, actualPort, err := listenWithFallback(requestedPort, portRetries, portFromEnv)
	if err != nil {
		log.Fatalf("Failed to bind: %v", err)
	}
	if requested, _ := strconv.Atoi(requestedPort); requested != actualPort {
		log.Printf("⚠ Port %d was in use; serving on port %d instead", requested, actualPort)
	}

	sqsHandler, err := sqs.NewSQSHandler()
	if err != nil {
		log.Fatal("Failed to create SQS handler:", err)
	}

	wsManager := websocket.NewWebSocketManager(sqsHandler.Client)

	r := mux.NewRouter()

	// API routes with logging middleware
	api := r.PathPrefix("/api").Subrouter()
	api.Use(loggingMiddleware)
	api.HandleFunc("/aws-context", sqsHandler.GetAWSContext).Methods("GET")
	api.HandleFunc("/queues", sqsHandler.ListQueues).Methods("GET")
	api.HandleFunc("/queues/{queueUrl:.*}/messages", sqsHandler.GetMessages).Methods("GET")
	api.HandleFunc("/queues/{queueUrl:.*}/messages", sqsHandler.SendMessage).Methods("POST")
	api.HandleFunc("/queues/{queueUrl:.*}/messages/{receiptHandle}", sqsHandler.DeleteMessage).Methods("DELETE")
	api.HandleFunc("/queues/{queueUrl:.*}/retry", sqsHandler.RetryMessage).Methods("POST")
	api.HandleFunc("/queues/{queueUrl:.*}/statistics", sqsHandler.GetQueueStatistics).Methods("GET")

	// WebSocket route (no middleware to avoid hijacker issues)
	r.HandleFunc("/ws", func(w http.ResponseWriter, req *http.Request) {
		log.Printf("WebSocket connection attempt from %s", req.RemoteAddr)
		wsManager.HandleWebSocket(w, req)
	})

	// Static files with logging
	staticFS, err := static.GetFS()
	if err != nil {
		log.Fatal("Failed to get static filesystem:", err)
	}

	// Serve static files (this will handle root path too)
	r.PathPrefix("/").Handler(http.StripPrefix("/", http.FileServer(http.FS(staticFS))))

	srv := &http.Server{
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("Server starting on http://localhost:%d", actualPort)
	if err := srv.Serve(listener); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

// loggingMiddleware logs all HTTP requests
func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create a custom response writer to capture status code
		wrapped := &responseWriter{
			ResponseWriter: w,
			statusCode:     http.StatusOK,
		}

		next.ServeHTTP(wrapped, r)

		duration := time.Since(start)
		log.Printf("%s %s %d %v", r.Method, r.URL.Path, wrapped.statusCode, duration)
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
