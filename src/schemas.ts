/**
 * Zod schemas for every request body. Strict validation: unknown keys rejected.
 */

import { z } from 'zod';

export const StartSessionSchema = z.object({
  anteStake: z.number().positive().max(1000),
  blindStake: z.number().positive().max(1000),
  tripsStake: z.number().nonnegative().max(1000).optional(),
  balance: z.number().nonnegative(),
}).strict();

export type StartSessionBody = z.infer<typeof StartSessionSchema>;

export const PreflopActionSchema = z.object({
  action: z.enum(['raise', 'check']),
}).strict();

export const FlopActionSchema = z.object({
  action: z.enum(['raise', 'check']),
}).strict();

export const RiverActionSchema = z.object({
  action: z.enum(['raise', 'fold']),
}).strict();

export type PreflopAction = z.infer<typeof PreflopActionSchema>['action'];
export type FlopAction = z.infer<typeof FlopActionSchema>['action'];
export type RiverAction = z.infer<typeof RiverActionSchema>['action'];
