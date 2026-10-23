import React from "react";
import { AbsoluteFill, spring, useVideoConfig } from "remotion";
import { DarkBackdrop } from "../components/Backdrop";
import { KineticText, parseMarkup } from "../components/KineticText";
import { Pill } from "../components/Window";
import { COLORS, FONT_DISPLAY, FONT_UI } from "../design/tokens";
import { progress } from "../design/motion";
import { useSceneTime } from "../engine/context";
import { useLayout } from "../engine/layout";
import type { Scene } from "../engine/types";

type S = Extract<Scene, { type: "bullets" }>;

const GLYPHS: Record<string, string> = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  star: "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z",
  bolt: "M13 2L4 14h6l-1 8 9-12h-6z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5",
  heart: "M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z",
  clock: "M12 7v5l3 2 M12 3a9 9 0 100 18 9 9 0 000-18z",
};

/** A headline and 2 to 5 cards (title + optional text). Generic scene for explainers and feature lists. */
export const BulletsScene: React.FC<{ scene: S }> = ({ scene }) => {
  const t = useSceneTime();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const landscape = layout.orientation === "landscape";
  const tz = layout.text;
  const vz = layout.visual;
  const n = scene.items.length;
  const gap = 22 * layout.u;
  const cardH = Math.min(220 * layout.u, (vz.h - gap * (n - 1)) / n);
  const hasText = scene.items.some((i) => i.text);

  return (
    <AbsoluteFill>
      <DarkBackdrop offset={Math.max(0, t)} />
      <div style={{ position: "absolute", left: tz.x, width: tz.w, top: landscape ? tz.y + tz.h * 0.25 : tz.y, display: "flex", flexDirection: "column", alignItems: landscape ? "flex-start" : "center", gap: 26 * layout.u }}>
        {scene.tag ? (
          <Pill size={34 * layout.u} style={{ opacity: progress(t, 0, 10) }}>
            {scene.tag}
          </Pill>
        ) : null}
        <KineticText fontSize={layout.headline} fit={landscape ? tz.w : layout.W * 0.88} align={landscape ? "left" : "center"} start={3} stagger={4} lines={parseMarkup(scene.lines)} style={{ filter: "drop-shadow(0 6px 30px rgba(4,8,33,0.8))" }} />
      </div>
      <div style={{ position: "absolute", left: vz.x + vz.w * 0.06, width: vz.w * 0.88, top: vz.y + (vz.h - (cardH * n + gap * (n - 1))) / 2, display: "flex", flexDirection: "column", gap }}>
        {scene.items.map((item, i) => {
          const s = spring({ frame: t - (16 + i * 9), fps, config: { damping: 15, stiffness: 150 } });
          const glyph = GLYPHS[item.icon ?? ""] ?? null;
          return (
            <div
              key={`${item.title}-${i}`}
              style={{
                height: cardH,
                borderRadius: 30 * layout.u,
                background: "rgba(11,21,80,0.78)",
                border: "2.5px solid rgba(120,170,255,0.32)",
                boxShadow: "0 20px 50px rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                gap: 28 * layout.u,
                padding: `0 ${36 * layout.u}px`,
                opacity: Math.min(1, s * 2),
                translate: `${(1 - s) * 120}px 0px`,
              }}
            >
              <div style={{ width: cardH * 0.52, height: cardH * 0.52, borderRadius: "50%", flex: "none", background: `linear-gradient(135deg, ${COLORS.royal}, ${COLORS.blue})`, display: "grid", placeItems: "center", color: COLORS.white, fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: cardH * 0.26 }}>
                {glyph ? (
                  <svg width={cardH * 0.28} height={cardH * 0.28} viewBox="0 0 24 24" fill="none" stroke={COLORS.white} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={glyph} />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: Math.min(54 * layout.u, cardH * (hasText ? 0.28 : 0.36)), color: COLORS.white, letterSpacing: -0.5 }}>{item.title}</div>
                {item.text ? <div style={{ fontFamily: FONT_UI, fontWeight: 500, fontSize: Math.min(32 * layout.u, cardH * 0.18), color: COLORS.ice, opacity: 0.88, marginTop: 4 }}>{item.text}</div> : null}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
