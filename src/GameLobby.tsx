import _ from "lodash";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { Doc, Id } from "../convex/_generated/dataModel";
import { toast } from "sonner";
import {
  gameNumRoundsSchema,
  gameSecondsPerQuestionSchema,
} from "../convex/validation";
import z from "zod/v4";

interface GameLobbyProps {
  gameId: Id<"games">;
  onLeave: () => void;
}

export function GameLobby({ gameId, onLeave }: GameLobbyProps) {
  const game = useQuery(api.games.getGame, { gameId });
  const updateSettingsMutation = useMutation(api.games.updateGameSettings);
  const startGameMutation = useMutation(api.games.startGame);
  const loggedInUser = useQuery(api.auth.loggedInUser);
  useEffect(() => {
    console.log({ loggedInUser });
  }, [loggedInUser]);

  const [rounds, setRounds] = useState(100);
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(10);

  const updateServerRounds = useMemo(
    () =>
      _.debounce(async (rounds: number) => {
        if (!game) return;
        const validatedRounds = gameNumRoundsSchema.safeParse(rounds);
        if (validatedRounds.error) {
          toast.error(
            <>
              Invalid number of rounds:
              <pre>{z.prettifyError(validatedRounds.error)}</pre>
            </>
          );
          return;
        }
        try {
          await updateSettingsMutation({
            gameId: game._id,
            roundsRemaining: validatedRounds.data,
          });
          toast.success("Settings updated!");
        } catch (error) {
          toast.error((error as Error).message);
        }
      }, 500),
    [game, updateSettingsMutation]
  );
  useEffect(() => {
    console.log({ game });
  }, [game]);

  const updateServerSecondsPerQuestion = useMemo(
    () =>
      _.debounce(async (secondsPerQuestion: number) => {
        if (!game) return;
        const validatedSecondsPerQuestion =
          gameSecondsPerQuestionSchema.safeParse(secondsPerQuestion);
        console.log("SRP", { validatedSecondsPerQuestion });
        if (validatedSecondsPerQuestion.error) {
          toast.error(
            <>
              Invalid number of seconds per question:
              <pre>{z.prettifyError(validatedSecondsPerQuestion.error)}</pre>
            </>
          );
          return;
        }
        try {
          await updateSettingsMutation({
            gameId: game._id,
            secondsPerQuestion: validatedSecondsPerQuestion.data,
          });
          toast.success("Settings updated!");
        } catch (error) {
          toast.error((error as Error).message);
        }
      }, 500),
    [game, updateSettingsMutation]
  );

  useEffect(() => {
    if (game) {
      setRounds(game.roundsRemaining);
      setSecondsPerQuestion(game.secondsPerQuestion);
    }
  }, [game]);

  if (!game) {
    // Still loading game details
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-gray-600">Loading game details...</p>
      </div>
    );
  }
  if (!game) {
    // GameId is null or game truly not found
    return (
      <p className="text-center text-red-500">
        Game not found or an error occurred.
      </p>
    );
  }

  const isPlayerInGame = game.players.some((p) => p?._id === loggedInUser?._id);
  const canEditSettings = isPlayerInGame && !game.started;
  const canStartGame =
    isPlayerInGame && !game.started && game.roundsRemaining > 0;

  const handleStartGame = async () => {
    try {
      await startGameMutation({ gameId: game._id });
      toast.success("Game started!");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h2 className="text-3xl font-bold text-primary">Game Lobby</h2>
        <button
          onClick={onLeave}
          className="px-4 py-2 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
        >
          Leave Lobby
        </button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <p className="text-lg font-semibold text-blue-700">
          Game ID:{" "}
          <span className="text-2xl font-bold text-blue-900 tracking-wider">
            {game.quickId}
          </span>
        </p>
        <p className="text-sm text-blue-600">
          Share this ID with friends to join!
        </p>
      </div>

      {game.started && <CurrentRound game={game} />}

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Players:</h3>
        {game.players.length > 0 ? (
          <ul className="space-y-1 list-disc list-inside bg-gray-50 p-3 rounded-md">
            {game.players.map((player) => (
              <li key={player?._id} className="text-gray-800">
                {player?.name ?? "Anonymous Player"}
                {player?._id === loggedInUser?._id && " (You)"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">No players yet.</p>
        )}
      </div>

      {!game.started && (
        <div className="space-y-6 mb-8">
          <div>
            <label
              htmlFor="rounds"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Rounds (1-1000)
            </label>
            <input
              id="rounds"
              type="number"
              value={rounds}
              onChange={(e) => {
                setRounds(parseInt(e.target.value));
                updateServerRounds(parseInt(e.target.value));
              }}
              min="1"
              max="1000"
              disabled={!canEditSettings}
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm disabled:bg-gray-100"
            />
          </div>

          <div>
            <label
              htmlFor="seconds"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Seconds Per Question (5-60)
            </label>
            <input
              id="seconds"
              type="number"
              value={secondsPerQuestion}
              onChange={(e) => {
                setSecondsPerQuestion(parseInt(e.target.value));
                updateServerSecondsPerQuestion(parseInt(e.target.value));
              }}
              min="5"
              max="60"
              disabled={!canEditSettings}
              className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm disabled:bg-gray-100"
            />
          </div>
        </div>
      )}

      {canStartGame && (
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              handleStartGame().catch((error) =>
                toast.error((error as Error).message)
              );
            }}
            className="w-full px-4 py-3 rounded bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors shadow-sm hover:shadow"
          >
            Start Game
          </button>
        </div>
      )}
      {game.started && (
        <p className="mt-8 text-center text-xl font-semibold text-green-600">
          Game in Progress!
        </p>
      )}
      {!game.started && game.roundsRemaining <= 0 && (
        <p className="mt-8 text-center text-xl font-semibold text-red-500">
          Game cannot start: No rounds remaining.
        </p>
      )}
    </div>
  );
}

function CurrentRound({
  game,
}: {
  game: Exclude<Awaited<typeof api.games.getGame._returnType>, null>;
}) {
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const currentRound = useQuery(api.games.getCurrentRound, {
    gameId: game._id,
  });
  useEffect(() => {
    console.log({ currentRound });
  }, [currentRound]);

  const setPlayerGuessMutation = useMutation(api.games.setPlayerGuess);

  const [playerGuess, setPlayerGuess] = useState(0.5);
  const canGuess = !!loggedInUser;

  return (
    <div className="h-40 border border-green-300 bg-green-50 rounded-md">
      {!currentRound ? (
        game.roundsRemaining === 0 ? (
          <div className="flex justify-center items-center h-full">
            <p className="text-lg text-gray-800">Game over!</p>
          </div>
        ) : (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )
      ) : (
        <>
          <h3 className="text-xl font-semibold text-green-700 mb-2">
            Current Question:
          </h3>
          <p className="text-lg text-gray-800">{currentRound.question.text}</p>

          <input
            type="range"
            value={playerGuess}
            min={0}
            max={1}
            step={0.001}
            disabled={!canGuess}
            onChange={(e) => {
              setPlayerGuess(parseFloat(e.target.value));
            }}
          />
          <button
            disabled={!canGuess}
            onClick={() => {
              setPlayerGuessMutation({
                gameId: game._id,
                guess: playerGuess,
              }).catch((error) => toast.error((error as Error).message));
            }}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Submit Probability
          </button>
        </>
      )}
    </div>
  );
}
