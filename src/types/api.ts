/**
 * Shared contract types, generated from `specs/contracts/api/*.yaml`.
 *
 * ADR-011 §4: the TypeScript type is INFERRED FROM the schema, never declared
 * beside it. One artefact, so the checked shape and the claimed shape cannot
 * drift. A hand-written type sitting next to a schema is finding P-7 waiting
 * to recur — the rooms payload has no `id`, and a generated type declaring one
 * would have made the compiler agree with the bug.
 *
 * Only the shapes Increment 0 actually uses are here. Feature payloads
 * (flights, hotels, trips, requests, expenses) arrive in the increment that
 * migrates their module — adding them now would be unused code.
 */
import { z } from 'zod';

/**
 * specs/contracts/api/auth.yaml → components.schemas.User
 * required: [id, name, email, department, role]
 */
export const UserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  department: z.string(),
  role: z.string(),
});
export type User = z.infer<typeof UserSchema>;

/**
 * auth.yaml → POST /auth/login → 200
 * required: [token, user]
 */
export const LoginResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

/** auth.yaml → GET /auth/me → 200 returns a bare User. */
export const MeResponseSchema = UserSchema;
export type MeResponse = z.infer<typeof MeResponseSchema>;

/**
 * auth.yaml → components.schemas.Error, required: [error]
 * Produced by authMiddleware as {"error":"Unauthorized"} or {"error":"Invalid token"}.
 */
export const ApiErrorSchema = z.object({
  error: z.string(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
