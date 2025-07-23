let currentQueue = null;
let ws = null;
let isMessagesPaused = false;

document.addEventListener('DOMContentLoaded', () => {
    loadQueues();
    setupEventListeners();
    setupWebSocket();
});

function setupEventListeners() {
    document.getElementById('refreshQueues').addEventListener('click', () => {
        currentOffset = 0; // Reset offset when refreshing
        loadQueues();
    });
    document.getElementById('sendMessage').addEventListener('click', sendMessage);
    document.getElementById('refreshMessages').addEventListener('click', loadMessages);
    document.getElementById('pauseMessages').addEventListener('click', toggleMessagesPause);
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
        if (data.type === 'messages' && data.queueUrl === currentQueue?.url && !isMessagesPaused) {
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
    const queueList = document.getElementById('queueList');
    queueList.innerHTML = '<div class="loading">Loading queues...</div>';
    
    try {
        const response = await fetch('/api/queues?limit=20');
        const queues = await response.json();
        displayQueues(queues);
        
        // Add "Load More" button if we got the full limit
        if (queues.length === 20) {
            addLoadMoreButton();
        }
    } catch (error) {
        console.error('Error loading queues:', error);
        showError('Failed to load queues');
        queueList.innerHTML = '<div class="error">Failed to load queues</div>';
    }
}

function displayQueues(queues, append = false) {
    const queueList = document.getElementById('queueList');
    
    if (!append) {
        queueList.innerHTML = '';
    } else {
        // Remove existing "Load More" button if present
        const existingLoadMore = queueList.querySelector('.load-more-btn');
        if (existingLoadMore) {
            existingLoadMore.remove();
        }
    }
    
    if (queues.length === 0 && !append) {
        queueList.innerHTML = '<div class="no-queues">No queues found</div>';
        return;
    }
    
    // Add queues progressively with a small delay for better UX
    queues.forEach((queue, index) => {
        setTimeout(() => {
            const queueItem = document.createElement('div');
            queueItem.className = 'queue-item';
            queueItem.textContent = queue.name;
            queueItem.onclick = () => selectQueue(queue);
            queueItem.style.opacity = '0';
            queueItem.style.transform = 'translateY(10px)';
            queueList.appendChild(queueItem);
            
            // Animate in
            requestAnimationFrame(() => {
                queueItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                queueItem.style.opacity = '1';
                queueItem.style.transform = 'translateY(0)';
            });
        }, index * 50); // Stagger the animations
    });
}

let currentOffset = 0;

function addLoadMoreButton() {
    const queueList = document.getElementById('queueList');
    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'btn btn-secondary load-more-btn';
    loadMoreBtn.textContent = 'Load More Queues';
    loadMoreBtn.style.width = '100%';
    loadMoreBtn.style.marginTop = '1rem';
    loadMoreBtn.onclick = loadMoreQueues;
    queueList.appendChild(loadMoreBtn);
}

async function loadMoreQueues() {
    const loadMoreBtn = document.querySelector('.load-more-btn');
    if (loadMoreBtn) {
        loadMoreBtn.textContent = 'Loading...';
        loadMoreBtn.disabled = true;
    }
    
    currentOffset += 20;
    
    try {
        // Note: AWS SQS doesn't support offset, so we'll need to implement this differently
        // For now, we'll just load more queues with a higher limit
        const response = await fetch(`/api/queues?limit=${currentOffset + 20}`);
        const allQueues = await response.json();
        
        // Get only the new queues (after the current offset)
        const newQueues = allQueues.slice(currentOffset);
        
        if (newQueues.length > 0) {
            displayQueues(newQueues, true);
            
            // Add "Load More" button again if we got the full batch
            if (newQueues.length === 20) {
                addLoadMoreButton();
            }
        } else {
            // No more queues to load
            if (loadMoreBtn) {
                loadMoreBtn.textContent = 'No more queues';
                loadMoreBtn.disabled = true;
            }
        }
    } catch (error) {
        console.error('Error loading more queues:', error);
        showError('Failed to load more queues');
        if (loadMoreBtn) {
            loadMoreBtn.textContent = 'Load More Queues';
            loadMoreBtn.disabled = false;
        }
    }
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
    
    // Clear any existing error banners
    document.querySelectorAll('.error').forEach(error => error.remove());
    
    // Show loading state immediately in message area
    const messageList = document.getElementById('messageList');
    messageList.innerHTML = '<div class="loading">Loading messages...</div>';
    
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
    
    const messageList = document.getElementById('messageList');
    messageList.innerHTML = '<div class="loading">Loading messages...</div>';
    
    try {
        const response = await fetch(`/api/queues/${encodeURIComponent(currentQueue.url)}/messages`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const messages = await response.json();
        displayMessages(messages);
    } catch (error) {
        console.error('Error loading messages:', error);
        messageList.innerHTML = '<div class="error-message">Failed to load messages. Please try again.</div>';
    }
}

let allMessages = [];
let currentMessageOffset = 0;

function displayMessages(messages, append = false) {
    const messageList = document.getElementById('messageList');
    
    if (!append) {
        messageList.innerHTML = '';
        allMessages = [];
        currentMessageOffset = 0;
        // Remove any existing "Show More" button
        const existingShowMore = messageList.querySelector('.show-more-messages-btn');
        if (existingShowMore) {
            existingShowMore.remove();
        }
    } else {
        // Remove existing "Show More" button if present
        const existingShowMore = messageList.querySelector('.show-more-messages-btn');
        if (existingShowMore) {
            existingShowMore.remove();
        }
    }
    
    // Add new messages to our collection
    allMessages = append ? [...allMessages, ...messages] : messages;
    
    if (allMessages.length === 0 && !append) {
        messageList.innerHTML = '<div class="no-messages">No messages found in this queue</div>';
        return;
    }
    
    // Display messages to show (either new batch or all if not appending)
    const messagesToShow = append ? messages : allMessages;
    
    messagesToShow.forEach((message, index) => {
        const actualIndex = append ? allMessages.length - messages.length + index : index;
        const messageItem = document.createElement('div');
        messageItem.className = `message-row ${actualIndex % 2 === 0 ? 'message-row-even' : 'message-row-odd'}`;
        messageItem.setAttribute('data-message-id', message.messageId);
        
        // Collapsed view (DataDog style)
        const collapsedView = document.createElement('div');
        collapsedView.className = 'message-collapsed';
        
        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.textContent = '▶';
        
        const messagePreview = document.createElement('div');
        messagePreview.className = 'message-preview';
        
        const timestamp = document.createElement('span');
        timestamp.className = 'message-timestamp-compact';
        if (message.attributes && message.attributes.SentTimestamp) {
            const date = new Date(parseInt(message.attributes.SentTimestamp));
            timestamp.textContent = date.toLocaleString();
        }
        
        const messagePreviewText = document.createElement('span');
        messagePreviewText.className = 'message-preview-text';
        // Show first 100 characters of message body
        const previewText = message.body.length > 100 ? message.body.substring(0, 100) + '...' : message.body;
        messagePreviewText.textContent = previewText;
        
        const messageId = document.createElement('span');
        messageId.className = 'message-id-compact';
        messageId.textContent = `ID: ${message.messageId.substring(0, 8)}...`;
        
        messagePreview.appendChild(timestamp);
        messagePreview.appendChild(messagePreviewText);
        messagePreview.appendChild(messageId);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-small';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteMessage(message.receiptHandle);
        };
        
        collapsedView.appendChild(expandIcon);
        collapsedView.appendChild(messagePreview);
        collapsedView.appendChild(deleteBtn);
        
        // Expanded view (hidden by default)
        const expandedView = document.createElement('div');
        expandedView.className = 'message-expanded hidden';
        
        const expandedHeader = document.createElement('div');
        expandedHeader.className = 'message-expanded-header';
        
        const collapseIcon = document.createElement('span');
        collapseIcon.className = 'collapse-icon';
        collapseIcon.textContent = '▼';
        
        const messageDetails = document.createElement('div');
        messageDetails.className = 'message-details';
        messageDetails.innerHTML = `
            <div><strong>Message ID:</strong> ${message.messageId}</div>
            <div><strong>Sent:</strong> ${timestamp.textContent}</div>
            <div><strong>Receipt Handle:</strong> ${message.receiptHandle.substring(0, 50)}...</div>
        `;
        
        expandedHeader.appendChild(collapseIcon);
        expandedHeader.appendChild(messageDetails);
        expandedHeader.appendChild(deleteBtn.cloneNode(true));
        expandedHeader.lastChild.onclick = (e) => {
            e.stopPropagation();
            deleteMessage(message.receiptHandle);
        };
        
        const messageBody = document.createElement('div');
        messageBody.className = 'message-body-expanded';
        
        let formattedBody;
        let isJSON = false;
        try {
            const parsed = JSON.parse(message.body);
            formattedBody = JSON.stringify(parsed, null, 4);
            isJSON = true;
        } catch {
            formattedBody = message.body;
        }
        
        const pre = document.createElement('pre');
        pre.className = isJSON ? 'message-json json-formatted' : 'message-json plain-text';
        pre.textContent = formattedBody;
        messageBody.appendChild(pre);
        
        expandedView.appendChild(expandedHeader);
        expandedView.appendChild(messageBody);
        
        // Toggle functionality
        collapsedView.onclick = () => toggleMessageExpansion(messageItem);
        expandedHeader.onclick = () => toggleMessageExpansion(messageItem);
        
        messageItem.appendChild(collapsedView);
        messageItem.appendChild(expandedView);
        
        messageList.appendChild(messageItem);
    });
    
    // Add "Show More" button if we got messages (indicating there might be more)
    if (messages.length > 0) {
        addShowMoreMessagesButton();
    }
}

function toggleMessageExpansion(messageItem) {
    const collapsed = messageItem.querySelector('.message-collapsed');
    const expanded = messageItem.querySelector('.message-expanded');
    const expandIcon = collapsed.querySelector('.expand-icon');
    const collapseIcon = expanded.querySelector('.collapse-icon');
    
    if (expanded.classList.contains('hidden')) {
        // Expand
        collapsed.classList.add('hidden');
        expanded.classList.remove('hidden');
        messageItem.classList.add('expanded');
    } else {
        // Collapse
        expanded.classList.add('hidden');
        collapsed.classList.remove('hidden');
        messageItem.classList.remove('expanded');
    }
}

function addShowMoreMessagesButton() {
    const messageList = document.getElementById('messageList');
    const showMoreBtn = document.createElement('button');
    showMoreBtn.className = 'btn btn-secondary show-more-messages-btn';
    showMoreBtn.textContent = 'Show More Messages';
    showMoreBtn.style.width = '100%';
    showMoreBtn.style.marginTop = '1rem';
    showMoreBtn.onclick = loadMoreMessages;
    messageList.appendChild(showMoreBtn);
}

async function loadMoreMessages() {
    const showMoreBtn = document.querySelector('.show-more-messages-btn');
    if (showMoreBtn) {
        showMoreBtn.textContent = 'Loading...';
        showMoreBtn.disabled = true;
    }
    
    try {
        const response = await fetch(`/api/queues/${encodeURIComponent(currentQueue.url)}/messages?limit=10`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const messages = await response.json();
        
        if (messages.length > 0) {
            displayMessages(messages, true);
        } else {
            // No more messages to load
            if (showMoreBtn) {
                showMoreBtn.textContent = 'No more messages';
                showMoreBtn.disabled = true;
            }
        }
    } catch (error) {
        console.error('Error loading more messages:', error);
        if (showMoreBtn) {
            showMoreBtn.textContent = 'Show More Messages';
            showMoreBtn.disabled = false;
        }
    }
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

function toggleMessagesPause() {
    isMessagesPaused = !isMessagesPaused;
    const pauseBtn = document.getElementById('pauseMessages');
    
    if (isMessagesPaused) {
        pauseBtn.innerHTML = '▶️ Resume';
        pauseBtn.title = 'Resume live updates';
    } else {
        pauseBtn.innerHTML = '⏸️ Pause';
        pauseBtn.title = 'Pause live updates';
    }
}