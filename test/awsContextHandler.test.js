/**
 * AWS Context Handler Tests
 * Tests for AWS context display and mode switching functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AWSContextHandler } from '../static/modules/awsContextHandler.js';

// Mock the APIService
vi.mock('../static/modules/apiService.js', () => ({
    APIService: {
        getAWSContext: vi.fn()
    }
}));

import { APIService } from '../static/modules/apiService.js';

describe('AWSContextHandler', () => {
    let contextHandler;
    let mockElement;

    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '<div id="awsContextDetails"></div>';
        mockElement = document.getElementById('awsContextDetails');
        
        // Create handler instance
        contextHandler = new AWSContextHandler();
        
        // Reset mocks
        vi.clearAllMocks();
    });

    describe('Demo Mode Context', () => {
        it('should display demo mode context correctly', async () => {
            const demoContext = {
                mode: 'Demo',
                region: null,
                profile: null,
                accountId: null
            };

            APIService.getAWSContext.mockResolvedValue(demoContext);

            await contextHandler.load();

            expect(APIService.getAWSContext).toHaveBeenCalledOnce();
            
            // Should show demo mode
            const table = mockElement.querySelector('.aws-context-table');
            expect(table).toBeTruthy();
            
            const rows = table.querySelectorAll('tr');
            expect(rows).toHaveLength(1); // Only mode should be displayed
            
            expect(rows[0].querySelector('.aws-context-label').textContent).toBe('Mode');
            expect(rows[0].querySelector('.aws-context-value').textContent).toBe('Demo');
        });

        it('should handle demo context with minimal data', async () => {
            const minimalContext = {
                mode: 'Demo'
            };

            APIService.getAWSContext.mockResolvedValue(minimalContext);

            await contextHandler.load();

            const table = mockElement.querySelector('.aws-context-table');
            expect(table).toBeTruthy();
            
            const rows = table.querySelectorAll('tr');
            expect(rows).toHaveLength(1);
            expect(rows[0].querySelector('.aws-context-value').textContent).toBe('Demo');
        });
    });

    describe('Live AWS Context', () => {
        it('should display live AWS context with full details', async () => {
            const liveContext = {
                mode: 'Live AWS',
                region: 'us-east-1',
                profile: 'default',
                accountId: '*** (IAM)'
            };

            APIService.getAWSContext.mockResolvedValue(liveContext);

            await contextHandler.load();

            expect(APIService.getAWSContext).toHaveBeenCalledOnce();
            
            const table = mockElement.querySelector('.aws-context-table');
            expect(table).toBeTruthy();
            
            const rows = table.querySelectorAll('tr');
            expect(rows).toHaveLength(4); // All fields should be displayed
            
            // Verify each field
            const rowData = Array.from(rows).map(row => ({
                label: row.querySelector('.aws-context-label').textContent,
                value: row.querySelector('.aws-context-value').textContent
            }));
            
            expect(rowData).toContainEqual({ label: 'Mode', value: 'Live AWS' });
            expect(rowData).toContainEqual({ label: 'Region', value: 'us-east-1' });
            expect(rowData).toContainEqual({ label: 'Profile', value: 'default' });
            expect(rowData).toContainEqual({ label: 'Account', value: '*** (IAM)' });
        });

        it('should display live AWS context with session credentials', async () => {
            const sessionContext = {
                mode: 'Live AWS',
                region: 'us-west-2',
                profile: 'dev-profile',
                accountId: '*** (Session)'
            };

            APIService.getAWSContext.mockResolvedValue(sessionContext);

            await contextHandler.load();

            const table = mockElement.querySelector('.aws-context-table');
            const rows = table.querySelectorAll('tr');
            
            const accountRow = Array.from(rows).find(row => 
                row.querySelector('.aws-context-label').textContent === 'Account'
            );
            
            expect(accountRow.querySelector('.aws-context-value').textContent).toBe('*** (Session)');
        });

        it('should handle live AWS context with missing optional fields', async () => {
            const partialContext = {
                mode: 'Live AWS',
                region: 'eu-west-1',
                profile: null,
                accountId: null
            };

            APIService.getAWSContext.mockResolvedValue(partialContext);

            await contextHandler.load();

            const table = mockElement.querySelector('.aws-context-table');
            const rows = table.querySelectorAll('tr');
            
            // Should only show mode and region (non-null values)
            expect(rows).toHaveLength(2);
            
            const rowData = Array.from(rows).map(row => ({
                label: row.querySelector('.aws-context-label').textContent,
                value: row.querySelector('.aws-context-value').textContent
            }));
            
            expect(rowData).toContainEqual({ label: 'Mode', value: 'Live AWS' });
            expect(rowData).toContainEqual({ label: 'Region', value: 'eu-west-1' });
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            const apiError = new Error('Network error');
            APIService.getAWSContext.mockRejectedValue(apiError);

            await contextHandler.load();

            expect(APIService.getAWSContext).toHaveBeenCalledOnce();
            expect(mockElement.innerHTML).toContain('Failed to load AWS context');
            expect(mockElement.querySelector('.error-message')).toBeTruthy();
        });

        it('should handle malformed context data', async () => {
            const malformedContext = null;
            APIService.getAWSContext.mockResolvedValue(malformedContext);

            await contextHandler.load();

            // Should not crash, should show error message
            expect(APIService.getAWSContext).toHaveBeenCalledOnce();
            expect(mockElement.innerHTML).toContain('Invalid context data');
            expect(mockElement.querySelector('.error-message')).toBeTruthy();
        });

        it('should handle context with unexpected structure', async () => {
            const unexpectedContext = {
                someOtherField: 'value',
                mode: 'Unknown Mode'
            };

            APIService.getAWSContext.mockResolvedValue(unexpectedContext);

            await contextHandler.load();

            const table = mockElement.querySelector('.aws-context-table');
            expect(table).toBeTruthy();
            
            const rows = table.querySelectorAll('tr');
            expect(rows).toHaveLength(1);
            expect(rows[0].querySelector('.aws-context-value').textContent).toBe('Unknown Mode');
        });
    });

    describe('UI Rendering', () => {
        it('should clear previous content before rendering new context', async () => {
            // Set some initial content
            mockElement.innerHTML = '<div>Previous content</div>';

            const context = { mode: 'Demo' };
            APIService.getAWSContext.mockResolvedValue(context);

            await contextHandler.load();

            // Previous content should be cleared
            expect(mockElement.innerHTML).not.toContain('Previous content');
            expect(mockElement.querySelector('.aws-context-table')).toBeTruthy();
        });

        it('should create properly structured table rows', () => {
            const row = contextHandler.createTableRow('Test Label', 'Test Value');
            
            expect(row.tagName).toBe('TR');
            expect(row.children).toHaveLength(2);
            
            const labelCell = row.children[0];
            const valueCell = row.children[1];
            
            expect(labelCell.tagName).toBe('TD');
            expect(labelCell.className).toBe('aws-context-label');
            expect(labelCell.textContent).toBe('Test Label');
            
            expect(valueCell.tagName).toBe('TD');
            expect(valueCell.className).toBe('aws-context-value');
            expect(valueCell.textContent).toBe('Test Value');
        });

        it('should skip N/A values in rendering', async () => {
            const contextWithNA = {
                mode: 'Live AWS',
                region: 'N/A',
                profile: 'test-profile',
                accountId: 'N/A'
            };

            APIService.getAWSContext.mockResolvedValue(contextWithNA);

            await contextHandler.load();

            const table = mockElement.querySelector('.aws-context-table');
            const rows = table.querySelectorAll('tr');
            
            // Should only show mode and profile (non-N/A values)
            expect(rows).toHaveLength(2);
            
            const labels = Array.from(rows).map(row => 
                row.querySelector('.aws-context-label').textContent
            );
            
            expect(labels).toContain('Mode');
            expect(labels).toContain('Profile');
            expect(labels).not.toContain('Region');
            expect(labels).not.toContain('Account');
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle rapid context switches', async () => {
            // First load demo context
            const demoContext = { mode: 'Demo' };
            APIService.getAWSContext.mockResolvedValue(demoContext);
            await contextHandler.load();

            let table = mockElement.querySelector('.aws-context-table');
            expect(table.querySelectorAll('tr')).toHaveLength(1);

            // Then switch to live AWS
            const liveContext = {
                mode: 'Live AWS',
                region: 'us-east-1',
                profile: 'default',
                accountId: '*** (IAM)'
            };
            APIService.getAWSContext.mockResolvedValue(liveContext);
            await contextHandler.load();

            table = mockElement.querySelector('.aws-context-table');
            expect(table.querySelectorAll('tr')).toHaveLength(4);
        });

        it('should handle context reload after error', async () => {
            // First request fails
            APIService.getAWSContext.mockRejectedValue(new Error('Connection failed'));
            await contextHandler.load();
            expect(mockElement.querySelector('.error-message')).toBeTruthy();

            // Second request succeeds
            const context = { mode: 'Demo' };
            APIService.getAWSContext.mockResolvedValue(context);
            await contextHandler.load();

            expect(mockElement.querySelector('.error-message')).toBeFalsy();
            expect(mockElement.querySelector('.aws-context-table')).toBeTruthy();
        });
    });
});