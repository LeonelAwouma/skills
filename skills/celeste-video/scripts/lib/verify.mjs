// Output verification. An export is never "successful" until this passes.
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { CvError, exists, findFfTool, run, ensureDir } from "./util.mjs";

async function ff(tool, projectRoot, args) {
  const t = findFfTool(tool, projectRoot);
  if (!t) throw new CvError(`${tool} not found`, "Install FFmpeg, or run `npm install` in the project (Remotion bundles ffmpeg/ffprobe).");
  return run(t.cmd, [...t.prefix, ...args], { cwd: projectRoot });
}

/** ffprobe -> {video, audio, duration, size}. */
export async function probe(projectRoot, file) {
  if (!exists(file)) throw new CvError(`Output file not found: ${file}`);
  const r = await ff("ffprobe", projectRoot, ["-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,duration,nb_frames", "-show_entries", "format=duration,size", "-of", "json", file]);
  if (r.code !== 0) throw new CvError(`ffprobe failed on ${file}`, r.stderr.slice(-400));
  const data = JSON.parse(r.stdout);
  const video = data.streams.find((s) => s.codec_type === "video") ?? null;
  const audio = data.streams.find((s) => s.codec_type === "audio") ?? null;
  const [n, d] = (video?.r_frame_rate ?? "0/1").split("/").map(Number);
  return {
    video: video && { codec: video.codec_name, width: video.width, height: video.height, fps: d ? n / d : 0, frames: Number(video.nb_frames) || null },
    audio: audio && { codec: audio.codec_name, sampleRate: Number(audio.sample_rate), channels: audio.channels },
    duration: Number(data.format.duration),
    size: Number(data.format.size),
  };
}

/**
 * Audio levels by decoding to 16-bit mono PCM and measuring in Node (works with the minimal FFmpeg
 * bundled by Remotion, which has no volumedetect filter).
 * @returns {{maxDb:number|null, meanDb:number|null, clippedSamples:number}}
 */
export async function audioLevels(projectRoot, file) {
  const t = findFfTool("ffmpeg", projectRoot);
  if (!t) throw new CvError("ffmpeg not found", "Run `npm install` in the project.");
  const chunks = await new Promise((resolve, reject) => {
    const child = spawn(t.cmd, [...t.prefix, "-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", "22050", "-c:a", "pcm_s16le", "-f", "wav", "-"], { cwd: projectRoot, windowsHide: true });
    const out = [];
    child.stdout.on("data", (d) => out.push(d));
    child.on("error", reject);
    child.on("close", () => resolve(out));
  });
  const wav = Buffer.concat(chunks);
  // streamed WAV: header sizes are unknown, so locate the "data" chunk and take everything after it
  const dataAt = wav.indexOf("data");
  const buf = dataAt < 0 ? Buffer.alloc(0) : wav.subarray(dataAt + 8);
  const n = Math.floor(buf.length / 2);
  if (n === 0) return { maxDb: null, meanDb: null, clippedSamples: 0 };
  let peak = 0;
  let sumSq = 0;
  let clipped = 0;
  for (let i = 0; i < n; i++) {
    const v = buf.readInt16LE(i * 2);
    const a = Math.abs(v);
    if (a > peak) peak = a;
    if (a >= 32767) clipped++;
    sumSq += v * v;
  }
  const db = (x) => (x > 0 ? Math.round(20 * Math.log10(x / 32768) * 10) / 10 : -120);
  return { maxDb: db(peak), meanDb: db(Math.sqrt(sumSq / n)), clippedSamples: clipped };
}

/** Decode the whole file; any error means the MP4 is damaged. */
export async function decodeCheck(projectRoot, file) {
  // the minimal FFmpeg bundled by Remotion needs explicit encoders for the null muxer
  const r = await ff("ffmpeg", projectRoot, ["-v", "error", "-i", file, "-c:v", "rawvideo", "-c:a", "pcm_s16le", "-f", "null", "-"]);
  return { ok: r.code === 0 && r.stderr.trim() === "", errors: r.stderr.trim().split("\n").slice(0, 5) };
}

/**
 * @param {{width:number,height:number,fps:number,durationSec:number,expectAudio:boolean,deep?:boolean,tolerance?:number}} expect
 * @returns {Promise<{ok:boolean, problems:string[], info:object}>}
 */
export async function verifyVideo(projectRoot, file, expect) {
  const problems = [];
  const info = await probe(projectRoot, file);
  if (info.size < 10_000) problems.push(`file is only ${info.size} bytes`);
  if (!info.video) problems.push("no video stream");
  else {
    if (info.video.codec !== "h264") problems.push(`video codec is ${info.video.codec}, expected h264`);
    if (info.video.width !== expect.width || info.video.height !== expect.height) problems.push(`resolution ${info.video.width}x${info.video.height}, expected ${expect.width}x${expect.height}`);
    if (Math.abs(info.video.fps - expect.fps) > 0.01) problems.push(`fps ${info.video.fps}, expected ${expect.fps}`);
  }
  if (expect.expectAudio) {
    if (!info.audio) problems.push("no audio stream");
    else if (info.audio.codec !== "aac") problems.push(`audio codec is ${info.audio.codec}, expected aac`);
  }
  const tol = expect.tolerance ?? 0.25;
  if (Math.abs(info.duration - expect.durationSec) > tol) problems.push(`duration ${info.duration.toFixed(2)}s, expected ${expect.durationSec.toFixed(2)}s (+/- ${tol}s)`);
  if (expect.expectAudio && info.audio) {
    const lv = await audioLevels(projectRoot, file);
    info.levels = lv;
    if ((lv.maxDb !== null && lv.maxDb >= -0.1) || lv.clippedSamples > 0) problems.push(`audio peaks at ${lv.maxDb} dB (${lv.clippedSamples} clipped samples): clipping`);
    if (lv.meanDb !== null && lv.meanDb < -45) problems.push(`audio mean level ${lv.meanDb} dB: probably silent`);
  }
  if (expect.deep) {
    const dec = await decodeCheck(projectRoot, file);
    if (!dec.ok) problems.push(`decode errors: ${dec.errors.join(" | ")}`);
  }
  return { ok: problems.length === 0, problems, info };
}

/** Extract frames for visual review. */
export async function extractFrames(projectRoot, file, seconds, outDir) {
  ensureDir(outDir);
  const out = [];
  for (const t of seconds) {
    const dest = path.join(outDir, `t${String(t).replace(".", "_")}.png`);
    const r = await ff("ffmpeg", projectRoot, ["-y", "-v", "error", "-ss", String(t), "-i", file, "-frames:v", "1", dest]);
    if (r.code === 0 && fs.existsSync(dest)) out.push(dest);
  }
  return out;
}
