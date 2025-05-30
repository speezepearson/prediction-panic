import _ from "lodash";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import {
  gameNumRoundsSchema,
  gameSecondsPerQuestionSchema,
  LobbyGame,
  PlayerId,
  StartedGame,
} from "../convex/validation";
import z from "zod/v4";
import { Doc } from "../convex/_generated/dataModel";
import { getRecordEntries } from "./lib/utils";
import { CalibrationData, CalibrationPlot } from "./CalibrationPlot";

interface GameLobbyProps {
  game: LobbyGame;
  playerId: PlayerId;
  onLeave: () => void;
}

export function GameLobby({ game, playerId, onLeave }: GameLobbyProps) {
  const updateSettingsMutation = useMutation(api.games.updateGameSettings);
  const startGameMutation = useMutation(api.games.startGame);

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

  const canEditSettings = !game.started;
  const canStartGame = !game.started && game.roundsRemaining > 0;

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
          Leave
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

      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Players:</h3>
        <ul className="space-y-1 list-disc list-inside bg-gray-50 p-3 rounded-md">
          {getRecordEntries(game.players)
            .sort(([, { name: a }], [, { name: b }]) => a.localeCompare(b))
            .map(([id, { name }]) => (
              <li key={id} className="text-gray-800">
                {name ?? "Anonymous Player"}
                {id === playerId && " (You)"}
              </li>
            ))}
        </ul>
      </div>

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
              updateServerRounds(parseInt(e.target.value))?.catch((error) =>
                toast.error((error as Error).message)
              );
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
              updateServerSecondsPerQuestion(parseInt(e.target.value))?.catch(
                (error) => toast.error((error as Error).message)
              );
            }}
            min="5"
            max="60"
            disabled={!canEditSettings}
            className="w-full px-3 py-2 rounded-md border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm disabled:bg-gray-100"
          />
        </div>
      </div>

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
    </div>
  );
}

export function RunningGame({
  game,
  playerId,
  onLeave,
}: {
  game: Exclude<Awaited<typeof api.games.getGame._returnType>, null> & {
    started: true;
  };
  playerId: PlayerId;
  onLeave: () => void;
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h2 className="text-3xl font-bold text-primary">Game {game.quickId}</h2>
        <button
          onClick={onLeave}
          className="px-4 py-2 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
        >
          Leave
        </button>
      </div>

      {game.started && <CurrentRound game={game} playerId={playerId} />}
    </div>
  );
}

function CurrentRound({
  game,
  playerId,
}: {
  game: StartedGame;
  playerId: PlayerId;
}) {
  const currentRound = useQuery(api.games.getCurrentRound, {
    gameId: game._id,
  });

  return (
    <div className="w-full border border-green-300 bg-green-50 rounded-md">
      {currentRound === undefined ? (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : game.roundsRemaining === 0 ? (
        <div className="flex flex-col justify-center items-center h-full w-full">
          <p className="text-lg text-gray-800">Game over!</p>
          <ScorePlot game={game} playerId={playerId} />
        </div>
      ) : (
        <div className="h-60">
          {currentRound === null ? (
            <div className="flex justify-center items-center h-full">
              Prepare!
            </div>
          ) : (
            <ActiveRound
              game={game}
              currentRound={currentRound}
              playerId={playerId}
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActiveRound({
  game,
  currentRound,
  playerId,
}: {
  game: StartedGame;
  currentRound: Doc<"currentRounds">;
  playerId: PlayerId;
}) {
  const setPlayerGuessMutation = useMutation(api.games.setPlayerGuess);

  const [playerGuess, setPlayerGuess] = useState(0.5);

  return (
    <div className="flex flex-col items-center p-2 h-full">
      <h3 className="text-xl font-semibold text-green-700 mb-2">
        Current Statement:
      </h3>
      <p className="text-lg text-gray-800">{currentRound.question.text}</p>

      <div className="flex-grow"></div>

      <div className="flex flex-row items-center justify-center w-full gap-2">
        <input
          className="flex-grow w-full"
          type="range"
          value={playerGuess}
          min={0}
          max={1}
          step={0.001}
          onChange={(e) => {
            setPlayerGuess(parseFloat(e.target.value));
          }}
        />
        <button
          onClick={() => {
            setPlayerGuessMutation({
              gameId: game._id,
              playerId,
              guess: playerGuess,
            }).catch((error) => toast.error((error as Error).message));
          }}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Submit Probability
        </button>
      </div>
    </div>
  );
}

function ScorePlot({
  game,
  playerId,
}: {
  game: Doc<"games">;
  playerId: PlayerId;
}) {
  const data: CalibrationData[] = useMemo(() => {
    return game.finishedRounds
      .map((r) => ({ prob: r.guesses[playerId], actual: r.question.answer }))
      .filter((r) => r.prob !== undefined);
  }, [game, playerId]);
  return (
    <div>
      <CalibrationPlot data={data} />
    </div>
  );
}
