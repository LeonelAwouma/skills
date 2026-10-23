import React from "react";
import { interpolate, spring, useVideoConfig } from "remotion";
import { Window } from "../../components/Window";
import { COLORS, FONT_UI } from "../../design/tokens";
import { CLAMP, EASE_IN_OUT, EASE_OUT, lerp, progress } from "../../design/motion";
import { useSceneTime as useSlotFrame } from "../../engine/context";
import { ASSETS } from "../../engine/data";
import { getLabels } from "../../engine/i18n";

const L = getLabels(ASSETS.lang);

const SIDEBAR_W = 250;
const WIN_W = 920;
const WIN_H = 740;

// Click schedule (slot frames): page 1 at 38, page 3 at 78.
const pageAt = (t: number) => (t < 38 ? 0 : t < 78 ? 1 : 3);

const StatCard: React.FC<{ label: string; fill: number; tone: string; t: number; delay: number }> = ({
  label,
  fill,
  tone,
  t,
  delay,
}) => {
  const p = progress(t, delay, 22);
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 18,
        background: COLORS.mist,
        padding: "18px 18px 20px",
        opacity: progress(t, delay - 6, 10),
        translate: `0px ${(1 - p) * 24}px`,
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: 10, background: tone, marginBottom: 14 }} />
      <div style={{ fontSize: 23, fontWeight: 600, color: COLORS.ink, marginBottom: 12 }}>{label}</div>
      <div style={{ height: 10, borderRadius: 10, background: COLORS.line }}>
        <div style={{ width: `${fill * p * 100}%`, height: "100%", borderRadius: 10, background: tone }} />
      </div>
    </div>
  );
};

const PageDashboard: React.FC<{ t: number }> = ({ t }) => {
  const draw = progress(t, 10, 40, EASE_IN_OUT);
  return (
    <div>
      <div style={{ fontSize: 34, fontWeight: 700, color: COLORS.ink, marginBottom: 20 }}>{L.overview}</div>
      <div style={{ display: "flex", gap: 16 }}>
        <StatCard label={L.orders} fill={0.72} tone={COLORS.blue} t={t} delay={4} />
        <StatCard label={L.customers} fill={0.55} tone={COLORS.cyan} t={t} delay={9} />
        <StatCard label={L.deliveries} fill={0.85} tone={COLORS.sky} t={t} delay={14} />
      </div>
      <svg width={640} height={250} viewBox="0 0 640 250" style={{ marginTop: 24 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.35} />
            <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0} />
          </linearGradient>
        </defs>
        {[50, 110, 170].map((y) => (
          <line key={y} x1={0} x2={640} y1={y} y2={y} stroke={COLORS.line} strokeWidth={2} />
        ))}
        <path
          d="M0 200 C 70 190, 110 120, 180 140 S 300 70, 370 100 S 500 40, 560 70 S 620 30, 640 20 L640 250 L0 250 Z"
          fill="url(#areaFill)"
          opacity={draw}
        />
        <path
          d="M0 200 C 70 190, 110 120, 180 140 S 300 70, 370 100 S 500 40, 560 70 S 620 30, 640 20"
          fill="none"
          stroke={COLORS.blue}
          strokeWidth={6}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - draw}
        />
      </svg>
    </div>
  );
};

const PageClients: React.FC<{ t: number }> = ({ t }) => {
  const rows = [
    [`${L.customerPrefix} A`, L.active, COLORS.ok],
    [`${L.customerPrefix} B`, L.isNew, COLORS.blue],
    [`${L.customerPrefix} C`, L.active, COLORS.ok],
    [`${L.customerPrefix} D`, L.pending, COLORS.warn],
    [`${L.customerPrefix} E`, L.active, COLORS.ok],
  ];
  return (
    <div>
      <div style={{ fontSize: 34, fontWeight: 700, color: COLORS.ink, marginBottom: 18 }}>{L.customers}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map(([name, status, color], i) => {
          const p = progress(t, 2 + i * 4, 14);
          return (
            <div
              key={name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 16px",
                borderRadius: 16,
                background: COLORS.mist,
                opacity: p,
                translate: `${(1 - p) * 60}px 0px`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.cyan})`,
                  color: COLORS.white,
                  fontWeight: 700,
                  fontSize: 22,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                {name.slice(-1)}
              </div>
              <div style={{ fontSize: 27, fontWeight: 600, color: COLORS.ink, flex: 1 }}>{name}</div>
              <div
                style={{
                  fontSize: 21,
                  fontWeight: 700,
                  color: COLORS.white,
                  background: color,
                  borderRadius: 999,
                  padding: "6px 16px",
                }}
              >
                {status}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PageReports: React.FC<{ t: number }> = ({ t }) => {
  const bars = [0.4, 0.62, 0.5, 0.78, 0.66, 0.92, 0.84];
  const ring = progress(t, 8, 36, EASE_IN_OUT);
  return (
    <div>
      <div style={{ fontSize: 34, fontWeight: 700, color: COLORS.ink, marginBottom: 18 }}>{L.reports}</div>
      <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 330, flex: 1 }}>
          {bars.map((b, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${b * 100 * progress(t, 2 + i * 3, 22)}%`,
                borderRadius: "10px 10px 4px 4px",
                background: `linear-gradient(0deg, ${COLORS.blue}, ${i % 2 ? COLORS.cyan : COLORS.sky})`,
              }}
            />
          ))}
        </div>
        <svg width={170} height={170} viewBox="0 0 120 120">
          <circle cx={60} cy={60} r={46} fill="none" stroke={COLORS.line} strokeWidth={16} />
          <circle
            cx={60}
            cy={60}
            r={46}
            fill="none"
            stroke={COLORS.blue}
            strokeWidth={16}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - 0.7 * ring}
            transform="rotate(-90 60 60)"
          />
        </svg>
      </div>
    </div>
  );
};

