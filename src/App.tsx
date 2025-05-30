import { Authenticated, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Toaster, toast } from "sonner";
import { useState, useMemo, createContext, useContext } from "react";
import { GameLobby, RunningGame } from "./GameLobby";
import { Id } from "../convex/_generated/dataModel";
import {
  gameQuickIdSchema,
  LobbyGame,
  PlayerId,
  playerIdSchema,
  StartedGame,
} from "../convex/validation";

const playerContext = createContext<{ id: PlayerId; name: string }>({
  id: playerIdSchema.parse(Math.random().toString(36).substring(2, 12)),
  name: "Anonymous",
});

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Mantic Mania</h2>
      </header>
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md mx-auto">
          <Content />
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function Content() {
  const { id: playerId } = useContext(playerContext);
  const [playerName, setPlayerName] = useState("Anonymous");
  const [currentGameId, setCurrentGameId] = useState<Id<"games"> | null>(null);
  const currentGame: StartedGame | LobbyGame | null | undefined = useQuery(
    api.games.getGame,
    currentGameId ? { gameId: currentGameId } : "skip"
  );

  const createGame = useMutation(api.games.createGame);

  const handleCreateGame = async () => {
    try {
      const { _id: gameId } = await createGame({
        playerId,
        playerName,
      });
      setCurrentGameId(gameId);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (currentGame) {
    if (currentGame.started) {
      return (
        <RunningGame
          game={currentGame}
          playerId={playerId}
          onLeave={() => setCurrentGameId(null)}
        />
      );
    } else {
      return (
        <GameLobby
          playerId={playerId}
          game={currentGame}
          onLeave={() => setCurrentGameId(null)}
        />
      );
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">Mantic Mania</h1>
        <p className="text-lg text-secondary">Welcome, friend!</p>
      </div>

      <Authenticated>
        <div className="space-y-6">
          <div>
            <button
              onClick={() => {
                handleCreateGame().catch(console.error);
              }}
              className="w-full px-4 py-3 rounded bg-primary text-white font-semibold hover:bg-primary-hover transition-colors shadow-sm hover:shadow"
            >
              Create New Game
            </button>
          </div>
          <JoinGameForm setCurrentGameId={setCurrentGameId} />
        </div>
      </Authenticated>
    </div>
  );
}

function JoinGameForm({
  setCurrentGameId,
}: {
  setCurrentGameId: (gameId: Id<"games">) => void;
}) {
  const player = useContext(playerContext);
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
      playerId: player.id,
      playerName: player.name,
    })
      .then((gameId) => {
        setCurrentGameId(gameId);
        toast.success("Joined game!");
      })
      .catch((error) => {
        setJoinError((error as Error).message);
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
