/**
 * Message Filter Module
 * Provides filtering and search functionality for messages
 */

export class MessageFilter {
    constructor() {
        this.currentFilter = '';
        this.filterChangeCallbacks = [];
    }

    /**
     * Filter messages based on search query
     * @param {Array} messages - Array of messages to filter
     * @param {string} filterQuery - Search query
     * @returns {Array} Filtered messages
     */
    filterMessages(messages, filterQuery) {
        if (!filterQuery || filterQuery.trim() === '') {
            return messages;
        }

        const { textFilter, attributeFilters } = this.parseFilterQuery(filterQuery);
        
        return messages.filter(message => {
            // Check attribute filters first
            for (const attrFilter of attributeFilters) {
                if (!this.matchesAttributeFilter(message, attrFilter)) {
                    return false;
                }
            }

            // If no text filter, message passes
            if (!textFilter) {
                return true;
            }

            // Check text filter against message content
            return this.matchesTextFilter(message, textFilter);
        });
    }

    /**
     * Parse filter query into text and attribute filters
     * @param {string} query - Filter query
     * @returns {Object} Parsed filters
     */
    parseFilterQuery(query) {
        const attributeFilters = [];
        let textFilter = '';

        // Match attribute filters (key:value)
        const attrRegex = /(\w+):(\S+)/g;
        const textParts = [];

        let lastIndex = 0;
        let match;
        while ((match = attrRegex.exec(query)) !== null) {
            // Add text before this attribute filter
            if (match.index > lastIndex) {
                textParts.push(query.substring(lastIndex, match.index));
            }
            
            attributeFilters.push({
                key: match[1],
                value: match[2]
            });
            
            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < query.length) {
            textParts.push(query.substring(lastIndex));
        }

        textFilter = textParts.join(' ').trim();

        return { textFilter, attributeFilters };
    }

    /**
     * Check if message matches attribute filter
     */
    matchesAttributeFilter(message, filter) {
        if (!message.attributes) return false;
        
        const attrValue = message.attributes[filter.key];
        if (!attrValue) return false;
        
        return attrValue.toLowerCase().includes(filter.value.toLowerCase());
    }

