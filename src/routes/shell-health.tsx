/**
 * SHELL HEALTH ROUTE — the one route React owns in Increment 0.
 *
 * Plan §4.2: "router tree with one trivial route that is not a product route
 * (a shell health route)".
 *
 * It is deliberately NOT a product route, so no baseline scenario observes it
 * and the Gherkin delta for Inc-0 stays a literal 0 / 235 / 0. Its only job is
 * to prove that React mounted, the router works, and the ledger is readable.
 */
import type { ReactElement } from 'react';
import { ROUTE_LEDGER, SHELL_HEALTH_PATH } from '../lib/route-ledger';

export function ShellHealth(): ReactElement {
  return (
    <div className="container" data-testid="shell-health">
      <h2>React shell — Increment 0</h2>
      <p data-testid="shell-status">ok</p>

      <h3>Route ledger</h3>
      <table className="table table-condensed" data-testid="ledger-table">
        <thead>
          <tr>
            <th>Path</th>
            <th>Legacy state</th>
            <th>Owner</th>
            <th>Migrates in</th>
          </tr>
        </thead>
        <tbody>
          {ROUTE_LEDGER.map((row) => (
            <tr key={row.path} data-testid={`ledger-row-${row.legacyState}`}>
              <td>{row.path}</td>
              <td>{row.legacyState}</td>
              <td data-testid={`ledger-owner-${row.legacyState}`}>{row.owner}</td>
              <td>{row.migratesIn}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        This route lives at <code>{SHELL_HEALTH_PATH}</code> and is not a product screen.
      </p>
    </div>
  );
}
