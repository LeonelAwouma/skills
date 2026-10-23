import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { SKILL_DIR } from "../scripts/lib/util.mjs";
import { applyLexicon, computeTimeline, dimensions, narrationSegments, replaceTokens, scaleDurations, validateStoryboard } from "../scripts/lib/storyboard.mjs";

const load = (name) => JSON.parse(fs.readFileSync(path.join(SKILL_DIR, "templates", "storyboards", `${name}.json`), "utf8"));

test("all shipped storyboard templates are valid", () => {
  for (const name of ["ad", "demo", "explainer"]) {
    const r = validateStoryboard(load(name), {});
    assert.equal(r.ok, true, `${name}: ${r.errors.join("; ")}`);
  }
});

test("{brand} tokens are replaced everywhere", () => {
  const r = validateStoryboard(load("demo"), {});
  assert.match(r.storyboard.scenes[0].lines[0], /Votre Application/);
  const o = { a: ["x {brand}", { b: "{brand}!" }], c: "{other}" };
  replaceTokens(o, { brand: "Acme" });
  assert.deepEqual(o, { a: ["x Acme", { b: "Acme!" }], c: "{other}" });
});

test("rejects unknown types, duplicate ids, bad markers, wrong total", () => {
  const sb = load("ad");
  sb.scenes[1].type = "nope";
  sb.scenes[2].id = sb.scenes[3].id;
  sb.scenes[4].lines = ["broken *marker"];
  sb.video.duration = 99;
  const r = validateStoryboard(sb, {});
  assert.equal(r.ok, false);
  const text = r.errors.join("\n");
  assert.match(text, /unknown "nope"/);
  assert.match(text, /duplicate/);
  assert.match(text, /unbalanced/);
  assert.match(text, /does not match the sum/);
});

test("licence is mandatory for a provided music file", () => {
  const sb = load("ad");
  sb.audio.music = { mode: "file", file: "audio/x.mp3" };
  const r = validateStoryboard(sb, {});
  assert.equal(r.ok, false);
  assert.match(r.errors.join("\n"), /license/);
});

test("first scene transition is forced to cut", () => {
  const sb = load("ad");
  sb.scenes[0].transition = { type: "bloom" };
  const r = validateStoryboard(sb, {});
  assert.equal(r.storyboard.scenes[0].transition.type, "cut");
  assert.ok(r.warnings.some((w) => /forced to "cut"/.test(w)));
});

test("timeline: cumulative rounding never drifts", () => {
  const sb = validateStoryboard(load("ad"), {}).storyboard;
  sb.video.fps = 29.97 > 30 ? 30 : 30;
  const tl = computeTimeline(sb);
  assert.equal(tl.totalFrames, 900);
  let end = 0;
  for (const s of tl.scenes) {
    assert.equal(s.startFrame, end, "scenes are contiguous");
    end = s.endFrame;
  }
  assert.equal(end, tl.totalFrames);
  assert.equal(tl.scenes[0].lead, 0);
  assert.equal(tl.scenes[1].lead, 14, "bloom lead");
});

test("scaleDurations hits the requested total exactly", () => {
  for (const target of [20, 30, 37.5, 45]) {
    const sb = scaleDurations(validateStoryboard(load("ad"), {}).storyboard, target);
    const sum = sb.scenes.reduce((a, s) => a + s.duration, 0);
    assert.ok(Math.abs(sum - target) < 0.051, `${target} -> ${sum}`);
  }
});

test("dimensions: even sizes and right ratios", () => {
  assert.deepEqual(dimensions("9:16", 1080), { width: 1080, height: 1920 });
  assert.deepEqual(dimensions("16:9", 1080), { width: 1920, height: 1080 });
  assert.deepEqual(dimensions("1:1", 1080), { width: 1080, height: 1080 });
  const d = dimensions("9:16", 540);
  assert.equal(d.width % 2 + d.height % 2, 0);
});

test("lexicon replaces whole words only", () => {
  const lex = { logiciels: "[[ L ]]" };
  assert.equal(applyLexicon("des logiciels et logicielsX", lex), "des [[ L ]] et logicielsX");
  assert.equal(applyLexicon("Logiciels.", lex), "[[ L ]].");
});

test("narration segments are placed on the global timeline", () => {
  const sb = validateStoryboard(load("ad"), {}).storyboard;
  const tl = computeTimeline(sb);
  const segs = narrationSegments(sb, tl, { plateformes: "[[ P ]]" });
  assert.equal(segs.length, 8);
  assert.equal(segs[0].start, 0.2);
  assert.equal(segs[1].start, 3.1);
  assert.equal(segs[2].start, 6.6); // scene "marque" starts at 6 s, narration at 0.6 s
  assert.ok(segs.every((s, i) => i === 0 || s.start > segs[i - 1].start), "strictly increasing");
  assert.ok(segs.every((s) => /^\d\d-/.test(s.id)));
});
