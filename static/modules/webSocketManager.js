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
        const currentQueue = this.appState.getCurrentQueue();
        if (data.type === 'messages' && 
            data.queueUrl === currentQueue?.url && 
            !this.appState.isMessagesPausedState()) {
            this.messageHandler.displayMessages(data.messages);
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