/**
 * AWS Context Handler
 * Manages display of AWS connection context information
 */
import { UIComponent } from './uiComponent.js';
import { APIService } from './apiService.js';

export class AWSContextHandler extends UIComponent {
    constructor() {
        super('#awsContextDetails');
    }

    async load() {
        try {
            const context = await APIService.getAWSContext();
            this.render(context);
        } catch (error) {
            console.error('Error loading AWS context:', error);
            this.setContent('<div class="error-message">Failed to load AWS context</div>');
        }
    }

    render(context) {
        const fields = [
            { label: 'Mode', value: context.mode },
            { label: 'Region', value: context.region || 'N/A' },
            { label: 'Profile', value: context.profile || 'default' },
            { label: 'Account', value: context.accountId || 'N/A' }
        ];

        const table = document.createElement('table');
        table.className = 'aws-context-table';

        fields.forEach(field => {
            if (field.value && field.value !== 'N/A') {
                const row = this.createTableRow(field.label, field.value);
                table.appendChild(row);
            }
        });

        this.setContent('');
        this.element.appendChild(table);
    }

    createTableRow(label, value) {
        const row = document.createElement('tr');
        
        const labelCell = document.createElement('td');
        labelCell.className = 'aws-context-label';
        labelCell.textContent = label;
        
        const valueCell = document.createElement('td');
        valueCell.className = 'aws-context-value';
        valueCell.textContent = value;
        
        row.appendChild(labelCell);
        row.appendChild(valueCell);
        return row;
    }
}