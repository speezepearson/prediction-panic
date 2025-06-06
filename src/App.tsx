import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import {
  GameQuickId,
  gameQuickIdSchema,
  LobbyGame,
  StartedGame,
} from "../convex/validation";
import { CreateGameButton } from "./CreateGameButton";
import { GameLobby, RunningGame } from "./Game";
import { usePlayerId } from "./player-info";
import { errString } from "./lib/utils";

export default function App({
  gameQuickIdFromHash,
}: {
  gameQuickIdFromHash: GameQuickId | undefined;
}) {
  return (
    <div className="flex flex-col">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">
          <a href="/">Probable Panic</a>
        </h2>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full mx-auto">
          <Content gameQuickIdFromHash={gameQuickIdFromHash} />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content({
  gameQuickIdFromHash,
}: {
  gameQuickIdFromHash: GameQuickId | undefined;
}) {
  const playerId = usePlayerId();
  useEffect(() => {
    console.log("playerId", playerId);
  }, [playerId]);
  const joinGameMutation = useMutation(api.games.joinGame);
  useEffect(() => {
    console.log("gameQuickIdFromHash", gameQuickIdFromHash);
    if (gameQuickIdFromHash) {
      joinGameMutation({ quickId: gameQuickIdFromHash, playerId })
        .then((gameId) => {
          setCurrentGameId(gameId);
          window.location.hash = gameQuickIdFromHash;
        })
        .catch((error) => {
          console.error(error);
          toast.error("Failed to join game");
        });
    }
  }, [gameQuickIdFromHash, playerId, joinGameMutation]);

  const [currentGameId, setCurrentGameId] = useState<Id<"games"> | null>(null);
  const currentGame: StartedGame | LobbyGame | null | undefined = useQuery(
    api.games.getGame,
    currentGameId ? { gameId: currentGameId } : "skip"
  );

  if (currentGame) {
    if (currentGame.started) {
      return (
        <RunningGame
          game={currentGame}
          playerId={playerId}
          onLeave={() => {
            setCurrentGameId(null);
            window.location.hash = "";
          }}
        />
      );
    } else {
      return (
        <GameLobby
          playerId={playerId}
          game={currentGame}
          onLeave={() => {
            setCurrentGameId(null);
            window.location.hash = "";
          }}
        />
      );
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-md mx-auto">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Probable Panic</h1>
        <p className="text-lg text-secondary">Welcome, friend!</p>
      </div>

      <div className="space-y-6">
        <div>
          <CreateGameButton
            onCreate={({ id, quickId }) => {
              setCurrentGameId(id);
              window.location.hash = quickId;
            }}
          >
            Create New Game
          </CreateGameButton>
        </div>
        <JoinGameForm setCurrentGameId={setCurrentGameId} />
      </div>
    </div>
  );
}

function JoinGameForm({
  setCurrentGameId,
}: {
  setCurrentGameId: (gameId: Id<"games">) => void;
}) {
  const playerId = usePlayerId();
  const [quickIdField, setQuickIdField] = useState("");
  const { data: quickId, error: parseError } = useMemo(
    () => gameQuickIdSchema.safeParse(quickIdField),
    [quickIdField]
  );
  const joinGameMutation = useMutation(api.games.joinGame);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoinGame = () => {
    if (parseError || isJoining) return;
    setIsJoining(true);
    setJoinError(null);

    joinGameMutation({
      quickId,
      playerId,
    })
      .then((gameId) => {
        window.location.hash = quickId;
        setCurrentGameId(gameId);
        toast.success("Joined game!");
      })
      .catch((error) => {
        setJoinError(errString(error));
      })
      .finally(() => {
        setIsJoining(false);
      });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-center text-gray-700">
        Join Existing Game
      </h3>
      <div>
        <label
          htmlFor="quickId"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Game ID (4 letters)
        </label>
        <input
          id="quickId"
          type="text"
          autoFocus
          value={quickIdField}
          onChange={(e) => setQuickIdField(e.target.value)}
          disabled={isJoining}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleJoinGame();
            }
          }}
          maxLength={4}
          placeholder="ABCD"
          className="w-full px-4 py-3 rounded-md bg-white border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm hover:shadow"
        />
      </div>
      <button
        disabled={isJoining || !quickId}
        onClick={handleJoinGame}
        className="w-full px-4 py-3 rounded bg-secondary text-white font-semibold hover:not:disabled:bg-secondary-hover transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Join Game
      </button>
      {joinError && <p className="text-red-500">{joinError}</p>}
    </div>
  );
}
