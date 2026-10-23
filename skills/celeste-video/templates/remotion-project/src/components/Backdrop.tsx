import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { COLORS } from "../design/tokens";

/** Deep navy cinematic background with slowly drifting light pools and a fine dot grid. */
export const DarkBackdrop: React.FC<{ offset?: number; glow?: number }> = ({
  offset = 0,
  glow = 1,
}) => {
  const frame = useCurrentFrame() + offset;
  const a = Math.sin(frame / 55);
  const b = Math.cos(frame / 70);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(170deg, ${COLORS.navy950} 0%, ${COLORS.navy900} 55%, ${COLORS.navy800} 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 1300,
          height: 1300,
          left: -420 + a * 70,
          top: -380 + b * 60,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(31,91,255,${0.34 * glow}) 0%, rgba(31,91,255,0) 65%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1200,
          height: 1200,
          right: -480 - a * 60,
          bottom: -300 + b * 80,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(34,211,238,${0.2 * glow}) 0%, rgba(34,211,238,0) 65%)`,
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(rgba(150,180,255,0.16) 1.5px, transparent 1.6px)",
          backgroundSize: "54px 54px",
          backgroundPosition: `${frame * 0.3}px ${frame * 0.2}px`,
          opacity: 0.55,
        }}
      />
    </AbsoluteFill>
  );
};

/** White / pale-blue background, matching the logo's transparent artwork. */
export const LightBackdrop: React.FC<{ offset?: number }> = ({ offset = 0 }) => {
  const frame = useCurrentFrame() + offset;
  const a = Math.sin(frame / 60);
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.mist} 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 1100,
          height: 1100,
          left: -300 + a * 40,
          top: 240,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(31,91,255,0.12) 0%, rgba(31,91,255,0) 65%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 1000,
          height: 1000,
          right: -380,
          bottom: -160 - a * 40,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(34,211,238,0.16) 0%, rgba(34,211,238,0) 65%)",
        }}
      />
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(rgba(31,91,255,0.12) 1.5px, transparent 1.6px)",
          backgroundSize: "54px 54px",
          opacity: 0.5,
        }}
      />
    </AbsoluteFill>
  );
};
