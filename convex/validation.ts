import { z } from "zod/v4";

export const gameQuickIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(4)
  .regex(/^[A-Z]*$/);
export type GameQuickId = z.infer<typeof gameQuickIdSchema>;
export const gameSecondsPerQuestionSchema = z.number().min(1).max(60);
export const gameNumRoundsSchema = z.number().min(1).max(300);
export const gamePlayerGuessSchema = z.number().min(0).max(1);
