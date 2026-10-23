// Project lifecycle: init (copy the engine template), storyboard scaffold, doctor, clean.
import fs from "node:fs";
import path from "node:path";
import { memorySnapshotText } from "./doctor-format.mjs";
import { scaleDurations } from "./storyboard.mjs";
import { SKILL_DIR, CvError, IS_WIN, ensureDir, exists, findFfTool, findPiperPython, findRemotionCli, findSystemPython, readJson, run, runSync, writeJson } from "./util.mjs";
import { listVoices } from "./voice.mjs";

const TEMPLATE = path.join(SKILL_DIR, "templates", "remotion-project");

function copyTree(src, dest, { overwrite = false, skip = [] } = {}) {
  const written = [];
  ensureDir(dest);
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.includes(e.name)) continue;
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) written.push(...copyTree(s, d, { overwrite, skip }));
    else if (overwrite || !exists(d)) {
      fs.copyFileSync(s, d);
      written.push(d);
    }
  }
  return written;
}

/**
 * Create (or complete) a video project in `dir`: engine sources, package.json, video/ folder.
 * Existing files are never overwritten unless `upgrade` is set (only src/engine, components, scenes, design).
 */
export async function initProject({ dir, template = "ad", install = true, upgrade = false, log }) {
  ensureDir(dir);
  const pkgPath = path.join(dir, "package.json");
  const fresh = !exists(pkgPath);
  const written = copyTree(TEMPLATE, dir, { overwrite: false, skip: ["generated", "video", "public"] });
  if (upgrade) {
    for (const sub of ["src/engine", "src/components", "src/scenes", "src/design"]) {
      copyTree(path.join(TEMPLATE, sub), path.join(dir, sub), { overwrite: true });
    }
  }
  ensureDir(path.join(dir, "public"));
  ensureDir(path.join(dir, "src", "generated"));
  const sbFile = path.join(dir, "video", "storyboard.json");
  if (!exists(sbFile)) {
    const tpl = path.join(SKILL_DIR, "templates", "storyboards", `${template}.json`);
    if (!exists(tpl)) {
      throw new CvError(`Unknown storyboard template "${template}".`, `Available: ${fs.readdirSync(path.join(SKILL_DIR, "templates", "storyboards")).map((f) => f.replace(/\.json$/, "")).join(", ")}`);
    }
    ensureDir(path.dirname(sbFile));
    fs.copyFileSync(tpl, sbFile);
    written.push(sbFile);
  }
  const themeFile = path.join(dir, "video", "theme.json");
  if (!exists(themeFile)) writeJson(themeFile, { preset: "midnight-blue" });
  if (!exists(path.join(dir, "cv.config.json"))) writeJson(path.join(dir, "cv.config.json"), { commercialUse: true });
  log.info(`[init] ${written.length} file(s) written in ${dir}${fresh ? "" : " (existing package.json kept)"}`);

  if (install && !exists(path.join(dir, "node_modules", "remotion"))) {
    log.info("[init] npm install (downloads Remotion and Chrome headless shell: a few minutes, ~700 MB on disk)");
    const npm = IS_WIN ? "npm.cmd" : "npm";
    const r = IS_WIN
      ? await run("cmd.exe", ["/d", "/s", "/c", "npm install --no-audit --no-fund"], { cwd: dir, stream: true })
      : await run(npm, ["install", "--no-audit", "--no-fund"], { cwd: dir, stream: true });
    if (r.code !== 0) throw new CvError("npm install failed.", r.stderr.slice(-400));
  }
  return { written };
}

/** Copy a template storyboard and scale it to the requested duration. */
export function scaffoldStoryboard({ template, duration, format, lang, brand, out }) {
  const tpl = path.join(SKILL_DIR, "templates", "storyboards", `${template}.json`);
  if (!exists(tpl)) throw new CvError(`Unknown storyboard template "${template}".`);
  const sb = readJson(tpl);
  if (duration) scaleDurations(sb, duration);
  if (format) sb.video.format = format;
  if (lang) sb.meta.lang = lang;
  if (brand) sb.meta.brand = brand;
  writeJson(out, sb);
  return sb;
}

