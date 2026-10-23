# celeste-video: Claude Code skill for automated video production

Type one sentence in Claude Code, get a verified MP4:

```
/celeste-video Crée une vidéo publicitaire professionnelle de 30 secondes pour une entreprise, avec animations modernes, voix off française, musique, sous-titres et export MP4.
```

Claude writes a **storyboard** (JSON), the engine animates it with **React + Remotion** (8 scene types, 3 formats: 9:16, 16:9, 1:1), **Piper TTS** records the narration locally, a **synthesised soundtrack** (rights-free) ducks under the voice, **captions** follow the real speech timing, and a **memory-safe renderer** exports an H.264/AAC MP4 that is verified before it is called done.

| Capability | Command | Notes |
| --- | --- | --- |
| Storyboard from a template, validation | `cv storyboard scaffold / validate` | ad, demo, explainer templates |
| Engine project | `cv init` | Remotion project with the generic engine |
| Narration | `cv voice setup / list / info / generate` | licences checked, pronunciation lexicon, voice swap without rebuilding the rest |
| Music | `cv music` | styles tech-uplift, bright-corporate, calm-ambient; deterministic, cached |
| Captures (optional) | `cv capture` | Playwright, authorised/local hosts only, no passwords, redaction |
| Review | `cv still`, `cv qa` | images in any format, frame extraction from the MP4 |
| Export | `cv render` | memory preflight, concurrency cap, chunked resume, retries, verification |
| Package | `cv package` | portable ZIP |

Everything is run as `node <skill>/scripts/cv.mjs <command>` from the project folder (`cv help`). Claude does it for you through `SKILL.md`.

## Install

See [references/install-windows.md](references/install-windows.md): project install (`.claude/skills/celeste-video/`), personal install (`~/.claude/skills/celeste-video/`), or the ZIP with `install/install.ps1`.

## Use

1. `/celeste-video <what you want>`. Describe goal, audience, brand, duration, format, language.
2. Claude checks the environment, **asks before any download or install**, writes `video/storyboard.json`, builds, shows review frames, renders, verifies.
3. To change something later: edit the storyboard (or ask Claude), `cv build`, `cv render`: only changed stages rerun.

Change copy -> `video/storyboard.json`. Change colours/logo/fonts -> `video/theme.json` + `public/brand/`. Change the voice -> `cv voice generate --voice ... --speaker ... --speed ...`. Other format -> `cv render --format 16:9`. Pronunciation -> `video/pronunciation.json`.

## Documentation

`SKILL.md` (orchestration) and `references/`: storyboard, scenes, voice-over, audio mix, subtitles, memory-safe rendering, captures, branding, existing compositions, install, troubleshooting, architecture. Licences: `LICENSE` (MIT, this code) and `THIRD_PARTY.md` (Remotion, Piper, voice models, fonts). Voice licences matter for commercial use: `cv voice list`.

## Limits (honest list)

- Piper has no emotion control; quality is that of the chosen model. Nobody has *listened* to the output unless you do: always check `public/audio/voiceover/voiceover-full.wav` and the final mix.
- Captions are timed per sentence (measured) and per phrase (proportional): Piper gives no word timings.
- Illustrations are conceptual (labelled); real interface visuals come from Playwright captures you authorise.
- A render needs about 1.6 GB of free RAM; the tool refuses to start below that and stops only its own processes.
- Remotion has its own licence for companies above a size threshold (THIRD_PARTY.md).

## Tests

`npm test` (Node, 30+ tests, no model/browser/network needed) and `npm run test:py` (caption cues, SRT, audio finishing). Pipeline acceptance (storyboard -> voice -> render) is exercised on a sample project: see `references/architecture.md`.
