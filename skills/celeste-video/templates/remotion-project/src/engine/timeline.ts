import type { Scene, Storyboard, TimelineScene, TransitionType } from "./types";

/** Frames a scene starts before its nominal boundary, so its entrance transition can play on top of the previous one. */
export const TRANSITION_LEAD: Record<TransitionType, number> = { cut: 0, fade: 10, bloom: 14, wipe: 12, push: 10 };
/** Frames a scene stays mounted after its nominal end (covered by the next scene's transition). */
export const TAIL = 8;

export const FADE_OUT_FRAMES = 22;

/** Cumulative-rounded boundaries: no drift, same rounding as the CLI (scripts/lib/storyboard.mjs). */
export function buildTimeline(sb: Storyboard): TimelineScene[] {
  const fps = sb.video.fps;
  let cursor = 0;
  const raw = sb.scenes.map((scene: Scene, index: number) => {
    const startFrame = Math.round(cursor * fps);
    cursor += scene.duration;
    const endFrame = Math.round(cursor * fps);
    return { scene, index, startFrame, durationFrames: endFrame - startFrame };
  });
  // consecutive scenes of the same type (e.g. 4 showcases) form a group: "01 / 04"
  const groups: { index: number; size: number }[] = [];
  let i = 0;
  while (i < raw.length) {
    let j = i;
    while (j + 1 < raw.length && raw[j + 1].scene.type === raw[i].scene.type) {
      j++;
    }
    for (let k = i; k <= j; k++) {
      groups[k] = { index: k - i, size: j - i + 1 };
    }
    i = j + 1;
  }
  return raw.map((r, k) => {
    const next = raw[k + 1];
    return {
      ...r,
      lead: k === 0 ? 0 : TRANSITION_LEAD[r.scene.transition.type],
      nextLead: next ? TRANSITION_LEAD[next.scene.transition.type] : 0,
      nextTransition: next ? next.scene.transition.type : null,
      group: groups[k],
    };
  });
}

export const totalFrames = (sb: Storyboard) => Math.round(sb.scenes.reduce((a, s) => a + s.duration, 0) * sb.video.fps);
