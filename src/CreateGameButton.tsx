import { useMutation } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";
import { usePlayerId } from "./player-info";
import { errString } from "./lib/utils";
import { GameQuickId } from "../convex/validation";

export function CreateGameButton({
  children,
  onCreate,
}: {
  onCreate: (data: { id: Id<"games">; quickId: GameQuickId }) => void;
  children: React.ReactNode;
}) {
  const playerId = usePlayerId();
  useEffect(() => {
    console.log("playerId", playerId);
  }, [playerId]);

  const createGame = useMutation(api.games.createGame);

  const handleCreateGame = async () => {
    try {
      const { _id: gameId, quickId } = await createGame({
        playerId,
      });
      onCreate({ id: gameId, quickId });
    } catch (error) {
      toast.error(
        <pre className="text-xs whitespace-pre-wrap">{errString(error)}</pre>
      );
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
