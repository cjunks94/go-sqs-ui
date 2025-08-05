package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sqs"
	"github.com/aws/aws-sdk-go-v2/service/sqs/types"
	"github.com/gorilla/mux"
)

type SQSClientInterface interface {
	ListQueues(ctx context.Context, params *sqs.ListQueuesInput, optFns ...func(*sqs.Options)) (*sqs.ListQueuesOutput, error)
	GetQueueAttributes(ctx context.Context, params *sqs.GetQueueAttributesInput, optFns ...func(*sqs.Options)) (*sqs.GetQueueAttributesOutput, error)
	ListQueueTags(ctx context.Context, params *sqs.ListQueueTagsInput, optFns ...func(*sqs.Options)) (*sqs.ListQueueTagsOutput, error)
	ReceiveMessage(ctx context.Context, params *sqs.ReceiveMessageInput, optFns ...func(*sqs.Options)) (*sqs.ReceiveMessageOutput, error)
	SendMessage(ctx context.Context, params *sqs.SendMessageInput, optFns ...func(*sqs.Options)) (*sqs.SendMessageOutput, error)
	DeleteMessage(ctx context.Context, params *sqs.DeleteMessageInput, optFns ...func(*sqs.Options)) (*sqs.DeleteMessageOutput, error)
}

type SQSHandler struct {
	client SQSClientInterface
	config aws.Config
	isDemo bool
}

func NewSQSHandler() (*SQSHandler, error) {
	// Check for forced mode environment variables
	forceDemoMode := os.Getenv("FORCE_DEMO_MODE") == "true"
	forceLiveMode := os.Getenv("FORCE_LIVE_MODE") == "true"
	
	if forceDemoMode && forceLiveMode {
		log.Fatal("Cannot set both FORCE_DEMO_MODE and FORCE_LIVE_MODE")
	}
	
	// If demo mode is forced, use it regardless of AWS config
	if forceDemoMode {
		log.Printf("Using demo mode (FORCE_DEMO_MODE=true)")
		return &SQSHandler{
			client: NewDemoSQSClient(),
			config: aws.Config{},
			isDemo: true,
		}, nil
	}
	
	// Try to load AWS config
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		if forceLiveMode {
			log.Fatalf("FORCE_LIVE_MODE is set but AWS config not available: %v", err)
		}
		log.Printf("Warning: AWS config not available (%v), using demo mode", err)
		return &SQSHandler{
			client: NewDemoSQSClient(),
			config: aws.Config{},
			isDemo: true,
		}, nil
	}

	// Test if we can actually connect to AWS
	sqsClient := sqs.NewFromConfig(cfg)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	_, err = sqsClient.ListQueues(ctx, &sqs.ListQueuesInput{MaxResults: aws.Int32(1)})
	if err != nil {
		if forceLiveMode {
			log.Fatalf("FORCE_LIVE_MODE is set but cannot connect to AWS SQS: %v", err)
		}
		log.Printf("Warning: Cannot connect to AWS SQS (%v), using demo mode", err)
		return &SQSHandler{
			client: NewDemoSQSClient(),
			config: cfg,
			isDemo: true,
		}, nil
	}

	log.Printf("Successfully connected to AWS SQS")
	return &SQSHandler{
		client: sqsClient,
		config: cfg,
		isDemo: false,
	}, nil
}

