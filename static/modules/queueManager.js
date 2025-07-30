/**
 * Queue Management
 * Handles queue listing, selection, and related operations
 */
import { UIComponent } from './uiComponent.js';
import { APIService } from './apiService.js';
import { enhanceQueueElement } from './dlqDetection.js';

export class QueueManager extends UIComponent {
    constructor(appState) {
        super('#queueList');
        this.appState = appState;
    }

    async loadQueues() {
        this.setContent('<div class="loading">Loading queues...</div>');
        
        try {
            const queues = await APIService.getQueues(20);
            this.renderQueues(queues);
            
            if (queues.length === 20) {
                this.addLoadMoreButton();
            }
        } catch (error) {
            console.error('Error loading queues:', error);
            this.setContent('<div class="error">Failed to load queues</div>');
        }
    }

    renderQueues(queues, append = false) {
        if (!append) {
            this.setContent('');
            this.removeLoadMoreButton();
        } else {
            this.removeLoadMoreButton();
        }

        if (queues.length === 0 && !append) {
            this.setContent('<div class="no-queues">No queues found</div>');
            return;
        }

        queues.forEach((queue, index) => {
            setTimeout(() => {
                const queueItem = this.createQueueItem(queue);
                this.element.appendChild(queueItem);
            }, index * 50);
        });
    }

    createQueueItem(queue) {
        const queueItem = document.createElement('li');
        queueItem.className = 'queue-item';
        queueItem.style.opacity = '0';
        queueItem.style.transform = 'translateY(10px)';
        
        // Create queue link structure
        const queueLink = document.createElement('a');
        queueLink.className = 'queue-link';
        queueLink.href = '#';
        
        // Queue name
        const queueName = document.createElement('div');
        queueName.className = 'queue-name';
        queueName.textContent = queue.name;
        
        // Queue metadata (message count)
        const queueMeta = document.createElement('div');
        queueMeta.className = 'queue-meta';
        
        const messageCount = document.createElement('span');
        messageCount.className = 'queue-count';
        messageCount.textContent = `${queue.attributes?.ApproximateNumberOfMessages || 0} messages`;
        
        queueMeta.appendChild(messageCount);
        
        // Assemble the structure
        queueLink.appendChild(queueName);
        queueLink.appendChild(queueMeta);
        queueItem.appendChild(queueLink);
        
        // Add DLQ detection and styling (will add DLQ badge if needed)
        enhanceQueueElement(queueMeta, queue);
        
        queueLink.onclick = (e) => {
            e.preventDefault();
            this.selectQueue(queue, queueItem);
        };
        
        // Animate in
        requestAnimationFrame(() => {
            queueItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
            queueItem.style.opacity = '1';
            queueItem.style.transform = 'translateY(0)';
        });

        return queueItem;
    }

    selectQueue(queue, queueItem) {
        this.appState.setCurrentQueue(queue);
        
        // Update UI state
        document.querySelectorAll('.queue-item').forEach(item => {
            item.classList.remove('active');
        });
        queueItem.classList.add('active');
        
        // Clear error banners and show loading
        document.querySelectorAll('.error').forEach(error => error.remove());
        
        // Show queue details
        document.getElementById('noQueueSelected').classList.add('hidden');
        document.getElementById('queueDetails').classList.remove('hidden');
        document.getElementById('queueName').textContent = queue.name;
        
        // Load queue data
        const messageList = document.getElementById('messageList');
        messageList.innerHTML = '<div class="loading">Loading messages...</div>';
        
        // These will be injected by the main app
        if (window.app) {
            window.app.queueAttributesHandler.display(queue.attributes);
            window.app.messageHandler.loadMessages();
            window.app.messageHandler.addFilterUI();
            window.app.webSocketManager.subscribe(queue.url);
        }
    }

    addLoadMoreButton() {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'btn btn-secondary load-more-btn';
        loadMoreBtn.textContent = 'Load More Queues';
        loadMoreBtn.style.width = '100%';
        loadMoreBtn.style.marginTop = '1rem';
        loadMoreBtn.onclick = () => this.loadMoreQueues();
        this.element.appendChild(loadMoreBtn);
    }

    removeLoadMoreButton() {
        const existingLoadMore = this.element.querySelector('.load-more-btn');
        if (existingLoadMore) {
            existingLoadMore.remove();
        }
    }

    async loadMoreQueues() {
        const loadMoreBtn = this.element.querySelector('.load-more-btn');
        if (loadMoreBtn) {
            loadMoreBtn.textContent = 'Loading...';
            loadMoreBtn.disabled = true;
        }
        
        this.appState.currentOffset += 20;
        
        try {
            const response = await APIService.getQueues(this.appState.currentOffset + 20);
            const newQueues = response.slice(this.appState.currentOffset);
            
            if (newQueues.length > 0) {
                this.renderQueues(newQueues, true);
                if (newQueues.length === 20) {
                    this.addLoadMoreButton();
                }
            } else {
                if (loadMoreBtn) {
                    loadMoreBtn.textContent = 'No more queues';
                    loadMoreBtn.disabled = true;
                }
            }
        } catch (error) {
            console.error('Error loading more queues:', error);
            if (loadMoreBtn) {
                loadMoreBtn.textContent = 'Load More Queues';
                loadMoreBtn.disabled = false;
            }
        }
    }

    refreshQueues() {
        this.appState.resetOffsets();
        this.loadQueues();
    }
}