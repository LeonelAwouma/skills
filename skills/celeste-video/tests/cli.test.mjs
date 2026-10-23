import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { SKILL_DIR } from "../scripts/lib/util.mjs";

const CV = path.join(SKILL_DIR, "scripts", "cv.mjs");
const run = (args, cwd) => spawnSync(process.execPath, [CV, ...args], { cwd, encoding: "utf8" });
const project = () => fs.mkdtempSync(path.join(os.tmpdir(), "cv-proj-"));

test("help exits 0, unknown command exits 2", () => {
  const dir = project();
  assert.equal(run(["help"], dir).status, 0);
  const bad = run(["frobnicate"], dir);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /Unknown command/);
});

test("storyboard scaffold writes a valid file at the requested duration, refuses to overwrite", () => {
  const dir = project();
  const out = path.join(dir, "video", "storyboard.json");
  const r = run(["storyboard", "scaffold", "--template", "ad", "--duration", "20", "--brand", "Atelier Lumen", "--lang", "fr"], dir);
  assert.equal(r.status, 0, r.stderr);
  const sb = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(sb.meta.brand, "Atelier Lumen");
  assert.ok(Math.abs(sb.scenes.reduce((a, s) => a + s.duration, 0) - 20) < 0.06);
  const v = run(["storyboard", "validate"], dir);
  assert.equal(v.status, 0, v.stderr + v.stdout);
  assert.match(v.stdout, /valid: 7 scenes/);
  const again = run(["storyboard", "scaffold", "--template", "ad"], dir);
  assert.notEqual(again.status, 0);
  assert.match(again.stderr + again.stdout, /already exists/);
});

test("an invalid storyboard is rejected with actionable errors", () => {
  const dir = project();
  fs.mkdirSync(path.join(dir, "video"));
  fs.writeFileSync(path.join(dir, "video", "storyboard.json"), JSON.stringify({ version: 1, meta: {}, scenes: [{ id: "A B", type: "x", duration: 1 }] }));
  const r = run(["storyboard", "validate"], dir);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /meta\.brand/);
  assert.match(r.stderr, /unknown "x"/);
});

test("render without Remotion installed fails with a clear fix and starts nothing", () => {
  const dir = project();
  run(["storyboard", "scaffold", "--template", "ad"], dir);
  const r = run(["render"], dir);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Remotion is not installed/);
});

test("voice generation without Piper explains how to set it up", () => {
  const dir = project();
  run(["storyboard", "scaffold", "--template", "ad"], dir);
  const r = spawnSync(process.execPath, [CV, "voice", "generate"], { cwd: dir, encoding: "utf8", env: { ...process.env, CV_PYTHON: path.join(dir, "no-python"), CV_HOME: path.join(dir, "nohome") } });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Piper TTS is not installed/);
  assert.match(r.stderr, /cv voice setup --yes/);
});

test("voice setup refuses to install anything without --yes", () => {
  const dir = project();
  const r = spawnSync(process.execPath, [CV, "voice", "setup"], { cwd: dir, encoding: "utf8", env: { ...process.env, CV_HOME: path.join(dir, "nohome") } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /needs confirmation/);
  assert.equal(fs.existsSync(path.join(dir, "nohome")), false, "nothing was created");
});

test("the skill is portable: no absolute path of the author's machine inside shipped sources", () => {
  const bad = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (["node_modules", "__pycache__", ".cv", "tests"].includes(e.name)) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(mjs|ts|tsx|json|md|py|ps1|sh)$/.test(e.name) && !e.name.startsWith("package-lock")) {
        const txt = fs.readFileSync(p, "utf8");
        if (/C:\\Users\\MARCOM|C:\/Users\/MARCOM|\/Users\/marcom/i.test(txt)) bad.push(path.relative(SKILL_DIR, p));
      }
    }
  };
  walk(SKILL_DIR);
  assert.deepEqual(bad, []);
});