export function listTemplates() {
  const dir = path.join(SKILL_DIR, "templates", "storyboards");
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => {
    const sb = readJson(path.join(dir, f));
    return { name: f.replace(/\.json$/, ""), duration: sb.video?.duration, scenes: sb.scenes.length, description: sb.meta?.templateDescription ?? "" };
  });
}

/** Everything the pipeline depends on, with a verdict and a fix for each missing piece. */
export async function doctor({ projectRoot, cfg, log }) {
  const checks = [];
  const add = (name, ok, detail, fix = "", level = ok ? "ok" : "fail") => checks.push({ name, ok, level, detail, fix });

  const major = Number(process.versions.node.split(".")[0]);
  add("Node.js >= 20", major >= 20, `v${process.versions.node}`, "Install Node.js 20+ (https://nodejs.org).");
  const npmv = runSync(IS_WIN ? "npm.cmd" : "npm", ["--version"], { shell: IS_WIN });
  add("npm", npmv.code === 0, npmv.stdout.trim() || "not found", "Install Node.js (includes npm).");
  add("Remotion in project", !!findRemotionCli(projectRoot), findRemotionCli(projectRoot) ? "installed" : "missing", "Run `cv init` (or `npm install`) in the project folder.");
  const ffm = findFfTool("ffmpeg", projectRoot);
  add("FFmpeg", !!ffm, ffm ? `${ffm.source} binary` : "missing", "Run `npm install` (Remotion bundles ffmpeg) or install FFmpeg.");
  const mem = memorySnapshotText();
  add("Memory", mem.free >= cfg.render.memory.minStartGB, mem.text, `Close heavy applications: renders need about ${cfg.render.memory.minStartGB} GB free.`, mem.free >= cfg.render.memory.minStartGB ? "ok" : "warn");

  const sys = findSystemPython();
  add("Python 3 (voice, optional)", !!sys, sys ? sys.version : "not found", "Only needed for narration. Windows: `winget install Python.Python.3.12`.", sys ? "ok" : "warn");
  const py = findPiperPython(projectRoot);
  add("Piper TTS (voice, optional)", !!py, py ? py : "not installed", "Run `cv voice setup --yes` after asking the user (creates a venv, ~170 MB).", py ? "ok" : "warn");
  const voices = listVoices(projectRoot);
  add("Voice models (optional)", voices.length > 0, voices.length ? voices.map((v) => `${v.name} [${v.commercial}]`).join(", ") : "none", "Run `cv voice setup --yes --voices fr_FR-upmc-medium`.", voices.length ? "ok" : "warn");

  let pw = false;
  try {
    pw = !!(await import("node:module")).createRequire(path.join(projectRoot, "package.json")).resolve("playwright-core");
  } catch {
    /* optional */
  }
  add("Playwright (captures, optional)", pw, pw ? "playwright-core found" : "not installed (feature off)", "Only for real interface captures: `npm install --save-dev playwright-core` in the project.", pw ? "ok" : "warn");
  add("Storyboard", exists(path.join(projectRoot, cfg.paths.video, "storyboard.json")), path.join(cfg.paths.video, "storyboard.json"), "Run `cv init` or `cv storyboard scaffold`.", exists(path.join(projectRoot, cfg.paths.video, "storyboard.json")) ? "ok" : "warn");
  return checks;
}

export function cleanProject({ projectRoot, cfg, what }) {
  const removed = [];
  const cache = path.join(projectRoot, cfg.paths.cache);
  const targets = what === "all" ? ["render", "reports", "stages.json", "narration.json"] : ["render"];
  for (const t of targets) {
    const p = path.join(cache, t);
    if (exists(p)) {
      fs.rmSync(p, { recursive: true, force: true });
      removed.push(p);
    }
  }
  return removed;
}
