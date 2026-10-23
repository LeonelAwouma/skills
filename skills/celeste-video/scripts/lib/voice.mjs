// Piper TTS orchestration: voice catalogue + licences, environment setup, narration generation.
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import * as cache from "./cache.mjs";
import { SKILL_DIR, CvError, cvHome, ensureDir, exists, findPiperPython, findSystemPython, findVoicesDir, readJson, run, sha, voiceDirs, writeJson, IS_WIN } from "./util.mjs";
import { narrationSegments } from "./storyboard.mjs";

const CATALOG = () => readJson(path.join(SKILL_DIR, "config", "voices.json")).voices;
const PY_SCRIPT = path.join(SKILL_DIR, "scripts", "voice", "generate-voiceover.py");
const OK_STATUS = ["allowed", "allowed-with-attribution"];

/** Installed Piper models joined with what we know about their licences. */
export function listVoices(projectRoot) {
  const catalog = CATALOG();
  const seen = new Set();
  const out = [];
  for (const dir of voiceDirs(projectRoot)) {
    if (!exists(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".onnx"))) {
      const name = f.replace(/\.onnx$/, "");
      if (seen.has(name)) continue;
      seen.add(name);
      let cfg = {};
      try {
        cfg = readJson(path.join(dir, `${f}.json`));
      } catch {
        /* config missing: still list the model */
      }
      const known = catalog[name];
      out.push({
        name,
        dir,
        lang: known?.lang ?? name.split("_")[0],
        sampleRate: cfg.audio?.sample_rate ?? known?.sampleRate ?? null,
        speakers: cfg.num_speakers ?? known?.speakers ?? 1,
        gender: known?.gender ?? "inconnu",
        license: known?.datasetLicense ?? "non vérifiée",
        commercial: known?.commercial ?? "unverified",
        notes: known?.notes ?? "Modèle absent du catalogue : lisez sa MODEL_CARD avant tout usage commercial (`cv voice info <nom>`).",
      });
    }
  }
  return out;
}

const httpGet = (url) =>
  new Promise((resolve, reject) => {
    https
      .get(url, { headers: { "User-Agent": "celeste-video" } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return resolve(httpGet(res.headers.location));
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        let body = "";
        res.on("data", (d) => (body += d));
        res.on("end", () => resolve(body));
      })
      .on("error", reject);
  });

/** Catalogue entry, or the model card fetched from the official Piper voices repository. */
export async function voiceInfo(name) {
  const known = CATALOG()[name];
  if (known) return { name, source: "catalogue", ...known };
  const m = /^([a-z]{2}_[A-Z]{2})-([^-]+)-(.+)$/.exec(name);
  if (!m) throw new CvError(`Unrecognised voice name "${name}"`, "Expected something like fr_FR-upmc-medium.");
  const [, locale, speaker, quality] = m;
  const url = `https://huggingface.co/rhasspy/piper-voices/resolve/main/${locale.slice(0, 2)}/${locale}/${speaker}/${quality}/MODEL_CARD`;
  try {
    const card = await httpGet(url);
    const lic = /License:\s*(.+)/i.exec(card)?.[1]?.trim() ?? "not stated";
    return { name, source: "model card (network)", datasetLicense: lic, commercial: "unverified", modelCard: card.slice(0, 800), url };
  } catch (e) {
    throw new CvError(`Could not fetch the model card for ${name} (${e.message}).`, `Open ${url} in a browser and read the licence before using this voice commercially.`);
  }
}

/** Creates the shared venv and installs Piper. Needs the user's consent (`yes`). */
export async function setupEnvironment({ yes, voices = [], log }) {
  const home = cvHome();
  const sys = findSystemPython();
  if (!sys) throw new CvError("Python 3 was not found.", "Install Python 3.10+ (Windows: `winget install Python.Python.3.12`), then re-run.");
  const venv = path.join(home, "venv");
  const py = path.join(venv, ...(IS_WIN ? ["Scripts", "python.exe"] : ["bin", "python"]));
  if (!yes) {
    throw new CvError(
      "Voice environment setup needs confirmation.",
      `It will create ${venv} (about 170 MB with onnxruntime) and download voice models (60-80 MB each) into ${path.join(home, "voices")}. Ask the user, then re-run with --yes.`,
      2,
    );
  }
  ensureDir(home);
  if (!exists(py)) {
    log.info(`[voice] creating ${venv} with ${sys.version}`);
    const r = await run(sys.cmd, [...sys.pre, "-m", "venv", venv], { stream: true });
    if (r.code !== 0) throw new CvError("venv creation failed", r.stderr.slice(-300));
  }
  log.info("[voice] installing piper-tts");
  let r = await run(py, ["-m", "pip", "install", "--upgrade", "pip", "piper-tts"], { stream: true });
  if (r.code !== 0) {
    throw new CvError(
      "pip could not install piper-tts.",
      `${r.stderr.slice(-300)}\nIf your Python is very recent, onnxruntime may lack a wheel: create the venv from Python 3.11-3.13 instead (set CV_PYTHON to its interpreter).`,
    );
  }
  const vdir = path.join(home, "voices");
  ensureDir(vdir);
  for (const v of voices) {
    log.info(`[voice] downloading ${v}`);
    r = await run(py, ["-m", "piper.download_voices", v, "--download-dir", vdir], { stream: true });
    if (r.code !== 0) throw new CvError(`Voice download failed for ${v}`, r.stderr.slice(-300));
  }
  return { venv, py, voicesDir: vdir };
}

