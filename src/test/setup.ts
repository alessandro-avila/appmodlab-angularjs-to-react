import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { authStore } from '../stores/auth-store';
import { notificationStore, resetNotificationSequence } from '../stores/notification-store';

/**
 * Every test starts from a clean shell: no DOM, no session, no notifications,
 * and a reset id sequence so notification ids are deterministic.
 */
beforeEach(() => {
  globalThis.localStorage?.clear();
  authStore.setState({ user: null });
  notificationStore.setState({ notifications: [] });
  resetNotificationSequence();
});

afterEach(() => {
  cleanup();
  globalThis.localStorage?.clear();
});
