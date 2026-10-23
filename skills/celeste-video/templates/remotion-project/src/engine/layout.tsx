import React from "react";
import { useVideoConfig } from "remotion";

export type Box = { x: number; y: number; w: number; h: number };
export type Orientation = "portrait" | "landscape" | "square";

export type Layout = {
  W: number;
  H: number;
  orientation: Orientation;
  /** 1 at a short side of 1080 px: multiply design sizes by it. */
  u: number;
  align: "center" | "left";
  /** Zone for the headline block, and the zone for an illustration. */
  text: Box;
  visual: Box;
  /** Base headline size (px) for 2-line headlines. */
  headline: number;
  /** Top (px) of the caption band. */
  captionTop: number;
  captionFont: number;
};

/** Pure function of the canvas size: portrait stacks, landscape splits into two columns. */
export function computeLayout(W: number, H: number): Layout {
  const orientation: Orientation = W > H * 1.2 ? "landscape" : H > W * 1.2 ? "portrait" : "square";
  const u = Math.min(W, H) / 1080;
  if (orientation === "portrait") {
    return {
      W, H, orientation, u, align: "center",
      text: { x: 0, y: H * 0.0875, w: W, h: H * 0.245 },
      visual: { x: 0, y: H * 0.333, w: W, h: H - H * 0.333 - 360 * u },
      headline: 88 * u,
      captionTop: H * 0.862,
      captionFont: 54 * u,
    };
  }
  if (orientation === "landscape") {
    return {
      W, H, orientation, u, align: "left",
      text: { x: W * 0.05, y: H * 0.05, w: W * 0.43, h: H * 0.9 },
      visual: { x: W * 0.5, y: H * 0.05, w: W * 0.47, h: H * 0.8 },
      headline: 78 * u,
      captionTop: H * 0.865,
      captionFont: 46 * u,
    };
  }
  return {
    W, H, orientation, u, align: "center",
    text: { x: 0, y: H * 0.035, w: W, h: H * 0.28 },
    visual: { x: 0, y: H * 0.335, w: W, h: H * 0.465 },
    headline: 66 * u,
    captionTop: H * 0.84,
    captionFont: 46 * u,
  };
}

export const useLayout = (): Layout => {
  const { width, height } = useVideoConfig();
  return computeLayout(width, height);
};

/** Place a fixed-size design canvas (dw x dh) inside `box`, uniformly scaled and centred. */
export const FitBox: React.FC<{ box: Box; dw: number; dh: number; children: React.ReactNode; maxScale?: number }> = ({
  box,
  dw,
  dh,
  children,
  maxScale = 1.15,
}) => {
  const scale = Math.min(box.w / dw, box.h / dh, maxScale);
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h }}>
      <div
        style={{
          position: "absolute",
          left: (box.w - dw) / 2,
          top: (box.h - dh) / 2,
          width: dw,
          height: dh,
          scale: `${scale}`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Largest font size (<= base) at which the widest line still fits `maxWidth`. */
export const fitFont = (lines: string[], base: number, maxWidth: number, charWidth = 0.56): number => {
  const longest = Math.max(1, ...lines.map((l) => l.replace(/\*/g, "").length));
  return Math.min(base, maxWidth / (longest * charWidth));
};
