/**
 * Pagination Component
 * Provides pagination controls for navigating through large datasets
 */
export class Pagination {
  constructor(options) {
    this.options = options;
    this.currentPage = options.currentPage || 1;
    this.itemsPerPage = options.itemsPerPage || 50;
    this.totalItems = options.totalItems || 0;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage) || 0;
    this.onPageChange = options.onPageChange || (() => {});
    this.element = null;
  }

  /**
   * Render pagination controls
   * @returns {HTMLElement} The pagination container element
   */
  render() {
    const container = document.createElement('div');
    container.className = 'pagination-controls';

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'pagination-prev btn btn-secondary';
    prevButton.textContent = 'Previous';
    prevButton.disabled = this.currentPage === 1;
    prevButton.onclick = () => this.previousPage();

    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;

    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'pagination-next btn btn-secondary';
    nextButton.textContent = 'Next';
    nextButton.disabled = this.currentPage === this.totalPages;
    nextButton.onclick = () => this.nextPage();

    // Page input
    const pageInput = document.createElement('input');
    pageInput.type = 'number';
    pageInput.className = 'pagination-input';
    pageInput.value = this.currentPage;
    pageInput.min = 1;
    pageInput.max = this.totalPages;
    pageInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        this.goToPage(parseInt(e.target.value));
      }
    };

    // Go button
    const goButton = document.createElement('button');
    goButton.className = 'pagination-go btn btn-primary';
    goButton.textContent = 'Go';
    goButton.onclick = () => {
      const page = parseInt(pageInput.value);
      this.goToPage(page);
    };

    // Assemble controls
    container.appendChild(prevButton);
    container.appendChild(pageInfo);
    container.appendChild(nextButton);
    container.appendChild(pageInput);
    container.appendChild(goButton);

    this.element = container;
    return container;
  }

  /**
   * Navigate to a specific page
   * @param {number} page - Page number to navigate to
   * @returns {boolean} True if navigation successful, false otherwise
   */
  goToPage(page) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.onPageChange(page);
      this.updateDisplay();
      return true;
    }
    return false;
  }

  /**
   * Navigate to the next page
   * @returns {boolean} True if navigation successful, false otherwise
   */
  nextPage() {
    return this.goToPage(this.currentPage + 1);
  }

  /**
   * Navigate to the previous page
   * @returns {boolean} True if navigation successful, false otherwise
   */
  previousPage() {
    return this.goToPage(this.currentPage - 1);
  }

  /**
   * Get current page number
   * @returns {number} Current page number
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * Get total number of pages
   * @returns {number} Total pages
   */
  getTotalPages() {
    return this.totalPages;
  }

  /**
   * Get detailed page information
   * @returns {Object} Page information including items range
   */
  getPageInfo() {
    const startItem = this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
    const endItem = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);

    return {
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      startItem: startItem,
      endItem: endItem,
      totalItems: this.totalItems,
    };
  }

  /**
   * Update the display after page change
   */
  updateDisplay() {
    if (!this.element) return;

    // Update buttons
    const prevButton = this.element.querySelector('.pagination-prev');
    const nextButton = this.element.querySelector('.pagination-next');
    const pageInfo = this.element.querySelector('.pagination-info');
    const pageInput = this.element.querySelector('.pagination-input');

    if (prevButton) prevButton.disabled = this.currentPage === 1;
    if (nextButton) nextButton.disabled = this.currentPage === this.totalPages;
    if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
    if (pageInput) pageInput.value = this.currentPage;
  }

  /**
   * Update total items and recalculate pages
   * @param {number} totalItems - New total item count
   */
  updateTotalItems(totalItems) {
    this.totalItems = totalItems;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage) || 0;

    // Adjust current page if necessary
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }

    this.updateDisplay();
  }

  /**
   * Update items per page and recalculate
   * @param {number} itemsPerPage - New items per page count
   */
  updateItemsPerPage(itemsPerPage) {
    this.itemsPerPage = itemsPerPage;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage) || 0;

    // Reset to first page when changing page size
    this.currentPage = 1;
    this.updateDisplay();
    this.onPageChange(1);
  }

  /**
   * Destroy the pagination component
   */
  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}
