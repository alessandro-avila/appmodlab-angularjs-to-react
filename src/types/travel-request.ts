/**
 * Travel-request contract types, generated from
 * `specs/contracts/api/travel-request.yaml` and verified against the running
 * mock API during Increment 4.
 *
 * ADR-011 §4: the TypeScript type is INFERRED FROM the schema, never declared
 * beside it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE FIELD THE SEARCH DIED ON
 * ─────────────────────────────────────────────────────────────────────────
 * `travelerName` is **optional**, and that is the whole story of this module's
 * broken search. The legacy `applyFilters()` called
 * `req.travelerName.toLowerCase()` unconditionally (controller:122); the seeds
 * carry `travelers: [{name, email}]` and no `travelerName`, so every keystroke
 * threw a TypeError out of the digest.
 *
 * It appears on requests the CLIENT created — `submitRequest()` assigns it at
 * controller:172 — and never on the seeds. Declaring it required would make the
 * compiler agree with the bug; declaring it optional makes the unsafe call a
 * compile error (finding P-7, the same lesson as the rooms payload).
 */
import { z } from 'zod';

export const ApprovalSchema = z.object({
  approver: z.string(),
  role: z.string(),
  status: z.string(),
  date: z.string().nullable(),
});
export type Approval = z.infer<typeof ApprovalSchema>;

export const EstimatedCostsSchema = z.object({
  flights: z.number(),
  hotels: z.number(),
  meals: z.number(),
  transport: z.number(),
  other: z.number(),
});
export type EstimatedCosts = z.infer<typeof EstimatedCostsSchema>;

export const TravelerSchema = z.object({
  name: z.string(),
  email: z.string(),
});
export type Traveler = z.infer<typeof TravelerSchema>;

export const TravelRequestSchema = z.object({
  id: z.string(),
  userId: z.number(),
  destination: z.string(),
  departDate: z.string(),
  returnDate: z.string(),
  purpose: z.string(),
  department: z.string(),
  justification: z.string().optional(),
  estimatedCosts: EstimatedCostsSchema,
  totalEstimate: z.number(),
  travelers: z.array(TravelerSchema),
  needsVisa: z.boolean(),
  needsInsurance: z.boolean(),
  status: z.string(),
  createdAt: z.string(),
  /**
   * SEAM-2 — stored and served, never shown. ADR-001 Q-1 ACCEPTS this; it is
   * not a defect to fix, and `travel-request.feature` pins that nothing on the
   * page can approve or reject. Modelled so the schema validates, not because
   * anything renders it.
   */
  approvals: z.array(ApprovalSchema).optional(),
  /** See the header. Absent on every seeded request. */
  travelerName: z.string().optional(),
  travelerEmail: z.string().optional(),
  submittedAt: z.string().optional(),
  notes: z.string().optional(),
});
export type TravelRequest = z.infer<typeof TravelRequestSchema>;

export const TravelRequestListSchema = z.array(TravelRequestSchema);

/**
 * SEAM-1 — the policy is published by the server and never requested by any
 * client. `travel-request.feature` pins both halves. Q-2 turns it into a
 * display-only feature in a later increment; this increment does not fetch it.
 *
 * Shape verified against `api-mock/server.js:257-267`, not guessed.
 */
export const TravelPolicySchema = z.object({
  maxFlightCost: z.number(),
  maxHotelPerNight: z.number(),
  maxMealPerDay: z.number(),
  maxTripDuration: z.number(),
  requiresApproval: z.object({
    flights: z.number(),
    hotels: z.number(),
    total: z.number(),
  }),
  allowedCabinClasses: z.array(z.string()),
  advanceBookingDays: z.number(),
  preferredAirlines: z.array(z.string()),
  preferredHotels: z.array(z.string()),
});
export type TravelPolicy = z.infer<typeof TravelPolicySchema>;
