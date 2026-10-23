---
name: celeste-video
description: Produces professional videos end to end from a plain-language brief - storyboard, React/Remotion animation, French (or other) Piper TTS voice-over, synthesised music with automatic ducking, synced captions and a verified H.264/AAC MP4 in 9:16, 16:9 or 1:1. Use for ads, Reels/TikTok/Shorts, product demos from a web app, explainers, adding narration to an existing Remotion composition, changing pacing/transitions, or exporting. Memory-safe renders.
when_to_use: User asks to create, narrate, modify or export a video, ad, publicité, vidéo, Reel, Short, démo, voix off, sous-titres, or to render a Remotion composition.
argument-hint: "[what the video is for] e.g. 30s ad with French voice-over, 9:16"
allowed-tools: Bash(node ${CLAUDE_SKILL_DIR}/scripts/cv.mjs doctor*) Bash(node ${CLAUDE_SKILL_DIR}/scripts/cv.mjs storyboard *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/cv.mjs prepare*) Bash(node ${CLAUDE_SKILL_DIR}/scripts/cv.mjs voice list*) Bash(node ${CLAUDE_SKILL_DIR}/scripts/cv.mjs voice info *)
license: MIT
compatibility: Node.js 20+, npm, Windows 11 / macOS / Linux. Voice needs Python 3.10-3.13 + Piper. Optional Playwright for captures.
---

# celeste-video: video production engine

Request: **$ARGUMENTS**

All commands run from the **project folder** (the folder that holds, or will hold, `video/storyboard.json`):

```
CV="node ${CLAUDE_SKILL_DIR}/scripts/cv.mjs"      # then:  $CV <command>
```

The storyboard (`video/storyboard.json`) is the single source of truth. You write JSON; the engine (Remotion template), Piper, the music composer and the subtitle builder all derive from it. Do **not** hand-write React unless the user needs something no scene type offers (see `references/scenes.md`, "Beyond the catalogue").

## Hard rules (read first)

1. **Ask before** any install or download (`voice setup`, `npm install`, a voice model, Playwright), any deletion, any paid service, and any render when `cv doctor` reports low memory. State what it will do and the size. Never install system-wide software without explicit approval.
2. **Memory.** Always render through `cv render` (never call `remotion render` directly). It checks free RAM, caps concurrency, renders in resumable chunks when memory is tight, retries at most once more conservatively, and verifies the file. If it refuses (`insufficient`), tell the user to close heavy applications; do not retry in a loop and never kill processes you did not start. Details: `references/render-memory.md`.
3. **An export is not done until `cv render` printed `verified:`** (codec, size, duration, audio levels checked). Report real numbers. If a check fails, say which and fix it.
4. **Licences.** Only use voices marked `allowed` / `allowed-with-attribution` for commercial videos (`cv voice list`). Report the attribution line the CLI prints. Music is synthesised by default; a provided music file needs `audio.music.license`. Never invent client references, metrics or testimonials.
5. **Privacy.** Captures only of apps the user owns/authorises, never credentials (typing into password fields is refused). Review every capture image before using it.
6. **You cannot listen to audio.** Say so; hand over `public/audio/voiceover/voiceover-full.wav` for the user to listen to. Never claim the voice "sounds natural".
7. Never overwrite or delete the user's existing files without looking at them first. Existing videos stay untouched: write new outputs to new names.

## Route the request

| The user wants | Do |
| --- | --- |
| A complete video from a brief ("crée une pub de 30 s...") | **Workflow A** |
| A demo from their web app / site | **Workflow B** (A + captures) |
| Narration for an **existing** Remotion composition | **Workflow C**, `references/existing-composition.md` |
| Change transitions, rhythm, copy, theme, voice of a video made with this skill | **Workflow D** (edit the storyboard, rebuild: only changed stages rerun) |
| Export / another format / a quick test render | **Workflow E** |

## Workflow A: full production

