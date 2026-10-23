import { createContext, useContext } from "react";
import { useCurrentFrame } from "remotion";
import type { TimelineScene } from "./types";

export const SceneContext = createContext<TimelineScene | null>(null);

export const useScene = (): TimelineScene => {
  const c = useContext(SceneContext);
  if (!c) {
    throw new Error("useScene must be used inside a scene");
  }
  return c;
};

/** Frames since the scene's nominal start (negative during its entrance transition). */
export const useSceneTime = (): number => useCurrentFrame() - useScene().lead;
