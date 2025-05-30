"use strict";

import _ from "lodash";
import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError, v, Validator } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import allQuestions from "./questions.json";
import {
  gameNumRoundsSchema,
  GameQuickId,
  gameQuickIdSchema,
  gameSecondsPerQuestionSchema,
  PlayerId,
  Question,
} from "./validation";
import z from "zod/v4";

const INTER_ROUND_DELAY = 300;

export const createGame = mutation({
  args: {
    playerId: v.string() as Validator<PlayerId>,
  },
  handler: async (ctx, { playerId }) => {
    let quickId: GameQuickId;
    let quickIdTaken: boolean;
    do {
      quickId = gameQuickIdSchema.parse(
        Array.from({ length: 4 }, () =>
          String.fromCharCode(
            Math.floor(Math.random() * 26) + "A".charCodeAt(0)
          )
        ).join("")
      );
      quickIdTaken = !!(await ctx.db
        .query("games")
        .withIndex("by_quickId", (q) => q.eq("quickId", quickId))
        .unique());
    } while (quickIdTaken);
    const gameId = await ctx.db.insert("games", {
      quickId,
      started: false,
      roundsRemaining: 100,
      secondsPerQuestion: 10,
      players: { [playerId]: { name: "" } },
      finishedRounds: [],
    });
    return { _id: gameId, quickId };
  },
});

export const joinGame = mutation({
  args: {
    quickId: v.string(),
    playerId: v.string() as Validator<PlayerId>,
  },
  handler: async (ctx, args) => {
    const quickId = gameQuickIdSchema.parse(args.quickId.toUpperCase());
    const game = await ctx.db
      .query("games")
      .withIndex("by_quickId", (q) => q.eq("quickId", quickId))
      .unique();
    if (!game) throw new Error("Game not found.");
    if (!game.players[args.playerId]) {
      await ctx.db.patch(game._id, {
        players: {
          ...game.players,
          [args.playerId]: { name: "" },
        },
      });
    }
    return game._id;
  },
});

export const leaveGame = mutation({
  args: { gameId: v.id("games"), playerId: v.string() as Validator<PlayerId> },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found.");
    delete game.players[args.playerId];
    await ctx.db.patch(game._id, {
      players: game.players,
    });
    return game._id;
  },
});

export const updateGameSettings = mutation({
  args: {
    gameId: v.id("games"),
    roundsRemaining: v.optional(v.number()),
    secondsPerQuestion: v.optional(v.number()),
    playerName: v.optional(
      v.object({
        playerId: v.string() as Validator<PlayerId>,
        name: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found.");
    if (game.started) throw new Error("Game started, cannot update settings.");

    const updates: Partial<Doc<"games">> = {};
    if (args.roundsRemaining !== undefined) {
      const roundsRemaining = gameNumRoundsSchema.safeParse(
        args.roundsRemaining
      );
      if (roundsRemaining.error)
        throw new ConvexError({
          message: z.prettifyError(roundsRemaining.error),
          code: 400,
        });
      updates.roundsRemaining = roundsRemaining.data;
    }
    if (args.secondsPerQuestion !== undefined) {
      const secondsPerQuestion = gameSecondsPerQuestionSchema.safeParse(
        args.secondsPerQuestion
      );
      if (secondsPerQuestion.error)
        throw new ConvexError({
          message: z.prettifyError(secondsPerQuestion.error),
          code: 400,
        });
      updates.secondsPerQuestion = secondsPerQuestion.data;
    }
    if (args.playerName) {
      updates.players = {
        ...game.players,
        [args.playerName.playerId]: { name: args.playerName.name },
      };
    }
    if (Object.keys(updates).length > 0)
      await ctx.db.patch(args.gameId, updates);
    return true;
  },
});

export const tickGame = internalMutation({
  args: {
    gameId: v.id("games"),
  },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) {
      console.error("Game not found in _setupRoundWithQuestion:", gameId);
      return;
    }
    if (!game.started) {
      throw new Error("Game not started.");
    }

    const currentRound = await ctx.db
      .query("currentRounds")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (currentRound) {
      await Promise.all([
        ctx.db.patch(gameId, {
          finishedRounds: [
            ...game.finishedRounds,
            { question: currentRound.question, guesses: currentRound.guesses },
          ],
        }),
        ctx.db.delete(currentRound._id),
      ]);
      await ctx.scheduler.runAfter(INTER_ROUND_DELAY, internal.games.tickGame, {
        gameId,
      });
      return;
    }

    if (game.roundsRemaining <= 0) return;

    const askedQuestions = new Set(
      game.finishedRounds.map((round) => round.question.text)
    );
    const nextQuestion = _.sample(
      allQuestions.filter((question) => !askedQuestions.has(question.text))
    )!;

    await Promise.all([
      ctx.db.insert("currentRounds", {
        gameId,
        question: nextQuestion,
        guesses: Object.fromEntries(
          Object.keys(game.players).map((playerId) => [playerId, 0.5])
        ),
      }),
      ctx.db.patch(gameId, { roundsRemaining: game.roundsRemaining - 1 }),
    ]);

    await ctx.scheduler.runAfter(
      game.secondsPerQuestion * 1000,
      internal.games.tickGame,
      { gameId }
    );
  },
});

export const startGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    const game = await ctx.db.get(args.gameId);
    if (!game) throw new Error("Game not found.");

    if (game.started) throw new Error("Game already started.");
    if (game.roundsRemaining <= 0) throw new Error("No rounds remaining.");

    await ctx.db.patch(args.gameId, { started: true });

    // Call the action to fetch question and then setup round
    await ctx.scheduler.runAfter(0, internal.games.tickGame, {
      gameId: args.gameId,
    });
    // Note: Game is marked as 'started' inside _setupRoundWithQuestion to ensure it happens after a question is confirmed.
    // However, for immediate UI feedback, we could patch here, but it's safer to do it atomically with round creation.
    // For now, we'll patch it to true in _setupRoundWithQuestion.
    return true;
  },
});

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args): Promise<null | Doc<"games">> => {
    return await ctx.db.get(args.gameId);
  },
});

export const getCurrentRound = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    if (!args.gameId) return null;
    return await ctx.db
      .query("currentRounds")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .unique();
  },
});

export const setPlayerGuess = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.string() as Validator<PlayerId>,
    guess: v.number(),
  },
  handler: async (ctx, args) => {
    const currentRound = await ctx.db
      .query("currentRounds")
      .withIndex("by_gameId", (q) => q.eq("gameId", args.gameId))
      .unique();

    if (!currentRound) {
      throw new Error("No active round found");
    }

    // Update the guesses map with the new guess
    const updatedGuesses = {
      ...currentRound.guesses,
      [args.playerId]: args.guess,
    };

    await ctx.db.patch(currentRound._id, {
      guesses: updatedGuesses,
    });
  },
});

export const resetGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.gameId, {
      started: false,
      roundsRemaining: 100,
      finishedRounds: [],
    });
  },
});
