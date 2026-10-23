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

`/plugin install celeste-video --marketplace LeonelAwouma/skills`, or see [skills/celeste-video/references/install-windows.md](skills/celeste-video/references/install-windows.md): project install (`.claude/skills/celeste-video/`), personal install (`~/.claude/skills/celeste-video/`), or the ZIP with `skills/celeste-video/install/install.ps1`.

## Use

1. `/celeste-video <what you want>`. Describe goal, audience, brand, duration, format, language.
2. Claude checks the environment, **asks before any download or install**, writes `video/storyboard.json`, builds, shows review frames, renders, verifies.
3. To change something later: edit the storyboard (or ask Claude), `cv build`, `cv render`: only changed stages rerun.

Change copy -> `video/storyboard.json`. Change colours/logo/fonts -> `video/theme.json` + `public/brand/`. Change the voice -> `cv voice generate --voice ... --speaker ... --speed ...`. Other format -> `cv render --format 16:9`. Pronunciation -> `video/pronunciation.json`.

## Documentation

`skills/celeste-video/SKILL.md` (orchestration) and `skills/celeste-video/references/`: storyboard, scenes, voice-over, audio mix, subtitles, memory-safe rendering, captures, branding, existing compositions, install, troubleshooting, architecture. Licences: `skills/celeste-video/LICENSE` (MIT, this code) and `skills/celeste-video/THIRD_PARTY.md` (Remotion, Piper, voice models, fonts). Voice licences matter for commercial use: `cv voice list`.

## Privacy, Data Processing and External Services

Celeste Video runs locally: your storyboard, narration text, brand assets and rendered video stay in your project folder, and no personal data is collected or sent to Celeste Corp.

- **Processed locally, never leaves your machine**: storyboard/theme/pronunciation JSON, generated narration and music audio, rendered MP4/SRT, pipeline cache (`.cv/`), and the local log (`.cv/logs/cv.log`).
- **External services contacted, each only on an explicit command**: `npm` registry (`cv init`), PyPI and the Hugging Face `rhasspy/piper-voices` repository (`cv voice setup --yes`, requires your explicit confirmation), a single public Hugging Face model-card URL (`cv voice info <name>`), and Google Fonts' CDN while Remotion renders a video.
- **Web captures** (`cv capture`) are off unless you create `video/captures.json` with `"authorized": true`; they only visit `localhost` or hosts you explicitly allow-list, refuse to type into password fields, and blur password/credit-card fields in screenshots on a best-effort basis before saving them locally.
- No credentials, API keys, or secret files are read or transmitted by the plugin's own code.

Full details: [PRIVACY.md](PRIVACY.md). Questions: leonelawouma65@gmail.com or [open an issue](https://github.com/LeonelAwouma/skills/issues).

## Limits (honest list)

- Piper has no emotion control; quality is that of the chosen model. Nobody has *listened* to the output unless you do: always check `public/audio/voiceover/voiceover-full.wav` and the final mix.
- Captions are timed per sentence (measured) and per phrase (proportional): Piper gives no word timings.
- Illustrations are conceptual (labelled); real interface visuals come from Playwright captures you authorise.
- A render needs about 1.6 GB of free RAM; the tool refuses to start below that and stops only its own processes.
- Remotion has its own licence for companies above a size threshold (THIRD_PARTY.md).

## Tests

`npm test` (Node, 30+ tests, no model/browser/network needed) and `npm run test:py` (caption cues, SRT, audio finishing). Pipeline acceptance (storyboard -> voice -> render) is exercised on a sample project: see `references/architecture.md`.
