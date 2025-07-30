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
            console.log('WebSocket connected');
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
            console.log('WebSocket disconnected');
            setTimeout(() => this.connect(), this.reconnectDelay);
        };
    }

    handleMessage(data) {
        if (!data || typeof data !== 'object') {
            console.warn('Invalid WebSocket message data:', data);
            return;
        }

        const currentQueue = this.appState.getCurrentQueue();
        if (data.type === 'messages' && 
            data.queueUrl === currentQueue?.url && 
            !this.appState.isMessagesPausedState()) {
            
            // Validate messages data before processing
            if (Array.isArray(data.messages)) {
                try {
                    // For now, keep WebSocket simple - just replace messages like before
                    // We can improve this later once basic functionality is working
                    this.messageHandler.displayMessages(data.messages);
                } catch (error) {
                    console.error('Error displaying WebSocket messages:', error);
                }
            } else {
                console.warn('WebSocket messages data is not an array:', data.messages);
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