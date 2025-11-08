/**
 * WebSocket Manager
 * Handles WebSocket connections and real-time message updates
 */
export class WebSocketManager {
    constructor(appState, messageHandler) {
        this.appState = appState;
        this.messageHandler = messageHandler;
        this.ws = null;
        this.reconnectDelay = 5000;
    }

    connect() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

        this.ws.onopen = () => {
            // WebSocket connected
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            // WebSocket disconnected - attempt reconnect
            setTimeout(() => this.connect(), this.reconnectDelay);
        };
    }

    handleMessage(data) {
        if (!data || typeof data !== 'object') {
            // Invalid WebSocket message data
            return;
        }

        const currentQueue = this.appState.getCurrentQueue();
        if ((data.type === 'messages' || data.type === 'initial_messages') && 
            data.queueUrl === currentQueue?.url && 
            !this.appState.isMessagesPausedState()) {
            
            // Validate messages data before processing
            if (Array.isArray(data.messages)) {
                try {
                    if (data.type === 'initial_messages') {
                        // Initial load - replace all messages
                        this.messageHandler.displayMessages(data.messages);
                    } else {
                        // Incremental update - add new messages only
                        this.messageHandler.addNewMessages(data.messages);
                    }
                } catch (error) {
                    console.error('Error processing WebSocket messages:', error);
                }
            } else {
                // WebSocket messages data is not an array
            }
        }
    }

    subscribe(queueUrl) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                queueUrl: queueUrl
            }));
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }
}