import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Bloom, DiagonalWipe } from "../components/Fx";
import { COLORS } from "../design/tokens";
import { EASE_IN_OUT, lerp, progress } from "../design/motion";
import { SceneContext } from "./context";
import type { TimelineScene } from "./types";

const isLight = (s: TimelineScene["scene"]) => s.bg === "light" || s.type === "logo-reveal" || s.type === "cta";

/**
 * Wraps a scene on its Sequence: plays the ENTRANCE transition (bloom / wipe / fade / push) during the
 * `lead` frames before the nominal start, and the exit half of a `push` when the next scene pushes in.
 * Scenes themselves only think in "scene time" (`useSceneTime`).
 */
export const SceneShell: React.FC<{ entry: TimelineScene; children: React.ReactNode }> = ({ entry, children }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const { lead, scene } = entry;
  const type = scene.transition.type;
  const bloomColor = isLight(scene) ? COLORS.white : COLORS.navy900;

  let body: React.ReactNode = children;

  if (lead > 0 && type === "wipe") {
    body = (
      <DiagonalWipe t={frame} duration={lead + 6}>
        {children}
      </DiagonalWipe>
    );
  } else if (lead > 0 && type === "bloom") {
    body = (
      <AbsoluteFill>
        <Bloom t={frame} duration={lead + 4} color={bloomColor} cy={height * 0.5} />
        <AbsoluteFill style={{ opacity: frame - lead > -4 ? 1 : 0 }}>{children}</AbsoluteFill>
      </AbsoluteFill>
    );
  } else if (lead > 0 && type === "fade") {
    body = <AbsoluteFill style={{ opacity: progress(frame, 0, lead, EASE_IN_OUT) }}>{children}</AbsoluteFill>;
  } else if (lead > 0 && type === "push") {
    const p = progress(frame, 0, lead, EASE_IN_OUT);
    body = <AbsoluteFill style={{ translate: `${(1 - p) * width}px 0px` }}>{children}</AbsoluteFill>;
  }

  // exit half of the next scene's push
  if (entry.nextTransition === "push" && entry.nextLead > 0) {
    const exitStart = entry.lead + entry.durationFrames - entry.nextLead;
    const q = progress(frame, exitStart, entry.nextLead, EASE_IN_OUT);
    body = (
      <AbsoluteFill style={{ translate: `${-q * width * 0.3}px 0px`, opacity: lerp(1, 0.15, q) }}>{body}</AbsoluteFill>
    );
  }

  return <SceneContext.Provider value={entry}>{body}</SceneContext.Provider>;
};
