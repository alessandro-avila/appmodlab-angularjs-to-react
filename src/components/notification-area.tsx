/**
 * NOTIFICATION AREA — the React port of `app/index.html:41-45`, which renders
 * `$rootScope.notifications` with an `ng-repeat`.
 *
 * Subscribed to the notification store (ADR-013). Bounded by the store itself,
 * closing P-5's unbounded array.
 */
import { useEffect, type ReactElement } from 'react';
import {
  notificationStore,
  useNotificationStore,
  type NotificationType,
} from '../stores/notification-store';

/** Bootstrap 3 alert classes — ADR-005 carries Bootstrap 3 forward unchanged. */
const ALERT_CLASS: Record<NotificationType, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  danger: 'alert-danger',
  error: 'alert-danger',
};

/**
 * ADR-024 D-2 — how long an alert stays on screen.
 *
 * Long enough that no scenario can watch one vanish mid-assertion: the slowest
 * notification step waits 1500ms after the triggering action before reading the
 * text, so this leaves a wide margin.
 */
export const NOTIFICATION_TTL_MS = 8000;

function Alert({
  id,
  message,
  type,
}: {
  readonly id: number;
  readonly message: string;
  readonly type: NotificationType;
}): ReactElement {
  // Dismiss through the vanilla store rather than a selected action: the
  // reference is module-stable, so the expiry effect depends only on `id` and
  // is not re-armed on every render.
  const dismiss = (): void => {
    notificationStore.getState().dismiss(id);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      notificationStore.getState().dismiss(id);
    }, NOTIFICATION_TTL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [id]);

  /*
    NO VISIBLE CLOSE BUTTON, deliberately — see ADR-024 D-2.

    The legacy area (`app/index.html:41-45`) is an ng-repeat of plain alerts and
    notifications "accumulate in $rootScope and are never dismissed". That
    lifetime is the defect being repaired; the plain-text rendering is not.

    A `×` glyph would join the alert's innerText, and
    `tests/pages/flight-search.page.js` reads `.notification-area .alert` with
    `allInnerTexts()` while `the notification counts every flight that was found`
    compares the result using strict equality. Expiring on a timer and dismissing
    on click both change lifetime without adding a single character of text, so
    every existing assertion still holds.
  */
  return (
    <div
      className={`alert ${ALERT_CLASS[type]}`}
      data-testid="notification"
      role="status"
      title="Dismiss"
      style={{ cursor: 'pointer' }}
      onClick={dismiss}
    >
      {message}
    </div>
  );
}

export function NotificationArea(): ReactElement | null {
  const notifications = useNotificationStore((s) => s.notifications);
  if (notifications.length === 0) return null;

  return (
    <div className="container notification-area" data-testid="notification-area">
      {notifications.map((n) => (
        <Alert key={n.id} id={n.id} message={n.message} type={n.type} />
      ))}
    </div>
  );
}
