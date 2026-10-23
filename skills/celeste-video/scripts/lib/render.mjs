// Safe MP4 rendering: memory preflight, limited concurrency, optional chunked render with
// resume, bounded retries, and a mandatory verification of the produced file.
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { chunkRanges, planRender, snapshot, watchMemory } from "./memory.mjs";
import { CvError, ensureDir, exists, findFfTool, findNode, findRemotionCli, killTree, run, writeJson } from "./util.mjs";
import { verifyVideo } from "./verify.mjs";

const OOM_PATTERNS = [/out of memory/i, /failed to allocate/i, /ERR_OUT_OF_MEMORY/i, /Page crashed/i, /Target closed/i, /3221225477/, /heap out of memory/i];

export function explainFailure(output, killedForMemory) {
  if (killedForMemory) {
    return "The render was stopped by cv because free memory fell under the safety floor. Only the render started by cv was stopped; other applications were left alone.";
  }
  if (OOM_PATTERNS.some((re) => re.test(output))) {
    return "The renderer ran out of memory. Close other heavy applications, then retry (cv will use concurrency 1 and chunked rendering).";
  }
  const tail = output.trim().split("\n").slice(-6).join("\n");
  return `The renderer failed. Last output:\n${tail}`;
}

const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });

/** One Remotion CLI invocation, supervised by the memory watcher. Never touches processes we did not start. */
async function remotionRender({ projectRoot, cli, args, memCfg, log }) {
  let child;
  let killedForMemory = false;
  const stop = watchMemory(memCfg, (free) => {
    killedForMemory = true;
    log.warn(`Free memory ${free.toFixed(2)} GB < floor ${memCfg.hardFloorGB} GB: stopping the render started by cv.`);
    killTree(child);
  });
  const r = await run(findNode(), [cli, ...args], { cwd: projectRoot, onSpawn: (c) => (child = c) });
  stop();
  return { ok: r.code === 0 && !killedForMemory, killedForMemory, output: r.stdout + r.stderr };
}

function baseArgs({ entry, comp, out, props, codec, crf, concurrency, port, frames, muted }) {
  const a = ["render", entry, comp, out, `--props=${JSON.stringify(props)}`, `--codec=${codec}`, `--crf=${crf}`, `--concurrency=${concurrency}`, `--port=${port}`, "--log=warn", "--overwrite"];
  if (frames) a.push(`--frames=${frames[0]}-${frames[1]}`);
  if (muted) a.push("--muted");
  return a;
}

/**
 * @param {object} o
 * @param {string} o.projectRoot @param {object} o.cfg @param {object} o.log
 * @param {string} o.out absolute output path
 * @param {{width:number,height:number,fps:number,totalFrames:number}} o.meta
 * @param {object} o.props composition props
 * @param {string} o.inputHash identifies the content (chunk resume key)
 * @param {[number,number]=} o.frames inclusive frame range (short test exports)
 * @param {boolean} o.expectAudio
 */
