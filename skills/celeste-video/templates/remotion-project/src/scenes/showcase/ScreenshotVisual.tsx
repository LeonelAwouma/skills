import React from "react";
import { Img, staticFile, interpolate } from "remotion";
import { Window } from "../../components/Window";
import { COLORS, FONT_UI } from "../../design/tokens";
import { CLAMP, EASE_IN_OUT, EASE_OUT, progress } from "../../design/motion";
import { useSceneTime } from "../../engine/context";
import { ASSETS } from "../../engine/data";

export type Focus = { x: number; y: number; zoom: number; at?: number };
export const SHOT_W = 1000;
export const SHOT_H = 640;

/**
 * A captured interface in a browser frame with a camera that moves between focus points.
 * `focus` = [{x, y (0..1 inside the image), zoom, at (seconds)}]; the camera eases between them.
 * Several images are shown one after the other (cross-fade over the scene).
 */
export const ScreenshotVisual: React.FC<{ images: { src: string; focus?: Focus[] }[]; durationFrames: number; fps: number; title?: string }> = ({ images, durationFrames, fps, title }) => {
  const t = useSceneTime();
  const n = Math.max(1, images.length);
  const slice = durationFrames / n;
  const idx = Math.min(n - 1, Math.max(0, Math.floor(t / slice)));
  const img = images[idx];
  const local = t - idx * slice;
  const missing = !img || ASSETS.missingImages.includes(img.src);

  const keys = img?.focus?.length ? img.focus : [{ x: 0.5, y: 0.5, zoom: 1, at: 0 }, { x: 0.5, y: 0.5, zoom: 1.08, at: slice / fps }];
  const times = keys.map((k, i) => (k.at !== undefined ? k.at * fps : (i * slice) / Math.max(1, keys.length - 1)));
  const ease = { ...CLAMP, easing: EASE_IN_OUT };
  const zoom = interpolate(local, times, keys.map((k) => k.zoom), ease);
  const fx = interpolate(local, times, keys.map((k) => k.x), ease);
  const fy = interpolate(local, times, keys.map((k) => k.y), ease);
  const fade = progress(local, 0, 10, EASE_OUT) * (1 - progress(local, slice - 8, 8));

  return (
    <div style={{ position: "absolute", left: (1080 - SHOT_W) / 2, top: (920 - SHOT_H - 54) / 2, opacity: Math.min(1, progress(t, 0, 14)) }}>
      <Window width={SHOT_W} height={SHOT_H + 54} title={title ?? ASSETS.brand} titleSize={22}>
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: COLORS.mist }}>
          {missing ? (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontFamily: FONT_UI, fontWeight: 600, fontSize: 34, color: COLORS.slate }}>
              {img ? `[${img.src}]` : "—"}
            </div>
          ) : (
            <Img
              src={staticFile(img.src)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: fade,
                transformOrigin: `${fx * 100}% ${fy * 100}%`,
                scale: `${zoom}`,
              }}
            />
          )}
        </div>
      </Window>
    </div>
  );
};
