/**
 * Enhanced Message View
 * Provides detailed message viewing for debugging DLQ messages
 */

export class EnhancedMessageView {
    /**
     * Create an enhanced view of a message with all debugging information
     * @param {Object} message - Message object
     * @returns {HTMLElement} Enhanced message view element
     */
    createEnhancedView(message) {
        const container = document.createElement('div');
        container.className = 'enhanced-message-view';

        // Add all sections
        container.appendChild(this.createMetadataSection(message));
        container.appendChild(this.createAttributesSection(message));
        container.appendChild(this.createBodySection(message));
        container.appendChild(this.createActionsSection(message));

        return container;
    }

    /**
     * Create metadata section showing key message information
     */
    createMetadataSection(message) {
        const section = document.createElement('div');
        section.className = 'message-metadata';

        const receiveCount = parseInt(message.attributes?.ApproximateReceiveCount || '1');
        const receiveCountStatus = this.getReceiveCountStatus(receiveCount);

        section.innerHTML = `
            <div class="metadata-row">
                <span class="metadata-label">Message ID:</span>
                <span class="metadata-value monospace">${message.messageId}</span>
            </div>
            <div class="metadata-row">
                <span class="metadata-label">Receipt Handle:</span>
                <span class="metadata-value monospace truncate" title="${message.receiptHandle}">
                    ${message.receiptHandle.substring(0, 50)}...
                </span>
            </div>
            <div class="metadata-row">
                <span class="metadata-label">Receive Count:</span>
                <span class="receive-count-badge ${receiveCountStatus}">
                    ${receiveCount} ${receiveCount === 1 ? 'receive' : 'receives'}
                </span>
            </div>
            <div class="metadata-row">
                <span class="metadata-label">First Received:</span>
                <span class="metadata-value">
                    ${this.formatTimestamp(message.attributes?.ApproximateFirstReceiveTimestamp)}
                </span>
            </div>
            <div class="metadata-row">
                <span class="metadata-label">Last Sent:</span>
                <span class="metadata-value">
                    ${this.formatTimestamp(message.attributes?.SentTimestamp)}
                </span>
            </div>
        `;

        return section;
    }

    /**
     * Create attributes section showing all message attributes
     */
    createAttributesSection(message) {
        const section = document.createElement('div');
        section.className = 'message-attributes';

        const header = document.createElement('h4');
        header.textContent = 'Message Attributes';
        section.appendChild(header);

        const attributesList = document.createElement('div');
        attributesList.className = 'attributes-list';

        if (message.attributes && Object.keys(message.attributes).length > 0) {
            for (const [key, value] of Object.entries(message.attributes)) {
                const row = document.createElement('div');
                row.className = 'attribute-row';
                row.innerHTML = `
                    <span class="attribute-key">${key}:</span>
                    <span class="attribute-value monospace">${value}</span>
                `;
                attributesList.appendChild(row);
            }
        } else {
            attributesList.innerHTML = '<span class="no-attributes">No attributes</span>';
        }

        section.appendChild(attributesList);
        return section;
    }

    /**
     * Create body section with syntax highlighting and copy functionality
     */
    createBodySection(message) {
        const section = document.createElement('div');
        section.className = 'message-body-section';

        const header = document.createElement('div');
        header.className = 'body-header';
        header.innerHTML = `
            <h4>Message Body</h4>
            <button class="btn btn-secondary btn-small copy-body-btn">
                Copy Body
            </button>
        `;
        section.appendChild(header);

        const bodyContent = document.createElement('pre');
        bodyContent.className = 'message-body-content';

        // Try to parse and format JSON
        let formattedBody = message.body;
        let isJSON = false;
        try {
            const parsed = JSON.parse(message.body);
            formattedBody = JSON.stringify(parsed, null, 2);
            isJSON = true;
        } catch {
            // Not JSON, keep as plain text
        }

        if (isJSON) {
            bodyContent.classList.add('json-highlighted');
            bodyContent.innerHTML = this.syntaxHighlightJSON(formattedBody);
        } else {
            bodyContent.classList.add('plain-text');
            bodyContent.textContent = formattedBody;
        }

        section.appendChild(bodyContent);

        // Add copy functionality
        const copyBtn = header.querySelector('.copy-body-btn');
        copyBtn.onclick = () => this.copyToClipboard(message.body, copyBtn);

        return section;
    }

    /**
     * Create actions section with retry and other operations
     */
    createActionsSection(message) {
        const section = document.createElement('div');
        section.className = 'message-actions';

        section.innerHTML = `
            <button class="btn btn-primary retry-btn" data-message-id="${message.messageId}">
                Retry Message
            </button>
            <button class="btn btn-secondary copy-all-btn">
                Copy All Details
            </button>
        `;

        // Copy all details functionality
        const copyAllBtn = section.querySelector('.copy-all-btn');
        copyAllBtn.onclick = () => {
            const allDetails = this.formatAllDetails(message);
            this.copyToClipboard(allDetails, copyAllBtn);
        };

        return section;
    }

    /**
     * Simple JSON syntax highlighting
     */
    syntaxHighlightJSON(json) {
        return json
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (match, p1, p2, p3) => {
                const cls = p3 ? 'json-key' : 'json-string';
                return `<span class="${cls}">${match}</span>`;
            })
            .replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>')
            .replace(/\b(null)\b/g, '<span class="json-null">$1</span>')
            .replace(/\b(\d+)\b/g, '<span class="json-number">$1</span>');
    }

    /**
     * Format timestamp to readable date
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return 'N/A';
        try {
            const date = new Date(parseInt(timestamp));
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleString();
        } catch {
            return 'Invalid date';
        }
    }

    /**
     * Get status level based on receive count
     */
    getReceiveCountStatus(count) {
        if (count >= 5) return 'danger';
        if (count >= 3) return 'warning';
        return 'normal';
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            const originalText = button.textContent;
            button.textContent = 'Copied!';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = originalText;
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    /**
     * Format all message details for copying
     */
    formatAllDetails(message) {
        const details = [
            '=== MESSAGE DETAILS ===',
            `Message ID: ${message.messageId}`,
            `Receipt Handle: ${message.receiptHandle}`,
            '',
            '=== ATTRIBUTES ===',
            ...Object.entries(message.attributes || {}).map(([k, v]) => `${k}: ${v}`),
            '',
            '=== BODY ===',
            message.body
        ];
        return details.join('\n');
    }
}