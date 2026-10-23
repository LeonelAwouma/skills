import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { DarkBackdrop } from "../components/Backdrop";
import { KineticText, parseMarkup } from "../components/KineticText";
import { COLORS } from "../design/tokens";
import { CLAMP, EASE_IN, EASE_OUT, progress } from "../design/motion";
import { useScene, useSceneTime } from "../engine/context";
import { FitBox, useLayout } from "../engine/layout";
import type { Scene } from "../engine/types";
import { DeskField } from "./DeskField";

type S = Extract<Scene, { type: "problem-solution" }>;

const DESK_Y0 = 640; // the desk is drawn on a 1080x1920 canvas; we show the band that holds the windows
const DESK_H = 1040;

/**
 * Problem -> solution on ONE continuous visual: scattered application windows flagged with problems turn
 * into an ordered grid. The headline changes at `split` (fraction of the scene, default 0.43).
 */
export const ProblemSolutionScene: React.FC<{ scene: S }> = ({ scene }) => {
  const t = useSceneTime();
  const { durationFrames } = useScene();
  const layout = useLayout();
  const splitFrame = Math.round(durationFrames * (scene.split ?? 0.43));
  const calmStart = splitFrame + 8;

  const flash = t >= 0 ? interpolate(t, [0, 1, 4], [0.85, 0.6, 0], CLAMP) : 0;
  const exit = progress(t, splitFrame - 12, 10, EASE_IN);
  const glitchX = Math.sin(t * 9) * 34 * exit;
  const scribble = progress(t, 22, 16, EASE_OUT);
  const size = layout.headline * 1.18;
  const maxW = layout.orientation === "landscape" ? layout.text.w : layout.W * 0.88;
  const tz = layout.text;
  const textTop = layout.orientation === "portrait" ? layout.H * 0.12 : tz.y + (tz.h - size * 2.4) / 2;
  const left = layout.orientation === "landscape" ? tz.x : 0;
  const width = layout.orientation === "landscape" ? tz.w : layout.W;

  return (
    <AbsoluteFill>
      <DarkBackdrop offset={Math.max(0, t)} />
      <FitBox box={layout.visual} dw={1080} dh={DESK_H} maxScale={1}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: DESK_H, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: -DESK_Y0, width: 1080, height: 1920 }}>
            <DeskField calmStart={calmStart} />
          </div>
        </div>
      </FitBox>

      {/* problem headline (before the split) */}
      {t < splitFrame + 4 ? (
        <div style={{ position: "absolute", left, width, top: textTop, opacity: 1 - exit, translate: `${glitchX}px 0px`, filter: exit > 0 ? `blur(${exit * 6}px)` : undefined }}>
          <KineticText
            variant="slam"
            fontSize={size}
            fit={maxW}
            stagger={2}
            start={0}
            align={layout.align}
            lines={parseMarkup(scene.problem.lines, "warn")}
            style={{ filter: "drop-shadow(0 6px 30px rgba(4,8,33,0.9))" }}
          />
          <svg width={width} height={60 * layout.u} viewBox="0 0 1080 60" preserveAspectRatio="none" style={{ position: "absolute", left: 0, top: size * scene.problem.lines.length * 1.08 - 6 * layout.u, overflow: "visible" }}>
            <path d="M120 34 C 260 8, 380 52, 520 26 S 800 40, 940 18" fill="none" stroke={COLORS.danger} strokeWidth={9 / Math.max(0.5, layout.u)} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - scribble} />
          </svg>
        </div>
      ) : null}

      {/* solution headline (after the split) */}
      {t >= splitFrame - 2 ? (
        <div style={{ position: "absolute", left, width, top: textTop }}>
          <KineticText fontSize={size * 0.96} fit={maxW} start={splitFrame + 3} stagger={4} align={layout.align} lines={parseMarkup(scene.solution.lines)} style={{ filter: "drop-shadow(0 6px 30px rgba(4,8,33,0.9))" }} />
        </div>
      ) : null}

      <AbsoluteFill style={{ background: COLORS.white, opacity: flash, zIndex: 50 }} />
    </AbsoluteFill>
  );
};
