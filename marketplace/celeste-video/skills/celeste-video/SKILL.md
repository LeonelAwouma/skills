---
name: celeste-video
description: Produces professional videos end to end from a plain-language brief - storyboard, React/Remotion animation, Piper TTS voice-over (French or other languages), synthesised music with automatic ducking, synced captions and a verified H.264/AAC MP4 in 9:16, 16:9 or 1:1 - by driving the separately installed Celeste Video engine. Use when the user asks to create, narrate, modify or export a video, ad, publicité, vidéo, Reel, Short, TikTok, product demo, explainer, voix off or sous-titres, or to add narration to an existing Remotion composition.
---

# celeste-video: video production with the Celeste Video engine

Request: **$ARGUMENTS**

This skill holds the production know-how (briefing, storyboard writing, timing, branding, audio licences, memory-safe rendering, QA). The actual work is done by the **Celeste Video engine**, a separate open-source command-line tool installed by the user (see `ENGINE.md` at the plugin root, two levels above this file). This plugin ships no executable code and pre-approves no command.

The storyboard (`video/storyboard.json` in the user's project) is the single source of truth. You write JSON; the engine (Remotion template), Piper, the music composer and the subtitle builder all derive from it. Do **not** hand-write React unless the user needs something no scene type offers (see `references/scenes.md`, "Beyond the catalogue").

## Step 0: locate the engine (always first)

1. Look for the engine entry point with Glob, in controlled places only: `celeste-video-engine/skills/celeste-video/scripts/cv.mjs` under the user's home folder (`~`, `%USERPROFILE%` on Windows; the location suggested in `ENGINE.md`), or a folder the user has given you in this conversation. Do not scan the whole disk.
2. Not found: ask the user where the engine is installed.
3. Not installed: say so plainly. Explain what it is, its prerequisites and the manual install from `ENGINE.md`, and wait. Never download, clone, install or run anything without the user's explicit agreement. Never pipe a download into a shell (`curl ... | bash`, `irm ... | iex`). Do not pretend a step ran: without the engine you can still write and review the storyboard JSON, but say that nothing was built or rendered.
4. Found: call its folder `<ENGINE_DIR>` (the folder that contains `scripts/cv.mjs`). Every command below is:

   ```
   node "<ENGINE_DIR>/scripts/cv.mjs" <command>      (written $CV <command> below)
   ```

   run from the user's **project folder** (the folder that holds, or will hold, `video/storyboard.json`), or with `--project <dir>`.

**Running commands.** Nothing is pre-approved. Before each shell command, state what it does (and its download size if any); it then goes through Claude Code's normal permission prompt, which the user may accept or refuse. An approval covers that command, not later ones. Never try to bypass or batch around the confirmation. Read the output and check it succeeded before the next step. Report real results only.

## Hard rules (read first)

1. **Ask before** any install or download (`voice setup`, `npm install`, a voice model, Playwright), any deletion, any paid service, and any render when `cv doctor` reports low memory. State what it will do and the size. Never install system-wide software without explicit approval.
2. **Memory.** Always render through `cv render` (never call `remotion render` directly on an engine project). It checks free RAM, caps concurrency, renders in resumable chunks when memory is tight, retries at most once more conservatively, and verifies the file. If it refuses (`insufficient`), tell the user to close heavy applications; do not retry in a loop and never kill processes you did not start. Details: `references/render-memory.md`.
3. **An export is not done until `cv render` printed `verified:`** (codec, size, duration, audio levels checked). Report real numbers. If a check fails, say which and fix it.
4. **Licences.** Only use voices marked `allowed` / `allowed-with-attribution` for commercial videos (`cv voice list`; reference copy in `config/voices.json`). Report the attribution line the CLI prints. Music is synthesised by default; a provided music file needs `audio.music.license`. Never invent client references, metrics or testimonials.
5. **Privacy.** Captures only of apps the user owns/authorises, never credentials (the engine refuses to type into password fields). Review every capture image before using it.
6. **You cannot listen to audio.** Say so; hand over `public/audio/voiceover/voiceover-full.wav` for the user to listen to. Never claim the voice "sounds natural".
7. **Never overwrite or delete the user's existing files without looking at them first** and getting agreement: an existing `video/storyboard.json`, audio, captures or MP4 stays untouched unless the user says otherwise. Write new outputs to new names.

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
2. **Environment:** Step 0, then `$CV doctor`. Missing Remotion in the project -> propose `$CV init . --template ad` (ask: ~700 MB `npm install`; inspect the folder first, `init` must not land on top of an unrelated project). Missing Piper/voice -> propose `$CV voice setup --yes` (ask first: ~170 MB venv + ~75 MB voice, shared in `~/.celeste-video`).
3. **Storyboard:** `$CV storyboard templates`, then `$CV storyboard scaffold --template ad --duration 30 --brand "<Brand>" --lang fr` (or edit the file written by `init`). Write the real copy following `references/storyboard.md` (scene catalogue, copywriting and timing rules: ~2.5 spoken words/second, max 4 lines of <= 34 chars, `*accent*` markers). Put narration in each scene's `narration` array. `examples/` holds two complete storyboards to model on.
4. **Brand:** logo in `public/brand/` + `video/theme.json` (`preset`, `logo.src`, `logo.focus`); see `references/branding.md`. No logo: the engine draws a vector mark. Presets: `midnight-blue`, `fresh-teal`, `sunset-warm` (reference copies in `config/themes/`).
5. `$CV storyboard validate` and fix every error. Present a **short storyboard summary** (timeline table + narration text) to the user and continue unless they want changes.
6. **Build:** `$CV build` = prepare, captures (if configured), narration (cached), music (cached), prepare. Add `--force` only to regenerate. Read warnings: narration overruns, pronunciation (`references/voiceover.md`: `voice phonemes` check, `video/pronunciation.json`).
7. **Preview before the full render:** `$CV still 2s,8s,14s,20s,27s --short-side 540 [--format 16:9]` writes PNGs to `out/stills/`; Read them. Fix text overflow, overlaps, unreadable captions. Do it for every requested format. For motion and sound a short export is cheap: `$CV render --frames 0-89 --short-side 540 --out out/test.mp4`, then `$CV qa out/test.mp4 --frames 0-89`.
8. **Final render:** `$CV render` (add `--format 16:9` / `1:1` for other ratios; same storyboard). Add `--deep` to decode the whole file.
9. **QA and report:** `$CV qa <mp4>`; open 4-6 frames across scenes. Deliver: MP4 path, SRT path, voice name + attribution, how to edit (storyboard + `cv build` + `cv render`), what you could not verify (listening).

## Workflow B: demo from a web app

Same as A, plus: confirm the user owns/may show the app and which URL (local, or add the host to `capture.allowedHosts`). Create `video/captures.json` (`references/capture.md`), propose `npm install --save-dev playwright-core` in the project (ask), `$CV capture`, **view every PNG** and remove anything private, then use the `screenshot` scene type (`demo` template). If real captures are unavailable, say the visuals are conceptual (showcase scenes carry the label automatically).

## Workflow C: narration for an existing composition

Do not rebuild the video. Follow `references/existing-composition.md`: write a narration JSON with explicit `start` times from the composition's scenes, run the engine's Piper script (`<ENGINE_DIR>/scripts/voice/generate-voiceover.py`, with the Python of the `cv voice setup` environment), `$CV attach-voice`, mount `<CvVoiceover/>`, `<CvSubtitles/>` and duck the music with `musicVolume`. Render with the same memory rules (check RAM, concurrency 1 when tight, verify the file): see `references/existing-composition.md` step 4.

## Workflow D: modify an existing storyboard video

Read `video/storyboard.json` first, then edit it (transition types `cut|fade|bloom|wipe|push`, scene `duration`, `music.energy` per scene, copy). `$CV build` reruns only stages whose inputs changed (voice and music are hashed). Swap the voice: `$CV voice generate --voice <name> --speaker <n> [--speed 1.1]` (nothing else is rebuilt). Then re-render to a new file name if the previous MP4 must be kept.

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
| `references/install-windows.md` | Installing the plugin and the engine on Windows 11 |
| `references/troubleshooting.md` | Symptoms and fixes |
| `references/architecture.md` | Code map of the engine, for maintainers |
| `examples/` | Two complete storyboards (Céleste Corp ad; fictional "Atelier Lumen") |
| `config/` | Read-only reference copies of the engine's defaults, voice catalogue, lexicon and theme presets (the engine's own `config/` is authoritative) |
