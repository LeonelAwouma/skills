import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { DarkBackdrop } from "../components/Backdrop";
import { KineticText, parseMarkup } from "../components/KineticText";
import { COLORS, FONT_UI } from "../design/tokens";
import { progress } from "../design/motion";
import { useScene, useSceneTime } from "../engine/context";
import { FitBox, useLayout } from "../engine/layout";
import type { Scene } from "../engine/types";
import { ScreenshotVisual } from "./showcase/ScreenshotVisual";

type S = Extract<Scene, { type: "screenshot" }>;

/** A captured interface (Playwright or any PNG) with simulated camera moves, optional headline and caption. */
export const ScreenshotScene: React.FC<{ scene: S }> = ({ scene }) => {
  const t = useSceneTime();
  const { fps } = useVideoConfig();
  const { durationFrames } = useScene();
  const layout = useLayout();
  const landscape = layout.orientation === "landscape";
  const hasText = !!scene.lines?.length;
  const tz = layout.text;
  // Without a headline the screenshot takes the whole canvas.
  const box = hasText ? layout.visual : { x: layout.W * 0.04, y: layout.H * 0.1, w: layout.W * 0.92, h: layout.H * 0.72 };

  return (
    <AbsoluteFill>
      <DarkBackdrop offset={Math.max(0, t)} />
      {hasText ? (
        <div style={{ position: "absolute", left: tz.x, width: tz.w, top: landscape ? tz.y + tz.h * 0.3 : tz.y }}>
          <KineticText fontSize={layout.headline} fit={landscape ? tz.w : layout.W * 0.88} align={landscape ? "left" : "center"} start={4} stagger={4} lines={parseMarkup(scene.lines ?? [])} style={{ filter: "drop-shadow(0 6px 30px rgba(4,8,33,0.8))" }} />
        </div>
      ) : null}
      <FitBox box={box} dw={1080} dh={920} maxScale={1.6}>
        <ScreenshotVisual images={[{ src: scene.image, focus: scene.focus }]} durationFrames={durationFrames} fps={fps} />
      </FitBox>
      {scene.caption ? (
        <div style={{ position: "absolute", left: box.x, width: box.w, top: box.y + box.h + 10 * layout.u, textAlign: "center", fontFamily: FONT_UI, fontSize: 30 * layout.u, fontWeight: 500, color: COLORS.slate, opacity: progress(t, 10, 14) }}>{scene.caption}</div>
      ) : null}
    </AbsoluteFill>
  );
};
