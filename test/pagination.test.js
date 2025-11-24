/**
 * Pagination Component Tests
 * Tests for pagination controls and navigation functionality
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Pagination } from '../static/modules/pagination.js';

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

      expect(pagination.getCurrentPage()).toBe(2);
      expect(onPageChangeMock).toHaveBeenCalledWith(2);
    });

    it('should handle clicking Previous button', () => {
      pagination.goToPage(2);
      onPageChangeMock.mockClear();

      const prevButton = container.querySelector('.pagination-prev');
      prevButton.click();

      expect(pagination.getCurrentPage()).toBe(1);
      expect(onPageChangeMock).toHaveBeenCalledWith(1);
    });

    it('should handle page input and Go button', () => {
      const input = container.querySelector('.pagination-input');
      const goButton = container.querySelector('.pagination-go');

      input.value = '3';
      goButton.click();

      expect(pagination.getCurrentPage()).toBe(3);
      expect(onPageChangeMock).toHaveBeenCalledWith(3);
    });

    it('should handle Enter key in page input', () => {
      const input = container.querySelector('.pagination-input');
      input.value = '2';

      const enterEvent = new KeyboardEvent('keypress', { key: 'Enter' });
      input.dispatchEvent(enterEvent);

      expect(pagination.getCurrentPage()).toBe(2);
    });

    it('should not navigate on same page', () => {
      const result = pagination.goToPage(1);
      expect(result).toBe(false);
      expect(onPageChangeMock).not.toHaveBeenCalled();
    });
  });

  describe('Update Methods', () => {
    beforeEach(() => {
      pagination = new Pagination({
        totalItems: 150,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });
      const element = pagination.render();
      container.appendChild(element);
    });

    it('should update total items and recalculate pages', () => {
      pagination.updateTotalItems(250);

      expect(pagination.totalItems).toBe(250);
      expect(pagination.getTotalPages()).toBe(5);
    });

    it('should adjust current page if it exceeds new total pages', () => {
      pagination.goToPage(3);
      onPageChangeMock.mockClear();

      pagination.updateTotalItems(75); // Only 2 pages now

      expect(pagination.getCurrentPage()).toBe(2);
      expect(pagination.getTotalPages()).toBe(2);
    });

    it('should update display when total items change', () => {
      pagination.updateTotalItems(200);

      const pageInfo = container.querySelector('.pagination-info');
      expect(pageInfo.textContent).toContain('of 4');
    });

    it('should update items per page and reset to page 1', () => {
      pagination.goToPage(2);
      onPageChangeMock.mockClear();

      pagination.updateItemsPerPage(100);

      expect(pagination.itemsPerPage).toBe(100);
      expect(pagination.getTotalPages()).toBe(2);
      expect(pagination.getCurrentPage()).toBe(1);
      expect(onPageChangeMock).toHaveBeenCalledWith(1);
    });

    it('should handle zero total items', () => {
      pagination.updateTotalItems(0);

      expect(pagination.getTotalPages()).toBe(0);
      const info = pagination.getPageInfo();
      expect(info.startItem).toBe(0);
      expect(info.endItem).toBe(0);
    });
  });

  describe('Display Update', () => {
    beforeEach(() => {
      pagination = new Pagination({
        totalItems: 150,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });
      const element = pagination.render();
      container.appendChild(element);
    });

    it('should update display when navigating', () => {
      pagination.goToPage(2);

      const pageInfo = container.querySelector('.pagination-info');
      const pageInput = container.querySelector('.pagination-input');
      const prevButton = container.querySelector('.pagination-prev');
      const nextButton = container.querySelector('.pagination-next');

      expect(pageInfo.textContent).toBe('Page 2 of 3');
      expect(pageInput.value).toBe('2');
      expect(prevButton.disabled).toBe(false);
      expect(nextButton.disabled).toBe(false);
    });

    it('should not throw if element is not rendered', () => {
      const newPagination = new Pagination({
        totalItems: 100,
        itemsPerPage: 50,
        onPageChange: vi.fn(),
      });

      expect(() => newPagination.updateDisplay()).not.toThrow();
    });
  });

  describe('Destroy Method', () => {
    beforeEach(() => {
      pagination = new Pagination({
        totalItems: 150,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });
      const element = pagination.render();
      container.appendChild(element);
    });

    it('should remove element from DOM', () => {
      expect(container.querySelector('.pagination-controls')).toBeTruthy();

      pagination.destroy();

      expect(container.querySelector('.pagination-controls')).toBeFalsy();
    });

    it('should set element to null after destroy', () => {
      pagination.destroy();
      expect(pagination.element).toBeNull();
    });

    it('should not throw if element not in DOM', () => {
      pagination.element = document.createElement('div');
      expect(() => pagination.destroy()).not.toThrow();
    });
  });

  describe('Constructor Options', () => {
    it('should use provided currentPage', () => {
      pagination = new Pagination({
        totalItems: 150,
        itemsPerPage: 50,
        currentPage: 2,
        onPageChange: onPageChangeMock,
      });

      expect(pagination.getCurrentPage()).toBe(2);
    });

    it('should default to page 1 if no currentPage provided', () => {
      pagination = new Pagination({
        totalItems: 150,
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });

      expect(pagination.getCurrentPage()).toBe(1);
    });

    it('should use default itemsPerPage of 50', () => {
      pagination = new Pagination({
        totalItems: 150,
        onPageChange: onPageChangeMock,
      });

      expect(pagination.itemsPerPage).toBe(50);
    });

    it('should use default totalItems of 0', () => {
      pagination = new Pagination({
        itemsPerPage: 50,
        onPageChange: onPageChangeMock,
      });

      expect(pagination.totalItems).toBe(0);
    });

    it('should use no-op function if onPageChange not provided', () => {
      pagination = new Pagination({
        totalItems: 150,
        itemsPerPage: 50,
      });

      expect(() => pagination.goToPage(2)).not.toThrow();
    });
  });
});
