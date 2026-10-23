#!/usr/bin/env node
// cv: the celeste-video command line. One entry point that orchestrates every production stage.
// Run it from the project folder:  node <skill>/scripts/cv.mjs <command> [options]
import fs from "node:fs";
import path from "node:path";
import { prepare } from "./lib/assets.mjs";
import * as cache from "./lib/cache.mjs";
import { runCaptures } from "./lib/capture.mjs";
import { formatChecks } from "./lib/doctor-format.mjs";
import { composeMusic, STYLES } from "./lib/music.mjs";
import { cleanProject, doctor, initProject, listTemplates, scaffoldStoryboard } from "./lib/project.mjs";
import { safeRender } from "./lib/render.mjs";
import { renderStills } from "./lib/stills.mjs";
import { computeTimeline, dimensions, FORMATS, validateStoryboard } from "./lib/storyboard.mjs";
import { extractFrames, verifyVideo } from "./lib/verify.mjs";
import { generateVoice, listVoices, setupEnvironment, voiceInfo } from "./lib/voice.mjs";
import { buildPackage } from "./package.mjs";
import { SKILL_DIR, CvError, createLogger, exists, hashFile, loadConfig, projectPaths, readJson, resolveProject, sha, toPosix, writeJson } from "./lib/util.mjs";

// ------------------------------------------------------------------ args
function parseArgs(argv) {
  const pos = [];
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, inline] = a.slice(2).split("=");
      const key = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (inline !== undefined) opts[key] = inline;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) opts[key] = argv[++i];
      else opts[key] = true;
    } else pos.push(a);
  }
  return { pos, opts };
}
const num = (v) => (v === undefined || v === true ? undefined : Number(v));

const HELP = `cv: celeste-video command line

  doctor                          check Node, Remotion, FFmpeg, memory, Piper, voices, Playwright
  init [dir] [--template ad|demo|explainer] [--no-install] [--upgrade]
  storyboard templates            list storyboard templates
  storyboard scaffold --template ad --duration 30 [--format 9:16] [--lang fr] [--brand "Name"] [--out video/storyboard.json]
  storyboard validate [file]      validate + show the timeline
  prepare                         validate and write src/generated/*.json
  voice list | info <name> | setup --yes [--voices a,b] | phonemes | generate [--voice N --speaker N --speed X --force]
  music [--force]                 compose the synthetic soundtrack
  capture [--force]               Playwright captures (needs video/captures.json)
  build [--render]                prepare + capture + voice + music + prepare [+ render]
  render [--format 9:16|16:9|1:1] [--short-side 1080] [--out file] [--frames a-b] [--concurrency N|auto] [--chunked] [--force] [--deep]
  still <frame,frame,...> [--format 16:9] [--short-side 720]   review images (bundles once)
  qa <file> [--at 1,5,9] [--frames a-b]   verify an MP4 and extract review frames (--frames for a test export)
  subtitles                       copy the generated SRT to out/
  attach-voice                    add narration + captions to an EXISTING Remotion composition
  clean [--all]                   remove chunk files / caches
  package [--out file.zip]        build the portable skill ZIP

Global: --project <dir> (default: current folder)`;

// ------------------------------------------------------------------ helpers
function ctx(opts) {
  const projectRoot = resolveProject(opts.project);
  const cfg = loadConfig(projectRoot);
  const paths = projectPaths(projectRoot, cfg);
  const log = createLogger(projectRoot, cfg);
  return { projectRoot, cfg, paths, log };
}

function lexiconFor(paths, lang) {
  const base = path.join(SKILL_DIR, "config", `lexicon.${lang.slice(0, 2)}.json`);
  const merged = { ...(exists(base) ? readJson(base) : {}), ...(exists(paths.pronunciation) ? readJson(paths.pronunciation) : {}) };
  return merged;
}

function chosenDims(sb, opts) {
  const format = opts.format ?? sb.video.format;
  if (!(format in FORMATS)) throw new CvError(`Unknown format "${format}".`, `Use one of: ${Object.keys(FORMATS).join(", ")}`);
  const shortSide = num(opts.shortSide) ?? sb.video.shortSide;
  return { format, shortSide, ...dimensions(format, shortSide) };
}

