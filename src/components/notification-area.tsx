/**
 * NOTIFICATION AREA — the React port of `app/index.html:41-45`, which renders
 * `$rootScope.notifications` with an `ng-repeat`.
 *
 * Subscribed to the notification store (ADR-013). Bounded by the store itself,
 * closing P-5's unbounded array.
 */
import type { ReactElement } from 'react';
import { useNotificationStore, notificationStore, type NotificationType } from '../stores/notification-store';

/** Bootstrap 3 alert classes — ADR-005 carries Bootstrap 3 forward unchanged. */
const ALERT_CLASS: Record<NotificationType, string> = {
  info: 'alert-info',
  success: 'alert-success',
  warning: 'alert-warning',
  danger: 'alert-danger',
  error: 'alert-danger',
};

export function NotificationArea(): ReactElement | null {
  const notifications = useNotificationStore((s) => s.notifications);
  if (notifications.length === 0) return null;

  return (
    <div className="container" data-testid="notification-area">
      {notifications.map((n) => (
        <div key={n.id} className={`alert ${ALERT_CLASS[n.type]}`} data-testid="notification">
          <span data-testid="notification-message">{n.message}</span>
          <button
            type="button"
            className="close"
            aria-label="Dismiss notification"
            onClick={() => notificationStore.getState().dismiss(n.id)}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
