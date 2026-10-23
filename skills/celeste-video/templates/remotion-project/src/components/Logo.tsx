import React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";
import { ASSETS } from "../engine/data";
import { COLORS, FONT_DISPLAY, GRADIENT_ACCENT_LIGHT } from "../design/tokens";
import { EASE_IN_OUT, EASE_OUT, lerp, progress } from "../design/motion";

/** Aspect ratio (height / width) of whatever is drawn: the provided logo, or the vector fallback. */
export const logoAspect = () => (ASSETS.logo ? ASSETS.logo.aspect : 0.5);

/** Vector brand mark used when no logo file is provided: a 4-point star + the brand name. */
const BrandMark: React.FC<{ width: number }> = ({ width }) => {
  const height = width * 0.5;
  return (
    <div style={{ width, height, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: height * 0.06 }}>
      <svg width={height * 0.5} height={height * 0.5} viewBox="0 0 24 24">
        <defs>
          <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={COLORS.royal} />
            <stop offset="100%" stopColor={COLORS.cyan} />
          </linearGradient>
        </defs>
        <path d="M12 1.5c.9 5.6 4.9 9.6 10.5 10.5-5.6.9-9.6 4.9-10.5 10.5C11.1 16.9 7.1 12.9 1.5 12 7.1 11.1 11.1 7.1 12 1.5z" fill="url(#bm)" />
      </svg>
      <div
        style={{
          fontFamily: FONT_DISPLAY,
          fontWeight: 800,
          fontSize: Math.min(height * 0.2, (width * 0.9) / Math.max(6, ASSETS.brand.length) / 0.62),
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: COLORS.ink,
          whiteSpace: "nowrap",
          backgroundImage: GRADIENT_ACCENT_LIGHT,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {ASSETS.brand}
      </div>
    </div>
  );
};

/** The brand logo, unmodified: only ever scaled uniformly. */
export const Logo: React.FC<{ width: number; style?: React.CSSProperties }> = ({ width, style }) => {
  const logo = ASSETS.logo;
  if (!logo) {
    return (
      <div style={style}>
        <BrandMark width={width} />
      </div>
    );
  }
  return <Img src={staticFile(logo.src)} style={{ width, height: width * logo.aspect, display: "block", ...style }} />;
};

/**
 * Reveal: a circular iris opens from the logo's focal point, the logo settles from a slight zoom,
 * a lens flare crosses the focus and a light sweep glides over the artwork (masked by the logo).
 * `frame` is local to the reveal: 0 = first visible frame.
 */
export const LogoReveal: React.FC<{ width: number; frame?: number; sweepAt?: number }> = ({ width, frame: frameProp, sweepAt = 26 }) => {
  const local = useCurrentFrame();
  const frame = frameProp ?? local;
  const logo = ASSETS.logo;
  const height = width * logoAspect();
  const focus = logo?.focus ?? { x: 0.5, y: 0.38 };

  const open = progress(frame, 0, 26, EASE_IN_OUT);
  const settle = progress(frame, 0, 34, EASE_OUT);
  const radius = lerp(0, 1.6, open) * width;
  const sweep = progress(frame, sweepAt, 26, EASE_IN_OUT);
  const flare = progress(frame, 6, 26, EASE_OUT);
  const flareFade = 1 - progress(frame, 22, 18, EASE_IN_OUT);
  const sx = focus.x * width;
  const sy = focus.y * height;
  const src = logo ? staticFile(logo.src) : null;

  return (
    <div style={{ position: "relative", width, height }}>
      <div
        style={{
          position: "absolute",
          left: sx - width * 0.45,
          top: sy - width * 0.45,
          width: width * 0.9,
          height: width * 0.9,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(40,130,255,0.30) 0%, rgba(34,211,238,0.12) 40%, rgba(255,255,255,0) 70%)",
          opacity: open * (0.7 + 0.3 * Math.sin(frame / 7)),
          scale: `${0.6 + 0.4 * open}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          clipPath: `circle(${radius}px at ${sx}px ${sy}px)`,
          scale: `${lerp(1.1, 1, settle)}`,
          transformOrigin: `${focus.x * 100}% ${focus.y * 100}%`,
        }}
      >
        <Logo width={width} />
        {src ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              WebkitMaskImage: `url(${src})`,
              maskImage: `url(${src})`,
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -height * 0.2,
                height: height * 1.4,
                width: width * 0.22,
                left: lerp(-0.3, 1.2, sweep) * width,
                rotate: "18deg",
                background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 100%)",
                opacity: sweep > 0 && sweep < 1 ? 0.9 : 0,
              }}
            />
          </div>
        ) : null}
      </div>
      <div
        style={{
          position: "absolute",
          left: sx - width * 0.5,
          top: sy - 2,
          width,
          height: 4,
          background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(120,220,255,1) 50%, rgba(255,255,255,0))",
          scale: `${flare} 1`,
          opacity: flareFade,
          filter: "blur(1px)",
        }}
      />
    </div>
  );
};