1. **Understand** the brief: goal, audience, tone, brand, language, duration, format, platforms, contact/CTA. Ask only what is missing and essential (brand name, contact, logo file). Defaults: 30 s, 9:16, French, voice-over, music, burned captions.
2. **Environment:** `$CV doctor`. Missing Remotion in the project -> `$CV init . --template ad` (ask: ~700 MB `npm install`). Missing Piper/voice -> propose `$CV voice setup --yes` (ask first: ~170 MB venv + ~75 MB voice, shared in `~/.celeste-video`).
3. **Storyboard:** `$CV storyboard templates`, then `$CV storyboard scaffold --template ad --duration 30 --brand "<Brand>" --lang fr` (or edit the file written by `init`). Write the real copy following `references/storyboard.md` (scene catalogue, copywriting and timing rules: ~2.5 spoken words/second, max 4 lines of <= 34 chars, `*accent*` markers). Put narration in each scene's `narration` array.
4. **Brand:** logo in `public/brand/` + `video/theme.json` (`preset`, `logo.src`, `logo.focus`); see `references/branding.md`. No logo: the engine draws a vector mark. Presets: `midnight-blue`, `fresh-teal`, `sunset-warm`.
5. `$CV storyboard validate` and fix every error. Present a **short storyboard summary** (timeline table + narration text) to the user and continue unless they want changes.
6. **Build:** `$CV build` = prepare, captures (if configured), narration (cached), music (cached), prepare. Add `--force` only to regenerate. Read warnings: narration overruns, pronunciation (`references/voiceover.md`: `--phonemes` check, `video/pronunciation.json`).
7. **Preview before the full render:** `$CV still 2s,8s,14s,20s,27s --short-side 540 [--format 16:9]` writes PNGs to `out/stills/` (one bundle, several frames); Read them. Fix text overflow, overlaps, unreadable captions. Do it for every requested format. For motion and sound a short export is cheap: `$CV render --frames 0-89 --short-side 540 --out out/test.mp4`, then `$CV qa out/test.mp4 --frames 0-89`.
8. **Final render:** `$CV render` (add `--format 16:9` / `1:1` for other ratios; same storyboard). Add `--deep` to decode the whole file.
9. **QA and report:** `$CV qa <mp4>`; open 4-6 frames across scenes. Deliver: MP4 path, SRT path, voice name + attribution, how to edit (storyboard + `cv build` + `cv render`), what you could not verify (listening).

## Workflow B: demo from a web app

Same as A, plus: confirm the user owns/may show the app and which URL (local, or add the host to `capture.allowedHosts`). Create `video/captures.json` (`references/capture.md`), `npm install --save-dev playwright-core` (ask), `$CV capture`, **view every PNG** and remove anything private, then use the `screenshot` scene type (`demo` template). If real captures are unavailable, say the visuals are conceptual (showcase scenes carry the label automatically).

## Workflow C: narration for an existing composition

Do not rebuild the video. Follow `references/existing-composition.md`: write a narration JSON with explicit `start` times from the composition's scenes, run the Piper script (via `cv voice setup` environment), `$CV attach-voice`, mount `<CvVoiceover/>`, `<CvSubtitles/>` and duck the music with `musicVolume`. Render with the same memory rules (check RAM, concurrency 1 when tight, verify the file): see `references/existing-composition.md` step 4.

## Workflow D: modify an existing storyboard video

Edit `video/storyboard.json` (transition types `cut|fade|bloom|wipe|push`, scene `duration`, `music.energy` per scene, copy). `$CV build` reruns only stages whose inputs changed (voice and music are hashed). Swap the voice: `$CV voice generate --voice <name> --speaker <n> [--speed 1.1]` (nothing else is rebuilt). Then re-render.

## Workflow E: export

`$CV render --format 9:16|16:9|1:1 [--short-side 1080] [--out path] [--frames a-b] [--concurrency N] [--chunked]`. Default output `out/<slug>-<format>.mp4`, H.264 + AAC. Resolution = `--short-side`; fps/duration come from the storyboard.

## Reference map (open only what you need)

| File | Content |
| --- | --- |
| `references/storyboard.md` | Schema, timing rules, copywriting for ads/demos/explainers |
| `references/scenes.md` | The 8 scene types and every property; extending the engine |
| `references/voiceover.md` | Piper, voice catalogue + licences, pronunciation, speed, swapping voice |
| `references/audio-mix.md` | Synth music styles, ducking, levels, using licensed music |
| `references/subtitles.md` | Captions: timing, style, SRT |
| `references/render-memory.md` | Memory protocol, chunked render, errors and recovery |
| `references/capture.md` | Playwright captures and privacy rules |
| `references/branding.md` | Themes, logo, fonts, multiple identities |
| `references/existing-composition.md` | Attach voice/captions to, or modify, a non-skill composition |
| `references/install-windows.md` | Installation (project / personal / ZIP) on Windows 11 |
| `references/troubleshooting.md` | Symptoms and fixes |
| `references/architecture.md` | Code map for maintainers; tests (`npm test`) |
| `examples/` | Two complete storyboards (Céleste Corp ad; fictional "Atelier Lumen") |
