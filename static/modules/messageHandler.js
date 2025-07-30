/**
 * Message Handler
 * Manages message display, pagination, and interactions
 */
import { UIComponent } from './uiComponent.js';
import { APIService } from './apiService.js';
import { EnhancedMessageView } from './enhancedMessageView.js';
import { MessageRetry } from './messageRetry.js';
import { MessageFilter } from './messageFilter.js';

export class MessageHandler extends UIComponent {
    constructor(appState) {
        super('#messageList');
        this.appState = appState;
        this.enhancedView = new EnhancedMessageView(appState);
        this.messageRetry = new MessageRetry(appState);
        this.messageFilter = new MessageFilter();
        
        // Listen for filter changes
        this.messageFilter.onFilterChange((filter) => {
            this.applyFilter(filter);
        });
    }

    async loadMessages() {
        const currentQueue = this.appState.getCurrentQueue();
        if (!currentQueue) return;

        this.setContent('<div class="loading">Loading messages...</div>');

        try {
            const messages = await APIService.getMessages(currentQueue.url, 10);
            this.displayMessages(messages);
        } catch (error) {
            console.error('Error loading messages:', error);
            this.setContent('<div class="error-message">Failed to load messages. Please try again.</div>');
        }
    }

    displayMessages(messages, append = false) {
        // Validate input
        if (!Array.isArray(messages)) {
            console.warn('displayMessages called with non-array:', messages);
            return;
        }

        // Ensure we have a valid DOM element
        if (!this.element) {
            console.error('Message handler element not found');
            return;
        }

        if (!append) {
            this.setContent('');
            this.appState.setMessages(messages);
            this.removeShowMoreButton();
        } else {
            this.removeShowMoreButton();
        }

        this.appState.setMessages(messages, append);
        const allMessages = this.appState.getMessages();

        if (allMessages.length === 0 && !append) {
            this.setContent('<div class="no-messages">No messages found in this queue</div>');
            return;
        }

        const messagesToShow = append ? messages : allMessages;
        
        messagesToShow.forEach((message, index) => {
            try {
                const actualIndex = append ? allMessages.length - messages.length + index : index;
                const messageRow = this.createMessageRow(message, actualIndex);
                if (messageRow && this.element) {
                    this.element.appendChild(messageRow);
                }
            } catch (error) {
                console.error('Error creating message row:', error, message);
            }
        });

        if (messages.length > 0) {
            this.addShowMoreButton();
        }

        // Attach retry handlers after messages are displayed
        setTimeout(() => {
            this.messageRetry.attachRetryHandlers(this.appState.getMessages());
        }, 100);
    }

    createMessageRow(message, index) {
        const messageItem = document.createElement('div');
        messageItem.className = `message-row ${index % 2 === 0 ? 'message-row-even' : 'message-row-odd'}`;
        messageItem.setAttribute('data-message-id', message.messageId);

        const collapsedView = this.createCollapsedView(message);
        const expandedView = this.createExpandedView(message);

        collapsedView.onclick = () => this.toggleMessageExpansion(messageItem);
        
        // Add click handler to expanded view - check if header exists first
        const expandedHeader = expandedView.querySelector('.message-expanded-header');
        if (expandedHeader) {
            expandedHeader.onclick = () => this.toggleMessageExpansion(messageItem);
        } else {
            // If no specific header, make the entire expanded view clickable to collapse
            expandedView.onclick = () => this.toggleMessageExpansion(messageItem);
        }

        messageItem.appendChild(collapsedView);
        messageItem.appendChild(expandedView);

        return messageItem;
    }

    createCollapsedView(message) {
        const collapsedView = document.createElement('div');
        collapsedView.className = 'message-collapsed';

        const expandIcon = document.createElement('span');
        expandIcon.className = 'expand-icon';
        expandIcon.textContent = '▶';

        const messagePreview = document.createElement('div');
        messagePreview.className = 'message-preview';

        const timestamp = this.createTimestamp(message);
        const previewText = this.createPreviewText(message);
        const messageId = this.createMessageId(message);
        const deleteBtn = this.createDeleteButton(message);

        messagePreview.appendChild(timestamp);
        messagePreview.appendChild(previewText);
        messagePreview.appendChild(messageId);

        collapsedView.appendChild(expandIcon);
        collapsedView.appendChild(messagePreview);
        collapsedView.appendChild(deleteBtn);

        return collapsedView;
    }

    createExpandedView(message) {
        const expandedView = document.createElement('div');
        expandedView.className = 'message-expanded hidden';

        // Use enhanced view for better debugging
        const enhancedContent = this.enhancedView.createEnhancedView(message);
        expandedView.appendChild(enhancedContent);

        return expandedView;
    }

    createTimestamp(message) {
        const timestamp = document.createElement('span');
        timestamp.className = 'message-timestamp-compact';
        if (message.attributes && message.attributes.SentTimestamp) {
            const date = new Date(parseInt(message.attributes.SentTimestamp));
            timestamp.textContent = date.toLocaleString();
        }
        return timestamp;
    }

    createPreviewText(message) {
        const messagePreviewText = document.createElement('span');
        messagePreviewText.className = 'message-preview-text';
        const previewText = message.body.length > 100 ? message.body.substring(0, 100) + '...' : message.body;
        messagePreviewText.textContent = previewText;
        return messagePreviewText;
    }

