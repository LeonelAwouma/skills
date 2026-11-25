# The Celeste Video engine

The `celeste-video` plugin contains instructions and reference documents only. The work itself (storyboard validation, Remotion rendering, Piper narration, music synthesis, captions, MP4 verification) is done by the **Celeste Video engine**, an independent open-source command-line tool that you install yourself. The plugin never downloads, installs or runs it on its own: Claude proposes each command and you approve it through Claude Code's normal permission prompt.

- Source: https://github.com/LeonelAwouma/skills/tree/main/skills/celeste-video (folder `skills/celeste-video/` of the repository)
- Entry point: `scripts/cv.mjs` (Node.js standard library only, no dependency of its own)
- Licence: MIT. Third-party components: see `THIRD_PARTY.md`.

## Prerequisites

| Need | Why | Check |
| --- | --- | --- |
| Node.js 20+ with npm | runs the engine; `npm install` brings Remotion into each video project | `node -v` |
| Git | to get and update the engine | `git --version` |
| Python 3.10-3.13 | narration only (Piper TTS in a private virtual environment) | `python --version` (Windows: `py --version`) |
| FFmpeg | encoding and checks | nothing to do: bundled with Remotion; a system FFmpeg is used if present |
| Playwright (`playwright-core`) | optional, web-app captures only | installed per project on request |
| About 1.6 GB of free RAM | rendering | `cv doctor` |

Disk: Remotion + headless Chrome about 700 MB per video project; Piper environment about 170 MB plus 60-80 MB per voice, shared in `~/.celeste-video` (Windows: `%USERPROFILE%\.celeste-video`).

## Install (manual)

1. Clone the repository to a folder of your choice. The skill looks first in `~/celeste-video-engine`:

   ```
   git clone https://github.com/LeonelAwouma/skills.git ~/celeste-video-engine
   ```

   The engine folder (`<ENGINE_DIR>`) is then `~/celeste-video-engine/skills/celeste-video`. Anywhere else works too: tell Claude the path.

2. Check it:

   ```
   node ~/celeste-video-engine/skills/celeste-video/scripts/cv.mjs doctor
   ```

   `doctor` only reads your environment (Node, Remotion in the current folder, FFmpeg, memory, Piper, voices, Playwright) and prints what is missing.

3. Optional, only if you want narration: `node <ENGINE_DIR>/scripts/cv.mjs voice setup --yes` creates the Piper environment and downloads the default French voice (about 250 MB, from PyPI and Hugging Face). Claude always asks before proposing it.

Do **not** also copy the engine folder into `.claude/skills/`: its own `SKILL.md` has the same name as this plugin's skill and the two would compete. Keep the engine in a normal folder and let the plugin drive it.

## Commands

All commands run from the video project folder (or add `--project <dir>`), as `node <ENGINE_DIR>/scripts/cv.mjs <command>`. `cv help` prints this list.

| Command | Does |
| --- | --- |
| `doctor` | check Node, Remotion, FFmpeg, memory, Piper, voices, Playwright |
| `init [dir] [--template ad\|demo\|explainer] [--no-install] [--upgrade]` | create a Remotion project with the engine and `video/storyboard.json` (runs `npm install` unless `--no-install`) |
| `storyboard templates` / `scaffold` / `validate [file]` | list templates, write a storyboard from one, validate and show the timeline |
| `prepare` | validate and write `src/generated/*.json` |
| `voice list \| info <name> \| setup --yes \| phonemes \| generate` | voice catalogue and licences, Piper setup, pronunciation check, narration |
| `music [--force]` | compose the synthetic soundtrack |
| `capture [--force]` | Playwright captures (needs `video/captures.json` with `"authorized": true`) |
| `build [--render]` | prepare + capture + voice + music + prepare (cached stages) |
| `render [--format ...] [--short-side ...] [--out ...] [--frames a-b] [--concurrency N\|auto] [--chunked] [--deep]` | memory-safe render and verification |
| `still <frames> [--format ...] [--short-side ...]` | review images |
| `qa <file> [--at ...] [--frames a-b]` | verify an MP4 and extract review frames |
| `subtitles` | copy the generated SRT to `out/` |
| `attach-voice` | add narration + captions to an existing Remotion composition |
| `clean [--all]` | remove chunk files / caches |
| `package [--out file.zip]` | build the engine's portable ZIP |

## Update

`git pull` in the clone. Then, in each video project that should get the new engine code: `cv init . --upgrade` (refreshes `src/engine`, `components`, `scenes`, `design`; your `video/` folder, `cv.config.json` and `package.json` are never overwritten).

## Diagnose

- `cv doctor` for the environment; `references/troubleshooting.md` for symptoms and fixes.
- Project log: `.cv/logs/cv.log`; render reports: `.cv/reports/`.
- Engine self-tests (no network, model or browser needed): from `<ENGINE_DIR>`, `npm test` and `npm run test:py`.

## Limits

- Piper has no emotion control; quality is that of the chosen model. Nobody has listened to the output unless you do.
- Captions are timed per sentence (measured) and per phrase (proportional): Piper gives no word timings.
- Illustrations are conceptual (labelled); real interface visuals come from captures you authorise.
- A render needs about 1.6 GB of free RAM; the engine refuses to start below that and stops only its own processes.
- First use needs internet (npm, headless Chrome, Google Fonts, Piper, voices); afterwards rendering works offline except for fonts not yet cached.
- Remotion has its own licence for companies above a size threshold (`THIRD_PARTY.md`).
- The reference copies in the plugin's `skills/celeste-video/config/` are for reading; the engine uses its own `config/` folder.
