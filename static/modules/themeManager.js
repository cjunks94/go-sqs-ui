/**
 * Theme Manager
 * Handles theme switching and persistence
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
        this.storageKey = 'sqs-ui-theme';
        this.init();
    }

    init() {
        // Load saved theme or use system preference
        this.loadTheme();
        
        // Listen for system theme changes
        this.watchSystemTheme();
        
        // Create theme toggle if it doesn't exist
        this.createThemeToggle();
    }

    loadTheme() {
        // Check localStorage first
        const savedTheme = localStorage.getItem(this.storageKey);
        
        if (savedTheme) {
            this.currentTheme = savedTheme;
        } else {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.currentTheme = prefersDark ? 'dark' : 'light';
        }
        
        this.applyTheme(this.currentTheme);
    }

    applyTheme(theme) {
        const html = document.documentElement;
        
        // Remove existing theme classes
        html.classList.remove('theme-light', 'theme-dark');
        
        // Add new theme class
        html.classList.add(`theme-${theme}`);
        
        // Update current theme
        this.currentTheme = theme;
        
        // Save to localStorage
        localStorage.setItem(this.storageKey, theme);
        
        // Update toggle button if it exists
        this.updateToggleButton();
        
        // Dispatch custom event for other components
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme }
        }));
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
    }

    createThemeToggle() {
        // Check if toggle already exists
        if (document.querySelector('.theme-toggle')) {
            return;
        }

        // Create theme toggle button
        const toggle = document.createElement('button');
        toggle.className = 'theme-toggle';
        toggle.setAttribute('aria-label', 'Toggle theme');
        toggle.innerHTML = this.getToggleIcon();
        
        // Add click handler
        toggle.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Add to header or create header if it doesn't exist
        this.addToggleToHeader(toggle);
    }

    addToggleToHeader(toggle) {
        // Look for existing header controls
        const messagesControls = document.querySelector('.messages-controls');
        if (messagesControls) {
            messagesControls.appendChild(toggle);
            return;
        }

        // Look for messages header
        const messagesHeader = document.querySelector('.messages-header');
        if (messagesHeader) {
            // Create controls container if it doesn't exist
            let controls = messagesHeader.querySelector('.messages-controls');
            if (!controls) {
                controls = document.createElement('div');
                controls.className = 'messages-controls';
                messagesHeader.appendChild(controls);
            }
            controls.appendChild(toggle);
            return;
        }

        // Fallback: add to body
        document.body.appendChild(toggle);
    }

    updateToggleButton() {
        const toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.innerHTML = this.getToggleIcon();
            toggle.setAttribute('aria-label', `Switch to ${this.currentTheme === 'light' ? 'dark' : 'light'} theme`);
        }
    }

    getToggleIcon() {
        if (this.currentTheme === 'light') {
            return '🌙'; // Moon icon for switching to dark
        } else {
            return '☀️'; // Sun icon for switching to light
        }
    }

    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // Only auto-switch if no theme is saved in localStorage
        mediaQuery.addListener((e) => {
            if (!localStorage.getItem(this.storageKey)) {
                const theme = e.matches ? 'dark' : 'light';
                this.applyTheme(theme);
            }
        });
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    setTheme(theme) {
        if (['light', 'dark'].includes(theme)) {
            this.applyTheme(theme);
        } else {
            console.warn(`Invalid theme: ${theme}. Valid themes are 'light' and 'dark'.`);
        }
    }
}

// Initialize theme manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.themeManager = new ThemeManager();
    });
} else {
    window.themeManager = new ThemeManager();
}

export default ThemeManager;