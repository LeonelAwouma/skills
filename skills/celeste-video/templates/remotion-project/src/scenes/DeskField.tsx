import React from "react";
import {
  AbsoluteFill,
  interpolateColors,
  random,
  spring,
  useVideoConfig,
} from "remotion";
import { Window, CheckIcon } from "../components/Window";
import { COLORS, FONT_UI } from "../design/tokens";
import { EASE_IN_OUT, lerp, progress } from "../design/motion";
import { useSceneTime } from "../engine/context";
import { ASSETS } from "../engine/data";
import { getLabels } from "../engine/i18n";

const L = getLabels(ASSETS.lang);

/**
 * The "desk": six application windows. At frame 0 they are scattered and
 * flagged with problems (scene 1); from CALM_START they glide into a tidy grid
 * and every alert turns into a check mark (scene 2). Uses the *global* frame.
 */
const CALM_DURATION = 52;

const W = 430;
const H = 290;

type BodyProps = { calm: number; frame: number };

const mix = (calm: number, a: string, b: string) =>
  interpolateColors(calm, [0, 1], [a, b]);

const Bar: React.FC<{ w: string | number; h?: number; color?: string; o?: number }> = ({
  w,
  h = 10,
  color = COLORS.line,
  o = 1,
}) => <div style={{ width: w, height: h, borderRadius: h, background: color, opacity: o }} />;

const MailBody: React.FC<BodyProps> = ({ calm }) => (
  <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
    {[0, 1, 2, 3].map((i) => (
      <div key={i} style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: mix(calm, i < 3 ? COLORS.danger : COLORS.warn, COLORS.sky),
            flex: "none",
            display: "grid",
            placeItems: "center",
            opacity: 0.9,
          }}
        >
          {calm > 0.6 ? <CheckIcon size={20} /> : null}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          <Bar w={`${78 - i * 9}%`} h={11} color={mix(calm, "#2A3566", COLORS.ink)} o={0.85} />
          <Bar w={`${52 + i * 6}%`} h={9} />
        </div>
      </div>
    ))}
  </div>
);

const SheetBody: React.FC<BodyProps> = ({ calm }) => {
  const cols = 5;
  const rows = 6;
  return (
    <div style={{ padding: 14, display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 5 }}>
      {Array.from({ length: cols * rows }).map((_, i) => {
        const bad = random(`cell-${i}`) > 0.62 && i > cols;
        const head = i < cols;
        const base = head ? "#DCE6FF" : "#F2F6FF";
        return (
          <div
            key={i}
            style={{
              height: 30,
              borderRadius: 5,
              background: bad ? mix(calm, "#FFC9CF", "#DCE9FF") : base,
              border: bad && calm < 0.5 ? `2px solid ${COLORS.danger}` : "2px solid transparent",
              display: "grid",
              placeItems: "center",
              fontFamily: FONT_UI,
              fontWeight: 700,
              fontSize: 13,
              color: COLORS.danger,
            }}
          >
            {bad && calm < 0.5 ? "#REF!" : null}
          </div>
        );
      })}
    </div>
  );
};

const ChatBody: React.FC<BodyProps> = ({ calm, frame }) => (
  <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          alignSelf: i % 2 ? "flex-end" : "flex-start",
          width: `${60 - i * 6}%`,
          height: 40,
          borderRadius: 18,
          background: i % 2 ? mix(calm, COLORS.warn, COLORS.blue) : "#E8EEFF",
          opacity: 0.95,
        }}
      />
    ))}
    {calm < 0.5 ? (
      <div style={{ display: "flex", gap: 7, paddingLeft: 8 }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: COLORS.danger,
              translate: `0px ${Math.sin(frame / 3 + i) * 5}px`,
            }}
          />
        ))}
      </div>
    ) : (
      <div style={{ alignSelf: "flex-end", display: "flex" }}>
        <CheckIcon size={26} color={COLORS.blue} />
        <div style={{ marginLeft: -12 }}>
          <CheckIcon size={26} color={COLORS.blue} />
        </div>
      </div>
    )}
  </div>
);

