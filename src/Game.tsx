import { useMutation, useQuery } from "convex/react";
import _ from "lodash";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import z from "zod/v4";
import { api } from "../convex/_generated/api";
import { Doc } from "../convex/_generated/dataModel";
import {
  gameNumRoundsSchema,
  gameSecondsPerQuestionSchema,
  LobbyGame,
  PlayerId,
  scoreGuess,
  StartedGame,
} from "../convex/validation";
import { CalibrationData, CalibrationPlot } from "./CalibrationPlot";
import {
  ANON_DISPLAY_NAMES,
  cn,
  errString,
  formatPlusMinusInt,
  formatProbabilityAsPercentage,
  formatTimeRemaining,
  getRecordEntries,
  ifEnter,
  useNow,
} from "./lib/utils";
import { usePlayerId } from "./player-info";
import { List, Map } from "immutable";
import QRCode from "react-qr-code";

interface GameLobbyProps {
  game: LobbyGame;
  playerId: PlayerId;
  onLeave: () => void;
}

export function GameLobby({ game, playerId, onLeave }: GameLobbyProps) {
  const updateSettingsMutation = useMutation(api.games.updateGameSettings);
  const startGameMutation = useMutation(api.games.startGame);

  const [roundsF, setRoundsF] = useState(game.roundsRemaining.toString());
  const rounds = useMemo(
    () => z.coerce.number().pipe(gameNumRoundsSchema).safeParse(roundsF),
    [roundsF]
  );

  const [secondsPerQuestionF, setSecondsPerQuestionF] = useState(
    game.secondsPerQuestion.toString()
  );
  const secondsPerQuestion = useMemo(
    () =>
      z.coerce
        .number()
        .pipe(gameSecondsPerQuestionSchema)
        .safeParse(secondsPerQuestionF),
    [secondsPerQuestionF]
  );

  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const handleUpdateSettings = useCallback(
    ({
      rounds,
      secondsPerQuestion,
    }: {
      rounds: number;
      secondsPerQuestion: number;
    }) => {
      if (
        rounds === game.roundsRemaining &&
        secondsPerQuestion === game.secondsPerQuestion
      )
        return;
      setIsUpdatingSettings(true);
      updateSettingsMutation({
        gameId: game._id,
        roundsRemaining: rounds,
        secondsPerQuestion: secondsPerQuestion,
      })
        .then(() => {
          toast.success("Settings updated!");
        })
        .catch((error) => toast.error(errString(error)))
        .finally(() => {
          setIsUpdatingSettings(false);
        });
    },
    [game, updateSettingsMutation]
  );

  useEffect(() => {
    setRoundsF(game.roundsRemaining.toString());
  }, [game.roundsRemaining]);

  useEffect(() => {
    setSecondsPerQuestionF(game.secondsPerQuestion.toString());
  }, [game.secondsPerQuestion]);

  const [isStartingGame, setIsStartingGame] = useState(false);
  const canStartGame = !game.started && !isUpdatingSettings && !isStartingGame;
  const handleStartGame = useCallback(() => {
    setIsStartingGame(true);
    startGameMutation({ gameId: game._id })
      .then(() => toast.success("Game started!"))
      .catch((error) => toast.error(errString(error)))
      .finally(() => setIsStartingGame(false));
  }, [game._id, startGameMutation]);

  const canUpdateSettings =
    rounds.success &&
    secondsPerQuestion.success &&
    !isUpdatingSettings &&
    !isStartingGame &&
    !(
      rounds.data === game.roundsRemaining &&
      secondsPerQuestion.data === game.secondsPerQuestion
    );

  const onUpdateSettingsSubmit = useCallback(() => {
    if (!canUpdateSettings) return;
    handleUpdateSettings({
      rounds: rounds.data,
      secondsPerQuestion: secondsPerQuestion.data,
    });
  }, [canUpdateSettings, handleUpdateSettings, rounds, secondsPerQuestion]);

  const anonDisplayNames = useMemo(() => getAnonDisplayNames(game), [game]);

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
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
        <div className="text-4xl font-bold text-blue-900 tracking-wider mb-2">
          {game.quickId}
        </div>
        <p className="text-sm text-blue-600 text-center">
          Share this ID with friends so they can join!
          <details>
            <summary>QR</summary>
            <QRCode className="mx-auto" value={window.location.href} />
          </details>
        </p>
      </div>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-700">Players</h3>
        <div className="p-4">
          <div className="flex flex-row gap-2 mb-2">
            {getRecordEntries(game.players)
              .sort(([idA, { name: a }], [idB, { name: b }]) =>
                idA === playerId
                  ? -1
                  : idB === playerId
                    ? 1
                    : a.localeCompare(b)
              )
              .filter(([id]) => id !== playerId)
              .map(([id, { name }]) => (
                <div
                  key={id}
                  className="text-gray-800 px-2 py-0 border rounded-md bg-gray-200"
                >
                  {name || anonDisplayNames.get(id)}
                </div>
              ))}
          </div>
          <EditableName game={game} playerId={playerId} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">Settings</h3>
        <div className="w-full grid grid-cols-3 gap-2 items-center">
          <label
            htmlFor="rounds"
            className="block text-sm font-medium text-gray-700 mb-1 text-right col-span-1"
          >
            # Questions
          </label>
          <input
            id="rounds"
            type="number"
            value={roundsF}
            onChange={(e) => {
              setRoundsF(e.target.value);
            }}
            onKeyDown={ifEnter(onUpdateSettingsSubmit)}
            className="col-span-2 px-3 py-2 rounded-md border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm disabled:bg-gray-100"
          />
          {rounds.error && (
            <div className="text-red-500 text-sm col-span-3 ml-auto">
              {z.prettifyError(rounds.error)}
            </div>
          )}
        </div>

        <div className="w-full grid grid-cols-3 gap-2 items-center">
          <label
            htmlFor="seconds"
            className="block text-sm font-medium text-gray-700 mb-1 text-right col-span-1"
          >
            Seconds Per Question
          </label>
          <input
            id="seconds"
            type="number"
            value={secondsPerQuestionF}
            onChange={(e) => {
              setSecondsPerQuestionF(e.target.value);
            }}
            onKeyDown={ifEnter(onUpdateSettingsSubmit)}
            className="col-span-2 px-3 py-2 rounded-md border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm disabled:bg-gray-100"
          />
          {secondsPerQuestion.error && (
            <div className="text-red-500 text-sm col-span-3 ml-auto">
              {z.prettifyError(secondsPerQuestion.error)}
            </div>
          )}
        </div>
        <button
          className="ml-auto px-2 py-1 rounded bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors shadow-sm hover:shadow disabled:opacity-50"
          disabled={!canUpdateSettings}
          onClick={onUpdateSettingsSubmit}
        >
          Update
        </button>
      </div>

      <div className="mt-8 text-center">
        <button
          disabled={!canStartGame}
          onClick={() => {
            handleStartGame();
          }}
          className="w-full px-4 py-3 rounded bg-green-500 text-white font-semibold hover:bg-green-600 transition-colors shadow-sm hover:shadow disabled:opacity-50"
        >
          {isUpdatingSettings ? "Updating..." : "Start Game"}
        </button>
      </div>
    </div>
  );
}