    createMessageId(message) {
        const messageId = document.createElement('span');
        messageId.className = 'message-id-compact';
        messageId.textContent = `ID: ${message.messageId.substring(0, 8)}...`;
        return messageId;
    }

    createDeleteButton(message) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-small';
        deleteBtn.textContent = 'Delete';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            this.deleteMessage(message.receiptHandle);
        };
        return deleteBtn;
    }

    createMessageDetails(message) {
        const messageDetails = document.createElement('div');
        messageDetails.className = 'message-details';
        
        const timestamp = this.createTimestamp(message);
        messageDetails.innerHTML = `
            <div><strong>Message ID:</strong> ${message.messageId}</div>
            <div><strong>Sent:</strong> ${timestamp.textContent}</div>
            <div><strong>Receipt Handle:</strong> ${message.receiptHandle.substring(0, 50)}...</div>
        `;
        return messageDetails;
    }

    createMessageBody(message) {
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

        return messageBody;
    }

    toggleMessageExpansion(messageItem) {
        const collapsed = messageItem.querySelector('.message-collapsed');
        const expanded = messageItem.querySelector('.message-expanded');

        if (expanded.classList.contains('hidden')) {
            collapsed.classList.add('hidden');
            expanded.classList.remove('hidden');
            messageItem.classList.add('expanded');
        } else {
            expanded.classList.add('hidden');
            collapsed.classList.remove('hidden');
            messageItem.classList.remove('expanded');
        }
    }

    addShowMoreButton() {
        const showMoreBtn = document.createElement('button');
        showMoreBtn.className = 'btn btn-secondary show-more-messages-btn';
        showMoreBtn.textContent = 'Show More Messages';
        showMoreBtn.style.width = '100%';
        showMoreBtn.style.marginTop = '1rem';
        showMoreBtn.onclick = () => this.loadMoreMessages();
        this.element.appendChild(showMoreBtn);
    }

    removeShowMoreButton() {
        const existingShowMore = this.element.querySelector('.show-more-messages-btn');
        if (existingShowMore) {
            existingShowMore.remove();
        }
    }

    async loadMoreMessages() {
        const currentQueue = this.appState.getCurrentQueue();
        if (!currentQueue) return;

        const showMoreBtn = this.element.querySelector('.show-more-messages-btn');
        if (showMoreBtn) {
            showMoreBtn.textContent = 'Loading...';
            showMoreBtn.disabled = true;
        }

        try {
            const messages = await APIService.getMessages(currentQueue.url, 10);
            
            if (messages.length > 0) {
                this.displayMessages(messages, true);
            } else {
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

    async deleteMessage(receiptHandle) {
        const currentQueue = this.appState.getCurrentQueue();
        if (!currentQueue) return;

        try {
            await APIService.deleteMessage(currentQueue.url, receiptHandle);
            this.loadMessages();
        } catch (error) {
            console.error('Error deleting message:', error);
            this.showError('Failed to delete message');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        const content = document.querySelector('.content');
        content.insertBefore(errorDiv, content.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }

    /**
     * Apply filter to messages
     * @param {string} filter - Filter query
     */
    applyFilter(filter) {
        const allMessages = this.appState.getMessages();
        const filteredMessages = this.messageFilter.filterMessages(allMessages, filter);
        
        // Clear current display
        this.setContent('');
        this.removeShowMoreButton();
        
        if (filteredMessages.length === 0) {
            this.setContent('<div class="no-results">No messages match your filter</div>');
            return;
        }
        
        // Display filtered messages
        filteredMessages.forEach((message, index) => {
            const messageRow = this.createMessageRow(message, index);
            
            // Highlight matches if there's a filter
            if (filter) {
                this.highlightMessageContent(messageRow, filter);
            }
            
            this.element.appendChild(messageRow);
        });
        
        // Re-attach retry handlers
        setTimeout(() => {
            this.messageRetry.attachRetryHandlers(filteredMessages);
        }, 100);
    }

    /**
     * Highlight matching content in message row
     * @param {HTMLElement} messageRow - Message row element
     * @param {string} filter - Filter query
     */
    highlightMessageContent(messageRow, filter) {
        const { textFilter } = this.messageFilter.parseFilterQuery(filter);
        if (!textFilter) return;
        
        // Highlight in preview text
        const previewText = messageRow.querySelector('.message-preview-text');
        if (previewText) {
            previewText.innerHTML = this.messageFilter.highlightMatches(
                previewText.textContent, 
                textFilter
            );
        }
    }

    /**
     * Add filter UI to messages section
     */
    addFilterUI() {
        const messagesSection = document.querySelector('.messages-section');
        if (!messagesSection) return;
        
        // Remove any existing filter UI to prevent duplicates
        const existingFilter = messagesSection.querySelector('.message-filter-container');
        if (existingFilter) {
            existingFilter.remove();
        }
        
        const filterUI = this.messageFilter.createFilterUI();
        const messagesHeader = messagesSection.querySelector('.messages-header');
        
        if (messagesHeader) {
            messagesSection.insertBefore(filterUI, messagesHeader.nextSibling);
        }
    }
}