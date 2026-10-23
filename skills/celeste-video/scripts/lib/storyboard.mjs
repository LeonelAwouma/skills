// Storyboard: validation, normalisation, timeline maths and narration extraction.
// The storyboard is the single source of truth: Remotion, Piper, the music composer and the
// subtitle generator all derive from it.
import { CvError } from "./util.mjs";

export const FORMATS = {
  "9:16": [9, 16],
  "16:9": [16, 9],
  "1:1": [1, 1],
  "4:5": [4, 5],
};

export const TRANSITIONS = ["cut", "fade", "bloom", "wipe", "push"];
/** Frames a scene starts *before* its nominal boundary so its entrance transition can play. */
export const TRANSITION_LEAD = { cut: 0, fade: 10, bloom: 14, wipe: 12, push: 10 };

export const SHOWCASE_KINDS = ["app", "automation", "integrations", "timeline", "screenshot"];

const SCENE_RULES = {
  kinetic: { required: ["lines"] },
  "problem-solution": { required: ["problem", "solution"] },
  "logo-reveal": { required: [] },
  showcase: { required: ["lines", "visual"] },
  value: { required: ["lines"] },
  cta: { required: ["lines"] },
  bullets: { required: ["lines", "items"] },
  screenshot: { required: ["image"] },
};
export const SCENE_TYPES = Object.keys(SCENE_RULES);

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
const MAX_LINE_CHARS = 34; // longer lines cannot stay legible at phone size
const MAX_LINES = 4;

/** Replace {brand} (and other {tokens}) inside every string of a JSON structure, in place. */
const fillTokens = (str, vars) => str.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
export function replaceTokens(node, vars) {
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      if (typeof v === "string") node[i] = fillTokens(v, vars);
      else replaceTokens(v, vars);
    });
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string") node[k] = fillTokens(v, vars);
      else replaceTokens(v, vars);
    }
  }
}

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const asLines = (v) => (Array.isArray(v) ? v : []);

function checkLines(path, lines, errors, warnings) {
  if (!Array.isArray(lines) || lines.length === 0) {
    errors.push(`${path}: must be a non-empty array of strings`);
    return;
  }
  if (lines.length > MAX_LINES) warnings.push(`${path}: ${lines.length} lines, more than ${MAX_LINES} hurts readability`);
  lines.forEach((l, i) => {
    if (!isStr(l)) {
      errors.push(`${path}[${i}]: must be a non-empty string`);
      return;
    }
    if ((l.match(/\*/g) ?? []).length % 2 !== 0) errors.push(`${path}[${i}]: unbalanced *accent* markers in "${l}"`);
    if (l.replace(/\*/g, "").length > MAX_LINE_CHARS) warnings.push(`${path}[${i}]: ${l.replace(/\*/g, "").length} characters (> ${MAX_LINE_CHARS}), text may shrink or overflow on mobile`);
  });
}

/**
 * @returns {{ok:boolean, errors:string[], warnings:string[], storyboard:object}}
 * `storyboard` is a normalised deep copy (defaults filled, duration derived).
 */
export function validateStoryboard(input, defaults = {}) {
  const errors = [];
  const warnings = [];
  if (!input || typeof input !== "object") throw new CvError("Storyboard must be a JSON object");
  const sb = JSON.parse(JSON.stringify(input));

  if (sb.version !== 1) errors.push(`version: expected 1, got ${JSON.stringify(sb.version)}`);
  sb.meta = { lang: "fr", ...(sb.meta ?? {}) };
  if (typeof sb.meta.brand === "string") replaceTokens(sb, { brand: sb.meta.brand });
  if (!isStr(sb.meta.brand)) errors.push("meta.brand: required (brand or company name)");
  sb.video = { fps: defaults.fps ?? 30, format: defaults.format ?? "9:16", shortSide: defaults.shortSide ?? 1080, ...(sb.video ?? {}) };
  if (!(sb.video.format in FORMATS)) errors.push(`video.format: must be one of ${Object.keys(FORMATS).join(", ")}`);
  if (!(sb.video.fps >= 12 && sb.video.fps <= 60)) errors.push("video.fps: must be between 12 and 60");
  if (!(sb.video.shortSide >= 240 && sb.video.shortSide <= 2160)) errors.push("video.shortSide: must be between 240 and 2160");

  if (!Array.isArray(sb.scenes) || sb.scenes.length === 0) {
    errors.push("scenes: must be a non-empty array");
    return { ok: false, errors, warnings, storyboard: sb };
  }

  const ids = new Set();
  let total = 0;
  sb.scenes.forEach((s, i) => {
    const at = `scenes[${i}]`;
    if (!isStr(s.id) || !ID_RE.test(s.id)) errors.push(`${at}.id: lowercase letters, digits and dashes only (got ${JSON.stringify(s.id)})`);
    else if (ids.has(s.id)) errors.push(`${at}.id: duplicate "${s.id}"`);
    else ids.add(s.id);

    const rule = SCENE_RULES[s.type];
    if (!rule) {
      errors.push(`${at}.type: unknown "${s.type}". Known: ${SCENE_TYPES.join(", ")}`);
    } else {
      for (const key of rule.required) if (s[key] === undefined) errors.push(`${at} (${s.type}): missing "${key}"`);
    }
    if (!(typeof s.duration === "number" && s.duration >= 1.5 && s.duration <= 60)) errors.push(`${at}.duration: seconds, between 1.5 and 60`);
    else total += s.duration;

    s.transition = { type: i === 0 ? "cut" : "fade", ...(s.transition ?? {}) };
    if (!TRANSITIONS.includes(s.transition.type)) errors.push(`${at}.transition.type: one of ${TRANSITIONS.join(", ")}`);
    if (i === 0 && s.transition.type !== "cut") {
      warnings.push(`${at}: first scene has no previous scene, transition forced to "cut"`);
      s.transition.type = "cut";
    }

    if (s.lines !== undefined) checkLines(`${at}.lines`, s.lines, errors, warnings);
    if (s.type === "problem-solution") {
      checkLines(`${at}.problem.lines`, s.problem?.lines, errors, warnings);
      checkLines(`${at}.solution.lines`, s.solution?.lines, errors, warnings);
    }
    if (s.type === "showcase" && s.visual && !SHOWCASE_KINDS.includes(s.visual.kind)) errors.push(`${at}.visual.kind: one of ${SHOWCASE_KINDS.join(", ")}`);
    if (s.type === "bullets" && (!Array.isArray(s.items) || s.items.length < 2 || s.items.length > 5)) errors.push(`${at}.items: 2 to 5 entries`);
    if (s.type === "cta" && !(Array.isArray(s.contacts) && s.contacts.length)) warnings.push(`${at}: cta scene without "contacts", viewers will not know how to reach you`);

    asLines(s.narration).forEach((n, j) => {
      if (!isStr(n.text)) errors.push(`${at}.narration[${j}].text: required`);
      if (n.at !== undefined && !(n.at >= 0 && n.at < (s.duration ?? 0))) warnings.push(`${at}.narration[${j}].at: ${n.at}s is outside the scene (0-${s.duration}s); it will spill into the next scene`);
    });
  });

  const rounded = Math.round(total * 1000) / 1000;
  if (sb.video.duration === undefined) sb.video.duration = rounded;
  else if (Math.abs(sb.video.duration - rounded) > 0.1) errors.push(`video.duration (${sb.video.duration}s) does not match the sum of scene durations (${rounded}s)`);

  const music = sb.audio?.music;
  if (music?.mode === "file") {
    if (!isStr(music.file)) errors.push("audio.music.file: required when mode is \"file\"");
    if (!isStr(music.license)) errors.push("audio.music.license: required for a provided music file (state the licence or source that allows this use)");
  }
  if (sb.subtitles?.burn && !sb.audio?.voice?.enabled) {
    warnings.push("subtitles.burn is on but no narration is enabled: no captions will be shown (captions are generated from the narration)");
  }

  return { ok: errors.length === 0, errors, warnings, storyboard: sb };
}

