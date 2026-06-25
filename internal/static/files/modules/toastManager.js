/**
 * Toast Notification Manager
 * Provides non-blocking user notifications to replace alert/confirm dialogs
 */

export class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.toastId = 0;
    this.init();
  }

  /**
   * Initialize toast container
   */
  init() {
    // Create toast container if it doesn't exist
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      this.container.setAttribute('aria-live', 'polite');
      this.container.setAttribute('aria-atomic', 'true');
      document.body.appendChild(this.container);
    }
  }

  /**
   * Show a generic toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (success, error, warning, info)
   * @param {number} duration - Duration in ms (0 = permanent)
   * @returns {number} Toast ID
   */
  show(message, type = 'info', duration = 3000) {
    const id = ++this.toastId;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('data-toast-id', id);

    const icon = this.getIcon(type);
    const content = `
            <div class="toast-content">
                <span class="toast-icon">${icon}</span>
                <span class="toast-message">${this.escapeHtml(message)}</span>
                <button class="toast-close" aria-label="Close notification">×</button>
            </div>
        `;

    toast.innerHTML = content;

    // Close button handler
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.onclick = () => this.remove(id);

    // Add to container
    this.container.appendChild(toast);
    this.toasts.push({ id, element: toast, timeout: null });

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    // Auto-dismiss if duration > 0
    if (duration > 0) {
      const timeout = setTimeout(() => this.remove(id), duration);
      const toastObj = this.toasts.find((t) => t.id === id);
      if (toastObj) {
        toastObj.timeout = timeout;
      }
    }

    return id;
  }

  /**
   * Show success toast (green)
   * @param {string} message - Success message
   * @param {number} duration - Duration in ms
   * @returns {number} Toast ID
   */
  success(message, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  /**
   * Show error toast (red)
   * @param {string} message - Error message
   * @param {number} duration - Duration in ms
   * @returns {number} Toast ID
   */
  error(message, duration = 4000) {
    return this.show(message, 'error', duration);
  }

  /**
   * Show warning toast (yellow)
   * @param {string} message - Warning message
   * @param {number} duration - Duration in ms
   * @returns {number} Toast ID
   */
  warning(message, duration = 3500) {
    return this.show(message, 'warning', duration);
  }

  /**
   * Show info toast (blue)
   * @param {string} message - Info message
   * @param {number} duration - Duration in ms
   * @returns {number} Toast ID
   */
  info(message, duration = 3000) {
    return this.show(message, 'info', duration);
  }

  /**
   * Show confirmation dialog (replaces window.confirm)
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback when confirmed
   * @param {Function} onCancel - Callback when cancelled (optional)
   * @returns {number} Toast ID
   */
  confirm(message, onConfirm, onCancel = null) {
    const id = ++this.toastId;

    const toast = document.createElement('div');
    toast.className = 'toast toast-confirm';
    toast.setAttribute('role', 'alertdialog');
    toast.setAttribute('data-toast-id', id);

    const content = `
            <div class="toast-content">
                <span class="toast-icon">❓</span>
                <span class="toast-message">${this.escapeHtml(message)}</span>
            </div>
            <div class="toast-actions">
                <button class="toast-btn toast-btn-confirm">Confirm</button>
                <button class="toast-btn toast-btn-cancel">Cancel</button>
            </div>
        `;

    toast.innerHTML = content;

    // Button handlers
    const confirmBtn = toast.querySelector('.toast-btn-confirm');
    const cancelBtn = toast.querySelector('.toast-btn-cancel');

    confirmBtn.onclick = () => {
      this.remove(id);
      if (onConfirm) onConfirm();
    };

    cancelBtn.onclick = () => {
      this.remove(id);
      if (onCancel) onCancel();
    };

    // Add to container
    this.container.appendChild(toast);
    this.toasts.push({ id, element: toast, timeout: null });

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('toast-show');
    });

    // Focus confirm button for accessibility
    setTimeout(() => confirmBtn.focus(), 100);

    return id;
  }

  /**
   * Remove a toast by ID
   * @param {number} id - Toast ID
   */
  remove(id) {
    const toastObj = this.toasts.find((t) => t.id === id);
    if (!toastObj) return;

    // Clear timeout if exists
    if (toastObj.timeout) {
      clearTimeout(toastObj.timeout);
    }

    // Fade out animation
    toastObj.element.classList.remove('toast-show');
    toastObj.element.classList.add('toast-hide');

    // Remove from DOM after animation
    setTimeout(() => {
      if (toastObj.element.parentNode) {
        toastObj.element.parentNode.removeChild(toastObj.element);
      }
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }, 300);
  }

  /**
   * Clear all toasts
   */
  clearAll() {
    this.toasts.forEach((toast) => {
      if (toast.timeout) {
        clearTimeout(toast.timeout);
      }
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
    });
    this.toasts = [];
  }

  /**
   * Get icon for toast type
   * @param {string} type - Toast type
   * @returns {string} Icon character
   */
  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };
    return icons[type] || icons.info;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create singleton instance
export const toast = new ToastManager();
