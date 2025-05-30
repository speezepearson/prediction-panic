import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster, toast } from "sonner";
import { useState, FormEvent } from "react";
import { GameLobby } from "./GameLobby";
import { Id } from "../convex/_generated/dataModel";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
        <h2 className="text-xl font-semibold text-primary">Probability Game</h2>
        <SignOutButton />
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
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const [currentGameId, setCurrentGameId] = useState<Id<"games"> | null>(null);

  const createGame = useMutation(api.games.createGame);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleCreateGame = async () => {
    try {
      const { _id: gameId } = await createGame();
      setCurrentGameId(gameId);
      toast.success("Game created!");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (currentGameId) {
    return (
      <GameLobby
        gameId={currentGameId}
        onLeave={() => setCurrentGameId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary mb-4">
          Probability Game
        </h1>
        <Authenticated>
          <p className="text-lg text-secondary">
            Welcome, {loggedInUser?.name ?? loggedInUser?.email ?? "friend"}!
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className="text-lg text-secondary">
            Sign in to create or join a game.
          </p>
        </Unauthenticated>
      </div>

      <Unauthenticated>
        <SignInForm />
      </Unauthenticated>

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
  const [joinQuickId, setJoinQuickId] = useState("");
  const joinGameMutation = useMutation(api.games.joinGame);

  const handleJoinGame = async (event: FormEvent) => {
    event.preventDefault();
    if (!joinQuickId.trim()) {
      toast.error("Please enter a Game ID.");
      return;
    }
    try {
      const gameId = await joinGameMutation({
        quickId: joinQuickId.trim().toUpperCase(),
      });
      setCurrentGameId(gameId);
      toast.success("Joined game!");
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <form
      onSubmit={(e) => {
        handleJoinGame(e).catch(console.error);
      }}
      className="space-y-4"
    >
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
          value={joinQuickId}
          onChange={(e) => setJoinQuickId(e.target.value)}
          maxLength={4}
          placeholder="ABCD"
          className="w-full px-4 py-3 rounded-md bg-white border border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-shadow shadow-sm hover:shadow"
        />
      </div>
      <button
        type="submit"
        className="w-full px-4 py-3 rounded bg-secondary text-white font-semibold hover:bg-secondary-hover transition-colors shadow-sm hover:shadow"
      >
        Join Game
      </button>
    </form>
  );
}
