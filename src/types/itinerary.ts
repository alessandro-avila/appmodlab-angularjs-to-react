/**
 * Itinerary contract types, generated from `specs/contracts/api/itinerary.yaml`
 * and verified against the running mock API during Increment 3.
 *
 * ADR-011 §4: the TypeScript type is INFERRED FROM the schema, never declared
 * beside it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TWO FIELDS THE TEMPLATE BINDS AND THE SERVER NEVER SENDS
 * ─────────────────────────────────────────────────────────────────────────
 * This is finding P-7 again, twice, and the schemas below refuse to repeat it.
 *
 *   `trip.destination` — bound at `itinerary.template.html:50` and `:92`.
 *     Trips carry no such field. `itinerary.feature` pins BOTH consequences:
 *     no trip shows a destination, and the details heading ends with a dangling
 *     "—". Both are PRESERVED; neither is in this schema.
 *
 *   `item.title` — bound at `:157` and `:215`. Items carry only `description`.
 *     `itinerary.feature` pins that every row's headline is blank. PRESERVED,
 *     and absent here.
 *
 * Declaring either would make the compiler agree with the bug — exactly the
 * failure mode ADR-011 exists to prevent. They are rendered as blanks in the
 * component, deliberately and with a comment at each site.
 */
import { z } from 'zod';

/**
 * A note pushed onto an item by `addNote()`.
 *
 * The server reads `req.body.notes` (`api-mock/server.js:540`) while the client
 * sends `{ text, createdAt }` (`itinerary.service.js:51`), so `item.notes` is
 * assigned `undefined` and nothing is ever stored. `itinerary.feature` pins
 * that ("A note is shown immediately but never stored"), so the field is
 * optional here rather than defaulted — an absent value must stay absent.
 */
export const ItineraryNoteSchema = z.object({
  text: z.string(),
  createdAt: z.string(),
  author: z.string(),
});
export type ItineraryNote = z.infer<typeof ItineraryNoteSchema>;

export const ItineraryItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  date: z.string(),
  /** '' on items created by a flight booking — the server knows no time. */
  time: z.string().optional(),
  description: z.string(),
  cost: z.number(),
  status: z.string(),
  /** Present on items created by a booking (SEAM-3); absent on the seeds. */
  confirmationCode: z.string().optional(),
  notes: z.array(ItineraryNoteSchema).optional(),
  // NO `title`. See the header.
});
export type ItineraryItem = z.infer<typeof ItineraryItemSchema>;

export const TripSchema = z.object({
  id: z.string(),
  userId: z.number(),
  name: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  /**
   * Sent by the server as "upcoming" for both seeds. The client throws it away
   * and derives status from the dates — `itinerary.feature` pins that the
   * derived value wins and both trips read "completed". PRESERVED.
   */
  status: z.string(),
  /**
   * Q-6 / ADR-020: DERIVED BY THE SERVER from the sum of `items[].cost`,
   * cancelled items included. Read-only. Until Increment 3 the client
   * recomputed this on arrival (`itinerary.service.js:19`); it no longer does.
   */
  totalCost: z.number(),
  items: z.array(ItineraryItemSchema),
  // NO `destination`. See the header.
});
export type Trip = z.infer<typeof TripSchema>;

export const TripListSchema = z.array(TripSchema);

/** What `PUT /api/itinerary-items/:id` returns — the merged item. */
export const ItineraryItemResponseSchema = ItineraryItemSchema;
