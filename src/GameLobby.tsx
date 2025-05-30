import _ from "lodash";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import { toast } from "sonner";
import {
  gameNumRoundsSchema,
  gameSecondsPerQuestionSchema,
  LobbyGame,
  PlayerId,
  scoreGuess,
  StartedGame,
} from "../convex/validation";
import z from "zod/v4";
import { Doc, Id } from "../convex/_generated/dataModel";
import {
  formatPlusMinus,
  formatProbabilityAsPercentage,
  getRecordEntries,
} from "./lib/utils";
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
            .sort(([idA, { name: a }], [idB, { name: b }]) =>
              idA === playerId ? -1 : idB === playerId ? 1 : a.localeCompare(b)
            )
            .map(([id, { name }]) => (
              <li key={id} className="text-gray-800">
                {id === playerId ? (
                  <EditableName gameId={game._id} playerId={playerId} />
                ) : (
                  name
                )}
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

function EditableName({
  gameId,
  playerId,
}: {
  gameId: Id<"games">;
  playerId: PlayerId;
}) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateNameMutation = useMutation(api.games.updateGameSettings);
  const debouncedUpdateName = useMemo(
    () =>
      _.debounce((name: string) => {
        setIsSubmitting(true);
        updateNameMutation({ gameId, playerName: { playerId, name } })
          .catch((error) => toast.error((error as Error).message))
          .finally(() => setIsSubmitting(false));
      }, 500),
    [gameId, playerId, updateNameMutation]
  );
  return (
    <div className="inline-flex flex-row w-[20em] items-center gap-2">
      <input
        type="text"
        autoFocus
        placeholder="Your name"
        className="w-[15em] px-3 py-2 rounded-md border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm disabled:bg-gray-100"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          debouncedUpdateName(e.target.value);
        }}
      />
      {isSubmitting && (
        <div className=" animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
  const currentRound = useQuery(api.games.getCurrentRound, {
    gameId: game._id,
  });
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

      <div className="w-full min-h-80 border border-blue-300 bg-blue-50 rounded-md relative">
        {currentRound ? (
          <ActiveRound
            game={game}
            currentRound={currentRound}
            playerId={playerId}
          />
        ) : currentRound === undefined ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : game.roundsRemaining === 0 ? (
          <GameOver game={game} playerId={playerId} />
        ) : (
          <>{/* Prepare! */}</>
        )}
      </div>
    </div>
  );
}

function GameOver({
  game,
  playerId,
}: {
  game: StartedGame;
  playerId: PlayerId;
}) {
  const [isWorking, setIsWorking] = useState(false);
  const resetGameMutation = useMutation(api.games.resetGame);

  const scores: Record<PlayerId, number> = useMemo(() => {
    const result: Record<PlayerId, number> = {};
    for (const round of game.finishedRounds) {
      for (const [playerId, guess] of getRecordEntries(round.guesses)) {
        if (result[playerId] === undefined) result[playerId] = 0;
        result[playerId] += scoreGuess(guess, round.question.answer);
      }
    }
    return result;
  }, [game]);

  return (
    <div className="flex flex-col justify-center items-center h-full w-full">
      <h2 className="text-2xl font-bold text-gray-800">Game Over!</h2>
      <div className="flex flex-row items-center justify-center gap-2">
        <table className="table-auto border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="px-2 py-1 border border-gray-300">Player</th>
              <th className="px-2 py-1 border border-gray-300">Score</th>
            </tr>
          </thead>
          <tbody>
            {getRecordEntries(scores)
              .sort(([idA, scoreA], [idB, scoreB]) => scoreB - scoreA)
              .map(([id, score]) => (
                <tr key={id}>
                  <td className="text-center px-2 py-1 border border-gray-300">
                    {id === playerId
                      ? "You"
                      : (game.players[id]?.name ?? "???")}
                  </td>
                  <td className="text-center px-2 py-1 border border-gray-300">
                    {score.toFixed(0)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="text-lg text-gray-800">
        Game ended! Your calibration curve:
      </p>
      <ScorePlot game={game} playerId={playerId} />
      <button
        disabled={isWorking}
        onClick={() => {
          setIsWorking(true);
          resetGameMutation({ gameId: game._id })
            .catch((error) => toast.error((error as Error).message))
            .finally(() => setIsWorking(false));
        }}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        {isWorking ? "Resetting..." : "Reset Game"}
      </button>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedSetGuess = useMemo(
    () =>
      _.throttle((...args: Parameters<typeof setPlayerGuessMutation>) => {
        setIsSubmitting(true);
        setPlayerGuessMutation(...args)
          .catch((error) => toast.error((error as Error).message))
          .finally(() => setIsSubmitting(false));
      }, 200),
    [setPlayerGuessMutation]
  );

  const [playerGuess, setPlayerGuess] = useState(0.5);
  useEffect(() => {
    debouncedSetGuess({
      gameId: game._id,
      playerId,
      guess: playerGuess,
    });
  }, [playerGuess, debouncedSetGuess, game._id, playerId]);

  const nudgeGuess = useCallback(
    (dir: "up" | "down", strength: "weak" | "strong") => {
      const oddsFactor = strength === "weak" ? Math.pow(2, 1 / 5) : 2;
      const odds = playerGuess / (1 - playerGuess);
      const newOdds = odds * (dir === "up" ? oddsFactor : 1 / oddsFactor);
      setPlayerGuess(newOdds / (1 + newOdds));
    },
    [playerGuess]
  );

  // adjust the guess when the player hits the left/right arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        nudgeGuess("down", e.shiftKey ? "strong" : "weak");
      }
      if (e.key === "ArrowRight") {
        nudgeGuess("up", e.shiftKey ? "strong" : "weak");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nudgeGuess]);

  return (
    <div className="flex flex-col items-center p-2">
      <h3 className="text-xl font-semibold text-blue-700 mb-2">
        Current Statement:
      </h3>
      <p className="text-lg text-gray-800">{currentRound.question.text}</p>

      <div className="flex flex-col items-center w-full absolute bottom-0 p-2">
        <div className="w-full flex flex-row items-center justify-center gap-2 h-20">
          <button
            className="border rounded-md px-2 h-full w-20 bg-red-500 font-bold"
            onClick={() => nudgeGuess("down", "strong")}
          >
            &lt;&lt;
          </button>
          <button
            className="border rounded-md px-2 h-full w-20 bg-red-300 font-bold"
            onClick={() => nudgeGuess("down", "weak")}
          >
            {" "}
            &lt;
          </button>
          <div className="flex-grow flex flex-col items-center justify-center">
            <div className="text-center relative">
              {formatProbabilityAsPercentage(playerGuess)}
              {isSubmitting && (
                <div className="absolute top-0 left-0 w-full h-full flex justify-center items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
            <div className="text-sm text-gray-500">
              {formatPlusMinus(Math.round(scoreGuess(playerGuess, false)))} /{" "}
              {formatPlusMinus(Math.round(scoreGuess(playerGuess, true)))}
            </div>
          </div>
          <button
            className="border rounded-md px-2 h-full w-20 bg-green-300 font-bold"
            onClick={() => nudgeGuess("up", "weak")}
          >
            &gt;
          </button>
          <button
            className="border rounded-md px-2 h-full w-20 bg-green-500 font-bold"
            onClick={() => nudgeGuess("up", "strong")}
          >
            &gt;&gt;
          </button>
        </div>
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
        </div>
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
