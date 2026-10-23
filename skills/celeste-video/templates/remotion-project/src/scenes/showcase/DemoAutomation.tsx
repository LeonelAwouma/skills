import React from "react";
import { CheckIcon } from "../../components/Window";
import { COLORS, FONT_UI } from "../../design/tokens";
import { EASE_IN_OUT, EASE_OUT, lerp, progress } from "../../design/motion";
import { useSceneTime as useSlotFrame } from "../../engine/context";
import { ASSETS } from "../../engine/data";
import { getLabels } from "../../engine/i18n";

const L = getLabels(ASSETS.lang);

const CX = 540;
const NODE_TOP = 340;
const NODE_H = 200;
const RESULT_TOP = 690;
const PACKETS = 5;
const FIRST = 26; // first packet leaves
const GAP = 13; // frames between packets
const TRAVEL = 40;

/** 4-point star, the same family of shapes as the brand mark (not the logo itself). */
const Sparkle: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path d="M12 1.5c.9 5.6 4.9 9.6 10.5 10.5-5.6.9-9.6 4.9-10.5 10.5C11.1 16.9 7.1 12.9 1.5 12 7.1 11.1 11.1 7.1 12 1.5z" fill={color} />
  </svg>
);

const DocCard: React.FC<{ y: number; opacity: number; scale: number; tone: string }> = ({ y, opacity, scale, tone }) => (
  <div
    style={{
      position: "absolute",
      left: CX - 70,
      top: y,
      width: 140,
      height: 86,
      borderRadius: 14,
      background: COLORS.white,
      boxShadow: "0 14px 30px rgba(0,0,0,0.4)",
      padding: "14px 16px",
      opacity,
      scale: `${scale}`,
      display: "flex",
      flexDirection: "column",
      gap: 9,
    }}
  >
    <div style={{ width: 34, height: 12, borderRadius: 6, background: tone }} />
    <div style={{ width: "88%", height: 9, borderRadius: 6, background: COLORS.line }} />
    <div style={{ width: "60%", height: 9, borderRadius: 6, background: COLORS.line }} />
  </div>
);

