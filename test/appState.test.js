import { describe, it, expect, beforeEach } from 'vitest';

import { AppState } from '../static/modules/appState.js';

describe('AppState', () => {
  let appState;

  beforeEach(() => {
    appState = new AppState();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      expect(appState.currentQueue).toBeNull();
      expect(appState.allMessages).toEqual([]);
      expect(appState.currentOffset).toBe(0);
      expect(appState.currentMessageOffset).toBe(0);
      expect(appState.isMessagesPaused).toBe(false);
    });
  });

  describe('queue management', () => {
    it('should set and get current queue', () => {
      const queue = { name: 'test-queue', url: 'https://test.com/queue' };

      appState.setCurrentQueue(queue);
      expect(appState.getCurrentQueue()).toEqual(queue);
    });
  });

  describe('message pause functionality', () => {
    it('should pause messages', () => {
      appState.pauseMessages();
      expect(appState.isMessagesPausedState()).toBe(true);
    });

    it('should resume messages', () => {
      appState.pauseMessages();
      appState.resumeMessages();
      expect(appState.isMessagesPausedState()).toBe(false);
    });

    it('should toggle message pause state', () => {
      expect(appState.toggleMessagesPause()).toBe(true);
      expect(appState.isMessagesPausedState()).toBe(true);

      expect(appState.toggleMessagesPause()).toBe(false);
      expect(appState.isMessagesPausedState()).toBe(false);
    });
  });

  describe('message management', () => {
    it('should set messages (replace)', () => {
      const messages = [
        { id: 1, body: 'test1' },
        { id: 2, body: 'test2' },
      ];

      appState.setMessages(messages);
      expect(appState.getMessages()).toEqual(messages);
    });

    it('should set messages (append)', () => {
      const initialMessages = [{ id: 1, body: 'test1' }];
      const newMessages = [{ id: 2, body: 'test2' }];

      appState.setMessages(initialMessages);
      appState.setMessages(newMessages, true);

      expect(appState.getMessages()).toEqual([...initialMessages, ...newMessages]);
    });

    it('should replace messages when append is false', () => {
      const initialMessages = [{ id: 1, body: 'test1' }];
      const newMessages = [{ id: 2, body: 'test2' }];

      appState.setMessages(initialMessages);
      appState.setMessages(newMessages, false);

      expect(appState.getMessages()).toEqual(newMessages);
    });
  });

  describe('offset management', () => {
    it('should reset offsets', () => {
      appState.currentOffset = 10;
      appState.currentMessageOffset = 5;

      appState.resetOffsets();

      expect(appState.currentOffset).toBe(0);
      expect(appState.currentMessageOffset).toBe(0);
    });
  });
});
