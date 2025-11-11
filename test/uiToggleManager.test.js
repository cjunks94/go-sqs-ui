import { describe, it, expect, beforeEach } from 'vitest';

import { UIToggleManager } from '../static/modules/uiToggleManager.js';
import { AppState } from '../static/modules/appState.js';

describe('UIToggleManager', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="test-section" class="collapsed">Section Content</div>
      <span id="test-icon">▶</span>
      <div id="sidebar">Sidebar</div>
      <button id="sidebarToggle">Toggle</button>
      <button id="pauseMessages">⏸️ Pause</button>
    `;
  });

  describe('toggleSection', () => {
    it('should expand collapsed section', () => {
      UIToggleManager.toggleSection('test-section', 'test-icon');

      const section = document.getElementById('test-section');
      const icon = document.getElementById('test-icon');

      expect(section.classList.contains('collapsed')).toBe(false);
      expect(icon.textContent).toBe('▼');
    });

    it('should collapse expanded section', () => {
      const section = document.getElementById('test-section');
      section.classList.remove('collapsed');

      UIToggleManager.toggleSection('test-section', 'test-icon');

      expect(section.classList.contains('collapsed')).toBe(true);
      expect(document.getElementById('test-icon').textContent).toBe('▶');
    });
  });

  describe('toggleSidebar', () => {
    it('should collapse sidebar and show toggle button', () => {
      UIToggleManager.toggleSidebar();

      const sidebar = document.getElementById('sidebar');
      const toggleBtn = document.getElementById('sidebarToggle');

      expect(sidebar.classList.contains('collapsed')).toBe(true);
      expect(toggleBtn.classList.contains('visible')).toBe(true);
    });

    it('should expand sidebar and hide toggle button', () => {
      const sidebar = document.getElementById('sidebar');
      const toggleBtn = document.getElementById('sidebarToggle');

      // First collapse it
      sidebar.classList.add('collapsed');
      toggleBtn.classList.add('visible');

      // Then toggle it back
      UIToggleManager.toggleSidebar();

      expect(sidebar.classList.contains('collapsed')).toBe(false);
      expect(toggleBtn.classList.contains('visible')).toBe(false);
    });
  });

  describe('closeSidebar', () => {
    it('should close sidebar and show toggle button', () => {
      UIToggleManager.closeSidebar();

      const sidebar = document.getElementById('sidebar');
      const toggleBtn = document.getElementById('sidebarToggle');

      expect(sidebar.classList.contains('collapsed')).toBe(true);
      expect(toggleBtn.classList.contains('visible')).toBe(true);
    });
  });

  describe('toggleMessagesPause', () => {
    it('should update button text when pausing', () => {
      const appState = new AppState();
      appState.isMessagesPaused = false;

      UIToggleManager.toggleMessagesPause(appState);

      const pauseBtn = document.getElementById('pauseMessages');
      expect(pauseBtn.innerHTML).toBe('▶️ Resume');
      expect(pauseBtn.title).toBe('Resume live updates');
    });

    it('should update button text when resuming', () => {
      const appState = new AppState();
      appState.isMessagesPaused = true;

      UIToggleManager.toggleMessagesPause(appState);

      const pauseBtn = document.getElementById('pauseMessages');
      expect(pauseBtn.innerHTML).toBe('⏸️ Pause');
      expect(pauseBtn.title).toBe('Pause live updates');
    });
  });
});
