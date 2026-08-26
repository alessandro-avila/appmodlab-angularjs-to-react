/**
 * NOTIFICATION STORE — behavioural equivalence with the `notification:add`
 * handler at `app/app.js:44-50`.
 */
import { describe, it, expect } from 'vitest';
import { notificationStore, notify, MAX_NOTIFICATIONS } from '../stores/notification-store';

describe('notification store — app/app.js:44-50', () => {
  it('starts empty, exactly as app/app.js:41 initialises it', () => {
    expect(notificationStore.getState().notifications).toEqual([]);
  });

  it('appends a message, mirroring the push at app.js:45', () => {
    notificationStore.getState().add('Flight booked', 'success');
    const [entry] = notificationStore.getState().notifications;
    expect(entry?.message).toBe('Flight booked');
    expect(entry?.type).toBe('success');
  });

  it('defaults the type to "info" — app.js:47 `type || \'info\'`', () => {
    notificationStore.getState().add('No type supplied');
    expect(notificationStore.getState().notifications[0]?.type).toBe('info');
  });

  it('stamps a Date — app.js:48 `timestamp: new Date()`', () => {
    notificationStore.getState().add('Stamped');
    expect(notificationStore.getState().notifications[0]?.timestamp).toBeInstanceOf(Date);
  });

  it('preserves append ORDER, as an array push does', () => {
    notificationStore.getState().add('first');
    notificationStore.getState().add('second');
    expect(notificationStore.getState().notifications.map((n) => n.message)).toEqual([
      'first',
      'second',
    ]);
  });

  it('gives every entry a unique id — the legacy array had none (cf. P-7)', () => {
    notificationStore.getState().add('a');
    notificationStore.getState().add('b');
    const ids = notificationStore.getState().notifications.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('notification store — P-5, the unbounded array is bounded', () => {
  it(`keeps at most ${MAX_NOTIFICATIONS}, discarding oldest first`, () => {
    // Assessment P-5: "an unbounded notifications array ... with no ownership
    // or teardown discipline". ADR-013 gives the slice an owner and a cap.
    for (let i = 1; i <= 12; i += 1) notificationStore.getState().add(`n${i}`);

    const messages = notificationStore.getState().notifications.map((n) => n.message);
    expect(messages).toHaveLength(MAX_NOTIFICATIONS);
    expect(messages).toEqual(['n8', 'n9', 'n10', 'n11', 'n12']);
  });
});

describe('notification store — usable from outside React', () => {
  it('notify() adds from a non-component, as the API client needs', () => {
    notify('from the error policy', 'danger');
    expect(notificationStore.getState().notifications[0]?.message).toBe('from the error policy');
    expect(notificationStore.getState().notifications[0]?.type).toBe('danger');
  });

  it('dismiss removes one entry by id', () => {
    notificationStore.getState().add('keep');
    notificationStore.getState().add('drop');
    const target = notificationStore.getState().notifications[1];
    notificationStore.getState().dismiss(target?.id ?? -1);
    expect(notificationStore.getState().notifications.map((n) => n.message)).toEqual(['keep']);
  });
});
