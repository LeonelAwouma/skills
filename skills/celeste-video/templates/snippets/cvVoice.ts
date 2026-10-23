// Drop-in narration helpers for an EXISTING Remotion composition (copied to src/cv/ by `cv attach-voice`).
// The manifest is written by `cv voice generate` / generate-voiceover.py (--copy-manifest src/cv/voiceover.manifest.json).
import manifest from "./voiceover.manifest.json";

export const FPS = 30; // set this to your composition's fps

export type VoiceSegment = { id: string; file: string; fromFrame: number; frames: number };
export type Cue = { fromFrame: number; toFrame: number; text: string };

export const VOICE_SEGMENTS: VoiceSegment[] = manifest.segments.map((s) => ({
  id: s.id,
  file: s.file,
  fromFrame: Math.round(s.start * FPS),
  frames: Math.ceil(s.duration * FPS) + 1,
}));

export const CUES: Cue[] = manifest.subtitles.map((c) => ({
  fromFrame: Math.round(c.start * FPS),
  toFrame: Math.round(c.end * FPS),
  text: c.text,
}));

const ATTACK = 8;
const RELEASE = 16;

/** 0 = silence, 1 = narration: use it to duck your music. */
export const voiceActivity = (frame: number): number => {
  let a = 0;
  for (const seg of VOICE_SEGMENTS) {
    const end = seg.fromFrame + seg.frames;
    if (frame < seg.fromFrame - ATTACK || frame > end + RELEASE) {
      continue;
    }
    const v = frame < seg.fromFrame ? (frame - (seg.fromFrame - ATTACK)) / ATTACK : frame > end ? 1 - (frame - end) / RELEASE : 1;
    a = Math.max(a, v);
  }
  return a;
};

/** e.g. <Audio src={music} volume={(f) => musicVolume(f, 0.6, 0.2)} /> */
export const musicVolume = (frame: number, full = 0.6, ducked = 0.2) => full + (ducked - full) * voiceActivity(frame);
