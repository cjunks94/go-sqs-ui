import { describe, it, expect, beforeEach } from 'vitest';

import { QueueAttributesHandler } from '../static/modules/queueAttributesHandler.js';

describe('QueueAttributesHandler', () => {
  let handler;

  beforeEach(() => {
    document.body.innerHTML = '<div id="queueAttributes"></div>';
    handler = new QueueAttributesHandler();
  });

  describe('display', () => {
    it('should render a table row for each important attribute when present', () => {
      handler.display({
        ApproximateNumberOfMessages: '42',
        ApproximateNumberOfMessagesNotVisible: '3',
        VisibilityTimeout: '30',
      });

      const rows = document.querySelectorAll('#queueAttributes table tr');
      expect(rows.length).toBe(3);

      const labels = Array.from(document.querySelectorAll('.attr-label')).map((el) => el.textContent);
      expect(labels).toEqual(['Messages', 'Not Visible', 'Visibility (sec)']);

      const values = Array.from(document.querySelectorAll('.attr-value')).map((el) => el.textContent);
      expect(values).toEqual(['42', '3', '30']);
    });

    it('should skip attributes that are not in the important whitelist', () => {
      handler.display({
        ApproximateNumberOfMessages: '5',
        QueueArn: 'arn:aws:sqs:us-east-1:123:test-queue',
        RedrivePolicy: '{"deadLetterTargetArn":"..."}',
      });

      const rows = document.querySelectorAll('#queueAttributes table tr');
      expect(rows.length).toBe(1);
      expect(document.querySelector('.attr-label').textContent).toBe('Messages');
    });

    it('should clear previous content when called again', () => {
      handler.display({ ApproximateNumberOfMessages: '5' });
      handler.display({ VisibilityTimeout: '60' });

      const rows = document.querySelectorAll('#queueAttributes table tr');
      expect(rows.length).toBe(1);
      expect(document.querySelector('.attr-label').textContent).toBe('Visibility (sec)');
    });

    it('should clear content and render nothing when attributes is null', () => {
      handler.setContent('<table><tr><td>stale</td></tr></table>');
      handler.display(null);

      expect(document.getElementById('queueAttributes').innerHTML).toBe('');
    });

    it('should clear content and render nothing when attributes is undefined', () => {
      handler.setContent('<table><tr><td>stale</td></tr></table>');
      handler.display(undefined);

      expect(document.getElementById('queueAttributes').innerHTML).toBe('');
    });

    it('should render an empty table when attributes object has no important keys', () => {
      handler.display({ QueueArn: 'arn:aws:sqs:test', CreatedTimestamp: '1640995200' });

      const table = document.querySelector('#queueAttributes table');
      expect(table).not.toBeNull();
      expect(table.querySelectorAll('tr').length).toBe(0);
    });
  });

  describe('createAttributeRow', () => {
    it('should produce a row with labelled label and value cells', () => {
      const row = handler.createAttributeRow('Messages', '42');

      expect(row.tagName).toBe('TR');
      const cells = row.querySelectorAll('td');
      expect(cells.length).toBe(2);
      expect(cells[0].className).toBe('attr-label');
      expect(cells[0].textContent).toBe('Messages');
      expect(cells[1].className).toBe('attr-value');
      expect(cells[1].textContent).toBe('42');
    });

    it('should use textContent (not innerHTML) so values are inserted safely', () => {
      // The handler sets `valueCell.textContent = value`, which is the safe
      // path. We can't directly assert the encoded innerHTML here because
      // happy-dom does not HTML-encode on serialization, so we verify the
      // structural property: the cell holds the raw string as text and has
      // no parsed child elements.
      const row = handler.createAttributeRow('Label', '<script>alert(1)</script>');

      const valueCell = row.querySelector('.attr-value');
      expect(valueCell.children.length).toBe(0);
      expect(valueCell.textContent).toBe('<script>alert(1)</script>');
    });
  });
});
