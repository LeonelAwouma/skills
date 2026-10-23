import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { COLORS, FONT_DISPLAY } from "../design/tokens";
import { CLAMP, EASE_OUT } from "../design/motion";
import { ASSETS } from "../engine/data";
import { useLayout } from "../engine/layout";
import { CUES } from "../engine/voice";

const HOLD = 4; // frames a cue stays after its end, if no cue follows immediately
const FADE_IN = 5;
const FADE_OUT = 4;

const endOf = (i: number) => {
  const c = CUES[i];
  const next = CUES[i + 1];
  return next && next.fromFrame - c.toFrame <= HOLD ? next.fromFrame : c.toFrame + HOLD;
};

/** Burned-in captions that follow the narration: one short line at a time. Position adapts to the format. */
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const layout = useLayout();
  const index = CUES.findIndex((c, i) => frame >= c.fromFrame - 1 && frame < endOf(i));
  if (index < 0 || !ASSETS.subtitles.burn) {
    return null;
  }
  const cue = CUES[index];
  const end = endOf(index);
  const t = frame - cue.fromFrame;
  const opacity = Math.min(interpolate(t, [0, FADE_IN], [0, 1], { ...CLAMP, easing: EASE_OUT }), interpolate(frame, [end - FADE_OUT, end], [1, 0], CLAMP));
  const rise = interpolate(t, [0, FADE_IN + 2], [14, 0], { ...CLAMP, easing: EASE_OUT });
  const parts = cue.text.split(new RegExp(`(${ASSETS.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[ \\u00a0]")})`, "i"));

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 100 }}>
      <div style={{ position: "absolute", left: 0, right: 0, top: layout.captionTop, display: "flex", justifyContent: "center", opacity, translate: `0px ${rise}px` }}>
        <div
          style={{
            padding: `${14 * layout.u}px ${34 * layout.u}px ${18 * layout.u}px`,
            borderRadius: 30 * layout.u,
            background: "rgba(4,8,33,0.86)",
            border: "1.5px solid rgba(120,170,255,0.35)",
            boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
            fontFamily: FONT_DISPLAY,
            fontWeight: 700,
            fontSize: layout.captionFont,
            lineHeight: 1.15,
            letterSpacing: -0.5,
            color: COLORS.white,
            whiteSpace: "nowrap",
            maxWidth: layout.W * 0.92,
          }}
        >
          {parts.map((p, i) =>
            p.toLowerCase().replace(/\u00a0/g, " ") === ASSETS.brand.toLowerCase() ? (
              <span key={i} style={{ color: COLORS.cyan }}>
                {p}
              </span>
            ) : (
              <span key={i}>{p}</span>
            ),
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
