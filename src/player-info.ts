import { playerIdSchema } from "../convex/validation";

import { createContext, useContext } from "react";
import { PlayerId } from "../convex/validation";

const getOrCreatePlayerId = (): PlayerId => {
  const stored = localStorage.getItem("playerInfo");
  if (stored) {
    try {
      const { id } = JSON.parse(stored);
      return playerIdSchema.parse(id);
    } catch (e) {
      // pass
    }
  }
  const newId = playerIdSchema.parse(
    Math.random().toString(36).substring(2, 12)
  );
  localStorage.setItem("playerInfo", JSON.stringify({ id: newId }));
  return newId;
};

const playerContext = createContext<PlayerId>(getOrCreatePlayerId());

export function usePlayerId(): PlayerId {
  const result = useContext(playerContext);
  if (!result) throw new Error("Player info not found");
  return result;
}