// ------------------------------------------------------------------ stages
async function stageVoice(c, { storyboard, timeline }, opts) {
  const lexicon = lexiconFor(c.paths, storyboard.meta.lang);
  const res = await generateVoice({ ...c, sb: storyboard, timeline, lexicon, override: { voice: opts.voice, speaker: num(opts.speaker), speed: num(opts.speed) }, force: !!opts.force, acceptLicenceRisk: !!opts.acceptLicenceRisk });
  if (res.attribution) c.log.info(`[voice] attribution required in your post description: ${res.attribution}`);
  return res;
}

function stageMusic(c, { storyboard, timeline }, opts) {
  const music = storyboard.audio?.music ?? { mode: "synth" };
  if (music.mode === "none") return { skipped: true, reason: "music.mode = none" };
  if (music.mode === "file") return { skipped: true, reason: "a music file is provided" };
  const key = sha({ scenes: storyboard.scenes.map((s) => [s.type, s.duration, s.transition, s.music, s.sfx]), music, audio: c.cfg.audio, total: timeline.totalSec });
  if (!opts.force && cache.isFresh(c.paths.cache, "music", key, [c.paths.musicFile])) {
    c.log.info("[music] up to date, skipped");
    return { skipped: true, reason: "unchanged" };
  }
  c.log.info(`[music] composing ${timeline.totalSec}s (${music.style ?? "tech-uplift"})`);
  const r = composeMusic(storyboard, timeline, c.paths.musicFile, c.cfg.audio);
  if (r.clipped > 0) throw new CvError(`Generated music clips (${r.clipped} samples).`, "This is a bug in the composer; report it.");
  cache.record(c.paths.cache, "music", key);
  return { skipped: false, ...r };
}

async function build(c, opts) {
  let state = prepare({ cfg: c.cfg, paths: c.paths, log: c.log });
  const { storyboard } = state;
  const capRes = await runCaptures({ projectRoot: c.projectRoot, paths: c.paths, cfg: c.cfg, log: c.log, force: !!opts.force });
  if (!capRes.skipped) c.log.info(`[capture] ${capRes.shots.length} image(s)`);
  let voice = null;
  if (storyboard.audio?.voice?.enabled) voice = await stageVoice(c, state, opts);
  stageMusic(c, state, opts);
  state = prepare({ cfg: c.cfg, paths: c.paths, log: c.log }); // refresh assets.json now that audio exists
  c.log.info(`[build] ready: ${state.timeline.scenes.length} scenes, ${state.timeline.totalSec}s, ${state.assets.music ? "music" : "no music"}, ${state.assets.voice ? "narration" : "no narration"}`);
  return { ...state, voice };
}

async function render(c, opts) {
  const state = prepare({ cfg: c.cfg, paths: c.paths, log: c.log });
  const { storyboard, timeline, assets } = state;
  const d = chosenDims(storyboard, opts);
  let frames;
  if (opts.frames) {
    const m = /^(\d+)-(\d+)$/.exec(String(opts.frames));
    if (!m || Number(m[2]) >= timeline.totalFrames || Number(m[1]) > Number(m[2])) throw new CvError(`Invalid --frames "${opts.frames}"`, `Use a-b with 0 <= a <= b < ${timeline.totalFrames}.`);
    frames = [Number(m[1]), Number(m[2])];
  }
  const slug = storyboard.meta.slug ?? storyboard.meta.brand.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const out = path.resolve(c.projectRoot, opts.out ?? path.join(c.cfg.paths.out, `${slug}-${d.format.replace(":", "x")}${frames ? "-test" : ""}.mp4`));
  const inputHash = sha({
    gen: ["storyboard.json", "theme.json", "assets.json", "voiceover.manifest.json"].map((f) => hashFile(path.join(c.paths.generated, f))),
    music: hashFile(c.paths.musicFile),
    voice: fs.existsSync(c.paths.voiceDir) ? fs.readdirSync(c.paths.voiceDir).map((f) => hashFile(path.join(c.paths.voiceDir, f))) : [],
    d,
  });
  const expectAudio = !!assets.music || assets.voice;
  return safeRender({
    projectRoot: c.projectRoot, cfg: c.cfg, log: c.log, out,
    meta: { width: d.width, height: d.height, fps: storyboard.video.fps, totalFrames: timeline.totalFrames },
    props: { format: d.format, shortSide: d.shortSide },
    inputHash, frames, expectAudio,
    concurrency: opts.concurrency === undefined ? "auto" : opts.concurrency, chunked: !!opts.chunked, force: !!opts.force, deep: !!opts.deep,
  });
}

