import { defineSchema, defineTable } from "convex/server";
import { v, Validator } from "convex/values";
import { PlayerId } from "./validation";

const vRedactedQuestion = v.object({
  text: v.string(),
  left: v.string(),
  right: v.string(),
});
const vPlayerGuesses = v.record(v.string() as Validator<PlayerId>, v.number());

const applicationTables = {
  games: defineTable({
    /** randomly generated 4-letter identifier for ease of joining */
    quickId: v.string(),
    started: v.boolean(),
    roundsRemaining: v.number(),
    secondsPerQuestion: v.number(),
    players: v.record(
      v.string() as Validator<PlayerId>,
      v.object({ name: v.string() })
    ),
    finishedRounds: v.array(
      v.object({
        question: vRedactedQuestion,
        answer: v.boolean(),
        guesses: vPlayerGuesses,
      })
    ),
  }).index("by_quickId", ["quickId"]),

  currentRounds: defineTable({
    gameId: v.id("games"),
    question: vRedactedQuestion,
    guesses: vPlayerGuesses,
    endsAtMs: v.number(),
  }).index("by_gameId", ["gameId"]),
};

export default defineSchema({
  ...applicationTables,
});
