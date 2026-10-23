import React from "react";
import { CheckIcon } from "../../components/Window";
import { COLORS, FONT_UI } from "../../design/tokens";
import { EASE_OUT, progress } from "../../design/motion";
import { useSceneTime } from "../../engine/context";
import { ASSETS } from "../../engine/data";
import { getLabels } from "../../engine/i18n";

const L = getLabels(ASSETS.lang);
const HUB = { x: 540, y: 450 };
const TONES = [COLORS.blue, COLORS.cyan, COLORS.sky];

type Tool = { label: string; icon?: string };

const Icon: React.FC<{ kind: string; color: string }> = ({ kind, color }) => {
  const c = { stroke: color, strokeWidth: 2.2, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg width={38} height={38} viewBox="0 0 24 24">
      {kind === "users" ? (
        <>
          <circle cx={9} cy={8} r={3.5} {...c} />
          <path d="M2.5 20c.5-4 3.2-6 6.5-6s6 2 6.5 6" {...c} />
          <path d="M16 5a3.5 3.5 0 010 6.5M18.5 14.5c1.6.8 2.7 2.7 3 5" {...c} />
        </>
      ) : kind === "card" ? (
        <>
          <rect x={2.5} y={5} width={19} height={14} rx={3} {...c} />
          <path d="M2.5 10h19M6 15h4" {...c} />
        </>
      ) : kind === "mail" ? (
        <>
          <rect x={2.5} y={5} width={19} height={14} rx={3} {...c} />
          <path d="M3 7l9 6.5L21 7" {...c} />
        </>
      ) : kind === "box" ? (
        <>
          <path d="M12 2.5l8.5 4.5v10L12 21.5 3.5 17V7z" {...c} />
          <path d="M3.5 7L12 11.5 20.5 7M12 11.5v10" {...c} />
        </>
      ) : kind === "calc" ? (
        <>
          <rect x={4.5} y={2.5} width={15} height={19} rx={3} {...c} />
          <path d="M8 7h8M8.5 12h1M12 12h1M15.5 12h.5M8.5 16h1M12 16h1M15.5 16h.5" {...c} />
        </>
      ) : kind === "chat" ? (
        <path d="M4 5.5h16a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H10l-5 3.5V17.5H4A1.5 1.5 0 012.5 16V7A1.5 1.5 0 014 5.5z" {...c} />
      ) : (
        <circle cx={12} cy={12} r={7} {...c} />
      )}
    </svg>
  );
};

/** Demo C: separate tools exchange data through one unified interface (3 to 6 tools). */
export const DemoIntegrations: React.FC<{ hub?: string; tools?: Tool[] }> = ({ hub = L.unifiedView, tools }) => {
  const t = useSceneTime();
  const list = (tools && tools.length >= 3 ? tools : L.tools).slice(0, 6);
  const n = list.length;
  const nodes = list.map((tool, i) => {
    const a = (-90 + (i * 360) / n) * (Math.PI / 180);
    return { ...tool, x: HUB.x + 330 * Math.cos(a), y: HUB.y + 380 * Math.sin(a), tone: TONES[i % 3], icon: tool.icon ?? L.tools[i % L.tools.length].icon };
  });
  const hubIn = progress(t, 0, 18, EASE_OUT);
  const connectedCount = nodes.filter((_, i) => t > 18 + i * 8 + 14).length;

  return (
    <div style={{ position: "absolute", inset: 0, fontFamily: FONT_UI }}>
      <svg width={1080} height={920} style={{ position: "absolute", inset: 0 }}>
        {nodes.map((nd, i) => {
          const start = 14 + i * 8;
          const draw = progress(t, start, 14);
          const dx = HUB.x - nd.x;
          const dy = HUB.y - nd.y;
          const phase = (t - start - 14) / 36;
          return (
            <g key={nd.label}>
              <line x1={nd.x} y1={nd.y} x2={nd.x + dx * draw} y2={nd.y + dy * draw} stroke={nd.tone} strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" />
              {phase > 0
                ? [0, 0.5].map((o, k) => {
                    const raw = (phase + o) % 1;
                    const f = k === 0 ? raw : 1 - raw;
                    return <circle key={k} cx={nd.x + dx * f} cy={nd.y + dy * f} r={9} fill={COLORS.white} style={{ filter: `drop-shadow(0 0 8px ${nd.tone})` }} />;
                  })
                : null}
            </g>
          );
        })}
      </svg>

      {[0, 2, 4].filter((i) => i < n).map((i) => {
        const nd = nodes[i];
        const p = progress(t, 36 + i * 6, 10);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (nd.x + HUB.x) / 2 - 42,
              top: (nd.y + HUB.y) / 2 - 22,
              width: 84,
              height: 44,
              borderRadius: 14,
              background: COLORS.navy900,
              border: `2px solid ${COLORS.cyan}`,
              color: COLORS.cyan,
              fontWeight: 800,
              fontSize: 24,
              display: "grid",
              placeItems: "center",
              scale: `${p}`,
              opacity: p,
              letterSpacing: 1,
            }}
          >
            API
          </div>
        );
      })}

      <div
        style={{
          position: "absolute",
          left: HUB.x - 210,
          top: HUB.y - 150,
          width: 420,
          height: 300,
          borderRadius: 30,
          background: COLORS.white,
          boxShadow: `0 30px 80px rgba(0,0,0,0.55), 0 0 ${connectedCount * 14}px rgba(34,211,238,0.5)`,
          scale: `${hubIn}`,
          opacity: hubIn,
          padding: "22px 26px",
        }}
      >
        <div style={{ fontSize: 31, fontWeight: 800, color: COLORS.ink, marginBottom: 16, whiteSpace: "nowrap" }}>{hub}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {nodes.map((nd, i) => {
            const ok = t > 18 + i * 8 + 14;
            return (
              <div key={nd.label} style={{ display: "flex", alignItems: "center", gap: 12, opacity: ok ? 1 : 0.35 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: ok ? COLORS.ok : COLORS.line, display: "grid", placeItems: "center" }}>
                  {ok ? <CheckIcon size={14} /> : null}
                </div>
                <div style={{ height: 11, borderRadius: 8, background: COLORS.ink, opacity: 0.75, width: `${78 - (i % 3) * 14}%` }} />
              </div>
            );
          })}
        </div>
      </div>

      {nodes.map((nd, i) => {
        const p = progress(t, 8 + i * 8, 14, EASE_OUT);
        return (
          <div
            key={nd.label}
            style={{
              position: "absolute",
              left: nd.x - 124,
              top: nd.y - 48,
              width: 248,
              height: 96,
              borderRadius: 26,
              background: "rgba(11,21,80,0.95)",
              border: `2.5px solid ${nd.tone}`,
              boxShadow: `0 18px 40px rgba(0,0,0,0.5), 0 0 24px ${nd.tone}55`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              color: COLORS.white,
              fontSize: 28,
              fontWeight: 700,
              whiteSpace: "nowrap",
              scale: `${p}`,
              opacity: p,
            }}
          >
            <Icon kind={nd.icon} color={nd.tone} />
            {nd.label}
          </div>
        );
      })}
    </div>
  );
};