function chooseVoice(sb, cfg, listed, override = {}) {
  const lang = sb.meta.lang ?? "fr";
  const wanted = override.voice ?? sb.audio?.voice?.voice ?? cfg.voice.defaultByLang[lang];
  if (!wanted) throw new CvError(`No default voice configured for language "${lang}".`, "Set audio.voice.voice in the storyboard (see `cv voice list`).");
  const installed = listed.find((v) => v.name === wanted);
  if (!installed) {
    throw new CvError(
      `Voice model ${wanted} is not installed.`,
      `Installed: ${listed.map((v) => v.name).join(", ") || "none"}. Install one with \`cv voice setup --yes --voices ${wanted}\` (ask the user first: ~70 MB download).`,
    );
  }
  const speaker = override.speaker ?? sb.audio?.voice?.speaker ?? cfg.voice.defaultSpeaker[wanted] ?? (installed.speakers > 1 ? 0 : undefined);
  return { installed, speaker };
}

/**
 * Generate the narration for the whole storyboard (or reuse the cached result).
 * Changing only the voice/speed re-runs this stage and nothing else.
 */
export async function generateVoice({ projectRoot, cfg, paths, sb, timeline, lexicon, log, override = {}, force = false, acceptLicenceRisk = false }) {
  const py = findPiperPython(projectRoot);
  if (!py) throw new CvError("Piper TTS is not installed.", "Run `cv voice setup --yes` (ask the user first: creates a Python environment and downloads about 250 MB).");
  const listed = listVoices(projectRoot);
  const { installed, speaker } = chooseVoice(sb, cfg, listed, override);

  if (cfg.commercialUse && !OK_STATUS.includes(installed.commercial)) {
    if (!acceptLicenceRisk) {
      throw new CvError(
        `Voice ${installed.name} is not cleared for commercial use (status: ${installed.commercial}, dataset licence: ${installed.license}).`,
        "Pick a voice marked allowed / allowed-with-attribution (`cv voice list`), or set commercialUse=false in cv.config.json, or re-run with --accept-licence-risk after reading the licence.",
      );
    }
    log.warn(`Using ${installed.name} although its commercial status is "${installed.commercial}" (--accept-licence-risk).`);
  }

  const segments = narrationSegments(sb, timeline, lexicon);
  if (segments.length === 0) throw new CvError("The storyboard has no narration.", "Add a \"narration\" array to at least one scene, or disable audio.voice.");

  const speed = override.speed ?? sb.audio?.voice?.speed ?? cfg.voice.speed;
  const script = {
    voice: installed.name,
    speaker,
    speed,
    pause: sb.audio?.voice?.pause ?? cfg.voice.pause,
    sentence_pause: sb.audio?.voice?.sentencePause ?? cfg.voice.sentencePause,
    target_db: cfg.voice.targetDb,
    auto_shift: true, // never let two narration segments play at the same time
    subtitle_max_chars: sb.subtitles?.maxChars ?? cfg.subtitles.maxChars,
    duration: Math.ceil(timeline.totalSec),
    segments,
  };
  const hash = sha({ script, model: installed.name });
  const manifest = path.join(paths.voiceDir, "manifest.json");
  const generatedManifest = path.join(paths.generated, "voiceover.manifest.json");
  if (!force && cache.isFresh(paths.cache, "voice", hash, [manifest, generatedManifest])) {
    log.info(`[voice] up to date (${segments.length} segments, ${installed.name}), skipped`);
    return { skipped: true, manifest: readJson(manifest), voice: installed, speaker };
  }

  const scriptFile = path.join(paths.cache, "narration.json");
  writeJson(scriptFile, script);
  ensureDir(paths.out);
  const srt = path.join(paths.out, `${sb.meta.slug ?? "video"}.${sb.meta.lang ?? "fr"}.srt`);
  log.info(`[voice] generating ${segments.length} segments with ${installed.name}${speaker !== undefined ? ` (speaker ${speaker})` : ""}, speed ${speed}`);
  const r = await run(
    py,
    [PY_SCRIPT, "--script", scriptFile, "--voices-dir", installed.dir, "--out", paths.voiceDir, "--full-track", "voiceover-full.wav", "--copy-manifest", generatedManifest, "--srt", srt],
    { cwd: projectRoot, env: { CV_VOICES_DIR: installed.dir } },
  );
  const lines = r.stdout.split("\n").filter((l) => !l.includes("Missing phoneme"));
  if (r.code !== 0) throw new CvError("Piper generation failed.", (r.stderr || lines.join("\n")).slice(-600));
  lines.filter((l) => l.trim()).forEach((l) => log.debug(l));
  const warnings = lines.filter((l) => l.startsWith("WARNING"));
  warnings.forEach((w) => log.warn(w.replace(/^WARNING:\s*/, "")));

  const m = readJson(manifest);
  const overflow = m.segments.filter((s) => s.end > timeline.totalSec + 0.01);
  if (overflow.length) {
    throw new CvError(
      `Narration overruns the video: ${overflow.map((s) => `${s.id} ends at ${s.end}s`).join(", ")} (video is ${timeline.totalSec}s).`,
      "Shorten the text, raise audio.voice.speed slightly, or lengthen the scene. Nothing was cut automatically.",
    );
  }
  cache.record(paths.cache, "voice", hash, { voice: installed.name, segments: m.segments.length });
  return { skipped: false, manifest: m, voice: installed, speaker, srt, warnings, attribution: CATALOG()[installed.name]?.attribution ?? "" };
}

/** Empty manifest so that the Remotion engine always compiles, with or without narration. */
export function writeEmptyManifest(paths) {
  const file = path.join(paths.generated, "voiceover.manifest.json");
  if (!exists(file)) writeJson(file, { voice: null, segments: [], subtitles: [] });
}
