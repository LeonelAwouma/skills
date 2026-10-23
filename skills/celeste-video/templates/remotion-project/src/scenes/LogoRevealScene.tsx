import React from "react";
import { AbsoluteFill } from "remotion";
import { LightBackdrop } from "../components/Backdrop";
import { KineticText, parseMarkup } from "../components/KineticText";
import { LogoReveal, logoAspect } from "../components/Logo";
import { COLORS, GRADIENT_ACCENT_LIGHT } from "../design/tokens";
import { useSceneTime } from "../engine/context";
import { useLayout } from "../engine/layout";
import type { Scene } from "../engine/types";

type S = Extract<Scene, { type: "logo-reveal" }>;

/** The logo opens like an iris, then the tagline lands. Light background: logos are drawn for white. */
export const LogoRevealScene: React.FC<{ scene: S }> = ({ scene }) => {
  const t = useSceneTime();
  const layout = useLayout();
  const aspect = logoAspect();
  const lines = scene.lines ?? [];
  const landscape = layout.orientation === "landscape";
  const logoW = landscape ? Math.min(layout.W * 0.44, (layout.H * 0.62) / aspect) : Math.min(layout.W * 0.87, (layout.H * 0.42) / aspect);
  const logoH = logoW * aspect;
  const textSize = layout.headline * 1.04;
  const textH = lines.length * textSize * 1.1;

  const logoLeft = landscape ? layout.W * 0.27 - logoW / 2 : (layout.W - logoW) / 2;
  const logoTop = landscape ? (layout.H - logoH) / 2 : Math.max(layout.H * 0.1, (layout.H - (logoH + textH + 60 * layout.u)) / 2 - layout.H * 0.03);

  return (
    <AbsoluteFill>
      <LightBackdrop offset={t} />
      <div style={{ position: "absolute", left: logoLeft, top: logoTop }}>
        <LogoReveal width={logoW} frame={t} />
      </div>
      {lines.length ? (
        <div
          style={
            landscape
              ? { position: "absolute", left: layout.W * 0.52, right: layout.W * 0.03, top: (layout.H - textH) / 2 }
              : { position: "absolute", left: 0, right: 0, top: logoTop + logoH + 60 * layout.u }
          }
        >
          <KineticText
            fontSize={textSize}
            fit={landscape ? layout.W * 0.44 : layout.W * 0.88}
            align={landscape ? "left" : "center"}
            start={34}
            stagger={5}
            color={COLORS.ink}
            accentGradient={GRADIENT_ACCENT_LIGHT}
            lines={parseMarkup(lines)}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
