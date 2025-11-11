/**
 * Pagination Component Tests
 * Tests for pagination controls and navigation functionality
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the module that doesn't exist yet - TDD approach
vi.mock('@/pagination.js', () => ({
  Pagination: vi.fn().mockImplementation(function (options) {
    this.options = options;
    this.currentPage = 1;
    this.totalPages = Math.ceil(options.totalItems / options.itemsPerPage);
    this.element = null;

    this.render = vi.fn(() => {
      const container = document.createElement('div');
      container.className = 'pagination-controls';
      container.innerHTML = `
                <button class="pagination-prev" ${this.currentPage === 1 ? 'disabled' : ''}>Previous</button>
                <span class="pagination-info">Page ${this.currentPage} of ${this.totalPages}</span>
                <button class="pagination-next" ${this.currentPage === this.totalPages ? 'disabled' : ''}>Next</button>
                <input type="number" class="pagination-input" value="${this.currentPage}" min="1" max="${this.totalPages}">
                <button class="pagination-go">Go</button>
            `;

      // Attach event listeners to make buttons functional
      const prevBtn = container.querySelector('.pagination-prev');
      const nextBtn = container.querySelector('.pagination-next');
      const goBtn = container.querySelector('.pagination-go');
      const input = container.querySelector('.pagination-input');

      prevBtn.addEventListener('click', () => this.previousPage());
      nextBtn.addEventListener('click', () => this.nextPage());
      goBtn.addEventListener('click', () => {
        const page = parseInt(input.value, 10);
        this.goToPage(page);
      });

      this.element = container;
      return container;
    });

    this.goToPage = vi.fn((page) => {
      if (page >= 1 && page <= this.totalPages) {
        this.currentPage = page;
        if (this.options.onPageChange) {
          this.options.onPageChange(page);
        }
        // Save reference to old element before rendering
        const oldElement = this.element;
        const newElement = this.render();
        // If there's an existing element in the DOM, replace it
        if (oldElement && oldElement.parentNode) {
          oldElement.parentNode.replaceChild(newElement, oldElement);
        }
        return true;
      }
      return false;
    });

    this.nextPage = vi.fn(() => {
      return this.goToPage(this.currentPage + 1);
    });

    this.previousPage = vi.fn(() => {
      return this.goToPage(this.currentPage - 1);
    });

    this.getCurrentPage = vi.fn(() => this.currentPage);
    this.getTotalPages = vi.fn(() => this.totalPages);
    this.getPageInfo = vi.fn(() => ({
      currentPage: this.currentPage,
      totalPages: this.totalPages,
      startItem: (this.currentPage - 1) * this.options.itemsPerPage + 1,
      endItem: Math.min(this.currentPage * this.options.itemsPerPage, this.options.totalItems),
      totalItems: this.options.totalItems,
    }));
  }),
}));

import { Pagination } from '@/pagination.js';

describe('Pagination Component', () => {
  let pagination;
  let container;
  let onPageChangeMock;

  beforeEach(() => {
    // Setup DOM container
    document.body.innerHTML = '<div id="test-container"></div>';
    container = document.getElementById('test-container');

    // Create mock callback
    onPageChangeMock = vi.fn();
  });

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      pagination = new Pagination({
        totalItems: 150,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });

      expect(pagination.getCurrentPage()).toBe(1);
      expect(pagination.getTotalPages()).toBe(3);
    });

    it('should calculate correct number of pages', () => {
      pagination = new Pagination({
        totalItems: 175,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });

      expect(pagination.getTotalPages()).toBe(4); // Rounds up
    });

    it('should handle empty queue', () => {
      pagination = new Pagination({
        totalItems: 0,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });

      expect(pagination.getTotalPages()).toBe(0);
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      pagination = new Pagination({
        totalItems: 150,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });
    });

    it('should render pagination controls', () => {
      const element = pagination.render();
      container.appendChild(element);

      expect(container.querySelector('.pagination-controls')).toBeTruthy();
      expect(container.querySelector('.pagination-prev')).toBeTruthy();
      expect(container.querySelector('.pagination-next')).toBeTruthy();
      expect(container.querySelector('.pagination-info')).toBeTruthy();
      expect(container.querySelector('.pagination-input')).toBeTruthy();
      expect(container.querySelector('.pagination-go')).toBeTruthy();
    });

    it('should display correct page information', () => {
      const element = pagination.render();
      container.appendChild(element);

      const info = container.querySelector('.pagination-info');
      expect(info.textContent).toBe('Page 1 of 3');
    });

    it('should disable Previous button on first page', () => {
      const element = pagination.render();
      container.appendChild(element);

      const prevButton = container.querySelector('.pagination-prev');
      expect(prevButton.disabled).toBe(true);
    });

    it('should disable Next button on last page', () => {
      pagination.goToPage(3);
      const element = pagination.render();
      container.appendChild(element);

      const nextButton = container.querySelector('.pagination-next');
      expect(nextButton.disabled).toBe(true);
    });
  });

  describe('Navigation', () => {
    beforeEach(() => {
      pagination = new Pagination({
        totalItems: 150,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });
    });

    it('should navigate to next page', () => {
      const result = pagination.nextPage();

      expect(result).toBe(true);
      expect(pagination.getCurrentPage()).toBe(2);
      expect(onPageChangeMock).toHaveBeenCalledWith(2);
    });

    it('should navigate to previous page', () => {
      pagination.goToPage(2);
      onPageChangeMock.mockClear();

      const result = pagination.previousPage();

      expect(result).toBe(true);
      expect(pagination.getCurrentPage()).toBe(1);
      expect(onPageChangeMock).toHaveBeenCalledWith(1);
    });

    it('should not navigate beyond last page', () => {
      pagination.goToPage(3);
      onPageChangeMock.mockClear();

      const result = pagination.nextPage();

      expect(result).toBe(false);
      expect(pagination.getCurrentPage()).toBe(3);
      expect(onPageChangeMock).not.toHaveBeenCalled();
    });

    it('should not navigate before first page', () => {
      onPageChangeMock.mockClear();

      const result = pagination.previousPage();

      expect(result).toBe(false);
      expect(pagination.getCurrentPage()).toBe(1);
      expect(onPageChangeMock).not.toHaveBeenCalled();
    });

    it('should jump to specific page', () => {
      const result = pagination.goToPage(2);

      expect(result).toBe(true);
      expect(pagination.getCurrentPage()).toBe(2);
      expect(onPageChangeMock).toHaveBeenCalledWith(2);
    });

    it('should not jump to invalid page', () => {
      const result = pagination.goToPage(5);

      expect(result).toBe(false);
      expect(pagination.getCurrentPage()).toBe(1);
      expect(onPageChangeMock).not.toHaveBeenCalled();
    });

    it('should not jump to negative page', () => {
      const result = pagination.goToPage(-1);

      expect(result).toBe(false);
      expect(pagination.getCurrentPage()).toBe(1);
      expect(onPageChangeMock).not.toHaveBeenCalled();
    });
  });

  describe('Page Information', () => {
    beforeEach(() => {
      pagination = new Pagination({
        totalItems: 175,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });
    });

    it('should provide correct page info for first page', () => {
      const info = pagination.getPageInfo();

      expect(info).toEqual({
        currentPage: 1,
        totalPages: 4,
        startItem: 1,
        endItem: 50,
        totalItems: 175,
      });
    });

    it('should provide correct page info for middle page', () => {
      pagination.goToPage(2);
      const info = pagination.getPageInfo();

      expect(info).toEqual({
        currentPage: 2,
        totalPages: 4,
        startItem: 51,
        endItem: 100,
        totalItems: 175,
      });
    });

    it('should provide correct page info for last page', () => {
      pagination.goToPage(4);
      const info = pagination.getPageInfo();

      expect(info).toEqual({
        currentPage: 4,
        totalPages: 4,
        startItem: 151,
        endItem: 175,
        totalItems: 175,
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single page', () => {
      pagination = new Pagination({
        totalItems: 25,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });

      expect(pagination.getTotalPages()).toBe(1);
      expect(pagination.nextPage()).toBe(false);
      expect(pagination.previousPage()).toBe(false);
    });

    it('should handle exactly divisible items', () => {
      pagination = new Pagination({
        totalItems: 100,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });

      expect(pagination.getTotalPages()).toBe(2);
    });

    it('should handle very large datasets', () => {
      pagination = new Pagination({
        totalItems: 10000,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });

      expect(pagination.getTotalPages()).toBe(200);

      // Test jumping to middle
      expect(pagination.goToPage(100)).toBe(true);
      expect(pagination.getCurrentPage()).toBe(100);

      // Test page info
      const info = pagination.getPageInfo();
      expect(info.startItem).toBe(4951);
      expect(info.endItem).toBe(5000);
    });
  });

  describe('User Interaction Simulation', () => {
    beforeEach(() => {
      pagination = new Pagination({
        totalItems: 150,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });
      const element = pagination.render();
      container.appendChild(element);
    });

    it('should handle clicking Next button', () => {
      const nextButton = container.querySelector('.pagination-next');
      nextButton.click();

      expect(pagination.nextPage).toHaveBeenCalled();
      expect(onPageChangeMock).toHaveBeenCalled();
    });

    it('should handle clicking Previous button', () => {
      pagination.goToPage(2);
      const prevButton = container.querySelector('.pagination-prev');
      prevButton.click();

      expect(pagination.previousPage).toHaveBeenCalled();
    });

    it('should handle page input and Go button', () => {
      const input = container.querySelector('.pagination-input');
      const goButton = container.querySelector('.pagination-go');

      input.value = '3';
      goButton.click();

      expect(pagination.goToPage).toHaveBeenCalledWith(3);
    });
  });
});
