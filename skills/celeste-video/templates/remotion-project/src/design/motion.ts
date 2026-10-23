import { Easing, interpolate } from "remotion";

export const CLAMP = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_IN = Easing.bezier(0.55, 0, 1, 0.45);

/** 0 → 1 progress of `frame` between `start` and `start + duration`. */
export const progress = (
  frame: number,
  start: number,
  duration: number,
  easing: (t: number) => number = EASE_OUT,
) => interpolate(frame, [start, start + duration], [0, 1], { ...CLAMP, easing });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