    /**
     * Check if message matches text filter
     */
    matchesTextFilter(message, textFilter) {
        const searchText = textFilter.toLowerCase();
        
        // Search in message ID
        if (message.messageId && message.messageId.toLowerCase().includes(searchText)) {
            return true;
        }

        // Search in message body
        if (message.body && message.body.toLowerCase().includes(searchText)) {
            return true;
        }

        // Search in attributes
        if (message.attributes) {
            for (const [key, value] of Object.entries(message.attributes)) {
                if (key.toLowerCase().includes(searchText) || 
                    value.toLowerCase().includes(searchText)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Create filter UI component
     * @returns {HTMLElement} Filter container
     */
    createFilterUI() {
        const container = document.createElement('div');
        container.className = 'message-filter-container';

        // Search input container
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-input-container';

        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.className = 'message-filter-input';
        filterInput.placeholder = 'Search messages... (e.g., "payment" or "ApproximateReceiveCount:5")';
        filterInput.value = this.currentFilter;

        const clearButton = document.createElement('button');
        clearButton.className = 'filter-clear';
        clearButton.innerHTML = '✕';
        clearButton.title = 'Clear filter';
        clearButton.style.display = this.currentFilter ? 'block' : 'none';

        // Handle input changes
        let debounceTimer;
        filterInput.addEventListener('input', (e) => {
            this.currentFilter = e.target.value;
            clearButton.style.display = this.currentFilter ? 'block' : 'none';
            
            // Debounce filter changes
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                this.notifyFilterChange(this.currentFilter);
            }, 300);
        });

        // Handle clear button
        clearButton.addEventListener('click', () => {
            filterInput.value = '';
            this.currentFilter = '';
            clearButton.style.display = 'none';
            this.notifyFilterChange('');
        });

        searchContainer.appendChild(filterInput);
        searchContainer.appendChild(clearButton);

        // Batch controls container
        const batchControls = document.createElement('div');
        batchControls.className = 'batch-controls';

        // Select All button
        const selectAllBtn = document.createElement('button');
        selectAllBtn.className = 'btn btn-secondary';
        selectAllBtn.textContent = 'Select All';
        selectAllBtn.onclick = () => this.handleSelectAll();

        // Deselect All button
        const deselectAllBtn = document.createElement('button');
        deselectAllBtn.className = 'btn btn-secondary';
        deselectAllBtn.textContent = 'Deselect All';
        deselectAllBtn.onclick = () => this.handleDeselectAll();

        // Delete Selected button
        const deleteSelectedBtn = document.createElement('button');
        deleteSelectedBtn.className = 'btn btn-danger';
        deleteSelectedBtn.textContent = 'Delete Selected';
        deleteSelectedBtn.onclick = () => this.handleDeleteSelected();

        // Retry Selected button (only for DLQ)
        const retrySelectedBtn = document.createElement('button');
        retrySelectedBtn.className = 'btn btn-success';
        retrySelectedBtn.textContent = 'Retry Selected';
        retrySelectedBtn.style.display = 'none'; // Hidden by default
        retrySelectedBtn.onclick = () => this.handleRetrySelected();

        batchControls.appendChild(selectAllBtn);
        batchControls.appendChild(deselectAllBtn);
        batchControls.appendChild(deleteSelectedBtn);
        batchControls.appendChild(retrySelectedBtn);

        container.appendChild(searchContainer);
        container.appendChild(batchControls);

        // Store references for later use
        this.retryButton = retrySelectedBtn;

        return container;
    }

    /**
     * Highlight matching text in content
     * @param {string} text - Text to highlight in
     * @param {string} searchTerm - Term to highlight
     * @returns {string} HTML with highlighted matches
     */
    highlightMatches(text, searchTerm) {
        if (!searchTerm || !text) return text;
        
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    /**
     * Register callback for filter changes
     * @param {Function} callback - Callback function
     */
    onFilterChange(callback) {
        this.filterChangeCallbacks.push(callback);
    }

    /**
     * Notify all callbacks of filter change
     * @param {string} newFilter - New filter value
     */
    notifyFilterChange(newFilter) {
        this.filterChangeCallbacks.forEach(callback => {
            callback(newFilter);
        });
    }

    /**
     * Get current filter value
     * @returns {string} Current filter
     */
    getCurrentFilter() {
        return this.currentFilter;
    }

    /**
     * Set filter value programmatically
     * @param {string} filter - Filter value
     */
    setFilter(filter) {
        this.currentFilter = filter;
        const input = document.querySelector('.message-filter-input');
        if (input) {
            input.value = filter;
        }
        this.notifyFilterChange(filter);
    }

    /**
     * Handle Select All button click
     */
    handleSelectAll() {
        const checkboxes = document.querySelectorAll('.message-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = true);
    }

    /**
     * Handle Deselect All button click
     */
    handleDeselectAll() {
        const checkboxes = document.querySelectorAll('.message-checkbox');
        checkboxes.forEach(checkbox => checkbox.checked = false);
    }

    /**
     * Handle Delete Selected button click
     */
    handleDeleteSelected() {
        const selectedMessages = this.getSelectedMessages();
        if (selectedMessages.length === 0) {
            alert('No messages selected');
            return;
        }

        if (confirm(`Delete ${selectedMessages.length} selected messages?`)) {
            // Trigger batch delete event
            window.dispatchEvent(new CustomEvent('batchDelete', { 
                detail: { messageIds: selectedMessages } 
            }));
        }
    }

    /**
     * Handle Retry Selected button click
     */
    handleRetrySelected() {
        const selectedMessages = this.getSelectedMessages();
        if (selectedMessages.length === 0) {
            alert('No messages selected');
            return;
        }

        if (confirm(`Retry ${selectedMessages.length} selected messages?`)) {
            // Trigger batch retry event
            window.dispatchEvent(new CustomEvent('batchRetry', { 
                detail: { messageIds: selectedMessages } 
            }));
        }
    }

    /**
     * Get selected message IDs
     * @returns {string[]} Array of selected message IDs
     */
    getSelectedMessages() {
        const selectedCheckboxes = document.querySelectorAll('.message-checkbox:checked');
        return Array.from(selectedCheckboxes).map(checkbox => {
            const messageItem = checkbox.closest('.message-item');
            return messageItem ? messageItem.getAttribute('data-message-id') : null;
        }).filter(id => id !== null);
    }

    /**
     * Show/hide retry button based on queue type
     * @param {boolean} isDLQ - Whether current queue is a DLQ
     */
    setDLQMode(isDLQ) {
        if (this.retryButton) {
            this.retryButton.style.display = isDLQ ? 'inline-flex' : 'none';
        }
    }
}