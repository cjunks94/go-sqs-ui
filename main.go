package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
)

//go:embed static/*
var staticFiles embed.FS

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	sqsHandler, err := NewSQSHandler()
	if err != nil {
		log.Fatal("Failed to create SQS handler:", err)
	}

	wsManager := NewWebSocketManager(sqsHandler.client)

	r := mux.NewRouter()

	// API routes with logging middleware
	api := r.PathPrefix("/api").Subrouter()
	api.Use(loggingMiddleware)
	api.HandleFunc("/aws-context", sqsHandler.GetAWSContext).Methods("GET")
	api.HandleFunc("/queues", sqsHandler.ListQueues).Methods("GET")
	api.HandleFunc("/queues/{queueUrl}/messages", sqsHandler.GetMessages).Methods("GET")
	api.HandleFunc("/queues/{queueUrl}/messages", sqsHandler.SendMessage).Methods("POST")
	api.HandleFunc("/queues/{queueUrl}/messages/{receiptHandle}", sqsHandler.DeleteMessage).Methods("DELETE")
	api.HandleFunc("/queues/{queueUrl}/retry", sqsHandler.RetryMessage).Methods("POST")

	// WebSocket route (no middleware to avoid hijacker issues)
	r.HandleFunc("/ws", func(w http.ResponseWriter, req *http.Request) {
		log.Printf("WebSocket connection attempt from %s", req.RemoteAddr)
		wsManager.HandleWebSocket(w, req)
	})

	// Static files with logging
	staticSubFS, err := fs.Sub(staticFiles, "static")
	if err != nil {
		log.Fatal("Failed to create static subdirectory:", err)
	}

	// Serve static files (this will handle root path too)
	r.PathPrefix("/").Handler(http.StripPrefix("/", http.FileServer(http.FS(staticSubFS))))

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
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