function EditableName({
  game,
  playerId,
}: {
  game: LobbyGame;
  playerId: PlayerId;
}) {
  const [name, setName] = useState(game.players[playerId]?.name ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const updateNameMutation = useMutation(api.games.updateGameSettings);
  const debouncedUpdateName = useMemo(
    () =>
      _.debounce((name: string) => {
        setIsSubmitting(true);
        updateNameMutation({ gameId: game._id, playerName: { playerId, name } })
          .catch((error) => toast.error(errString(error)))
          .finally(() => setIsSubmitting(false));
      }, 500),
    [game._id, playerId, updateNameMutation]
  );
  return (
    <div className="inline-flex flex-row items-center gap-2 w-full">
      <input
        type="text"
        autoFocus
        placeholder="Your name"
        className="w-full px-2 py-1 font-bold bg-blue-100 border-blue-400 rounded-md border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm disabled:bg-gray-100"
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

  const scores = useMemo(() => {
    return getPlayerScores(game);
  }, [game]);

  const anonDisplayNames = useMemo(() => getAnonDisplayNames(game), [game]);

  return (
    <div className="bg-white p-1 rounded-lg shadow-xl w-full max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
        <h2 className="text-3xl font-bold text-primary">Game {game.quickId}</h2>
        <button
          onClick={onLeave}
          className="px-4 py-2 text-sm rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
        >
          Leave
        </button>
      </div>

      <div className="flex flex-row gap-2 mb-2 w-full items-center justify-center mx-auto">
        {getRecordEntries(game.players)
          .sort(([idA, { name: a }], [idB, { name: b }]) =>
            idA === playerId ? -1 : idB === playerId ? 1 : a.localeCompare(b)
          )
          .map(([id, { name }]) => (
            <div
              key={id}
              className={cn(
                "text-gray-800 px-2 py-0 border rounded-md bg-gray-200 flex flex-col items-center",
                id === playerId && "bg-blue-200 border-blue-400"
              )}
            >
              <div className="font-bold">
                {name || anonDisplayNames.get(id)}
              </div>
              <div>{formatPlusMinusInt(scores[id] ?? 0)}</div>
            </div>
          ))}
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
  const roundsByScoreImpactDesc = useMemo(() => {
    return List(game.finishedRounds).sortBy(
      (r) => -Math.abs(scoreGuess(r.guesses[playerId] ?? 0.5, r.answer))
    );
  }, [game.finishedRounds, playerId]);

  const container = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    if (container.current) {
      resizeObserver.observe(container.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [container]);

  return (
    <div
      className="flex flex-col justify-center items-center h-full w-full"
      ref={container}
    >
      <h2 className="text-2xl font-bold text-gray-800">Game Over!</h2>
      <ScorePlot game={game} playerId={playerId} width={containerWidth} />
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr>
            <th className="border border-gray-300">Question</th>
            <th className="border border-gray-300">Right</th>
            <th className="border border-gray-300">Wrong</th>
            <th className="border border-gray-300">Your P(Right)</th>
            <th className="border border-gray-300">Score</th>
          </tr>
        </thead>
        <tbody>
          {roundsByScoreImpactDesc.map((r) => (
            <tr key={r.question.text}>
              <td className="border border-gray-300">{r.question.text}</td>
              <td className="border border-gray-300">
                {r.answer ? r.question.right : r.question.left}
              </td>
              <td className="border border-gray-300">
                {r.answer ? r.question.left : r.question.right}
              </td>
              <td className="border border-gray-300">
                {formatProbabilityAsPercentage(r.guesses[playerId] ?? 0.5)}
              </td>
              <td className="border border-gray-300">
                {formatPlusMinusInt(
                  Math.round(scoreGuess(r.guesses[playerId] ?? 0.5, r.answer))
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        disabled={isWorking}
        onClick={() => {
          setIsWorking(true);
          resetGameMutation({ gameId: game._id })
            .catch((error) => toast.error(errString(error)))
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
  currentRound: Doc<"currentRounds"> & { serverMsFetchedAt: number };
  playerId: PlayerId;
}) {
  const endsAtClientMs = useMemo(
    () => currentRound.endsAtMs + (Date.now() - currentRound.serverMsFetchedAt),
    [currentRound.endsAtMs, currentRound.serverMsFetchedAt]
  );
  const setPlayerGuessMutation = useMutation(api.games.setPlayerGuess);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const debouncedSetGuess = useMemo(
    () =>
      _.throttle((...args: Parameters<typeof setPlayerGuessMutation>) => {
        setIsSubmitting(true);
        setPlayerGuessMutation(...args)
          .catch((error) => toast.error(errString(error)))
          .finally(() => setIsSubmitting(false));
      }, 200),
    [setPlayerGuessMutation]
  );

  const [playerGuess, setPlayerGuess] = useState(0.5);
  useEffect(() => {
    debouncedSetGuess({
      gameId: game._id,
      playerId,
      questionText: currentRound.question.text,
      guess: playerGuess,
    });
  }, [
    playerGuess,
    debouncedSetGuess,
    game._id,
    playerId,
    currentRound.question.text,
  ]);

  const nudgeGuess = useCallback(
    (dir: "up" | "down", strength: "weak" | "strong") => {
      const oddsFactor = strength === "weak" ? Math.pow(2, 1 / 3) : 2;
      const odds = playerGuess / (1 - playerGuess);
      const newOdds = odds * (dir === "up" ? oddsFactor : 1 / oddsFactor);
      setPlayerGuess(newOdds / (1 + newOdds));
    },
    [playerGuess]
  );

  const now = useNow();

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
      <h3 className="text-xl font-mono font-semibold text-blue-700 mb-2">
        {formatTimeRemaining(now, endsAtClientMs)}
      </h3>
      <p className="text-lg text-gray-800 text-center">
        {currentRound.question.text}
      </p>

      <div className="flex flex-col items-center w-full absolute bottom-0 p-2">
        <div className="grid grid-cols-3 gap-2 w-full mb-4 text-xl font-bold items-center">
          <div className="col-span-1 text-red-500 text-right flex items-center justify-end">
            {currentRound.question.left}
          </div>
          <div className="col-span-1"></div>
          <div className="col-span-1 text-green-500 text-left flex items-center">
            {currentRound.question.right}
          </div>
        </div>

        <div className="w-full flex flex-row items-center justify-center gap-2 h-20">
          <button
            className="border rounded-md px-2 h-full w-20 bg-red-500 font-bold"
            onClick={() => nudgeGuess("down", "strong")}
          >
            --
          </button>
          <button
            className="border rounded-md px-2 h-full w-20 bg-red-300 font-bold"
            onClick={() => nudgeGuess("down", "weak")}
          >
            -
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
              {formatPlusMinusInt(Math.round(scoreGuess(playerGuess, false)))} /{" "}
              {formatPlusMinusInt(Math.round(scoreGuess(playerGuess, true)))}
            </div>
          </div>
          <button
            className="border rounded-md px-2 h-full w-20 bg-green-300 font-bold"
            onClick={() => nudgeGuess("up", "weak")}
          >
            +
          </button>
          <button
            className="border rounded-md px-2 h-full w-20 bg-green-500 font-bold"
            onClick={() => nudgeGuess("up", "strong")}
          >
            ++
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
  width,
}: {
  game: Doc<"games">;
  playerId: PlayerId;
  width: number;
}) {
  const ourPlayerId = usePlayerId();
  const data: CalibrationData[] = useMemo(() => {
    return game.finishedRounds
      .map((r) => ({
        prob: r.guesses[playerId],
        question: { ...r.question, answer: r.answer },
      }))
      .filter((r) => r.prob !== undefined);
  }, [game, playerId]);
  useEffect(() => {
    console.log(data);
  }, [data]);
  const whose =
    ourPlayerId === playerId
      ? "Your"
      : `${game.players[playerId]?.name ?? "???"}'s`;
  return <CalibrationPlot data={data} width={width} />;
}

function getPlayerScores(game: Doc<"games">): Record<PlayerId, number> {
  const res: Record<PlayerId, number> = {};
  for (const round of game.finishedRounds) {
    for (const [playerId, guess] of getRecordEntries(round.guesses)) {
      res[playerId] ??= 0;
      res[playerId] += scoreGuess(guess, round.answer);
    }
  }
  return res;
}

function getAnonDisplayNames(game: Doc<"games">): Map<PlayerId, string> {
  const ids = List(getRecordEntries(game.players).map(([id]) => id)).sort();
  return Map(
    ids.map((id, i) => [
      id,
      ANON_DISPLAY_NAMES.get(i % ANON_DISPLAY_NAMES.size)!,
    ])
  );
}