// ---------------------------------------------------------------- timing
export function dimensions(format, shortSide = 1080) {
  const [rw, rh] = FORMATS[format] ?? FORMATS["9:16"];
  const even = (n) => Math.round(n / 2) * 2;
  if (rw === rh) return { width: even(shortSide), height: even(shortSide) };
  if (rw < rh) return { width: even(shortSide), height: even((shortSide * rh) / rw) };
  return { width: even((shortSide * rw) / rh), height: even(shortSide) };
}

/** Cumulative-rounded frame boundaries (no drift) + transition lead per scene. */
export function computeTimeline(sb) {
  const fps = sb.video.fps;
  let cursor = 0;
  const scenes = sb.scenes.map((s, i) => {
    const startSec = cursor;
    cursor += s.duration;
    const startFrame = Math.round(startSec * fps);
    const endFrame = Math.round(cursor * fps);
    const lead = i === 0 ? 0 : TRANSITION_LEAD[s.transition?.type ?? "cut"];
    return { id: s.id, type: s.type, startSec, durationSec: s.duration, startFrame, endFrame, durationFrames: endFrame - startFrame, lead };
  });
  return { fps, totalSec: cursor, totalFrames: Math.round(cursor * fps), scenes };
}

/** Scale all scene durations proportionally so that they sum to `target` seconds. */
export function scaleDurations(sb, target) {
  const sum = sb.scenes.reduce((a, s) => a + s.duration, 0);
  const k = target / sum;
  let acc = 0;
  sb.scenes.forEach((s, i) => {
    const last = i === sb.scenes.length - 1;
    const d = last ? target - acc : Math.round(s.duration * k * 10) / 10;
    s.duration = Math.round(d * 10) / 10;
    acc += s.duration;
  });
  sb.video.duration = Math.round(acc * 10) / 10;
  return sb;
}

// ---------------------------------------------------------------- narration
/** Replace words by their phoneme spelling (`[[ ... ]]`). Whole words only, case-insensitive. */
export function applyLexicon(text, lexicon = {}) {
  let out = text;
  for (const [word, repl] of Object.entries(lexicon)) {
    if (word.startsWith("_")) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "giu");
    out = out.replace(re, repl);
  }
  return out;
}

/** Narration blocks of every scene -> flat list in the generate-voiceover.py script format. */
export function narrationSegments(sb, timeline, lexicon = {}) {
  const segments = [];
  sb.scenes.forEach((scene, si) => {
    asLines(scene.narration).forEach((n, j) => {
      const start = timeline.scenes[si].startSec + (n.at ?? 0.25);
      const spoken = applyLexicon(n.spoken ?? n.text, lexicon);
      segments.push({
        id: `${String(segments.length + 1).padStart(2, "0")}-${scene.id}${asLines(scene.narration).length > 1 ? `-${j + 1}` : ""}`,
        cue: `${scene.id} (${scene.type})`,
        start: Math.round(start * 1000) / 1000,
        text: n.text,
        ...(spoken !== n.text ? { spoken } : {}),
        ...(n.speed ? { speed: n.speed } : {}),
        ...(n.sentencePause !== undefined ? { sentence_pause: n.sentencePause } : {}),
      });
    });
  });
  return segments;
}

/** Strip *accent* markers: used for subtitles / SRT / plain text. */
export const plain = (s) => s.replace(/\*/g, "");
