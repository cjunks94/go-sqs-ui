/**
 * API Service for HTTP requests
 * Handles all communication with the backend API
 */
export class APIService {
  static async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${url}:`, error);
      throw error;
    }
  }

  static async getAWSContext() {
    return this.request('/api/aws-context');
  }

  static async getQueues(limit = 20) {
    return this.request(`/api/queues?limit=${limit}`);
  }

  static async getMessages(queueUrl, limit = 10) {
    return this.request(`/api/queues/${encodeURIComponent(queueUrl)}/messages?limit=${limit}`);
  }

  static async sendMessage(queueUrl, messageBody) {
    return this.request(`/api/queues/${encodeURIComponent(queueUrl)}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body: messageBody }),
    });
  }

  static async deleteMessage(queueUrl, receiptHandle) {
    const response = await fetch(
      `/api/queues/${encodeURIComponent(queueUrl)}/messages/${encodeURIComponent(receiptHandle)}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  static async retryMessage(sourceQueueUrl, message, targetQueueUrl) {
    return this.request(`/api/queues/${encodeURIComponent(sourceQueueUrl)}/retry`, {
      method: 'POST',
      body: JSON.stringify({
        message: message,
        targetQueueUrl: targetQueueUrl,
      }),
    });
  }

  /**
   * Get queue statistics
   * @param {string} queueUrl - Queue URL
   * @returns {Promise<Object>} Queue statistics
   */
  static async getQueueStatistics(queueUrl) {
    return this.request(`/api/queues/${encodeURIComponent(queueUrl)}/statistics`);
  }

  /**
   * Get DLQ-specific statistics
   * @param {string} queueUrl - DLQ URL
   * @returns {Promise<Object>} DLQ statistics
   */
  static async getDLQStatistics(queueUrl) {
    // For now, this uses the same endpoint but could be separated
    const stats = await this.getQueueStatistics(queueUrl);
    return stats.dlqStatistics || {};
  }
}
