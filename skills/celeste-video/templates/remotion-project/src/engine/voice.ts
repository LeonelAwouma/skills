import { ASSETS, MANIFEST, STORYBOARD } from "./data";

const fps = STORYBOARD.video.fps;

export type VoiceSegment = { id: string; file: string; fromFrame: number; frames: number };
export type Cue = { fromFrame: number; toFrame: number; text: string };

export const VOICE_SEGMENTS: VoiceSegment[] = MANIFEST.segments.map((s) => ({
  id: s.id,
  file: s.file,
  fromFrame: Math.round(s.start * fps),
  frames: Math.ceil(s.duration * fps) + 1,
}));

export const CUES: Cue[] = MANIFEST.subtitles.map((c) => ({
  fromFrame: Math.round(c.start * fps),
  toFrame: Math.round(c.end * fps),
  text: c.text,
}));

/** 0 = no voice, 1 = voice active; smooth deterministic ramps. */
export const voiceActivity = (frame: number): number => {
  const { attack, release } = ASSETS.ducking;
  let a = 0;
  for (const seg of VOICE_SEGMENTS) {
    const end = seg.fromFrame + seg.frames;
    if (frame < seg.fromFrame - attack || frame > end + release) {
      continue;
    }
    let v = 1;
    if (frame < seg.fromFrame) {
      v = (frame - (seg.fromFrame - attack)) / attack;
    } else if (frame > end) {
      v = 1 - (frame - end) / release;
    }
    a = Math.max(a, v);
  }
  return a;
};

/** Music level: full in the gaps, ducked under the voice. */
export const musicVolume = (frame: number): number => {
  const m = ASSETS.music;
  if (!m) {
    return 0;
  }
  return m.volume + (m.ducked - m.volume) * voiceActivity(frame);
};