/** Demo B – a manual process becomes an automated flow: documents → automation → structured data. */
export const DemoAutomation: React.FC<{ source?: string; node?: string; before?: string; after?: string; done?: string; steps?: string[] }> = ({
  source = L.sourceDocs,
  node = L.automation,
  before = L.manualEntry,
  after = L.automatic,
  done: doneLabel = L.processed,
  steps = L.steps,
}) => {
  const t = useSlotFrame();

  const toggle = progress(t, 14, 10, EASE_IN_OUT);
  const nodeIn = progress(t, 4, 16, EASE_OUT);
  const pulse = 0.5 + 0.5 * Math.sin(t / 4);
  const done = progress(t, FIRST + GAP * (PACKETS - 1) + TRAVEL, 10);

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT_UI }}>
      {/* before / after switch */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 4, display: "flex", justifyContent: "center", alignItems: "center", gap: 24 }}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 600,
            color: COLORS.slate,
            textDecoration: toggle > 0.5 ? "line-through" : undefined,
            opacity: lerp(1, 0.6, toggle),
          }}
        >
          {before}
        </div>
        <div
          style={{
            width: 96,
            height: 52,
            borderRadius: 26,
            background: lerp(0, 1, toggle) > 0.5 ? COLORS.blue : "#3A4680",
            padding: 5,
            boxShadow: toggle > 0.5 ? "0 0 30px rgba(31,91,255,0.7)" : undefined,
          }}
        >
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: COLORS.white, translate: `${toggle * 44}px 0px` }} />
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: toggle > 0.5 ? COLORS.cyan : COLORS.slate }}>{after}</div>
      </div>

      {/* source label */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 100,
          textAlign: "center",
          fontSize: 30,
          fontWeight: 600,
          color: COLORS.ice,
          opacity: progress(t, 6, 10),
        }}
      >
        {source}
      </div>

      {/* pipes */}
      <div style={{ position: "absolute", left: CX - 3, top: 190, width: 6, height: NODE_TOP - 190, background: "rgba(120,170,255,0.35)", borderRadius: 3, scale: `1 ${progress(t, 6, 14)}`, transformOrigin: "top" }} />
      <div style={{ position: "absolute", left: CX - 3, top: NODE_TOP + NODE_H, width: 6, height: RESULT_TOP - NODE_TOP - NODE_H, background: "rgba(34,211,238,0.5)", borderRadius: 3, scale: `1 ${progress(t, 10, 14)}`, transformOrigin: "top" }} />

      {/* automation node */}
      <div
        style={{
          position: "absolute",
          left: CX - 200,
          top: NODE_TOP,
          width: 400,
          height: NODE_H,
          borderRadius: 36,
          background: `linear-gradient(135deg, ${COLORS.royal}, ${COLORS.blue} 60%, ${COLORS.sky})`,
          boxShadow: `0 0 ${50 + pulse * 40}px rgba(34,211,238,${0.35 + pulse * 0.25}), inset 0 0 0 2px rgba(255,255,255,0.35)`,
          scale: `${nodeIn}`,
          opacity: nodeIn,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          color: COLORS.white,
        }}
      >
        <div style={{ rotate: `${t * 2}deg` }}>
          <Sparkle size={64} color={COLORS.white} />
        </div>
        <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.5 }}>{node}</div>
        <div style={{ fontSize: 26, fontWeight: 600, color: COLORS.ice, opacity: 0.9 }}>
          {steps[Math.floor(t / 10) % steps.length]}…
        </div>
      </div>

      {/* travelling documents */}
      {Array.from({ length: PACKETS }).map((_, k) => {
        const start = FIRST + k * GAP;
        const p = (t - start) / TRAVEL; // 0..1
        if (p < 0 || p > 1) {
          return null;
        }
        // phase 1: source → node (0–0.3), hidden inside node (0.3–0.6), phase 3: node → result row (0.6–1)
        let y: number;
        let opacity = 1;
        let scale = 1;
        if (p < 0.3) {
          y = lerp(130, NODE_TOP + 30, p / 0.3);
          scale = lerp(1, 0.8, p / 0.3);
        } else if (p < 0.6) {
          y = NODE_TOP + 30;
          opacity = 0;
          scale = 0.6;
        } else {
          const q = (p - 0.6) / 0.4;
          y = lerp(NODE_TOP + NODE_H - 40, RESULT_TOP + 30 + k * 50, q);
          scale = lerp(0.6, 0.5, q);
          opacity = 1 - progress(q, 0.7, 0.3);
        }
        return <DocCard key={k} y={y} opacity={opacity} scale={scale} tone={k % 2 ? COLORS.cyan : COLORS.blue} />;
      })}

      {/* structured result */}
      <div
        style={{
          position: "absolute",
          left: 130,
          top: RESULT_TOP,
          width: 820,
          height: 230,
          borderRadius: 26,
          background: COLORS.white,
          boxShadow: "0 30px 70px rgba(0,0,0,0.5)",
          padding: "16px 28px",
          opacity: progress(t, 12, 12),
          translate: `0px ${(1 - progress(t, 12, 16)) * 40}px`,
        }}
      >
        {Array.from({ length: PACKETS }).map((_, k) => {
          const arrive = FIRST + k * GAP + TRAVEL * 0.72;
          const p = progress(t, arrive, 8);
          return (
            <div
              key={k}
              style={{
                height: 38,
                marginBottom: k === PACKETS - 1 ? 0 : 3,
                display: "flex",
                alignItems: "center",
                gap: 16,
                opacity: 0.2 + 0.8 * p,
                translate: `0px ${(1 - p) * 10}px`,
              }}
            >
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: p > 0.5 ? COLORS.ok : COLORS.line, display: "grid", placeItems: "center" }}>
                {p > 0.5 ? <CheckIcon size={18} /> : null}
              </div>
              <div style={{ width: `${70 - k * 6}%`, height: 11, borderRadius: 8, background: COLORS.ink, opacity: 0.8 }} />
              <div style={{ marginLeft: "auto", width: 90, height: 11, borderRadius: 8, background: COLORS.line }} />
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: RESULT_TOP + 245,
          textAlign: "center",
          fontSize: 34,
          fontWeight: 700,
          color: COLORS.cyan,
          opacity: done,
          scale: `${0.9 + 0.1 * done}`,
        }}
      >
        {doneLabel}
      </div>
    </div>
  );
};
