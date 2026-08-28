/**
 * Expense data access — the Restangular replacement for
 * `app/components/expense-reconciliation/expense.service.js`.
 *
 * Everything goes through `api-client`, which owns the base URL, the auth
 * header, the error policy and runtime response validation (ADR-011 §4).
 *
 * NOT PORTED, deliberately — all three have zero callers in the legacy too:
 *   updateReport()        no consumer
 *   uploadReceipt()       the receipt endpoint answers, but nothing calls it;
 *                         a scenario pins exactly that. The React screen keeps
 *                         the file NAME on the line item, as the legacy does,
 *                         and posts nothing.
 *   getStatistics()       shadowed by the report-by-id route, which a scenario
 *                         also pins.
 *   linkToTravelRequest() no consumer (SEAM-5).
 */
import { request } from '../../lib/api-client';
import { z } from 'zod';
import {
  ExpenseReportListSchema,
  ExpenseReportSchema,
  type ExpenseReport,
} from '../../types/expense';

/** `{ message: 'Expense report deleted' }` — `api-mock/server.js:768`. */
const DeleteResultSchema = z.object({ message: z.string() });

/** GET /api/expense-reports */
export async function getReports(): Promise<ExpenseReport[]> {
  return request('/expense-reports', ExpenseReportListSchema);
}

/** GET /api/expense-reports/:id — `expense.service.js:35`. */
export async function getReportDetails(id: string): Promise<ExpenseReport> {
  return request(`/expense-reports/${id}`, ExpenseReportSchema);
}

/** POST /api/expense-reports — `expense.service.js:54`. */
export async function submitReport(body: unknown): Promise<ExpenseReport> {
  return request('/expense-reports', ExpenseReportSchema, { method: 'POST', body });
}

/** DELETE /api/expense-reports/:id — `expense.service.js:73`. */
export async function deleteReport(id: string): Promise<{ message: string }> {
  return request(`/expense-reports/${id}`, DeleteResultSchema, { method: 'DELETE' });
}
