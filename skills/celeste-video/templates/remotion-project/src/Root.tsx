import React from "react";
import { Composition } from "remotion";
import { STORYBOARD } from "./engine/data";
import { totalFrames } from "./engine/timeline";
import { Video } from "./engine/Video";

type Props = { format?: "9:16" | "16:9" | "1:1"; shortSide?: number };

const even = (n: number) => Math.round(n / 2) * 2;

/** Canvas size from the aspect ratio and the length of the short side. */
export const dimensions = (format: string, shortSide: number) => {
  const [rw, rh] = format === "16:9" ? [16, 9] : format === "1:1" ? [1, 1] : [9, 16];
  if (rw === rh) {
    return { width: even(shortSide), height: even(shortSide) };
  }
  return rw < rh
    ? { width: even(shortSide), height: even((shortSide * rh) / rw) }
    : { width: even((shortSide * rw) / rh), height: even(shortSide) };
};

export const RemotionRoot: React.FC = () => {
  const v = STORYBOARD.video;
  return (
    <Composition
      id="main"
      component={Video}
      fps={v.fps}
      durationInFrames={totalFrames(STORYBOARD)}
      width={dimensions(v.format, v.shortSide).width}
      height={dimensions(v.format, v.shortSide).height}
      defaultProps={{ format: v.format, shortSide: v.shortSide } as Props}
      // `cv render --format 16:9 --short-side 720` passes these props: one storyboard, any format.
      calculateMetadata={({ props }: { props: Props }) => {
        const d = dimensions(props.format ?? v.format, props.shortSide ?? v.shortSide);
        return { width: d.width, height: d.height };
      }}
    />
  );
};
