import assert from "node:assert/strict";
import test from "node:test";
import { chunkRanges, planRender } from "../scripts/lib/memory.mjs";
import { explainFailure } from "../scripts/lib/render.mjs";
import { readJson, SKILL_DIR } from "../scripts/lib/util.mjs";
import path from "node:path";

const mem = readJson(path.join(SKILL_DIR, "config", "defaults.json")).render.memory;
const job = { width: 1080, height: 1920, frames: 900 };

test("plenty of memory: parallel, single pass, never above 4 workers", () => {
  const p = planRender({ freeGB: 12, totalGB: 16, cpus: 16 }, mem, job);
  assert.equal(p.verdict, "ok");
  assert.ok(p.concurrency >= 2 && p.concurrency <= 4);
  assert.equal(p.chunked, false);
});

test("low memory: concurrency 1 and chunked", () => {
  const p = planRender({ freeGB: 1.9, totalGB: 16, cpus: 16 }, mem, job);
  assert.equal(p.verdict, "low");
  assert.equal(p.concurrency, 1);
  assert.equal(p.chunked, true);
  assert.equal(p.chunkFrames, mem.chunkFramesLow);
});

test("insufficient memory is reported, not attempted silently", () => {
  const p = planRender({ freeGB: 0.8, totalGB: 16, cpus: 16 }, mem, job);
  assert.equal(p.verdict, "insufficient");
  assert.equal(p.concurrency, 1);
  assert.ok(p.messages.join(" ").match(/Close heavy applications/));
});

test("requested concurrency is lowered when memory cannot support it", () => {
  const p = planRender({ freeGB: 3.2, totalGB: 16, cpus: 16 }, mem, { ...job, requestedConcurrency: 4 });
  assert.ok(p.concurrency < 4);
  assert.ok(p.messages.some((m) => /lowered/.test(m)));
});

test("small canvases need less memory per worker", () => {
  const big = planRender({ freeGB: 4, totalGB: 16, cpus: 16 }, mem, job);
  const small = planRender({ freeGB: 4, totalGB: 16, cpus: 16 }, mem, { ...job, width: 540, height: 960 });
  assert.ok(small.perWorkerGB < big.perWorkerGB);
});

test("tiny jobs are never chunked", () => {
  const p = planRender({ freeGB: 1.9, totalGB: 16, cpus: 16 }, mem, { ...job, frames: 60 });
  assert.equal(p.chunked, false);
});

test("chunkRanges covers every frame exactly once", () => {
  for (const [frames, size] of [[900, 300], [901, 120], [59, 120], [1, 1]]) {
    const r = chunkRanges(frames, size);
    assert.equal(r[0][0], 0);
    assert.equal(r[r.length - 1][1], frames - 1);
    for (let i = 1; i < r.length; i++) assert.equal(r[i][0], r[i - 1][1] + 1);
  }
});

test("failure explanations are human readable", () => {
  assert.match(explainFailure("", true), /other applications were left alone/);
  assert.match(explainFailure("FATAL: JavaScript heap out of memory", false), /ran out of memory/);
  assert.match(explainFailure("boom\nline2", false), /Last output/);
});
