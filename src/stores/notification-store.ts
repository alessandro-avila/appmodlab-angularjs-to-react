/**
 * NOTIFICATION STORE — the React port of the `notification:add` handler at
 * `app/app.js:44-50`.
 *
 * The legacy mechanism, verbatim:
 *
 *     $rootScope.notifications = [];                          // app.js:41
 *     $rootScope.$on('notification:add', function (event, message, type) {
 *       $rootScope.notifications.push({
 *         message: message,
 *         type: type || 'info',                               // app.js:47
 *         timestamp: new Date()                               // app.js:48
 *       });
 *     });
 *
 * This is the ONLY one of the five $rootScope events that actually works
 * (increment plan §0.4): its listener sits on $rootScope itself, so it is
 * always alive. It carries 24 of the 29 emit sites.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ONE DELIBERATE DIFFERENCE: the array is BOUNDED.
 * ─────────────────────────────────────────────────────────────────────────
 * Assessment finding P-5 records "an unbounded `notifications` array ... with
 * no ownership or teardown discipline". ADR-013 closes it by giving the slice
 * a named owner (the app shell) and a cap.
 *
 * This is safe to do in Increment 0 and is not an unauthorised behaviour
 * change, because `app/index.html:41-45` renders the legacy array and the
 * React shell owns no route that any baseline scenario reaches. The cap
 * becomes user-visible only when a feature increment starts emitting into it.
 */
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

/** app.js:47 — `type || 'info'`. The observed values across the 24 emit sites. */
export type NotificationType = 'info' | 'success' | 'warning' | 'danger' | 'error';

export interface Notification {
  /** Stable identity for React keys. The legacy array had none — see P-7 on
   *  what happens when a list is keyed by a field that does not exist. */
  readonly id: number;
  readonly message: string;
  readonly type: NotificationType;
  /** app.js:48 — `new Date()`. */
  readonly timestamp: Date;
}

/** P-5: the bound that the legacy array never had. */
export const MAX_NOTIFICATIONS = 5;

export interface NotificationState {
  readonly notifications: readonly Notification[];
  /** Replaces `$rootScope.$broadcast('notification:add', message, type)`. */
  add(message: string, type?: NotificationType): void;
  dismiss(id: number): void;
  clear(): void;
}

let sequence = 0;

/** Exported for tests: keeps ids deterministic across cases. */
export function resetNotificationSequence(): void {
  sequence = 0;
}

export const notificationStore = createStore<NotificationState>((set) => ({
  notifications: [],

  add: (message, type) =>
    set((state) => {
      const entry: Notification = {
        id: ++sequence,
        message,
        type: type ?? 'info', // app.js:47 — `type || 'info'`
        timestamp: new Date(), // app.js:48
      };
      // Append, then keep only the newest MAX_NOTIFICATIONS (P-5).
      return { notifications: [...state.notifications, entry].slice(-MAX_NOTIFICATIONS) };
    }),

  dismiss: (id) =>
    set((state) => ({ notifications: state.notifications.filter((n) => n.id !== id) })),

  clear: () => set({ notifications: [] }),
}));

/** Component-side subscription with a selector (ADR-013). */
export const useNotificationStore = <T,>(selector: (state: NotificationState) => T): T =>
  useStore(notificationStore, selector);

/**
 * Callable from outside React — the API client's error policy raises
 * notifications, and it is a module, not a component.
 */
export function notify(message: string, type?: NotificationType): void {
  notificationStore.getState().add(message, type);
}
