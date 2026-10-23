# Rendering safely (memory protocol)

A previous export was stopped for lack of memory. `cv render` makes that a managed case.

## What it does

1. **Preflight**: free RAM now vs `config/defaults.json` -> `render.memory` (`minStartGB` 1.6, `perWorkerGB` 1.4 scaled by canvas megapixels, `baseGB` 1.0).
   - `insufficient` (< 1.6 GB free): nothing is started. Exit code 3 with advice. `--force` tries anyway at concurrency 1.
   - `low` (< 1.6 + one worker): concurrency 1 and **chunked** rendering (120-frame chunks).
   - `ok`: concurrency = what memory allows (max 4, max CPU/2), single pass (or 300-frame chunks if `--chunked`).
2. **Chunked mode**: video-only chunks (`.cv/render/<hash>/chunk-000.mp4`...), then the audio track, then FFmpeg concat + mux (stream copy, no re-encode). Finished chunks are **kept**: re-running the same command resumes. Cleaned after a successful assembly or with `cv clean`.
3. **Watchdog**: while a render runs, free RAM is sampled every 4 s. Under `hardFloorGB` (0.6) the render **that cv started** is stopped (its process tree only) with an explicit message. Other applications are never touched.
4. **Retries are bounded**: `maxAttempts` = 2. Attempt 2 is forced to concurrency 1 + chunked. Then it stops with the reason; do not loop.
5. **Verification** (always): ffprobe (H.264, resolution, fps, duration +/- 0.25 s, AAC present if audio expected), size > 10 kB, audio peak/mean via ffmpeg `volumedetect`; `--deep` decodes the whole file. Report in `.cv/reports/<file>.json`. The CLI prints `verified:` only when all pass.

## What you should do

- `cv doctor` shows free memory. If low, tell the user plainly, suggest closing browsers/other renders, and offer: wait and retry, `--short-side 720` for a lighter render, or `--chunked`.
- Do not run Studio, several renders, or large installs in parallel with a render.
- Test renders: `--frames 0-89 --short-side 540` (a few seconds, small memory).
- Never claim success without the `verified:` line. If it failed: quote the explanation (`OOM`, `killed for memory`, renderer error tail) and the next step.
- Windows port clash: renders use a free random port, so Studio on 3000 does not conflict.

## Error messages

| Message | Meaning | Action |
| --- | --- | --- |
| `Not enough free memory to render safely, nothing was started.` | preflight | free RAM, retry |
| `stopped by cv because free memory fell under the safety floor` | watchdog | free RAM, rerun (resumes chunks) |
| `The renderer ran out of memory` | OOM patterns in output | retry is automatic once at concurrency 1 |
| `Verification failed: ...` | file invalid | read the list; common: wrong duration (storyboard changed during render), no audio stream |
| `Remotion is not installed in this project` | no node_modules | `cv init` / `npm install` |
