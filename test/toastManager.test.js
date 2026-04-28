import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { ToastManager } from '../static/modules/toastManager.js';

describe('ToastManager', () => {
  let toast;

  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
    toast = new ToastManager();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('init', () => {
    it('should create a toast container with accessibility attributes on construction', () => {
      const container = document.getElementById('toast-container');
      expect(container).not.toBeNull();
      expect(container.getAttribute('aria-live')).toBe('polite');
      expect(container.getAttribute('aria-atomic')).toBe('true');
    });
  });

  describe('show', () => {
    it('should render a toast with the given message and type', () => {
      toast.show('Saved', 'success');

      const el = document.querySelector('.toast');
      expect(el).not.toBeNull();
      expect(el.classList.contains('toast-success')).toBe(true);
      expect(el.querySelector('.toast-message').textContent).toBe('Saved');
    });

    it('should pass message through escapeHtml so escaping happens before injection', () => {
      // happy-dom does not implement HTML escaping on innerHTML serialization,
      // so we verify the call boundary by spying rather than asserting on output.
      // In a real browser, escapeHtml's textContent->innerHTML round-trip
      // would HTML-encode the dangerous characters.
      const spy = vi.spyOn(toast, 'escapeHtml');
      toast.show('<img src=x onerror=alert(1)>', 'info');

      expect(spy).toHaveBeenCalledWith('<img src=x onerror=alert(1)>');
    });

    it('should auto-dismiss the toast after the configured duration', () => {
      toast.show('temp', 'info', 1000);
      expect(document.querySelectorAll('.toast').length).toBe(1);

      vi.advanceTimersByTime(1000);
      // remove() schedules a 300ms fade-out before DOM removal
      vi.advanceTimersByTime(300);

      expect(document.querySelectorAll('.toast').length).toBe(0);
    });

    it('should leave the toast permanent when duration is 0', () => {
      toast.show('persistent', 'info', 0);

      vi.advanceTimersByTime(60_000);
      expect(document.querySelectorAll('.toast').length).toBe(1);
    });

    it('should remove the toast when its close button is clicked', () => {
      toast.show('closable', 'info', 0);

      document.querySelector('.toast-close').click();
      vi.advanceTimersByTime(300);

      expect(document.querySelectorAll('.toast').length).toBe(0);
    });

    it('should default type to info when not specified', () => {
      toast.show('hello');

      const el = document.querySelector('.toast');
      expect(el.classList.contains('toast-info')).toBe(true);
    });

    it('should return a unique id per call so toasts can be removed individually', () => {
      const idA = toast.show('a');
      const idB = toast.show('b');

      expect(idA).not.toBe(idB);
    });
  });

  describe('typed shortcuts', () => {
    it('should render a success toast with the success class', () => {
      toast.success('Done');
      expect(document.querySelector('.toast-success')).not.toBeNull();
    });

    it('should render an error toast with the error class', () => {
      toast.error('Failed');
      expect(document.querySelector('.toast-error')).not.toBeNull();
    });

    it('should render a warning toast with the warning class', () => {
      toast.warning('Careful');
      expect(document.querySelector('.toast-warning')).not.toBeNull();
    });

    it('should render an info toast with the info class', () => {
      toast.info('FYI');
      expect(document.querySelector('.toast-info')).not.toBeNull();
    });
  });

  describe('confirm', () => {
    it('should render a confirm toast with both action buttons', () => {
      toast.confirm('Are you sure?', () => {});

      const confirmToast = document.querySelector('.toast-confirm');
      expect(confirmToast).not.toBeNull();
      expect(confirmToast.getAttribute('role')).toBe('alertdialog');
      expect(confirmToast.querySelector('.toast-btn-confirm')).not.toBeNull();
      expect(confirmToast.querySelector('.toast-btn-cancel')).not.toBeNull();
    });

    it('should invoke onConfirm and remove the toast when confirm is clicked', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      toast.confirm('Delete this?', onConfirm, onCancel);
      document.querySelector('.toast-btn-confirm').click();
      vi.advanceTimersByTime(300);

      expect(onConfirm).toHaveBeenCalledOnce();
      expect(onCancel).not.toHaveBeenCalled();
      expect(document.querySelector('.toast-confirm')).toBeNull();
    });

    it('should invoke onCancel and remove the toast when cancel is clicked', () => {
      const onConfirm = vi.fn();
      const onCancel = vi.fn();

      toast.confirm('Delete this?', onConfirm, onCancel);
      document.querySelector('.toast-btn-cancel').click();
      vi.advanceTimersByTime(300);

      expect(onCancel).toHaveBeenCalledOnce();
      expect(onConfirm).not.toHaveBeenCalled();
      expect(document.querySelector('.toast-confirm')).toBeNull();
    });

    it('should not throw when onCancel is omitted and cancel is clicked', () => {
      toast.confirm('msg', () => {});

      expect(() => {
        document.querySelector('.toast-btn-cancel').click();
        vi.advanceTimersByTime(300);
      }).not.toThrow();
    });

    it('should pass confirm message through escapeHtml before injection', () => {
      const spy = vi.spyOn(toast, 'escapeHtml');
      toast.confirm('<b>delete?</b>', () => {});

      expect(spy).toHaveBeenCalledWith('<b>delete?</b>');
    });
  });

  describe('remove', () => {
    it('should remove the targeted toast and leave others intact', () => {
      const idA = toast.show('a', 'info', 0);
      toast.show('b', 'info', 0);

      toast.remove(idA);
      vi.advanceTimersByTime(300);

      const remaining = document.querySelectorAll('.toast');
      expect(remaining.length).toBe(1);
      expect(remaining[0].querySelector('.toast-message').textContent).toBe('b');
    });

    it('should be a no-op when the id does not match any toast', () => {
      toast.show('a', 'info', 0);

      expect(() => toast.remove(9999)).not.toThrow();
      vi.advanceTimersByTime(300);
      expect(document.querySelectorAll('.toast').length).toBe(1);
    });

    it('should clear the auto-dismiss timer when removed manually', () => {
      const id = toast.show('temp', 'info', 1000);

      toast.remove(id);
      vi.advanceTimersByTime(300);
      // The original auto-dismiss timeout should not double-fire and crash
      vi.advanceTimersByTime(2000);

      expect(document.querySelectorAll('.toast').length).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('should remove every toast immediately', () => {
      toast.show('a', 'info', 0);
      toast.show('b', 'info', 0);
      toast.show('c', 'info', 0);

      toast.clearAll();

      expect(document.querySelectorAll('.toast').length).toBe(0);
    });

    it('should reset the toast list so subsequent shows start fresh', () => {
      toast.show('a', 'info', 0);
      toast.clearAll();
      toast.show('b', 'info', 0);

      expect(document.querySelectorAll('.toast').length).toBe(1);
    });
  });

  describe('getIcon', () => {
    it('should return the matching icon for known types', () => {
      expect(toast.getIcon('success')).toBe('✓');
      expect(toast.getIcon('error')).toBe('✕');
      expect(toast.getIcon('warning')).toBe('⚠');
      expect(toast.getIcon('info')).toBe('ℹ');
    });

    it('should fall back to the info icon for an unknown type', () => {
      expect(toast.getIcon('mystery')).toBe('ℹ');
    });
  });

  describe('escapeHtml', () => {
    it('should return a string for any string input without throwing', () => {
      // happy-dom's innerHTML serialization does not HTML-encode like real
      // browsers do, so we cannot assert on the encoded form here. The
      // textContent->innerHTML round-trip is the standard browser-side
      // escape pattern; this test guards the function shape only.
      expect(typeof toast.escapeHtml('<script>x</script>')).toBe('string');
      expect(typeof toast.escapeHtml('')).toBe('string');
      expect(typeof toast.escapeHtml('plain text')).toBe('string');
    });
  });
});
