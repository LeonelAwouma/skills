// "prepare" stage: validate the storyboard, merge the theme preset, resolve logo / music / captures
// and write src/generated/*.json, the only inputs the Remotion engine reads.
import fs from "node:fs";
import path from "node:path";
import { SKILL_DIR, CvError, deepMerge, ensureDir, exists, readJson, toPosix, writeJson } from "./util.mjs";
import { validateStoryboard, computeTimeline } from "./storyboard.mjs";

/** PNG width/height from the IHDR chunk, null for anything else. */
export function pngSize(file) {
  const fd = fs.openSync(file, "r");
  try {
    const b = Buffer.alloc(24);
    fs.readSync(fd, b, 0, 24, 0);
    return b.toString("hex", 0, 8) === "89504e470d0a1a0a" ? { width: b.readUInt32BE(16), height: b.readUInt32BE(20) } : null;
  } finally {
    fs.closeSync(fd);
  }
}

export function loadTheme(paths, sb) {
  const projectTheme = exists(paths.theme) ? readJson(paths.theme) : {};
  const presetName = projectTheme.preset ?? sb.theme ?? "midnight-blue";
  const presetFile = path.join(SKILL_DIR, "config", "themes", `${presetName}.json`);
  if (!exists(presetFile)) {
    const known = fs.readdirSync(path.join(SKILL_DIR, "config", "themes")).map((f) => f.replace(/\.json$/, ""));
    throw new CvError(`Unknown theme preset "${presetName}".`, `Available: ${known.join(", ")}.`);
  }
  return deepMerge(readJson(presetFile), { ...projectTheme, preset: undefined, name: projectTheme.name ?? presetName });
}

export function prepare({ cfg, paths, log, extraAssets = {} }) {
  if (!exists(paths.storyboard)) throw new CvError(`No storyboard at ${paths.storyboard}`, "Create one with `cv storyboard scaffold` or write video/storyboard.json.");
  const { ok, errors, warnings, storyboard } = validateStoryboard(readJson(paths.storyboard), cfg.video);
  warnings.forEach((w) => log.warn(w));
  if (!ok) throw new CvError(`Storyboard is invalid (${errors.length} error${errors.length > 1 ? "s" : ""}):\n - ${errors.join("\n - ")}`, "Fix video/storyboard.json, then retry.");

  const theme = loadTheme(paths, storyboard);
  const timeline = computeTimeline(storyboard);

  // ---- logo
  let logo = null;
  const logoCfg = theme.logo;
  if (logoCfg?.src) {
    const file = path.join(paths.public, logoCfg.src);
    if (!exists(file)) {
      log.warn(`Logo ${logoCfg.src} not found in ${path.relative(paths.root, paths.public)}/: a vector brand mark will be generated instead.`);
    } else {
      const size = pngSize(file);
      const aspect = size ? size.height / size.width : logoCfg.aspect;
      if (!aspect) throw new CvError(`Cannot determine the aspect ratio of ${logoCfg.src}.`, "Use a PNG, or set theme.logo.aspect (height / width).");
      logo = { src: toPosix(logoCfg.src), aspect, focus: logoCfg.focus ?? { x: 0.5, y: 0.5 }, onDark: !!logoCfg.onDark };
    }
  }

  // ---- music
  const music = storyboard.audio?.music ?? { mode: "synth" };
  let musicAsset = null;
  if (music.mode === "file") {
    const file = path.join(paths.public, music.file);
    if (!exists(file)) throw new CvError(`Music file not found: ${music.file}`, "Put the file under public/ and keep its licence in audio.music.license.");
    musicAsset = { src: toPosix(music.file) };
  } else if (music.mode !== "none" && exists(paths.musicFile)) {
    musicAsset = { src: "audio/music.wav" };
  }
  if (musicAsset) {
    musicAsset.volume = music.volume ?? cfg.audio.musicVolume;
    musicAsset.ducked = music.ducked ?? cfg.audio.duckedVolume;
  }

  // ---- screenshots referenced by scenes
  const missing = [];
  const imageRefs = [];
  storyboard.scenes.forEach((s) => {
    if (s.type === "screenshot" && s.image) imageRefs.push(s.image);
    if (s.type === "showcase" && s.visual?.kind === "screenshot") (s.visual.images ?? []).forEach((i) => imageRefs.push(i.src));
  });
  imageRefs.forEach((r) => {
    if (r && !exists(path.join(paths.public, r))) missing.push(r);
  });
  missing.forEach((m) => log.warn(`Image ${m} not found under public/: a placeholder will be shown.`));

  const voiceManifest = path.join(paths.generated, "voiceover.manifest.json");
  const assets = {
    logo,
    music: musicAsset,
    voice: !!storyboard.audio?.voice?.enabled && exists(voiceManifest),
    missingImages: missing,
    brand: storyboard.meta.brand,
    lang: storyboard.meta.lang,
    subtitles: { burn: storyboard.subtitles?.burn ?? cfg.subtitles.burn, position: storyboard.subtitles?.position ?? "bottom" },
    ducking: { attack: cfg.audio.duckAttackFrames, release: cfg.audio.duckReleaseFrames },
    ...extraAssets,
  };

  ensureDir(paths.generated);
  writeJson(path.join(paths.generated, "storyboard.json"), storyboard);
  writeJson(path.join(paths.generated, "theme.json"), theme);
  writeJson(path.join(paths.generated, "assets.json"), assets);
  if (!exists(voiceManifest)) writeJson(voiceManifest, { voice: null, segments: [], subtitles: [] });
  return { storyboard, theme, timeline, assets, warnings };
}
