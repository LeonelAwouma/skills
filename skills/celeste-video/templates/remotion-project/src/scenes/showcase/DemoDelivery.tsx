import React from "react";
import { CheckIcon } from "../../components/Window";
import { COLORS, FONT_DISPLAY, FONT_UI } from "../../design/tokens";
import { EASE_IN_OUT, EASE_OUT, progress } from "../../design/motion";
import { useSceneTime } from "../../engine/context";
import { ASSETS } from "../../engine/data";
import { getLabels } from "../../engine/i18n";

const L = getLabels(ASSETS.lang);
const STEP_AT = 8;
const STEP_GAP = 21;
const AREA_H = 780;

const ICONS: Record<string, string> = {
  idea: "M4 20l1-4.5L16 4.5 19.5 8 8.5 19z M14 6.5l3.5 3.5",
  code: "M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 5l-4 14",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5",
  flag: "M5 21V4 M5 4h13l-2.5 4 2.5 4H5",
};
const ICON_ORDER = ["idea", "code", "shield", "flag"];

type Step = { title: string; sub?: string; icon?: string };

/** Demo D: stages from idea to production (3 to 5 steps), ending with a "live" status. */
export const DemoDelivery: React.FC<{ steps?: Step[]; done?: string }> = ({ steps, done: doneLabel = L.online }) => {
  const t = useSceneTime();
  const list = (steps && steps.length >= 3 ? steps : L.stages).slice(0, 5);
  const n = list.length;
  const rowH = AREA_H / n;
  const cardH = rowH - 20;
  const circle = Math.min(112, cardH - 40);
  const lastDone = STEP_AT + (n - 1) * STEP_GAP + 16;
  const online = progress(t, lastDone, 12, EASE_OUT);
  const pulse = 0.5 + 0.5 * Math.sin(t / 4);
  const railTop = cardH / 2;
  const railX = 80 + 36 + circle / 2 - 4;

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT_UI }}>
      <div style={{ position: "absolute", left: railX, top: railTop, width: 8, height: rowH * (n - 1), borderRadius: 4, background: "rgba(120,170,255,0.25)" }} />
      <div
        style={{
          position: "absolute",
          left: railX,
          top: railTop,
          width: 8,
          height: rowH * (n - 1),
          borderRadius: 4,
          background: `linear-gradient(180deg, ${COLORS.cyan}, ${COLORS.blue})`,
          scale: `1 ${progress(t, STEP_AT + 8, STEP_GAP * (n - 1), EASE_IN_OUT)}`,
          transformOrigin: "top",
          boxShadow: "0 0 18px rgba(34,211,238,0.7)",
        }}
      />
      {list.map((s, i) => {
        const at = STEP_AT + i * STEP_GAP;
        const enter = progress(t, at, 14, EASE_OUT);
        const done = progress(t, at + 14, 8);
        const active = enter > 0 && done < 1;
        const icon = ICONS[s.icon ?? ICON_ORDER[i % 4]] ?? ICONS.flag;
        return (
          <div
            key={`${s.title}-${i}`}
            style={{
              position: "absolute",
              left: 80,
              top: i * rowH,
              width: 920,
              height: cardH,
              borderRadius: 34,
              display: "flex",
              alignItems: "center",
              gap: 36,
              padding: "0 40px 0 36px",
              background: active ? "rgba(31,91,255,0.28)" : "rgba(11,21,80,0.75)",
              border: `2.5px solid ${active ? COLORS.cyan : "rgba(120,170,255,0.3)"}`,
              boxShadow: active ? `0 0 ${30 + pulse * 20}px rgba(34,211,238,0.35)` : undefined,
              opacity: enter,
              translate: `${(1 - enter) * 120}px 0px`,
            }}
          >
            <div
              style={{
                width: circle,
                height: circle,
                borderRadius: "50%",
                background: done > 0.5 ? COLORS.ok : `linear-gradient(135deg, ${COLORS.royal}, ${COLORS.blue})`,
                display: "grid",
                placeItems: "center",
                flex: "none",
                boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
              }}
            >
              {done > 0.5 ? (
                <CheckIcon size={circle * 0.57} stroke={3} />
              ) : (
                <svg width={circle * 0.52} height={circle * 0.52} viewBox="0 0 24 24" fill="none" stroke={COLORS.white} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon} />
                </svg>
              )}
            </div>
            <div>
              <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: Math.min(58, cardH * 0.34), color: COLORS.white, letterSpacing: -1 }}>{s.title}</div>
              {s.sub ? <div style={{ fontSize: Math.min(34, cardH * 0.2), fontWeight: 500, color: COLORS.ice, opacity: 0.85 }}>{s.sub}</div> : null}
            </div>
          </div>
        );
      })}

      <div style={{ position: "absolute", left: 0, right: 0, top: AREA_H + 8, display: "flex", justifyContent: "center", opacity: online, scale: `${0.85 + 0.15 * online}` }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "16px 40px",
            borderRadius: 999,
            background: "rgba(45,212,167,0.16)",
            border: `2.5px solid ${COLORS.ok}`,
            fontSize: 38,
            fontWeight: 700,
            color: COLORS.white,
            boxShadow: `0 0 ${24 + pulse * 20}px rgba(45,212,167,0.45)`,
          }}
        >
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: COLORS.ok, boxShadow: `0 0 ${10 + pulse * 12}px ${COLORS.ok}` }} />
          {doneLabel}
        </div>
      </div>
    </div>
  );
};
