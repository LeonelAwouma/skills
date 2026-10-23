// Music composer: turns a storyboard timeline into an original synthesised soundtrack.
// Every scene gets an energy level (0-3); transitions get matching sound effects.
import { createSynth } from "./synth.mjs";

export const STYLES = {
  "tech-uplift": { bpm: 120, mode: "minor", description: "Pulsations nettes, arpèges brillants : technologie inspirante." },
  "bright-corporate": { bpm: 110, mode: "major", description: "Lumineux et rassurant : entreprise, services." },
  "calm-ambient": { bpm: 84, mode: "major", description: "Nappes douces, sans batterie : présentation, explication." },
};

// Chords as MIDI notes, one per bar, looping.
const PROGRESSIONS = {
  minor: [
    { name: "Am", root: 45, notes: [57, 60, 64, 67] },
    { name: "F", root: 41, notes: [53, 57, 60, 65] },
    { name: "C", root: 48, notes: [60, 64, 67, 71] },
    { name: "G", root: 43, notes: [55, 59, 62, 67] },
  ],
  major: [
    { name: "C", root: 48, notes: [60, 64, 67, 71] },
    { name: "G", root: 43, notes: [55, 59, 62, 67] },
    { name: "Am", root: 45, notes: [57, 60, 64, 67] },
    { name: "F", root: 41, notes: [53, 57, 60, 65] },
  ],
};

const DEFAULT_ENERGY = { kinetic: 2, "problem-solution": 3, "logo-reveal": 2, showcase: 3, value: 1, cta: 2, bullets: 2, screenshot: 2 };

export function sceneEnergy(scene, index) {
  if (typeof scene.music?.energy === "number") return Math.max(0, Math.min(3, scene.music.energy));
  if (index === 0 && scene.type === "kinetic") return 3;
  return DEFAULT_ENERGY[scene.type] ?? 2;
}

/**
 * @param {object} sb normalised storyboard @param {object} timeline computeTimeline() result
 * @returns {{file:string, seconds:number, clipped:number, peakBeforeNorm:number}}
 */
export function composeMusic(sb, timeline, outFile, audioCfg = {}) {
  const musicCfg = sb.audio?.music ?? {};
  const styleName = musicCfg.style && STYLES[musicCfg.style] ? musicCfg.style : "tech-uplift";
  const style = STYLES[styleName];
  const bpm = musicCfg.bpm ?? style.bpm;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const prog = PROGRESSIONS[musicCfg.tonality ?? style.mode]; // "minor" | "major" (music.mode is synth/file/none)
  const total = timeline.totalSec;
  const S = createSynth(total);
  const arpOrder = [0, 1, 2, 3, 2, 1];

  const chordAt = (t) => prog[Math.floor(t / bar) % prog.length];

  sb.scenes.forEach((scene, i) => {
    const tl = timeline.scenes[i];
    const t0 = tl.startSec;
    const t1 = t0 + tl.durationSec;
    const energy = styleName === "calm-ambient" ? Math.min(1, sceneEnergy(scene, i)) : sceneEnergy(scene, i);

    // ---- transition into the scene
    const kind = scene.transition?.type ?? "cut";
    if (i === 0) {
      if (energy >= 2) S.boom(0, 0.9, 1.0);
    } else if (kind === "bloom") {
      S.sweep(Math.max(0, t0 - 0.6), 0.6, 1, 0.3, 250, 11000);
      S.boom(t0, 0.7, 1.2);
      S.bell(t0, 81, 0.16, 2.6);
    } else if (kind === "wipe") {
      S.sweep(Math.max(0, t0 - 0.4), 0.45, 1, 0.26, 500, 10000);
      S.boom(t0, 0.35, 0.6);
    } else if (kind === "fade") {
      S.sweep(t0, 0.7, -1, 0.18, 400, 6000);
    } else {
      S.zap(t0, 0.12);
    }

    // ---- bed, bar by bar
    for (let t = Math.floor(t0 / bar) * bar; t < t1; t += bar) {
      const start = Math.max(t, t0);
      const len = Math.min(t + bar, t1) - start;
      if (len < beat) continue;
      const ch = chordAt(t);
      S.pad(start, len, ch.notes, energy === 0 ? 0.085 : 0.07);
      if (energy >= 1) {
        for (let b = 0; b < 4; b++) {
          const bt = t + b * beat;
          if (bt < t0 || bt >= t1) continue;
          S.bass(bt, beat * 0.5, ch.root, energy >= 3 ? 0.26 : 0.2);
          if (energy >= 3) S.bass(bt + beat * 0.75, beat * 0.22, ch.root + 12, 0.13);
        }
      }
      if (energy === 1 && t >= t0) S.bell(Math.max(t, t0), ch.notes[(Math.floor(t / bar) + 1) % 4] + 24, 0.06, 2, ((Math.floor(t / bar) % 2) - 0.5) * 0.6);
      if (energy >= 2) {
        const stepBeats = energy >= 3 && scene.music?.fast ? 0.25 : 0.5;
        const count = Math.round(4 / stepBeats);
        for (let k = 0; k < count; k++) {
          const nt = t + k * stepBeats * beat;
          if (nt < t0 || nt >= t1) continue;
          S.pluck(nt, ch.notes[arpOrder[k % 6]] + 12, energy >= 3 ? 0.1 : 0.08, k % 2 ? 0.4 : -0.4);
        }
      }
    }

    // ---- drums on the beat grid
    if (energy >= 2 && styleName !== "calm-ambient") {
      const firstBeat = Math.ceil(t0 / beat);
      for (let b = firstBeat; b * beat < t1 - 0.05; b++) {
        const t = b * beat;
        S.kick(t, energy >= 3 ? 0.8 : 0.45);
        if (energy >= 3 && b % 2 === 1) S.clap(t, 0.42);
        S.hat(t + beat * 0.5, energy >= 3 ? 0.13 : 0.08, b % 4 === 3);
        if (energy >= 3 && scene.music?.fast) {
          S.hat(t + beat * 0.25, 0.08);
          S.hat(t + beat * 0.75, 0.08);
        }
      }
    }

    // ---- user-declared effects: scene.sfx = [{at, kind}]
    (scene.sfx ?? []).forEach((e) => {
      const t = t0 + (e.at ?? 0);
      if (t >= total) return;
      if (e.kind === "click") S.click(t, 0.26);
      else if (e.kind === "bell") S.bell(t, e.note ?? 88, 0.16, 2.4);
      else if (e.kind === "whoosh") S.sweep(t, 0.5, -1, 0.26);
      else if (e.kind === "boom") S.boom(t, 0.6, 1.0);
      else S.tick(t, e.note ?? 84, 0.1);
    });
  });

  // final resolution chime on the last scene if it is a call to action
  const last = sb.scenes[sb.scenes.length - 1];
  if (last.type === "cta") S.bell(Math.max(0, total - Math.min(total * 0.15, 4.2)), 88, 0.14, 2.6);

  return S.render(outFile, { fadeOutSec: audioCfg.fadeOutSeconds ?? 1.2, bpm });
}