// ------------------------------------------------------------------ commands
const commands = {
  async doctor(c) {
    const checks = await doctor(c);
    console.log(formatChecks(checks));
    const failed = checks.filter((k) => k.level === "fail").length;
    console.log(`\n${failed ? `${failed} blocking problem(s).` : "No blocking problem."}`);
    return failed ? 1 : 0;
  },

  async init(c, { pos, opts }) {
    const dir = path.resolve(pos[0] ?? c.projectRoot);
    await initProject({ dir, template: opts.template ?? "ad", install: !opts.noInstall, upgrade: !!opts.upgrade, log: c.log });
    const sub = { projectRoot: dir, cfg: loadConfig(dir), };
    sub.paths = projectPaths(dir, sub.cfg);
    prepare({ cfg: sub.cfg, paths: sub.paths, log: c.log });
    console.log(`\nProject ready in ${dir}. Next: edit video/storyboard.json, then \`cv build\` and \`cv render\`.`);
    return 0;
  },

  async storyboard(c, { pos, opts }) {
    const sub = pos[0];
    if (sub === "templates") {
      listTemplates().forEach((t) => console.log(`${t.name.padEnd(12)} ${String(t.duration).padStart(3)}s  ${t.scenes} scenes  ${t.description}`));
      return 0;
    }
    if (sub === "scaffold") {
      const out = path.resolve(c.projectRoot, opts.out ?? path.join(c.cfg.paths.video, "storyboard.json"));
      if (exists(out) && !opts.force) throw new CvError(`${out} already exists.`, "Use --force to overwrite, or --out to write elsewhere.");
      const sb = scaffoldStoryboard({ template: opts.template ?? "ad", duration: num(opts.duration), format: opts.format, lang: opts.lang, brand: opts.brand, out });
      console.log(`Storyboard written to ${out} (${sb.scenes.length} scenes, ${sb.video.duration}s). Fill in the copy, then \`cv storyboard validate\`.`);
      return 0;
    }
    if (sub === "validate") {
      const file = path.resolve(c.projectRoot, pos[1] ?? c.paths.storyboard);
      const r = validateStoryboard(readJson(file), c.cfg.video);
      r.warnings.forEach((w) => console.warn(`warning: ${w}`));
      if (!r.ok) {
        r.errors.forEach((e) => console.error(`error: ${e}`));
        return 1;
      }
      const tl = computeTimeline(r.storyboard);
      tl.scenes.forEach((s) => console.log(`${s.startSec.toFixed(1).padStart(5)}s  ${String(s.durationSec).padStart(4)}s  ${s.type.padEnd(16)} ${s.id}`));
      console.log(`valid: ${tl.scenes.length} scenes, ${tl.totalSec}s, ${tl.totalFrames} frames @ ${tl.fps} fps`);
      return 0;
    }
    throw new CvError("Usage: cv storyboard templates | scaffold | validate");
  },

  async prepare(c) {
    const r = prepare({ cfg: c.cfg, paths: c.paths, log: c.log });
    console.log(`prepared: ${r.timeline.scenes.length} scenes, ${r.timeline.totalSec}s -> ${toPosix(path.relative(c.projectRoot, c.paths.generated))}/`);
    return 0;
  },

  async voice(c, { pos, opts }) {
    const sub = pos[0];
    if (sub === "list") {
      const v = listVoices(c.projectRoot);
      if (!v.length) console.log("No voice model installed. Run `cv voice setup --yes --voices fr_FR-upmc-medium` (ask the user first).");
      v.forEach((x) => console.log(`${x.name.padEnd(22)} ${x.lang}  ${String(x.sampleRate).padStart(5)} Hz  ${String(x.speakers).padStart(3)} spk  licence: ${x.license}  commercial: ${x.commercial}\n   ${x.notes}`));
      return 0;
    }
    if (sub === "info") {
      if (!pos[1]) throw new CvError("Usage: cv voice info <voice-name>");
      console.log(JSON.stringify(await voiceInfo(pos[1]), null, 2));
      return 0;
    }
    if (sub === "setup") {
      const r = await setupEnvironment({ yes: !!opts.yes, voices: opts.voices ? String(opts.voices).split(",") : ["fr_FR-upmc-medium"], log: c.log });
      console.log(`Piper ready: ${r.py}\nVoices in: ${r.voicesDir}`);
      return 0;
    }
    if (sub === "phonemes" || sub === "generate") {
      const state = prepare({ cfg: c.cfg, paths: c.paths, log: c.log });
      if (!state.storyboard.audio?.voice?.enabled) throw new CvError("Narration is disabled in the storyboard.", "Set audio.voice.enabled = true and add scene narration.");
      if (sub === "generate") {
        const r = await stageVoice(c, state, opts);
        prepare({ cfg: c.cfg, paths: c.paths, log: c.log });
        console.log(r.skipped ? "voice up to date" : `voice: ${r.manifest.segments.length} segments, ends at ${r.manifest.end}s. SRT: ${r.srt ? path.relative(c.projectRoot, r.srt) : "-"}`);
        return 0;
      }
      throw new CvError("Use `cv voice generate`; phoneme checking is done by the Python script: python generate-voiceover.py --script .cv/narration.json --phonemes");
    }
    throw new CvError("Usage: cv voice list | info <name> | setup --yes | generate");
  },

  async music(c, { opts }) {
    const state = prepare({ cfg: c.cfg, paths: c.paths, log: c.log });
    const r = stageMusic(c, state, opts);
    prepare({ cfg: c.cfg, paths: c.paths, log: c.log });
    console.log(r.skipped ? `music: ${r.reason}` : `music: ${r.seconds}s, peak before normalisation ${r.peakBeforeNorm.toFixed(2)}, clipped samples ${r.clipped}\nstyles available: ${Object.keys(STYLES).join(", ")}`);
    return 0;
  },

  async capture(c, { opts }) {
    const r = await runCaptures({ projectRoot: c.projectRoot, paths: c.paths, cfg: c.cfg, log: c.log, force: !!opts.force });
    console.log(r.skipped ? `capture skipped: ${r.reason}` : `${r.shots.length} capture(s) in public/captures/`);
    return 0;
  },

  async build(c, { opts }) {
    await build(c, opts);
    if (opts.render) {
      const rep = await render(c, opts);
      console.log(`\nDONE: ${rep.out}`);
    }
    return 0;
  },

  async render(c, { opts }) {
    const rep = await render(c, opts);
    console.log(`\nDONE: ${rep.out}`);
    return 0;
  },

  async still(c, { pos, opts }) {
    const state = prepare({ cfg: c.cfg, paths: c.paths, log: c.log });
    const d = chosenDims(state.storyboard, opts);
    const fps = state.storyboard.video.fps;
    // "3s" = seconds, plain number = frame
    const frames = String(pos[0] ?? opts.frames ?? "")
      .split(",")
      .filter(Boolean)
      .map((v) => (v.endsWith("s") ? Math.round(parseFloat(v) * fps) : Number(v)));
    if (!frames.length || frames.some(Number.isNaN)) throw new CvError("Usage: cv still 30,120,300 (frames) or 1s,4.5s (seconds)");
    const files = await renderStills({ projectRoot: c.projectRoot, cfg: c.cfg, log: c.log, frames, props: { format: d.format, shortSide: d.shortSide, width: d.width, height: d.height }, outDir: path.join(c.paths.out, "stills"), prefix: d.format.replace(":", "x") });
    console.log(files.map((f) => path.relative(c.projectRoot, f)).join("\n"));
    return 0;
  },

  async qa(c, { pos, opts }) {
    const state = prepare({ cfg: c.cfg, paths: c.paths, log: c.log });
    const d = chosenDims(state.storyboard, opts);
    const file = path.resolve(c.projectRoot, pos[0] ?? opts.file ?? "");
    if (!pos[0] && !opts.file) throw new CvError("Usage: cv qa <video.mp4> [--at 1,5,9]");
    let durationSec = state.timeline.totalSec;
    if (opts.frames) {
      const m = /^(\d+)-(\d+)$/.exec(String(opts.frames));
      if (!m) throw new CvError("Invalid --frames, use a-b");
      durationSec = (Number(m[2]) - Number(m[1]) + 1) / state.storyboard.video.fps;
    }
    const check = await verifyVideo(c.projectRoot, file, { width: d.width, height: d.height, fps: state.storyboard.video.fps, durationSec, expectAudio: !!state.assets.music || state.assets.voice, deep: true, tolerance: 0.3 });
    console.log(JSON.stringify(check.info, null, 2));
    check.problems.forEach((p) => console.error(`problem: ${p}`));
    const at = opts.at ? String(opts.at).split(",").map(Number) : state.timeline.scenes.map((s) => Math.round((s.startSec + s.durationSec * 0.6) * 10) / 10);
    const frames = await extractFrames(c.projectRoot, file, at, path.join(c.paths.out, "qa"));
    console.log(`review frames:\n${frames.map((f) => `  ${path.relative(c.projectRoot, f)}`).join("\n")}`);
    return check.ok ? 0 : 1;
  },

  async subtitles(c) {
    const state = prepare({ cfg: c.cfg, paths: c.paths, log: c.log });
    const srt = path.join(c.paths.out, `${state.storyboard.meta.slug ?? "video"}.${state.storyboard.meta.lang}.srt`);
    if (!exists(srt)) throw new CvError("No SRT yet.", "Run `cv voice generate` (captions are built from the real narration timing).");
    console.log(`subtitles: ${srt}`);
    return 0;
  },

  async "attach-voice"(c, { opts }) {
    const snippets = path.join(SKILL_DIR, "templates", "snippets");
    const dest = path.join(c.projectRoot, "src", "cv");
    fs.mkdirSync(dest, { recursive: true });
    for (const f of fs.readdirSync(snippets)) {
      const to = path.join(dest, f);
      if (!exists(to) || opts.force) fs.copyFileSync(path.join(snippets, f), to);
    }
    console.log(`Copied narration snippets to ${path.relative(c.projectRoot, dest)}/.\nSee references/existing-composition.md: write a narration.json, run the Piper script, then add <CvVoiceover/> and <CvSubtitles/> to your composition.`);
    return 0;
  },

  async clean(c, { opts }) {
    const r = cleanProject({ projectRoot: c.projectRoot, cfg: c.cfg, what: opts.all ? "all" : "render" });
    console.log(r.length ? `removed:\n${r.join("\n")}` : "nothing to clean");
    return 0;
  },

  async package(c, { opts }) {
    const out = path.resolve(c.projectRoot, opts.out ?? "out/celeste-video-skill.zip");
    const r = buildPackage(out);
    console.log(`package: ${out} (${r.files} files, ${(r.bytes / 1e6).toFixed(2)} MB)`);
    return 0;
  },
};

// ------------------------------------------------------------------ main
async function main() {
  const { pos, opts } = parseArgs(process.argv.slice(2));
  const name = pos.shift();
  if (!name || name === "help" || opts.help) {
    console.log(HELP);
    return 0;
  }
  const fn = commands[name];
  if (!fn) {
    console.error(`Unknown command "${name}".\n\n${HELP}`);
    return 2;
  }
  const c = ctx(opts);
  try {
    return await fn(c, { pos, opts });
  } catch (e) {
    if (e instanceof CvError) {
      c.log.error(e.message);
      if (e.hint) console.error(`  -> ${e.hint}`);
      return e.exitCode;
    }
    c.log.error(`${e.stack ?? e}`);
    console.error(`Unexpected error (details in ${path.relative(process.cwd(), c.log.file)}): ${e.message}`);
    return 1;
  }
}

process.exitCode = await main();
