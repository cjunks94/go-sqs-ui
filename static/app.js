let currentQueue = null;
let ws = null;

document.addEventListener('DOMContentLoaded', () => {
    loadQueues();
    setupEventListeners();
    setupWebSocket();
});

function setupEventListeners() {
    document.getElementById('refreshQueues').addEventListener('click', loadQueues);
    document.getElementById('sendMessage').addEventListener('click', sendMessage);
    document.getElementById('refreshMessages').addEventListener('click', loadMessages);
    document.getElementById('sidebarToggle').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
}

function setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    
    ws.onopen = () => {
        console.log('WebSocket connected');
    };
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'messages' && data.queueUrl === currentQueue?.url) {
            displayMessages(data.messages);
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
        console.log('WebSocket disconnected');
        setTimeout(setupWebSocket, 5000);
    };
}

async function loadQueues() {
    try {
        const response = await fetch('/api/queues');
        const queues = await response.json();
        displayQueues(queues);
    } catch (error) {
        console.error('Error loading queues:', error);
        showError('Failed to load queues');
    }
}

function displayQueues(queues) {
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '';
    
    if (queues.length === 0) {
        queueList.innerHTML = '<div class="no-queues">No queues found</div>';
        return;
    }
    
    queues.forEach(queue => {
        const queueItem = document.createElement('div');
        queueItem.className = 'queue-item';
        queueItem.textContent = queue.name;
        queueItem.onclick = () => selectQueue(queue);
        queueList.appendChild(queueItem);
    });
}

function selectQueue(queue) {
    currentQueue = queue;
    
    document.querySelectorAll('.queue-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.target.classList.add('active');
    
    document.getElementById('noQueueSelected').classList.add('hidden');
    document.getElementById('queueDetails').classList.remove('hidden');
    
    document.getElementById('queueName').textContent = queue.name;
    
    displayQueueAttributes(queue.attributes);
    loadMessages();
    
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'subscribe',
            queueUrl: queue.url
        }));
    }
}

function displayQueueAttributes(attributes) {
    const container = document.getElementById('queueAttributes');
    container.innerHTML = '';
    
    if (!attributes) return;
    
    const grid = document.createElement('div');
    grid.className = 'queue-attributes';
    
    const importantAttrs = [
        'ApproximateNumberOfMessages',
        'ApproximateNumberOfMessagesNotVisible',
        'ApproximateNumberOfMessagesDelayed',
        'MessageRetentionPeriod',
        'VisibilityTimeout'
    ];
    
    importantAttrs.forEach(attr => {
        if (attributes[attr]) {
            const label = document.createElement('div');
            label.className = 'attribute-label';
            label.textContent = attr + ':';
            
            const value = document.createElement('div');
            value.className = 'attribute-value';
            value.textContent = attributes[attr];
            
            grid.appendChild(label);
            grid.appendChild(value);
        }
    });
    
    container.appendChild(grid);
}

async function loadMessages() {
    if (!currentQueue) return;
    
    try {
        const response = await fetch(`/api/queues/${encodeURIComponent(currentQueue.url)}/messages`);
        const messages = await response.json();
        displayMessages(messages);
    } catch (error) {
        console.error('Error loading messages:', error);
        showError('Failed to load messages');
    }
}

function displayMessages(messages) {
    const messageList = document.getElementById('messageList');
    messageList.innerHTML = '';
    
    if (messages.length === 0) {
        messageList.innerHTML = '<div class="no-messages">No messages in queue</div>';
        return;
    }
    
    messages.forEach((message, index) => {
        const messageItem = document.createElement('div');
        messageItem.className = 'message-item';
        
        const header = document.createElement('div');
        header.className = 'message-header';
        
        const messageInfo = document.createElement('div');
        messageInfo.className = 'message-info';
        
        const messageId = document.createElement('div');
        messageId.className = 'message-id';
        messageId.textContent = `Message ${index + 1} - ID: ${message.messageId}`;
        
        const timestamp = document.createElement('div');
        timestamp.className = 'message-timestamp';
        if (message.attributes && message.attributes.SentTimestamp) {
            const date = new Date(parseInt(message.attributes.SentTimestamp));
            timestamp.textContent = `Sent: ${date.toLocaleString()}`;
        }
        
        messageInfo.appendChild(messageId);
        messageInfo.appendChild(timestamp);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = () => deleteMessage(message.receiptHandle);
        
        header.appendChild(messageInfo);
        header.appendChild(deleteBtn);
        
        const body = document.createElement('div');
        body.className = 'message-body';
        
        let formattedBody;
        let isJSON = false;
        try {
            const parsed = JSON.parse(message.body);
            formattedBody = JSON.stringify(parsed, null, 4); // Use 4 spaces for better readability
            isJSON = true;
        } catch {
            formattedBody = message.body;
        }
        
        // Create a pre element for better JSON formatting
        const pre = document.createElement('pre');
        pre.className = isJSON ? 'message-json json-formatted' : 'message-json plain-text';
        pre.textContent = formattedBody;
        body.appendChild(pre);
        
        messageItem.appendChild(header);
        messageItem.appendChild(body);
        
        messageList.appendChild(messageItem);
    });
}

async function sendMessage() {
    if (!currentQueue) return;
    
    const messageBody = document.getElementById('messageBody').value;
    if (!messageBody.trim()) {
        alert('Please enter a message body');
        return;
    }
    
    try {
        const response = await fetch(`/api/queues/${encodeURIComponent(currentQueue.url)}/messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body: messageBody })
        });
        
        if (response.ok) {
            document.getElementById('messageBody').value = '';
            loadMessages();
        } else {
            showError('Failed to send message');
        }
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message');
    }
}

async function deleteMessage(receiptHandle) {
    if (!currentQueue) return;
    
    try {
        const response = await fetch(`/api/queues/${encodeURIComponent(currentQueue.url)}/messages/${encodeURIComponent(receiptHandle)}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadMessages();
        } else {
            showError('Failed to delete message');
        }
    } catch (error) {
        console.error('Error deleting message:', error);
        showError('Failed to delete message');
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    const content = document.querySelector('.content');
    content.insertBefore(errorDiv, content.firstChild);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    
    sidebar.classList.toggle('collapsed');
    
    if (sidebar.classList.contains('collapsed')) {
        toggleBtn.classList.add('visible');
    } else {
        toggleBtn.classList.remove('visible');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    
    sidebar.classList.add('collapsed');
    toggleBtn.classList.add('visible');
}