/**
 * DLQ Detection Module
 * Utilities for identifying and handling Dead Letter Queues
 */

/**
 * Check if a queue is a Dead Letter Queue
 * @param {Object} queue - Queue object with name and attributes
 * @returns {boolean} True if the queue is a DLQ
 */
export function isDLQ(queue) {
    if (!queue || !queue.name) return false;
    
    // Check common DLQ naming patterns
    const dlqPatterns = [
        /-dlq$/i,
        /-DLQ$/i,
        /_dlq$/i,
        /_DLQ$/i
    ];
    
    // Check name patterns
    if (dlqPatterns.some(pattern => pattern.test(queue.name))) {
        return true;
    }
    
    // Check if queue has redrive allow policy (indicates it's a DLQ)
    // DLQs have RedriveAllowPolicy, source queues have RedrivePolicy
    if (queue.attributes && queue.attributes.RedriveAllowPolicy) {
        try {
            const policy = JSON.parse(queue.attributes.RedriveAllowPolicy);
            if (policy.redrivePermission && policy.sourceQueueArns) {
                return true;
            }
        } catch (_e) {
            // Invalid JSON, not a DLQ
        }
    }
    
    return false;
}

/**
 * Extract the source queue name from a DLQ name
 * @param {string} dlqName - Name of the DLQ
 * @returns {string|null} Source queue name or null if not a DLQ
 */
export function getSourceQueue(dlqName) {
    if (!dlqName) return null;
    
    const patterns = [
        { pattern: /-dlq$/i, suffix: '-dlq' },
        { pattern: /-DLQ$/i, suffix: '-DLQ' },
        { pattern: /_dlq$/i, suffix: '_dlq' },
        { pattern: /_DLQ$/i, suffix: '_DLQ' }
    ];
    
    for (const { pattern, suffix } of patterns) {
        if (pattern.test(dlqName)) {
            const index = dlqName.toLowerCase().lastIndexOf(suffix.toLowerCase());
            return dlqName.substring(0, index);
        }
    }
    
    return null;
}

/**
 * Get HTML for DLQ indicator badge
 * @returns {string} HTML string for DLQ indicator
 */
export function getDLQIndicator() {
    return '<span class="dlq-indicator" title="Dead Letter Queue">DLQ</span>';
}

/**
 * Add DLQ styling and indicators to a queue element
 * @param {HTMLElement} element - Queue element to enhance
 * @param {Object} queue - Queue object
 */
export function enhanceQueueElement(element, queue) {
    if (isDLQ(queue)) {
        // Find the parent queue-item to add the class
        const queueItem = element.closest('.queue-item');
        if (queueItem) {
            queueItem.classList.add('dlq-queue');
        }
        
        // Add DLQ indicator badge
        const indicator = document.createElement('span');
        indicator.className = 'dlq-badge';
        indicator.title = 'Dead Letter Queue';
        indicator.textContent = 'DLQ';
        element.appendChild(indicator);
        
        // Add source queue info if available
        const sourceQueue = getSourceQueue(queue.name);
        if (sourceQueue && queueItem) {
            queueItem.setAttribute('data-source-queue', sourceQueue);
        }
    }
}