/**
 * AWS SQS UI Application - Main Entry Point
 * Modern ES6+ JavaScript with modular architecture
 */
import { SQSApp } from './modules/sqsApp.js';

// Initialize Application
let app;

document.addEventListener('DOMContentLoaded', async () => {
  app = new SQSApp();

  // Make app available globally for queue selection callback
  window.app = app;

  await app.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (app) {
    app.cleanup();
  }
});
