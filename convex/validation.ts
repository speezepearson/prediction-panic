import { z } from "zod/v4";
import { Doc } from "./_generated/dataModel";
import allQuestions from "./questions.json" with { type: "json" };
import { Map } from "immutable";

const typedRawQuestions: Record<
  string,
  { left: string; right: string; answer: boolean; tags?: string[] }
> = allQuestions;

export const fullQuestions = Map(
  Object.entries(typedRawQuestions).map(
    ([text, { left, right, answer, tags }]) => [
      text,
      { left, right, answer, tags },
    ]
  )
).filter(({ tags }) => tags?.includes("rat"));
export const redactedQuestions: Map<string, { left: string; right: string }> =
  fullQuestions.map(({ left, right, tags }) => ({ left, right, tags }));

export const gameQuickIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(4)
  .regex(/^[A-Z]*$/);

export type GameQuickId = z.infer<typeof gameQuickIdSchema>;
export const gameSecondsPerQuestionSchema = z.number().min(1).max(60);
export const gameNumRoundsSchema = z
  .number()
  .int()
  .min(1)
  .max(redactedQuestions.size, {
    error: `There are only ${redactedQuestions.size} questions`,
  });
export const gamePlayerGuessSchema = z.number().min(0).max(1);

export const playerIdSchema = z.string().trim().length(10).brand("playerId");
export type PlayerId = z.infer<typeof playerIdSchema>;

export type StartedGame = Doc<"games"> & { started: true };
export type LobbyGame = Doc<"games"> & { started: false };

export function scoreGuess(guess: number, answer: boolean) {
  return 100 * (1 + Math.log2(answer ? guess : 1 - guess));
}
