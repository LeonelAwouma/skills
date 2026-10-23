import React from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Subtitles } from "../components/Subtitles";
import { Voiceover } from "../components/Voiceover";
import { COLORS } from "../design/tokens";
import { EASE_IN_OUT, progress } from "../design/motion";
import { SceneShell } from "./SceneShell";
import { ASSETS, MANIFEST, STORYBOARD } from "./data";
import { FADE_OUT_FRAMES, TAIL, buildTimeline, totalFrames } from "./timeline";
import { musicVolume } from "./voice";
import type { Scene } from "./types";
import { BulletsScene } from "../scenes/BulletsScene";
import { CtaScene } from "../scenes/CtaScene";
import { KineticScene } from "../scenes/KineticScene";
import { LogoRevealScene } from "../scenes/LogoRevealScene";
import { ProblemSolutionScene } from "../scenes/ProblemSolutionScene";
import { ScreenshotScene } from "../scenes/ScreenshotScene";
import { ShowcaseScene } from "../scenes/ShowcaseScene";
import { ValueScene } from "../scenes/ValueScene";

const renderScene = (scene: Scene) => {
  switch (scene.type) {
    case "kinetic":
      return <KineticScene scene={scene} />;
    case "problem-solution":
      return <ProblemSolutionScene scene={scene} />;
    case "logo-reveal":
      return <LogoRevealScene scene={scene} />;
    case "showcase":
      return <ShowcaseScene scene={scene} />;
    case "value":
      return <ValueScene scene={scene} />;
    case "cta":
      return <CtaScene scene={scene} />;
    case "bullets":
      return <BulletsScene scene={scene} />;
    case "screenshot":
      return <ScreenshotScene scene={scene} />;
  }
};

const EndFade: React.FC = () => {
  const frame = useCurrentFrame();
  const total = totalFrames(STORYBOARD);
  const o = progress(frame, total - FADE_OUT_FRAMES, FADE_OUT_FRAMES, EASE_IN_OUT);
  return <AbsoluteFill style={{ background: COLORS.navy950, opacity: o, zIndex: 90 }} />;
};

/** The composition: scenes stacked on one timeline, then narration, music, captions and the closing fade. */
export const Video: React.FC = () => {
  const timeline = buildTimeline(STORYBOARD);
  const hasVoice = ASSETS.voice && MANIFEST.segments.length > 0;
  return (
    <AbsoluteFill style={{ background: COLORS.navy950 }}>
      {ASSETS.music ? <Audio src={staticFile(ASSETS.music.src)} volume={hasVoice ? (f) => musicVolume(f) : ASSETS.music.volume} /> : null}
      {hasVoice ? <Voiceover /> : null}
      {timeline.map((entry) => {
        const last = entry.index === timeline.length - 1;
        return (
          <Sequence
            key={entry.scene.id}
            name={`${entry.index + 1} · ${entry.scene.id}`}
            from={entry.startFrame - entry.lead}
            durationInFrames={entry.durationFrames + entry.lead + (last ? 0 : TAIL)}
          >
            <SceneShell entry={entry}>{renderScene(entry.scene)}</SceneShell>
          </Sequence>
        );
      })}
      {hasVoice ? <Subtitles /> : null}
      <EndFade />
    </AbsoluteFill>
  );
};
