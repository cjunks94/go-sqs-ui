package main

import (
	"embed"
	"log"
	"net/http"
	"os"

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
	
	// API routes
	r.HandleFunc("/api/queues", sqsHandler.ListQueues).Methods("GET")
	r.HandleFunc("/api/queues/{queueUrl}/messages", sqsHandler.GetMessages).Methods("GET")
	r.HandleFunc("/api/queues/{queueUrl}/messages", sqsHandler.SendMessage).Methods("POST")
	r.HandleFunc("/api/queues/{queueUrl}/messages/{receiptHandle}", sqsHandler.DeleteMessage).Methods("DELETE")
	
	// WebSocket route
	r.HandleFunc("/ws", wsManager.HandleWebSocket)
	
	// Static files
	r.PathPrefix("/").Handler(http.FileServer(http.FS(staticFiles)))

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}