const Cursor: React.FC<{ x: number; y: number; press: number }> = ({ x, y, press }) => (
  <svg
    width={54}
    height={54}
    viewBox="0 0 24 24"
    style={{
      position: "absolute",
      left: x,
      top: y,
      scale: `${1 - press * 0.15}`,
      filter: "drop-shadow(0 6px 8px rgba(0,0,0,0.35))",
      zIndex: 30,
    }}
  >
    <path d="M4 2l15 10-6.5 1.5L9 20z" fill={COLORS.ink} stroke={COLORS.white} strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

const Phone: React.FC<{ t: number }> = ({ t }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: t - 46, fps, config: { damping: 14, stiffness: 120 } });
  const bars = [0.5, 0.7, 0.45, 0.85, 0.65];
  return (
    <div
      style={{
        position: "absolute",
        left: 720,
        top: 330,
        width: 290,
        height: 560,
        borderRadius: 44,
        background: COLORS.ink,
        padding: 10,
        boxShadow: "0 40px 90px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.18)",
        translate: `0px ${(1 - s) * 500 + Math.sin(t / 14) * 6}px`,
        opacity: Math.min(1, s * 2),
        zIndex: 40,
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 36, background: COLORS.white, overflow: "hidden", fontFamily: FONT_UI }}>
        <div style={{ height: 90, background: `linear-gradient(120deg, ${COLORS.royal}, ${COLORS.blue})`, padding: "40px 20px 0", color: COLORS.white, fontWeight: 700, fontSize: 24 }}>
          {L.mobileApp}
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[COLORS.blue, COLORS.cyan].map((c) => (
              <div key={c} style={{ flex: 1, height: 84, borderRadius: 16, background: COLORS.mist, padding: 12 }}>
                <div style={{ width: 24, height: 24, borderRadius: 8, background: c }} />
                <div style={{ height: 8, borderRadius: 8, background: COLORS.line, marginTop: 14 }} />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 190 }}>
            {bars.map((b, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${b * 100 * progress(t, 56 + i * 3, 20)}%`,
                  borderRadius: "8px 8px 3px 3px",
                  background: `linear-gradient(0deg, ${COLORS.blue}, ${COLORS.cyan})`,
                }}
              />
            ))}
          </div>
          {[0, 1].map((i) => (
            <div key={i} style={{ height: 14, borderRadius: 14, background: COLORS.line, width: `${90 - i * 30}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
};

/** Demo A – a custom web application, navigated by a cursor, with its mobile twin. */
export const DemoApp: React.FC<{ appTitle?: string; nav?: string[] }> = ({ appTitle, nav: navProp }) => {
  const nav = navProp && navProp.length >= 4 ? navProp : L.nav;
  const t = useSlotFrame();
  const page = pageAt(t);

  // cursor keyframes (inside the window body): rest → Clients (t 34) → Rapports (t 76)
  const kf = [0, 20, 34, 62, 76];
  const cx = interpolate(t, kf, [780, 780, 130, 130, 130], { ...CLAMP, easing: EASE_IN_OUT });
  const cy = interpolate(t, kf, [260, 260, 116, 116, 240], { ...CLAMP, easing: EASE_IN_OUT });
  const press = Math.max(
    progress(t, 36, 3) * (1 - progress(t, 39, 4)),
    progress(t, 76, 3) * (1 - progress(t, 79, 4)),
  );

  const intro = progress(t, 0, 30, EASE_OUT);
  const push = lerp(0.94, 1.02, progress(t, 0, 105, EASE_IN_OUT));
  const pageT = t < 38 ? t : t < 78 ? t - 38 : t - 78;

  return (
    <div style={{ position: "absolute", inset: 0, perspective: 1800 }}>
      <div
        style={{
          position: "absolute",
          left: (1080 - WIN_W) / 2,
          top: 20,
          opacity: Math.min(1, intro * 2),
          transform: `rotateY(${lerp(-14, -4, intro)}deg) rotateX(${lerp(8, 2, intro)}deg) scale(${push})`,
          transformOrigin: "50% 50%",
        }}
      >
        <Window width={WIN_W} height={WIN_H} title={appTitle ?? L.appTitle} titleSize={24}>
          <div style={{ display: "flex", height: "100%", fontFamily: FONT_UI }}>
            <div style={{ width: SIDEBAR_W, background: COLORS.navy800, padding: "28px 12px", position: "relative" }}>
              {nav.map((label, i) => {
                const active = i === page;
                return (
                  <div
                    key={label}
                    style={{
                      height: 52,
                      marginBottom: 10,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      padding: "0 16px",
                      fontSize: 21,
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                      color: active ? COLORS.white : "#A9B8E6",
                      background: active ? COLORS.blue : "transparent",
                      boxShadow: active ? "0 8px 22px rgba(31,91,255,0.5)" : undefined,
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
            <div style={{ flex: 1, padding: "28px 26px", position: "relative" }}>
              {page === 0 ? <PageDashboard t={pageT} /> : null}
              {page === 1 ? <PageClients t={pageT} /> : null}
              {page === 3 ? <PageReports t={pageT} /> : null}
            </div>
          </div>
          <Cursor x={cx - 9} y={cy - 5} press={press} />
        </Window>
      </div>
      <Phone t={t} />
    </div>
  );
};
