import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { CUES } from "./cvVoice";

const HOLD = 4;

const endOf = (i: number) => {
  const c = CUES[i];
  const next = CUES[i + 1];
  return next && next.fromFrame - c.toFrame <= HOLD ? next.fromFrame : c.toFrame + HOLD;
};

/**
 * Captions that follow the narration. `bottom` is the distance from the bottom edge in px
 * (keep it above the platform UI: ~260 px on 1080x1920).
 */
export const CvSubtitles: React.FC<{ bottom?: number; fontFamily?: string }> = ({ bottom = 250, fontFamily = "sans-serif" }) => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const u = width / 1080;
  const index = CUES.findIndex((c, i) => frame >= c.fromFrame - 1 && frame < endOf(i));
  if (index < 0) {
    return null;
  }
  const end = endOf(index);
  const t = frame - CUES[index].fromFrame;
  const opacity = Math.min(interpolate(t, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), interpolate(frame, [end - 4, end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100, justifyContent: "flex-end", alignItems: "center", paddingBottom: bottom * u }}>
      <div style={{ opacity, padding: `${14 * u}px ${34 * u}px`, borderRadius: 30 * u, background: "rgba(4,8,33,0.86)", color: "#fff", fontFamily, fontWeight: 700, fontSize: 54 * u, whiteSpace: "nowrap" }}>
        {CUES[index].text}
      </div>
    </AbsoluteFill>
  );
};
