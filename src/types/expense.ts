/**
 * Expense-reconciliation contract types, generated from
 * `specs/contracts/api/expense-reconciliation.yaml` and verified against the
 * running mock API during Increment 5.
 *
 * ADR-011 §4: the TypeScript type is INFERRED FROM the schema, never declared
 * beside it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * `submittedAt` IS NULLABLE, AND THAT IS LOAD-BEARING
 * ─────────────────────────────────────────────────────────────────────────
 * `exp-2` carries `submittedAt: null`. Two pinned behaviours follow, and both
 * would be lost if this were typed as a plain string:
 *
 *   the list renders the literal text "Invalid date" for it, because
 *   `moment(null).format('MMM D, YYYY')` produces exactly that;
 *
 *   the undated draft sorts ABOVE the dated report in a most-recent-first
 *   list, because lodash `orderBy` puts a null last ascending and the order is
 *   reversed.
 *
 * Both are PRESERVED. Declaring the field non-null would make the compiler
 * agree that neither case exists — finding P-7 again.
 */
import { z } from 'zod';

export const ExpenseLineSchema = z.object({
  id: z.string(),
  date: z.string(),
  /**
   * The stored lines use `flights` / `hotels` / `meals` / `transport` /
   * `other` — NONE of which appear in the twelve values the form's dropdown
   * offers. `expense-reconciliation.feature` pins that mismatch, so this is a
   * free string rather than an enum of either list.
   */
  category: z.string(),
  description: z.string(),
  amount: z.number(),
  currency: z.string(),
  notes: z.string().optional(),
  /** Set only on lines added in the browser; never present on the seeds. */
  receiptName: z.string().optional(),
});
export type ExpenseLine = z.infer<typeof ExpenseLineSchema>;

export const ExpenseReportSchema = z.object({
  id: z.string(),
  userId: z.number(),
  title: z.string(),
  tripDestination: z.string(),
  /** SEAM-5 — stored without ever being checked against a real request. */
  travelRequestId: z.string().nullable().optional(),
  /**
   * SEAM-4 — neither client nor server ever writes anything but 'draft' or the
   * seeded 'pending'. The Approved tile is therefore structurally $0.00.
   */
  status: z.string(),
  /** See the header. Null on `exp-2`, and two scenarios depend on it. */
  submittedAt: z.string().nullable(),
  submittedBy: z.string().optional(),
  totalAmount: z.number(),
  expenses: z.array(ExpenseLineSchema),
  notes: z.string().optional(),
  categoryBreakdown: z.record(z.string(), z.number()).optional(),
});
export type ExpenseReport = z.infer<typeof ExpenseReportSchema>;

export const ExpenseReportListSchema = z.array(ExpenseReportSchema);