const CalBody: React.FC<BodyProps> = ({ calm }) => {
  const events = [
    { col: 0, top: 18, h: 70, chaosTop: 30, chaosCol: 0.6 },
    { col: 1, top: 70, h: 80, chaosTop: 40, chaosCol: 0.3 },
    { col: 2, top: 18, h: 60, chaosTop: 55, chaosCol: 1.3 },
    { col: 3, top: 90, h: 70, chaosTop: 60, chaosCol: 2.1 },
    { col: 4, top: 40, h: 90, chaosTop: 70, chaosCol: 2.2 },
  ];
  return (
    <div style={{ padding: "12px 14px", position: "relative", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-around", fontFamily: FONT_UI, fontWeight: 600, fontSize: 18, color: COLORS.slate }}>
        {["L", "M", "M", "J", "V"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
      </div>
      <div style={{ position: "relative", marginTop: 12, height: 190 }}>
        {events.map((e, i) => {
          const colW = 78;
          const left = lerp(8 + e.chaosCol * 62, 6 + e.col * 80, calm);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left,
                width: colW,
                top: lerp(e.chaosTop, e.top, calm),
                height: e.h,
                borderRadius: 10,
                background: mix(calm, i % 2 ? COLORS.warn : COLORS.danger, i % 2 ? COLORS.cyan : COLORS.blue),
                opacity: 0.92,
                boxShadow: "0 6px 14px rgba(11,18,51,0.18)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
};

const FormBody: React.FC<BodyProps> = ({ calm, frame }) => (
  <div style={{ padding: "14px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
    {L.form.map((label, i) => (
      <div key={label}>
        <div style={{ fontFamily: FONT_UI, fontSize: 17, fontWeight: 600, color: COLORS.slate, marginBottom: 4 }}>
          {label}
        </div>
        <div
          style={{
            height: 40,
            borderRadius: 10,
            border: `2px solid ${mix(calm, i === 2 ? COLORS.danger : COLORS.line, COLORS.line)}`,
            background: calm > 0.5 ? "#EAF2FF" : COLORS.white,
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: 10,
          }}
        >
          {calm > 0.5 ? (
            <>
              <Bar w={`${70 - i * 12}%`} h={10} color={COLORS.sky} />
              <div style={{ marginLeft: "auto" }}>
                <CheckIcon size={22} color={COLORS.blue} />
              </div>
            </>
          ) : i === 0 ? (
            <div style={{ width: 3, height: 24, background: COLORS.ink, opacity: frame % 14 < 7 ? 1 : 0 }} />
          ) : null}
        </div>
      </div>
    ))}
  </div>
);

const ReportBody: React.FC<BodyProps> = ({ calm }) => {
  const chaos = [0.55, 0.9, 0.35, 0.7, 0.25, 0.45];
  const order = [0.3, 0.42, 0.52, 0.64, 0.78, 0.92];
  return (
    <div style={{ padding: "18px 24px", height: "100%", display: "flex", alignItems: "flex-end", gap: 16 }}>
      {chaos.map((c, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${lerp(c, order[i], calm) * 100 * 0.85}%`,
            borderRadius: "8px 8px 3px 3px",
            background: mix(calm, i % 2 ? COLORS.warn : COLORS.danger, i % 2 ? COLORS.cyan : COLORS.blue),
            opacity: 0.92,
          }}
        />
      ))}
    </div>
  );
};

type Item = {
  id: string;
  chaosTitle: string;
  orderTitle: string;
  chaosBadge: string;
  chaos: { x: number; y: number; r: number; s: number };
  order: { x: number; y: number };
  delay: number;
  Body: React.FC<BodyProps>;
};

const ITEMS: Item[] = [
  { id: "mail", chaosTitle: "Boîte de réception", orderTitle: "Messages traités", chaosBadge: "47", chaos: { x: 270, y: 960, r: -9, s: 1.14 }, order: { x: 292, y: 880 }, delay: 0, Body: MailBody },
  { id: "sheet", chaosTitle: "tableau_final_v7.xlsx", orderTitle: "Tableau de suivi", chaosBadge: "!", chaos: { x: 790, y: 900, r: 7, s: 1.12 }, order: { x: 788, y: 880 }, delay: 2, Body: SheetBody },
  { id: "chat", chaosTitle: "Messagerie", orderTitle: "Messagerie", chaosBadge: "12", chaos: { x: 290, y: 1260, r: 6, s: 1.08 }, order: { x: 292, y: 1180 }, delay: 4, Body: ChatBody },
  { id: "cal", chaosTitle: "Agenda", orderTitle: "Agenda", chaosBadge: "!", chaos: { x: 800, y: 1220, r: -7, s: 1.1 }, order: { x: 788, y: 1180 }, delay: 6, Body: CalBody },
  { id: "form", chaosTitle: "Saisie manuelle", orderTitle: "Saisie automatique", chaosBadge: "!!", chaos: { x: 420, y: 1470, r: -4, s: 1.12 }, order: { x: 292, y: 1480 }, delay: 8, Body: FormBody },
  { id: "report", chaosTitle: "Rapport (à refaire)", orderTitle: "Rapport à jour", chaosBadge: "3", chaos: { x: 745, y: 1470, r: 9, s: 1.1 }, order: { x: 788, y: 1480 }, delay: 10, Body: ReportBody },
];

const TOASTS = [
  { text: "Relance client en retard", x: 330, y: 790, r: -4, at: 8 },
  { text: "Doublon détecté", x: 760, y: 1070, r: 5, at: 20 },
  { text: "Saisie manuelle × 48", x: 300, y: 1390, r: -3, at: 34 },
  { text: "Erreur de synchronisation", x: 710, y: 1400, r: 4, at: 48 },
];

/** `calmStart` = scene frame at which the windows start gliding into order. */
export const DeskField: React.FC<{ calmStart: number }> = ({ calmStart: CALM_START }) => {
  const frame = Math.max(0, useSceneTime());
  const { fps } = useVideoConfig();
  const calm = progress(frame, CALM_START, CALM_DURATION, EASE_IN_OUT);

  // camera shake on impact, fading out
  const shakeAmp = Math.max(0, 14 - frame) * 1.4;
  const shake = `${Math.sin(frame * 5.3) * shakeAmp}px ${Math.cos(frame * 6.1) * shakeAmp}px`;

  return (
    <AbsoluteFill style={{ translate: shake }}>
      {/* repeating-task ticker: copy / paste / restart */}
      {[0, 1].map((row) => {
        const fade = 1 - progress(frame, CALM_START - 6, 14, EASE_IN_OUT);
        const dir = row === 0 ? -1 : 1;
        const label = L.ticker;
        return (
          <div
            key={row}
            style={{
              position: "absolute",
              left: 0,
              top: 640 + row * 54,
              width: 1080,
              overflow: "hidden",
              opacity: fade * 0.9,
              whiteSpace: "nowrap",
              fontFamily: FONT_UI,
              fontWeight: 700,
              fontSize: 34,
              letterSpacing: 4,
              color: row === 0 ? COLORS.warn : COLORS.danger,
            }}
          >
            <div style={{ translate: `${dir * frame * 14 - (dir > 0 ? 2400 : 0)}px 0px`, width: 4000 }}>
              {label.repeat(8)}
            </div>
          </div>
        );
      })}

      {ITEMS.map((it, i) => {
        const pop = spring({ frame: frame - it.delay, fps, config: { damping: 15, stiffness: 320, mass: 0.8 } });
        const x = lerp(it.chaos.x, it.order.x, calm) + Math.sin(frame / 9 + i * 2) * (1 - calm) * 7;
        const y = lerp(it.chaos.y, it.order.y, calm) + Math.cos(frame / 8 + i) * (1 - calm) * 7;
        const rot = lerp(it.chaos.r, 0, calm);
        const sc = lerp(it.chaos.s, 1, calm) * pop;
        const lab = L.deskWindows[i] ?? { chaosTitle: it.chaosTitle, orderTitle: it.orderTitle };
        const title = calm > 0.5 ? lab.orderTitle : lab.chaosTitle;
        const badgeIn = calm > 0.7
          ? spring({ frame: frame - (CALM_START + 40 + i * 3), fps, config: { damping: 10, stiffness: 200 } })
          : spring({ frame: frame - it.delay - 8, fps, config: { damping: 9, stiffness: 220 } });
        const ok = calm > 0.7;
        const Body = it.Body;
        return (
          <div
            key={it.id}
            style={{
              position: "absolute",
              left: x - W / 2,
              top: y - H / 2,
              width: W,
              height: H,
              opacity: Math.min(1, pop * 3),
              scale: `${sc}`,
              rotate: `${rot}deg`,
              zIndex: i,
            }}
          >
            <Window
              width={W}
              height={H}
              title={title}
              accent={mix(calm, COLORS.danger, COLORS.blue)}
              style={{
                boxShadow:
                  calm > 0.9
                    ? `0 40px 90px rgba(0,0,0,0.5), 0 0 40px rgba(34,211,238,${0.25 * calm})`
                    : "0 40px 90px rgba(0,0,0,0.55)",
              }}
            >
              <Body calm={calm} frame={frame} />
            </Window>
            <div
              style={{
                position: "absolute",
                right: -18,
                top: -18,
                minWidth: 54,
                height: 54,
                padding: "0 12px",
                borderRadius: 27,
                background: ok ? COLORS.ok : COLORS.danger,
                color: COLORS.white,
                display: "grid",
                placeItems: "center",
                fontFamily: FONT_UI,
                fontWeight: 800,
                fontSize: 26,
                scale: `${Math.min(1.15, badgeIn)}`,
                boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
              }}
            >
              {ok ? <CheckIcon size={30} /> : it.chaosBadge}
            </div>
          </div>
        );
      })}

      {TOASTS.map((t, i) => {
        const pop = spring({ frame: frame - t.at, fps, config: { damping: 14, stiffness: 300, mass: 0.8 } });
        const out = 1 - progress(frame, CALM_START - 8 + i * 3, 10, EASE_IN_OUT);
        return (
          <div
            key={t.text}
            style={{
              position: "absolute",
              left: t.x - 270,
              top: t.y - 40,
              width: 540,
              height: 80,
              borderRadius: 20,
              background: "rgba(7,13,46,0.92)",
              border: `2px solid ${COLORS.warn}`,
              boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "0 22px",
              color: COLORS.white,
              fontFamily: FONT_UI,
              fontWeight: 700,
              fontSize: 31,
              scale: `${pop * (0.6 + 0.4 * out)}`,
              rotate: `${t.r}deg`,
              opacity: Math.min(1, pop * 3) * out,
              zIndex: 20 + i,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: COLORS.warn,
                color: COLORS.navy950,
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
                fontSize: 28,
                flex: "none",
              }}
            >
              !
            </div>
            {L.toasts[i] ?? t.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
