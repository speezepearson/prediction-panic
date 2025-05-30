import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const vQuestion = v.object({ text: v.string(), answer: v.boolean() });
const vPlayerGuesses = v.record(v.id("users"), v.number());

const applicationTables = {
  games: defineTable({
    /** randomly generated 4-letter identifier for ease of joining */
    quickId: v.string(),
    started: v.boolean(),
    roundsRemaining: v.number(),
    secondsPerQuestion: v.number(),
    players: v.array(v.id("users")),
    finishedRounds: v.array(
      v.object({
        question: vQuestion,
        guesses: vPlayerGuesses,
      }),
    ),
  }).index("by_quickId", ["quickId"]),

  currentRounds: defineTable({
    gameId: v.id("games"),
    question: vQuestion,
    guesses: vPlayerGuesses,
  }).index("by_gameId", ["gameId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
