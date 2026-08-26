/**
 * DASHBOARD ROUTE — placeholder.
 *
 * Mirrors the legacy `dashboard` state (`app/app.routes.js:27-31`), which is an
 * inline template listing links to the five feature modules.
 *
 * Migrates in Inc-6 alongside the authentication surface (ADR-010), because
 * the dashboard and login share the `/` document.
 */
import type { ReactElement } from 'react';
import { Placeholder } from './placeholder';

export function Dashboard(): ReactElement {
  return <Placeholder path="/dashboard" title="GlobalTravel Corp Portal" />;
}
