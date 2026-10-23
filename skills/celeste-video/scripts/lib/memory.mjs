// Memory-aware render planning. Pure functions (easy to unit test) + a small live sampler.
import os from "node:os";

const GB = 1024 ** 3;

export function snapshot() {
  return { freeGB: os.freemem() / GB, totalGB: os.totalmem() / GB, cpus: os.cpus().length };
}

/**
 * Decide how to render given the memory that is free NOW.
 * Never optimistic: a render that dies at 90 % wastes more time than a slower safe one.
 *
 * @param {{freeGB:number,totalGB:number,cpus:number}} snap
 * @param {object} cfg render.memory section of the config
 * @param {{width:number,height:number,frames:number,requestedConcurrency?:number|"auto",forceChunked?:boolean}} job
 */
export function planRender(snap, cfg, job) {
  const mem = cfg;
  const megapixels = (job.width * job.height) / 1e6;
  // 1080x1920 ~ 2.07 MP is the reference the per-worker figure was set for.
  const perWorker = mem.perWorkerGB * Math.max(0.5, megapixels / 2.07);
  const usable = snap.freeGB - mem.baseGB;
  const messages = [];

  let concurrency = Math.floor(usable / perWorker);
  concurrency = Math.max(1, Math.min(concurrency, Math.floor(snap.cpus / 2) || 1, 4));
  if (job.requestedConcurrency && job.requestedConcurrency !== "auto") {
    const asked = Number(job.requestedConcurrency);
    if (asked > concurrency) messages.push(`Requested concurrency ${asked} lowered to ${concurrency} (free memory ${snap.freeGB.toFixed(1)} GB).`);
    concurrency = Math.max(1, Math.min(asked, concurrency));
  }

  let verdict = "ok";
  let chunked = !!job.forceChunked;
  // insufficient: under minStartGB; low: not enough for a comfortable worker on top of the base; ok otherwise.
  if (snap.freeGB < mem.minStartGB) {
    verdict = "insufficient";
    concurrency = 1;
    chunked = true;
    messages.push(
      `Only ${snap.freeGB.toFixed(1)} GB free: below the ${mem.minStartGB.toFixed(1)} GB minimum to start a render. Close heavy applications (browser tabs, other renders) and retry.`,
    );
  } else if (snap.freeGB < mem.minStartGB + perWorker) {
    verdict = "low";
    concurrency = 1;
    chunked = true;
    messages.push(`Low memory (${snap.freeGB.toFixed(1)} GB free): concurrency 1 and chunked rendering.`);
  }

  const chunkFrames = verdict === "ok" ? mem.chunkFramesNormal : mem.chunkFramesLow;
  if (chunked && job.frames <= chunkFrames) chunked = false; // not worth splitting a tiny job
  return { verdict, concurrency, chunked, chunkFrames, perWorkerGB: perWorker, messages };
}

/** Split [0, frames) into inclusive [start, end] ranges of at most `size` frames. */
export function chunkRanges(frames, size) {
  const out = [];
  for (let start = 0; start < frames; start += size) out.push([start, Math.min(frames, start + size) - 1]);
  return out;
}

/** Live sampler: calls onLow(freeGB) once when free memory drops under the hard floor. */
export function watchMemory({ hardFloorGB, pollSeconds }, onLow) {
  let fired = false;
  const timer = setInterval(() => {
    const free = os.freemem() / GB;
    if (!fired && free < hardFloorGB) {
      fired = true;
      onLow(free);
    }
  }, Math.max(1, pollSeconds) * 1000);
  timer.unref?.();
  return () => clearInterval(timer);
}
