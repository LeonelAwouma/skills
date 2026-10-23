// Shared helpers: paths, JSON, config, logging, process execution, tool discovery.
// No third-party dependency: this file must run with a bare Node >= 20.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const SKILL_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const IS_WIN = process.platform === "win32";

/** Error with a human readable hint; the CLI prints `message` + `hint` and exits non-zero. */
export class CvError extends Error {
  constructor(message, hint = "", code = 1) {
    super(message);
    this.name = "CvError";
    this.hint = hint;
    this.exitCode = code;
  }
}

// ---------------------------------------------------------------- files
export const exists = (p) => fs.existsSync(p);
export const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });
export const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    throw new CvError(`Cannot read JSON file ${p}: ${e.message}`, "Check the file exists and is valid JSON.");
  }
};
export const writeJson = (p, data) => {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n", "utf8");
};
export const toPosix = (p) => p.split(path.sep).join("/");

export function deepMerge(base, extra) {
  if (Array.isArray(base) || Array.isArray(extra) || typeof base !== "object" || typeof extra !== "object" || !base || !extra) {
    return extra === undefined ? base : extra;
  }
  const out = { ...base };
  for (const [k, v] of Object.entries(extra)) out[k] = k in base ? deepMerge(base[k], v) : v;
  return out;
}

export const sha = (value) =>
  crypto
    .createHash("sha256")
    .update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value))
    .digest("hex")
    .slice(0, 16);

export function hashFile(p) {
  return exists(p) ? crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16) : "missing";
}

// ---------------------------------------------------------------- project + config
export function resolveProject(dir) {
  return path.resolve(dir || process.cwd());
}

/** defaults.json < <project>/cv.config.json. Paths in the result are relative to the project. */
export function loadConfig(projectRoot) {
  const defaults = readJson(path.join(SKILL_DIR, "config", "defaults.json"));
  const local = path.join(projectRoot, "cv.config.json");
  return exists(local) ? deepMerge(defaults, readJson(local)) : defaults;
}

export function projectPaths(projectRoot, cfg) {
  const p = (rel) => path.join(projectRoot, rel);
  return {
    root: projectRoot,
    video: p(cfg.paths.video),
    storyboard: path.join(p(cfg.paths.video), "storyboard.json"),
    theme: path.join(p(cfg.paths.video), "theme.json"),
    pronunciation: path.join(p(cfg.paths.video), "pronunciation.json"),
    public: p(cfg.paths.public),
    generated: p(cfg.paths.generated),
    cache: p(cfg.paths.cache),
    out: p(cfg.paths.out),
    voiceDir: path.join(p(cfg.paths.public), "audio", "voiceover"),
    musicFile: path.join(p(cfg.paths.public), "audio", "music.wav"),
  };
}

export const cvHome = () => process.env.CV_HOME || path.join(os.homedir(), ".celeste-video");

// ---------------------------------------------------------------- logging
export function createLogger(projectRoot, cfg) {
  const dir = path.join(projectRoot, cfg?.paths?.cache ?? ".cv", "logs");
  const file = path.join(dir, "cv.log");
  const stamp = () => new Date().toISOString();
  const write = (level, msg) => {
    try {
      ensureDir(dir);
      fs.appendFileSync(file, `${stamp()} [${level}] ${msg}\n`);
    } catch {
      /* logging must never break the pipeline */
    }
  };
  return {
    file,
    info: (m) => {
      console.log(m);
      write("info", m);
    },
    warn: (m) => {
      console.warn(`WARNING: ${m}`);
      write("warn", m);
    },
    error: (m) => {
      console.error(`ERROR: ${m}`);
      write("error", m);
    },
    debug: (m) => write("debug", m),
  };
}

// ---------------------------------------------------------------- processes
/** Run a command, capture output, optionally stream it. Never uses a shell. */
export function run(cmd, args, { cwd, env, stream = false, input, onSpawn } = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      env: { ...process.env, PYTHONUTF8: "1", ...env },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });
    onSpawn?.(child);
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
      if (stream) process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      stderr += d;
      if (stream) process.stderr.write(d);
    });
    child.on("error", (e) => resolve({ code: -1, stdout, stderr: stderr + String(e.message) }));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    if (input) child.stdin.end(input);
    else child.stdin.end();
  });
}

export function runSync(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", windowsHide: true, ...opts });
  return { code: r.status ?? -1, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

/** Kill only a process tree that THIS tool started. */
export function killTree(child) {
  if (!child?.pid) return;
  if (IS_WIN) spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true });
  else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }
}

// ---------------------------------------------------------------- tool discovery
export function findNode() {
  return process.execPath;
}

export function findRemotionCli(projectRoot) {
  const p = path.join(projectRoot, "node_modules", "@remotion", "cli", "remotion-cli.js");
  return exists(p) ? p : null;
}

/** {cmd, prefix} so that `[cmd, ...prefix, ...args]` runs ffmpeg/ffprobe. System binary first, Remotion's bundled one second. */
export function findFfTool(tool, projectRoot) {
  const sys = runSync(tool, ["-version"]);
  if (sys.code === 0) return { cmd: tool, prefix: [], source: "system" };
  const cli = findRemotionCli(projectRoot);
  if (cli) return { cmd: findNode(), prefix: [cli, tool], source: "remotion" };
  return null;
}

export function pythonCandidates(projectRoot) {
  const exe = IS_WIN ? ["Scripts", "python.exe"] : ["bin", "python"];
  return [
    process.env.CV_PYTHON,
    path.join(projectRoot, ".venv-piper", ...exe),
    path.join(cvHome(), "venv", ...exe),
  ].filter(Boolean);
}

export function findPiperPython(projectRoot) {
  for (const py of pythonCandidates(projectRoot)) {
    if (!exists(py)) continue;
    const r = runSync(py, ["-c", "import piper; print('ok')"]);
    if (r.code === 0) return py;
  }
  return null;
}

export function findSystemPython() {
  const tries = IS_WIN ? [["py", ["-3"]], ["python", []]] : [["python3", []], ["python", []]];
  for (const [cmd, pre] of tries) {
    const r = runSync(cmd, [...pre, "--version"]);
    if (r.code === 0) return { cmd, pre, version: (r.stdout || r.stderr).trim() };
  }
  return null;
}

export function voiceDirs(projectRoot) {
  return [process.env.CV_VOICES_DIR, path.join(projectRoot, "voices"), path.join(cvHome(), "voices")].filter(Boolean);
}

export function findVoicesDir(projectRoot) {
  return voiceDirs(projectRoot).find((d) => exists(d) && fs.readdirSync(d).some((f) => f.endsWith(".onnx"))) ?? null;
}
