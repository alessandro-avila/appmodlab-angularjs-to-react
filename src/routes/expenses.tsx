/**
 * EXPENSE RECONCILIATION ROUTE — migrated in Increment 5.
 *
 * The last feature module. The ledger row for `/expenses` is now
 * `owner: 'react'`; only `/login` and `/dashboard` remain with AngularJS, and
 * they migrate at the cutover (Inc-6, ADR-010).
 */
import type { ReactElement } from 'react';
import { ExpenseReconciliation } from '../features/expense-reconciliation/ExpenseReconciliation';

export function Expenses(): ReactElement {
  return <ExpenseReconciliation />;
}
