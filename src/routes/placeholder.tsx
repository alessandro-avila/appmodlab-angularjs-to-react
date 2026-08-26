/**
 * PLACEHOLDER — the body of every unmigrated product route.
 *
 * Increment 0 migrates NO feature (plan §4.1). Each of the six feature routes
 * renders this instead, and increments 1–5 replace one file at a time.
 *
 * Nothing here is reachable by a user in Increment 0: the front door's route
 * ledger still points every product path at AngularJS, so a browser asking for
 * /flights is proxied to :8080 and never sees React. These components exist so
 * that the route TREE is complete and an increment's job is to swap a
 * component, not to invent a route.
 */
import type { ReactElement } from 'react';
import { ROUTE_LEDGER } from '../lib/route-ledger';

export interface PlaceholderProps {
  readonly path: string;
  readonly title: string;
}

export function Placeholder({ path, title }: PlaceholderProps): ReactElement {
  const row = ROUTE_LEDGER.find((r) => r.path === path);

  return (
    <div className="container" data-testid="placeholder" data-route={path}>
      <h2>{title}</h2>
      <p>
        This screen has not been migrated yet. It is still served by the AngularJS application
        {row ? ` and moves to React in ${row.migratesIn}` : ''}.
      </p>
      <dl>
        <dt>Legacy UI-Router state</dt>
        <dd data-testid="placeholder-legacy-state">{row?.legacyState ?? 'unknown'}</dd>
        <dt>Current owner</dt>
        <dd data-testid="placeholder-owner">{row?.owner ?? 'unknown'}</dd>
      </dl>
    </div>
  );
}
