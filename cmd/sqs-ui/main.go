package main

import (
	"io/fs"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/cjunks94/go-sqs-ui/internal/sqs"
	"github.com/cjunks94/go-sqs-ui/internal/static"
	"github.com/cjunks94/go-sqs-ui/internal/websocket"
	"github.com/gorilla/mux"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	sqsHandler, err := sqs.NewSQSHandler()
	if err != nil {
		log.Fatal("Failed to create SQS handler:", err)
	}

	wsManager := websocket.NewWebSocketManager(sqsHandler.Client)

	staticFS, err := static.GetFS()
	if err != nil {
		log.Fatal("Failed to get static filesystem:", err)
	}

	r := newRouter(sqsHandler, wsManager, staticFS)

	// ReadHeaderTimeout guards against slow-loris; no WriteTimeout so the
	// long-lived WebSocket stream isn't cut off.
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("Server starting on port %s", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

// newRouter wires up all HTTP routes.
//
// SkipClean(true) is essential: queue URLs are embedded in the request path
// (URL-encoded), so the decoded "//" must NOT be collapsed into a 301 redirect
// — that redirect drops the body of POST send/retry requests. Handlers restore
// the scheme separator via normalizeQueueURL.
func newRouter(sqsHandler *sqs.SQSHandler, wsManager *websocket.WebSocketManager, staticFS fs.FS) *mux.Router {
	r := mux.NewRouter().SkipClean(true)

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

	// Serve static files (this handles the root path too)
	r.PathPrefix("/").Handler(http.StripPrefix("/", http.FileServer(http.FS(staticFS))))

	return r
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
