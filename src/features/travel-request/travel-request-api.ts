/**
 * Travel-request data access — the Restangular replacement for
 * `app/components/travel-request/travel-request.service.js`.
 *
 * Everything goes through `api-client`, which owns the base URL, the auth
 * header, the error policy and runtime response validation (ADR-011 §4).
 *
 * WHAT THE OLD SERVICE DID THAT THIS DOES NOT: `getRequests()` decorated every
 * request with six derived fields — `departFormatted`, `returnFormatted`,
 * `createdFormatted`, `tripDuration`, `totalFormatted`, `daysUntilTravel`
 * (`travel-request.service.js:20-25`) — mutating the payload on the way past.
 * Formatting is a rendering concern and lives in the component.
 *
 * NOT PORTED, deliberately:
 *   getApprovalHistory()  SEAM-2 is ACCEPTED (Q-1). Nothing renders approvals,
 *                         and `travel-request.feature` pins that.
 *   getPolicyLimits()     SEAM-1. Never called by the legacy either; the
 *                         feature pins that the policy is never requested.
 *                         Q-2 makes it display-only in a later increment.
 *   getRequest()          zero callers.
 *   deleteRequest()       no such client method; the route exists unused.
 */
import { request } from '../../lib/api-client';
import {
  TravelRequestListSchema,
  TravelRequestSchema,
  type TravelRequest,
} from '../../types/travel-request';

/** GET /api/travel-requests */
export async function getRequests(): Promise<TravelRequest[]> {
  return request('/travel-requests', TravelRequestListSchema);
}

/** POST /api/travel-requests — `travel-request.service.js:46`. */
export async function submitRequest(body: unknown): Promise<TravelRequest> {
  return request('/travel-requests', TravelRequestSchema, { method: 'POST', body });
}

/** PUT /api/travel-requests/:id — `travel-request.service.js:56`. */
export async function updateRequest(id: string, body: unknown): Promise<TravelRequest> {
  return request(`/travel-requests/${id}`, TravelRequestSchema, { method: 'PUT', body });
}

/**
 * PUT /api/travel-requests/:id with only a status — `service.js:65`.
 *
 * A partial PUT, exactly as the legacy sent it. The mock merges with
 * Object.assign, so the rest of the request survives.
 */
export async function cancelRequest(id: string): Promise<TravelRequest> {
  return request(`/travel-requests/${id}`, TravelRequestSchema, {
    method: 'PUT',
    body: { status: 'cancelled' },
  });
}
