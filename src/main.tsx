import { createRoot } from "react-dom/client";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";
import { gameQuickIdSchema } from "../convex/validation";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

const gameQuickIdFromHash = gameQuickIdSchema.safeParse(
  window.location.hash.slice(1)
);

createRoot(document.getElementById("probable-panic-root")!).render(
  <ConvexProvider client={convex}>
    <App gameQuickIdFromHash={gameQuickIdFromHash.data} />
  </ConvexProvider>
);
