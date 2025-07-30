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

        container.appendChild(filterInput);
        container.appendChild(clearButton);

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
}