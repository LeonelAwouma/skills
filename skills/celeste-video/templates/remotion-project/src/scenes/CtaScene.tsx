import React from "react";
import { AbsoluteFill } from "remotion";
import { LightBackdrop } from "../components/Backdrop";
import { KineticText, parseMarkup } from "../components/KineticText";
import { LogoReveal, logoAspect } from "../components/Logo";
import { COLORS, FONT_UI, GRADIENT_ACCENT_LIGHT } from "../design/tokens";
import { EASE_IN_OUT, EASE_OUT, lerp, progress } from "../design/motion";
import { useSceneTime } from "../engine/context";
import { useLayout } from "../engine/layout";
import type { Contact, Scene } from "../engine/types";

type S = Extract<Scene, { type: "cta" }>;

const ContactIcon: React.FC<{ kind: Contact["kind"]; size: number }> = ({ kind, size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.white} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    {kind === "email" ? (
      <>
        <rect x={2.5} y={5} width={19} height={14} rx={3} />
        <path d="M3 7l9 6.5L21 7" />
      </>
    ) : kind === "phone" ? (
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
    ) : kind === "web" ? (
      <>
        <circle cx={12} cy={12} r={9} />
        <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
      </>
    ) : (
      <>
        <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
        <circle cx={12} cy={10} r={2.5} />
      </>
    )}
  </svg>
);

/** Closing scene: the logo lands centred, makes room, then the call to action and contacts appear. */
export const CtaScene: React.FC<{ scene: S }> = ({ scene }) => {
  const t = useSceneTime();
  const layout = useLayout();
  const { W, H, u } = layout;
  const landscape = layout.orientation === "landscape";
  const aspect = logoAspect();
  const contacts = scene.contacts ?? [];

  const logoW = landscape ? Math.min(W * 0.4, (H * 0.55) / aspect) : Math.min(W * 0.65, (H * 0.3) / aspect);
  const logoH = logoW * aspect;
  const finalLeft = landscape ? W * 0.26 - logoW / 2 : (W - logoW) / 2;
  const finalTop = landscape ? (H - logoH) / 2 : H * 0.12;
  const move = progress(t, 22, 28, EASE_IN_OUT);
  const shiftX = lerp(W / 2 - (finalLeft + logoW / 2), 0, move);
  const shiftY = lerp(H / 2 - (finalTop + logoH / 2), 0, move);

  const textSize = (landscape ? 64 : 80) * u;
  const ctaSize = (landscape ? 120 : 156) * u;
  const colX = landscape ? W * 0.52 : 0;
  const colW = landscape ? W * 0.45 : W;
  const textTop = landscape ? H * 0.13 : finalTop + logoH + H * 0.045;
  const ctaTop = textTop + scene.lines.length * textSize * 1.12 + 14 * u;
  const contactTop = ctaTop + ctaSize * 1.2 + 30 * u;
  const pillFont = Math.min(48 * u, ((colW * 0.86) / Math.max(18, ...contacts.map((c) => c.value.length))) / 0.56);
  const show = progress(t, 70, 16, EASE_OUT);
  const ring = ((t - 84) % 40) / 40;

  return (
    <AbsoluteFill>
      <LightBackdrop offset={Math.max(0, t) + 90} />
      <div style={{ position: "absolute", left: finalLeft, top: finalTop, translate: `${shiftX}px ${shiftY}px`, scale: `${lerp(1.3, 1, move)}` }}>
        <LogoReveal width={logoW} frame={t - 2} sweepAt={30} />
      </div>

      <div style={{ position: "absolute", left: colX, width: colW, top: textTop }}>
        <KineticText fontSize={textSize} fit={colW * 0.92} start={34} stagger={4} align={landscape ? "left" : "center"} color={COLORS.ink} accentGradient={GRADIENT_ACCENT_LIGHT} lines={parseMarkup(scene.lines)} style={landscape ? { paddingLeft: 0 } : undefined} />
      </div>
      {scene.cta ? (
        <div style={{ position: "absolute", left: colX, width: colW, top: ctaTop }}>
          <KineticText variant="slam" fontSize={ctaSize} fit={colW * 0.94} start={58} align={landscape ? "left" : "center"} color={COLORS.ink} accentGradient={GRADIENT_ACCENT_LIGHT} lines={[[{ t: scene.cta, tone: "accent" }]]} />
        </div>
      ) : null}

      {contacts.length ? (
        <div style={{ position: "absolute", left: colX, width: colW, top: contactTop, display: "flex", flexDirection: "column", alignItems: landscape ? "flex-start" : "center", gap: 16 * u, fontFamily: FONT_UI, opacity: show, translate: `0px ${(1 - show) * 30}px` }}>
          {scene.contactLabel ? <div style={{ fontSize: 34 * u, fontWeight: 600, color: "#5C6A99", letterSpacing: 6, textTransform: "uppercase" }}>{scene.contactLabel}</div> : null}
          {contacts.map((c, i) => (
            <div key={`${c.kind}-${c.value}`} style={{ position: "relative" }}>
              {i === 0 ? <div style={{ position: "absolute", inset: -6, borderRadius: 999, border: `4px solid ${COLORS.blue}`, opacity: t > 84 ? (1 - ring) * 0.55 : 0, scale: `${1 + ring * 0.18}` }} /> : null}
              <div style={{ display: "flex", alignItems: "center", gap: 20 * u, padding: `${22 * u}px ${44 * u}px`, borderRadius: 999, background: `linear-gradient(100deg, ${COLORS.royal}, ${COLORS.blue})`, color: COLORS.white, fontSize: pillFont, fontWeight: 700, boxShadow: "0 22px 50px rgba(31,91,255,0.38)", whiteSpace: "nowrap" }}>
                <ContactIcon kind={c.kind} size={pillFont * 1.1} />
                {c.value}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
