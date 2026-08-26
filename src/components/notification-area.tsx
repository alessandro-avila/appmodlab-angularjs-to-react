/**
 * NOTIFICATION AREA — the React port of `app/index.html:41-45`, which renders
 * `$rootScope.notifications` with an `ng-repeat`.
 *
 * Subscribed to the notification store (ADR-013). Bounded by the store itself,
 * closing P-5's unbounded array.
 */
import type { ReactElement } from 'react';
import { useNotificationStore, type NotificationType } from '../stores/notification-store';

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
    <div className="container notification-area" data-testid="notification-area">
      {notifications.map((n) => (
        <div key={n.id} className={`alert ${ALERT_CLASS[n.type]}`} data-testid="notification">
          {/*
            NO DISMISS CONTROL, deliberately. The legacy notification area
            (`app/index.html:41-45`) is an ng-repeat of plain alerts —
            "notifications accumulate in $rootScope and are never dismissed",
            as the baseline page object records. A close button would add text
            to the alert's innerText, and scenarios assert that text exactly
            (`the notification counts every flight that was found` compares it
            with strict equality). Dismissal is not a behaviour this app has.
          */}
          {n.message}
        </div>
      ))}
    </div>
  );
}
