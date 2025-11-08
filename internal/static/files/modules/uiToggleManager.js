/**
 * UI Toggle Manager
 * Handles all UI toggle functionality (sections, sidebar, etc.)
 */
export class UIToggleManager {
    static toggleSection(sectionId, iconId) {
        const section = document.getElementById(sectionId);
        const icon = document.getElementById(iconId);
        
        if (section.classList.contains('collapsed')) {
            section.classList.remove('collapsed');
            icon.textContent = '▼';
        } else {
            section.classList.add('collapsed');
            icon.textContent = '▶';
        }
    }

    static toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        
        sidebar.classList.toggle('collapsed');
        
        if (sidebar.classList.contains('collapsed')) {
            toggleBtn.classList.add('visible');
        } else {
            toggleBtn.classList.remove('visible');
        }
    }

    static closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        
        sidebar.classList.add('collapsed');
        toggleBtn.classList.add('visible');
    }

    static toggleMessagesPause(appState) {
        const isPaused = appState.toggleMessagesPause();
        const pauseBtn = document.getElementById('pauseMessages');
        
        if (isPaused) {
            pauseBtn.innerHTML = '▶️ Resume';
            pauseBtn.title = 'Resume live updates';
        } else {
            pauseBtn.innerHTML = '⏸️ Pause';
            pauseBtn.title = 'Pause live updates';
        }
    }
}