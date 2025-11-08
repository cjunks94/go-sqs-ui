/**
 * UI Component Base Class
 * Base class for all UI components with common functionality
 */
export class UIComponent {
    constructor(selector) {
        this.element = document.querySelector(selector);
        if (!this.element) {
            throw new Error(`Element not found: ${selector}`);
        }
    }

    show() {
        this.element.classList.remove('hidden');
    }

    hide() {
        this.element.classList.add('hidden');
    }

    setContent(content) {
        this.element.innerHTML = content;
    }

    addClass(className) {
        this.element.classList.add(className);
    }

    removeClass(className) {
        this.element.classList.remove(className);
    }

    toggleClass(className) {
        this.element.classList.toggle(className);
    }
}