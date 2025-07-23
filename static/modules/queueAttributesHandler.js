/**
 * Queue Attributes Handler
 * Manages display of queue attributes and metadata
 */
import { UIComponent } from './uiComponent.js';

export class QueueAttributesHandler extends UIComponent {
    constructor() {
        super('#queueAttributes');
    }

    display(attributes) {
        this.setContent('');
        
        if (!attributes) return;

        const table = document.createElement('table');
        table.className = 'attributes-table';

        const importantAttrs = [
            { key: 'ApproximateNumberOfMessages', label: 'Messages' },
            { key: 'ApproximateNumberOfMessagesNotVisible', label: 'Not Visible' },
            { key: 'ApproximateNumberOfMessagesDelayed', label: 'Delayed' },
            { key: 'MessageRetentionPeriod', label: 'Retention (sec)' },
            { key: 'VisibilityTimeout', label: 'Visibility (sec)' }
        ];

        importantAttrs.forEach(attr => {
            if (attributes[attr.key]) {
                const row = this.createAttributeRow(attr.label, attributes[attr.key]);
                table.appendChild(row);
            }
        });

        this.element.appendChild(table);
    }

    createAttributeRow(label, value) {
        const row = document.createElement('tr');
        
        const labelCell = document.createElement('td');
        labelCell.className = 'attr-label';
        labelCell.textContent = label;
        
        const valueCell = document.createElement('td');
        valueCell.className = 'attr-value';
        valueCell.textContent = value;
        
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        return row;
    }
}