func (h *SQSHandler) ListQueues(w http.ResponseWriter, r *http.Request) {
	log.Printf("ListQueues: Starting to fetch queues")
	ctx := context.Background()

	// Get limit from query parameter, default to 20
	limit := int32(20)
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 {
			limit = int32(parsedLimit)
		}
	}

	result, err := h.client.ListQueues(ctx, &sqs.ListQueuesInput{
		MaxResults: aws.Int32(limit),
	})
	if err != nil {
		log.Printf("ListQueues: Error fetching queues: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("ListQueues: Found %d queues", len(result.QueueUrls))
	queues := []Queue{}
	
	// Check if tag filtering is disabled
	disableTagFilter := os.Getenv("DISABLE_TAG_FILTER") == "true"
	
	// Define required tags for filtering (configurable via environment)
	requiredTags := map[string][]string{}
	
	if !disableTagFilter {
		// Use custom tags if provided, otherwise use defaults
		if businessUnit := os.Getenv("FILTER_BUSINESS_UNIT"); businessUnit != "" {
			requiredTags["businessunit"] = strings.Split(businessUnit, ",")
		} else {
			requiredTags["businessunit"] = []string{"degrees"}
		}
		
		if product := os.Getenv("FILTER_PRODUCT"); product != "" {
			requiredTags["product"] = strings.Split(product, ",")
		} else {
			requiredTags["product"] = []string{"amt"}
		}
		
		if env := os.Getenv("FILTER_ENV"); env != "" {
			requiredTags["env"] = strings.Split(env, ",")
		} else {
			requiredTags["env"] = []string{"stg", "prod"}
		}
		
		log.Printf("ListQueues: Tag filtering enabled with: %+v", requiredTags)
	} else {
		log.Printf("ListQueues: Tag filtering disabled (DISABLE_TAG_FILTER=true)")
	}
	
	filteredCount := 0

	for _, queueURL := range result.QueueUrls {
		// Skip tag checking if filtering is disabled
		if disableTagFilter {
			queue := Queue{
				Name: queueURL,
				URL:  queueURL,
			}
			
			// Get queue attributes
			attrs, err := h.client.GetQueueAttributes(ctx, &sqs.GetQueueAttributesInput{
				QueueUrl:       aws.String(queueURL),
				AttributeNames: []types.QueueAttributeName{types.QueueAttributeNameAll},
			})
			
			if err == nil && attrs.Attributes != nil {
				queue.Attributes = attrs.Attributes
				// Extract queue name from ARN
				if name, ok := attrs.Attributes["QueueArn"]; ok {
					for i := len(name) - 1; i >= 0; i-- {
						if name[i] == ':' {
							queue.Name = name[i+1:]
							break
						}
					}
				}
			}
			
			queues = append(queues, queue)
			continue
		}
		
		// Check queue tags if filtering is enabled
		tagsResult, err := h.client.ListQueueTags(ctx, &sqs.ListQueueTagsInput{
			QueueUrl: aws.String(queueURL),
		})
		if err != nil {
			log.Printf("ListQueues: Error fetching tags for queue %s: %v", queueURL, err)
			continue
		}

		// Check if queue matches all required tags  
		matchesAllTags := true
		for tagKey, validValues := range requiredTags {
			tagValue, exists := tagsResult.Tags[tagKey]
			if !exists {
				log.Printf("ListQueues: Queue %s missing required tag: %s", queueURL, tagKey)
				matchesAllTags = false
				break
			}
			if !contains(validValues, tagValue) {
				log.Printf("ListQueues: Queue %s has invalid value '%s' for tag '%s' (expected: %v)", queueURL, tagValue, tagKey, validValues)
				matchesAllTags = false
				break
			}
		}

		if !matchesAllTags {
			continue
		}
		
		filteredCount++
		log.Printf("ListQueues: Queue %s matches all required tags", queueURL)

		// Get queue attributes for matching queues
		attrs, err := h.client.GetQueueAttributes(ctx, &sqs.GetQueueAttributesInput{
			QueueUrl:       aws.String(queueURL),
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
	if err := json.NewEncoder(w).Encode(queues); err != nil {
		log.Printf("ListQueues: Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	log.Printf("ListQueues: Successfully returned %d filtered queues (out of %d total)", len(queues), len(result.QueueUrls))
}

// contains checks if a value exists in a slice (case-insensitive)
func contains(slice []string, value string) bool {
	for _, v := range slice {
		if strings.EqualFold(v, value) {
			return true
		}
	}
	return false
}

func (h *SQSHandler) GetMessages(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	queueURL := vars["queueUrl"]

	// Get limit from query parameter, default to 10 (SQS max per call)
	limit := int32(10)
	if limitParam := r.URL.Query().Get("limit"); limitParam != "" {
		if parsedLimit, err := strconv.Atoi(limitParam); err == nil && parsedLimit > 0 && parsedLimit <= 10 {
			limit = int32(parsedLimit)
		}
	}

	log.Printf("GetMessages: Fetching up to %d messages for queue %s", limit, queueURL)
	ctx := context.Background()

	result, err := h.client.ReceiveMessage(ctx, &sqs.ReceiveMessageInput{
		QueueUrl:              aws.String(queueURL),
		MaxNumberOfMessages:   limit,
		WaitTimeSeconds:       1,
		AttributeNames:        []types.QueueAttributeName{types.QueueAttributeNameAll},
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

	// Sort messages by SentTimestamp in descending order (newest first)
	// This ensures consistent chronological ordering regardless of SQS return order
	sort.Slice(messages, func(i, j int) bool {
		timeI := getTimestampFromMessage(messages[i])
		timeJ := getTimestampFromMessage(messages[j])
		return timeI > timeJ // Descending order (newest first)
	})

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(messages); err != nil {
		log.Printf("Error encoding messages response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
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
	if err := json.NewEncoder(w).Encode(map[string]string{
		"messageId": aws.ToString(result.MessageId),
	}); err != nil {
		log.Printf("Error encoding send message response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
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

func (h *SQSHandler) RetryMessage(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	sourceQueueURL := vars["queueUrl"]

	var payload struct {
		Message        Message `json:"message"`
		TargetQueueURL string  `json:"targetQueueUrl"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ctx := context.Background()

	// Send message to target queue
	result, err := h.client.SendMessage(ctx, &sqs.SendMessageInput{
		QueueUrl:    aws.String(payload.TargetQueueURL),
		MessageBody: aws.String(payload.Message.Body),
	})

	if err != nil {
		log.Printf("RetryMessage: Error sending to target queue: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Delete from source queue (DLQ)
	_, err = h.client.DeleteMessage(ctx, &sqs.DeleteMessageInput{
		QueueUrl:      aws.String(sourceQueueURL),
		ReceiptHandle: aws.String(payload.Message.ReceiptHandle),
	})

	if err != nil {
		log.Printf("RetryMessage: Warning - failed to delete from source queue: %v", err)
		// Don't fail the request, message was successfully retried
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]string{
		"messageId": aws.ToString(result.MessageId),
		"status":    "retried",
	}); err != nil {
		log.Printf("Error encoding retry response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
}

func (h *SQSHandler) GetAWSContext(w http.ResponseWriter, r *http.Request) {
	log.Printf("GetAWSContext: Fetching AWS context information")
	
	type AWSContext struct {
		Mode      string `json:"mode"`
		Region    string `json:"region,omitempty"`
		Profile   string `json:"profile,omitempty"`
		AccountID string `json:"accountId,omitempty"`
	}
	
	context := AWSContext{
		Mode: "Demo",
	}
	
	if !h.isDemo {
		context.Mode = "Live AWS"
		context.Region = h.config.Region
		
		// Get profile from environment or config
		if profile := os.Getenv("AWS_PROFILE"); profile != "" {
			context.Profile = profile
		}
		
		// Try to get account ID from credentials if available
		if h.config.Credentials != nil {
			if creds, err := h.config.Credentials.Retrieve(r.Context()); err == nil {
				if creds.SessionToken != "" {
					context.AccountID = "*** (Session)"
				} else {
					context.AccountID = "*** (IAM)"
				}
			}
		}
	}
	
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(context); err != nil {
		log.Printf("GetAWSContext: Error encoding response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}
	
	log.Printf("GetAWSContext: Successfully returned context (mode: %s)", context.Mode)
}

// getTimestampFromMessage extracts and parses the SentTimestamp from a message
// Returns 0 if timestamp is missing or invalid, ensuring consistent sorting
func getTimestampFromMessage(message Message) int64 {
	timestampStr, exists := message.Attributes["SentTimestamp"]
	if !exists {
		return 0
	}
	
	timestamp, err := strconv.ParseInt(timestampStr, 10, 64)
	if err != nil {
		log.Printf("Warning: Invalid SentTimestamp format '%s' for message %s: %v", 
			timestampStr, message.MessageId, err)
		return 0
	}
	
	return timestamp
}
