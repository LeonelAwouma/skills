import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import * as cache from "../scripts/lib/cache.mjs";
import { hostAllowed, validateCaptures } from "../scripts/lib/capture.mjs";
import { composeMusic } from "../scripts/lib/music.mjs";
import { computeTimeline, validateStoryboard } from "../scripts/lib/storyboard.mjs";
import { SKILL_DIR, readJson } from "../scripts/lib/util.mjs";
import { crc32, readZip, writeZip } from "../scripts/lib/zip.mjs";
import { isExcluded } from "../scripts/package.mjs";

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "cv-test-"));

test("cache: fresh only when hash matches and outputs exist", () => {
  const dir = tmp();
  const out = path.join(dir, "out.txt");
  assert.equal(cache.isFresh(dir, "s", "h1", [out]), false);
  fs.writeFileSync(out, "x");
  cache.record(dir, "s", "h1");
  assert.equal(cache.isFresh(dir, "s", "h1", [out]), true);
  assert.equal(cache.isFresh(dir, "s", "h2", [out]), false, "input changed");
  fs.rmSync(out);
  assert.equal(cache.isFresh(dir, "s", "h1", [out]), false, "output deleted");
});

test("zip: round trip keeps names and bytes, CRC verified", () => {
  const dir = tmp();
  const file = path.join(dir, "a.zip");
  const big = Buffer.from("celeste ".repeat(5000));
  writeZip(file, [{ name: "x/é.txt", data: Buffer.from("héllo") }, { name: "x/big.txt", data: big }, { name: "x/empty", data: Buffer.alloc(0) }]);
  const back = readZip(file);
  assert.deepEqual(back.map((e) => e.name), ["x/é.txt", "x/big.txt", "x/empty"]);
  assert.equal(back[0].data.toString(), "héllo");
  assert.ok(back[1].data.equals(big));
  assert.equal(crc32(Buffer.from("123456789")), 0xcbf43926);
});

test("package: never includes envs, models, caches, outputs", () => {
  for (const bad of ["node_modules/x.js", "templates/remotion-project/node_modules/a", "venv/bin/python", ".venv-piper/x", "voices/a.onnx", "foo/model.onnx", "out/a.mp4", ".cv/stages.json", "x/y.pyc", "a/b.wav", "templates/remotion-project/src/generated/theme.json"]) {
    assert.equal(isExcluded(bad, false), true, bad);
  }
  for (const good of ["SKILL.md", "scripts/cv.mjs", "templates/remotion-project/src/Root.tsx", "config/voices.json", "examples/atelier-lumen/storyboard.json"]) {
    assert.equal(isExcluded(good, false), false, good);
  }
});

test("capture safety: only local or explicitly allowed hosts", () => {
  assert.equal(hostAllowed("http://localhost:3000/x"), true);
  assert.equal(hostAllowed("http://127.0.0.1:8080"), true);
  assert.equal(hostAllowed("https://app.example.com"), false);
  assert.equal(hostAllowed("https://app.example.com", ["app.example.com"]), true);
  assert.equal(hostAllowed("not a url"), false);
});

test("capture: authorization flag, hosts and step rules are enforced", () => {
  const base = { authorized: true, captures: [{ id: "home", url: "http://localhost:3000", steps: [{ do: "goto" }, { do: "shot", name: "a" }] }] };
  assert.deepEqual(validateCaptures(base), []);
  assert.match(validateCaptures({ ...base, authorized: false }).join(), /authorized/);
  assert.match(validateCaptures({ authorized: true, captures: [{ id: "x", url: "https://evil.test" }] }).join(), /host not allowed/);
  assert.match(validateCaptures({ authorized: true, captures: [{ id: "x", url: "http://localhost", steps: [{ do: "type", selector: "#q" }] }] }).join(), /text/);
  assert.match(validateCaptures({ authorized: true, captures: [{ id: "x", url: "http://localhost", steps: [{ do: "hack" }] }] }).join(), /one of/);
});

test("voice catalogue: every voice states licence, commercial status and attribution coherently", () => {
  const { voices } = readJson(path.join(SKILL_DIR, "config", "voices.json"));
  const statuses = ["allowed", "allowed-with-attribution", "unclear", "restricted"];
  for (const [name, v] of Object.entries(voices)) {
    assert.ok(v.datasetLicense, `${name}: licence`);
    assert.ok(statuses.includes(v.commercial), `${name}: status`);
    if (v.commercial === "allowed-with-attribution") assert.ok(v.attribution?.length > 10, `${name}: attribution text`);
  }
  assert.equal(voices["fr_FR-tom-medium"].commercial, "unclear", "AGPL voice must not be cleared");
});

test("theme presets define every colour the engine needs", () => {
  const need = ["navy950", "navy900", "navy800", "navy700", "ink", "royal", "blue", "sky", "cyan", "ice", "mist", "white", "slate", "line", "warn", "danger", "ok"];
  const dir = path.join(SKILL_DIR, "config", "themes");
  const presets = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  assert.ok(presets.length >= 3);
  for (const f of presets) {
    const t = readJson(path.join(dir, f));
    for (const k of need) assert.match(t.colors[k] ?? "", /^#[0-9a-fA-F]{6}$/, `${f}: ${k}`);
    assert.ok(t.fonts.display && t.fonts.ui, `${f}: fonts`);
  }
});

test("music composer: valid WAV, right length, no clipping, deterministic", () => {
  const sb = validateStoryboard(
    {
      version: 1,
      meta: { brand: "T" },
      video: { duration: 7 },
      audio: { music: { mode: "synth", style: "tech-uplift" } },
      scenes: [
        { id: "a", type: "kinetic", duration: 3, lines: ["x"] },
        { id: "b", type: "cta", duration: 4, lines: ["y"], transition: { type: "bloom" }, contacts: [{ kind: "email", value: "a@b.c" }] },
      ],
    },
    {},
  ).storyboard;
  const tl = computeTimeline(sb);
  const f1 = path.join(tmp(), "m1.wav");
  const f2 = path.join(tmp(), "m2.wav");
  const r = composeMusic(sb, tl, f1);
  composeMusic(sb, tl, f2);
  const buf = fs.readFileSync(f1);
  assert.equal(buf.toString("ascii", 0, 4), "RIFF");
  assert.equal(buf.toString("ascii", 8, 12), "WAVE");
  assert.equal(buf.readUInt32LE(24), 44100);
  assert.equal(buf.readUInt16LE(22), 2);
  assert.equal(Math.round((buf.length - 44) / 4 / 44100), 7);
  assert.equal(r.clipped, 0);
  assert.ok(fs.readFileSync(f2).equals(buf), "same input, same audio (cacheable)");
});
