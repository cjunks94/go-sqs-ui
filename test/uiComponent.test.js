import { describe, it, expect, beforeEach } from 'vitest';

import { UIComponent } from '../static/modules/uiComponent.js';

describe('UIComponent', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-element" class="initial-class">Test Content</div>
    `;
  });

  describe('initialization', () => {
    it('should find and store element by selector', () => {
      const component = new UIComponent('#test-element');
      expect(component.element).toBeDefined();
      expect(component.element.id).toBe('test-element');
    });

    it('should throw error if element not found', () => {
      expect(() => new UIComponent('#non-existent')).toThrow('Element not found: #non-existent');
    });
  });

  describe('visibility methods', () => {
    let component;

    beforeEach(() => {
      component = new UIComponent('#test-element');
    });

    it('should show element by removing hidden class', () => {
      component.element.classList.add('hidden');
      component.show();
      expect(component.element.classList.contains('hidden')).toBe(false);
    });

    it('should hide element by adding hidden class', () => {
      component.hide();
      expect(component.element.classList.contains('hidden')).toBe(true);
    });
  });

  describe('content methods', () => {
    let component;

    beforeEach(() => {
      component = new UIComponent('#test-element');
    });

    it('should set element content', () => {
      component.setContent('<p>New Content</p>');
      expect(component.element.innerHTML).toBe('<p>New Content</p>');
    });
  });

  describe('class methods', () => {
    let component;

    beforeEach(() => {
      component = new UIComponent('#test-element');
    });

    it('should add class to element', () => {
      component.addClass('new-class');
      expect(component.element.classList.contains('new-class')).toBe(true);
    });

    it('should remove class from element', () => {
      component.removeClass('initial-class');
      expect(component.element.classList.contains('initial-class')).toBe(false);
    });

    it('should toggle class on element', () => {
      component.toggleClass('toggle-class');
      expect(component.element.classList.contains('toggle-class')).toBe(true);

      component.toggleClass('toggle-class');
      expect(component.element.classList.contains('toggle-class')).toBe(false);
    });
  });
});
