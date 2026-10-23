import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { DarkBackdrop } from "../components/Backdrop";
import { KineticText, parseMarkup } from "../components/KineticText";
import { Pill } from "../components/Window";
import { COLORS, FONT_UI } from "../design/tokens";
import { progress } from "../design/motion";
import { useScene, useSceneTime } from "../engine/context";
import { ASSETS } from "../engine/data";
import { getLabels } from "../engine/i18n";
import { FitBox, useLayout } from "../engine/layout";
import type { Scene } from "../engine/types";
import { DemoApp } from "./showcase/DemoApp";
import { DemoAutomation } from "./showcase/DemoAutomation";
import { DemoDelivery } from "./showcase/DemoDelivery";
import { DemoIntegrations } from "./showcase/DemoIntegrations";
import { ScreenshotVisual } from "./showcase/ScreenshotVisual";

type S = Extract<Scene, { type: "showcase" }>;
const L = getLabels(ASSETS.lang);

const Visual: React.FC<{ scene: S; durationFrames: number; fps: number }> = ({ scene, durationFrames, fps }) => {
  const v = scene.visual;
  switch (v.kind) {
    case "app":
      return <DemoApp appTitle={v.appTitle} nav={v.nav} />;
    case "automation":
      return <DemoAutomation source={v.source} node={v.node} before={v.before} after={v.after} done={v.done} steps={v.steps} />;
    case "integrations":
      return <DemoIntegrations hub={v.hub} tools={v.tools} />;
    case "timeline":
      return <DemoDelivery steps={v.steps} done={v.done} />;
    case "screenshot":
      return <ScreenshotVisual images={v.images} durationFrames={durationFrames} fps={fps} />;
  }
};

/** Tag + headline + an interface illustration (app / automation / integrations / timeline / screenshot). */
export const ShowcaseScene: React.FC<{ scene: S }> = ({ scene }) => {
  const t = useSceneTime();
  const { group, durationFrames } = useScene();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const landscape = layout.orientation === "landscape";
  const tz = layout.text;
  const size = layout.headline;
  const isShot = scene.visual.kind === "screenshot";
  const note = scene.note ?? (isShot ? undefined : L.illustration);

  return (
    <AbsoluteFill>
      <DarkBackdrop offset={Math.max(0, t) + 40} />
      <div style={{ position: "absolute", left: tz.x, width: tz.w, top: landscape ? tz.y + tz.h * 0.2 : tz.y, display: "flex", flexDirection: "column", alignItems: landscape ? "flex-start" : "center", gap: 28 * layout.u }}>
        {scene.tag ? (
          <Pill size={34 * layout.u} style={{ scale: `${0.8 + 0.2 * progress(t, 0, 14)}`, opacity: progress(t, 0, 10) }}>
            {group.size > 1 ? (
              <>
                <span style={{ color: COLORS.cyan, fontWeight: 700 }}>{String(group.index + 1).padStart(2, "0")}</span>
                <span style={{ opacity: 0.5 }}>/</span>
              </>
            ) : null}
            <span>{scene.tag}</span>
          </Pill>
        ) : null}
        <KineticText
          fontSize={size}
          fit={landscape ? tz.w : layout.W * 0.88}
          align={landscape ? "left" : "center"}
          start={4}
          stagger={4}
          lines={parseMarkup(scene.lines)}
          style={{ filter: "drop-shadow(0 6px 30px rgba(4,8,33,0.8))" }}
        />
      </div>

      <FitBox box={layout.visual} dw={1080} dh={920}>
        <Visual scene={scene} durationFrames={durationFrames} fps={fps} />
      </FitBox>

      {note || group.size > 1 ? (
        <div
          style={{
            position: "absolute",
            left: layout.visual.x,
            width: layout.visual.w,
            top: layout.visual.y + layout.visual.h + 6 * layout.u,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 26 * layout.u,
            fontFamily: FONT_UI,
            fontSize: 28 * layout.u,
            fontWeight: 500,
            color: COLORS.slate,
            opacity: progress(t, 10, 14),
          }}
        >
          {note ? <span>{note}</span> : null}
          {group.size > 1 ? (
            <div style={{ display: "flex", gap: 10 }}>
              {Array.from({ length: group.size }).map((_, i) => (
                <div key={i} style={{ width: i === group.index ? 36 : 12, height: 12, borderRadius: 6, background: i === group.index ? COLORS.cyan : "rgba(142,160,201,0.45)" }} />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