export async function safeRender(o) {
  const { projectRoot, cfg, log, out, meta, props, inputHash, frames, expectAudio } = o;
  const cli = findRemotionCli(projectRoot);
  if (!cli) throw new CvError("Remotion is not installed in this project.", "Run `npm install` in the project folder (or `cv init`).");
  const r = cfg.render;
  const frameCount = frames ? frames[1] - frames[0] + 1 : meta.totalFrames;

  let attempt = 0;
  let lastReason = "";
  const history = [];
  while (attempt < r.maxAttempts) {
    attempt++;
    const snap = snapshot();
    const plan = planRender(snap, r.memory, {
      width: meta.width,
      height: meta.height,
      frames: frameCount,
      requestedConcurrency: attempt === 1 ? o.concurrency ?? "auto" : 1,
      forceChunked: attempt > 1 || !!o.chunked,
    });
    log.info(`[render] attempt ${attempt}/${r.maxAttempts}: ${snap.freeGB.toFixed(1)} GB free of ${snap.totalGB.toFixed(1)} GB -> verdict "${plan.verdict}", concurrency ${plan.concurrency}, ${plan.chunked ? `chunked (${plan.chunkFrames} frames)` : "single pass"}`);
    plan.messages.forEach((m) => log.warn(m));
    if (plan.verdict === "insufficient" && !o.force) {
      throw new CvError(
        "Not enough free memory to render safely, nothing was started.",
        `${plan.messages.join(" ")} Re-run with --force to try anyway at concurrency 1.`,
        3,
      );
    }

    ensureDir(path.dirname(out));
    const port = await freePort();
    const common = { projectRoot, cli, memCfg: r.memory, log };
    const params = { entry: "src/index.ts", comp: r.composition, props, codec: r.codec, crf: r.crf, concurrency: plan.concurrency, port };
    let result;
    if (!plan.chunked) {
      result = await remotionRender({ ...common, args: baseArgs({ ...params, out, frames }) });
    } else {
      result = await chunkedRender({ ...common, params, out, frames, frameCount, plan, inputHash, meta, log });
    }
    history.push({ attempt, plan: { verdict: plan.verdict, concurrency: plan.concurrency, chunked: plan.chunked }, ok: result.ok });
    if (!result.ok) {
      lastReason = explainFailure(result.output, result.killedForMemory);
      log.error(`[render] attempt ${attempt} failed. ${lastReason}`);
      continue; // next attempt is more conservative; bounded by maxAttempts
    }

    const expect = { width: meta.width, height: meta.height, fps: meta.fps, durationSec: frameCount / meta.fps, expectAudio, deep: o.deep };
    const check = await verifyVideo(projectRoot, out, expect);
    const report = { out, expect, check, history, at: new Date().toISOString() };
    writeJson(path.join(projectRoot, cfg.paths.cache, "reports", `${path.basename(out)}.json`), report);
    if (!check.ok) {
      lastReason = `Verification failed: ${check.problems.join("; ")}`;
      log.error(`[render] ${lastReason}`);
      continue;
    }
    if (result.cleanup) fs.rmSync(result.cleanup, { recursive: true, force: true }); // chunks are only kept when something failed
    log.info(`[render] verified: ${check.info.video.width}x${check.info.video.height} ${check.info.video.codec}${check.info.audio ? ` + ${check.info.audio.codec}` : ""}, ${check.info.duration.toFixed(2)} s, ${(check.info.size / 1e6).toFixed(1)} MB${check.info.levels ? `, peak ${check.info.levels.maxDb} dB` : ""}`);
    return report;
  }
  throw new CvError(`Render failed after ${attempt} attempt(s), not retrying further.`, lastReason, 4);
}

async function chunkedRender({ projectRoot, cli, memCfg, log, params, out, frames, frameCount, plan, inputHash, meta }) {
  const base = frames ? frames[0] : 0;
  const dir = path.join(projectRoot, ".cv", "render", inputHash + (frames ? `-${frames[0]}-${frames[1]}` : ""));
  ensureDir(dir);
  const ranges = chunkRanges(frameCount, plan.chunkFrames).map(([a, b]) => [a + base, b + base]);
  const files = [];
  for (let i = 0; i < ranges.length; i++) {
    const file = path.join(dir, `chunk-${String(i).padStart(3, "0")}.mp4`);
    files.push(file);
    if (exists(file)) {
      log.info(`[render] chunk ${i + 1}/${ranges.length} already rendered, reused`);
      continue;
    }
    const part = file + ".part.mp4";
    log.info(`[render] chunk ${i + 1}/${ranges.length} (frames ${ranges[i][0]}-${ranges[i][1]})`);
    const res = await remotionRender({ projectRoot, cli, memCfg, log, args: baseArgs({ ...params, out: part, frames: ranges[i], muted: true }) });
    if (!res.ok || !exists(part)) {
      return { ...res, ok: false, output: `${res.output}\nResume: re-run the same command, finished chunks are kept in ${dir}` };
    }
    fs.renameSync(part, file);
  }
  const audio = path.join(dir, "audio.aac");
  if (!exists(audio)) {
    log.info("[render] audio track");
    const res = await remotionRender({ projectRoot, cli, memCfg, log, args: baseArgs({ ...params, out: audio, frames, codec: "aac" }).filter((a) => !a.startsWith("--crf")) });
    if (!res.ok || !exists(audio)) return { ...res, ok: false };
  }

  const list = path.join(dir, "list.txt");
  fs.writeFileSync(list, files.map((f) => `file '${f.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n"));
  const ffm = findFfTool("ffmpeg", projectRoot);
  if (!ffm) return { ok: false, output: "ffmpeg not available to assemble the chunks" };
  log.info("[render] assembling chunks with ffmpeg");
  const asm = await run(ffm.cmd, [...ffm.prefix, "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", list, "-i", audio, "-map", "0:v:0", "-map", "1:a:0", "-c", "copy", "-shortest", "-movflags", "+faststart", out], { cwd: projectRoot });
  if (asm.code !== 0) return { ok: false, output: asm.stderr };
  void meta;
  return { ok: true, output: "", cleanup: dir };
}
