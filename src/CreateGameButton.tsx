import { useMutation } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { usePlayerId } from "./player-info";

export function CreateGameButton({
  children,
  onCreate,
}: {
  onCreate: (id: Id<"games">) => void;
  children: React.ReactNode;
}) {
  const playerId = usePlayerId();
  useEffect(() => {
    console.log("playerId", playerId);
  }, [playerId]);

  const createGame = useMutation(api.games.createGame);

  const handleCreateGame = async () => {
    try {
      const { _id: gameId } = await createGame({
        playerId,
      });
      onCreate(gameId);
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <button
      onClick={() => {
        handleCreateGame().catch(console.error);
      }}
      className="w-full px-4 py-3 rounded bg-primary text-white font-semibold hover:bg-primary-hover transition-colors shadow-sm hover:shadow"
    >
      {children}
    </button>
  );
}
