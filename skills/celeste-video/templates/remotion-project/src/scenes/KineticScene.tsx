import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { DarkBackdrop, LightBackdrop } from "../components/Backdrop";
import { KineticText, parseMarkup } from "../components/KineticText";
import { COLORS, FONT_UI, GRADIENT_ACCENT_DARK, GRADIENT_ACCENT_LIGHT } from "../design/tokens";
import { CLAMP, EASE_OUT, progress } from "../design/motion";
import { useSceneTime } from "../engine/context";
import { useLayout } from "../engine/layout";
import type { Scene } from "../engine/types";

type S = Extract<Scene, { type: "kinetic" }>;

/** Big headline in kinetic typography. `variant: "slam"` adds an impact flash (good for hooks). */
export const KineticScene: React.FC<{ scene: S }> = ({ scene }) => {
  const t = useSceneTime();
  const layout = useLayout();
  const light = scene.bg === "light";
  const slam = (scene.variant ?? "pop") === "slam";
  const flash = slam && t >= 0 ? interpolate(t, [0, 1, 4], [0.85, 0.6, 0], CLAMP) : 0;
  const size = layout.headline * 1.2;

  return (
    <AbsoluteFill>
      {light ? <LightBackdrop offset={t} /> : <DarkBackdrop offset={t} />}
      <div style={{ position: "absolute", left: layout.W * 0.05, right: layout.W * 0.05, top: layout.H * (layout.orientation === "portrait" ? 0.26 : 0.3), display: "flex", justifyContent: "center" }}>
        <div>
          <KineticText
            variant={slam ? "slam" : "pop"}
            fontSize={size}
            fit={layout.W * 0.88}
            start={slam ? 0 : 2}
            stagger={slam ? 2 : 4}
            color={light ? COLORS.ink : COLORS.white}
            accentGradient={light ? GRADIENT_ACCENT_LIGHT : GRADIENT_ACCENT_DARK}
            lines={parseMarkup(scene.lines, scene.tone === "warn" ? "warn" : "accent")}
            style={{ filter: light ? undefined : "drop-shadow(0 6px 30px rgba(4,8,33,0.9))" }}
          />
          {scene.sub ? (
            <div
              style={{
                marginTop: 40 * layout.u,
                textAlign: "center",
                fontFamily: FONT_UI,
                fontWeight: 600,
                fontSize: 44 * layout.u,
                color: light ? "#5C6A99" : COLORS.ice,
                opacity: progress(t, 22, 14),
                translate: `0px ${(1 - progress(t, 22, 18, EASE_OUT)) * 30}px`,
              }}
            >
              {scene.sub}
            </div>
          ) : null}
        </div>
      </div>
      {slam ? <AbsoluteFill style={{ background: COLORS.white, opacity: flash, zIndex: 50 }} /> : null}
    </AbsoluteFill>
  );
};
