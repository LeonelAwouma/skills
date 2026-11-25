# Privacy Policy — Celeste Video (Claude Code plugin)

Last updated: 2026-11-25

## 1. Publisher and contact

Celeste Video is published by **Leonel Awouma** under the brand name **Céleste Corp**. Céleste Corp is a brand used by an independent developer; it is not a registered legal entity.

For privacy questions, data concerns, or to report an issue:

- Issues: https://github.com/LeonelAwouma/skills/issues
- Email: the publisher's address listed as `author.email` in this plugin's `.claude-plugin/plugin.json`

## 2. What the plugin is

The plugin is a Claude Code skill made only of instructions and reference documents (Markdown, JSON, one PNG icon). It contains no executable code, runs nothing by itself and pre-approves no command.

To actually produce a video, the skill drives the **Celeste Video engine**, an open-source command-line tool that you install yourself from the same repository (see `ENGINE.md`). Claude proposes each engine command and it runs only after you approve it through Claude Code's normal permission prompt. The engine runs as local Node.js/Python processes on your machine. There is no backend server: the publisher operates no service that the plugin or the engine talks to.

## 3. Data processed

All of the following are **provided by you** (directly, or through project files you point Claude at) and are processed **locally**, inside your project folder:

- Text for the video: brand name, taglines, narration script, calls to action, duration, language.
- Brand assets you supply: logo files, theme colours, fonts you select.
- Pronunciation overrides in `video/pronunciation.json`.
- Optionally, screenshots of a web app you own or are authorised to show, if you create and opt into `video/captures.json` (see §7).
- Local system information read by the engine's `cv doctor` and render planner: free/total RAM, CPU count, installed Node/npm/Python versions. It is used for local decisions only (how many render workers to run, what is missing) and is never transmitted.

Neither the plugin nor the engine asks for or collects your name, email address or any account information.

## 4. What is stored locally, and where

The plugin itself stores nothing. When you run the engine, it writes only inside your project folder (and, for the optional one-time voice setup, in a shared folder in your home directory):

| Location | Contents |
| --- | --- |
| `video/` | `storyboard.json`, `theme.json`, `pronunciation.json`, `captures.json`: your inputs |
| `public/audio/voiceover/` | Synthesised narration `.wav` files and a timing manifest |
| `public/audio/music.wav` | Generated soundtrack |
| `public/captures/` | Screenshots, only if you enabled and configured captures |
| `.cv/cache/` | Hashes and an intermediate narration script, to skip unchanged stages |
| `.cv/logs/cv.log` | Operational log (timestamps, commands, stages, counts, warnings). Not designed to capture narration text, file contents or environment values, but a file path you chose may appear |
| `out/` | The rendered `.mp4` and `.srt` |
| `~/.celeste-video/` (or a project-local `.venv-piper/`) | Python environment and Piper voice models, created only after you confirm `cv voice setup --yes` |

None of this is synced, uploaded or made available to the publisher. It stays on your disk until you delete it; there is no remote copy.

## 5. Network communications

The plugin makes no network request. The engine makes network requests only in these cases, each triggered by a command you approve:

1. **Getting the engine**: `git clone` / `git pull` from GitHub, run by you (see `ENGINE.md`).
2. **`cv init`**: `npm install` against your configured npm registry to download Remotion and its headless Chrome renderer.
3. **`cv voice setup --yes`**: `pip install piper-tts` (PyPI) and the download of Piper voice models from the Hugging Face `rhasspy/piper-voices` repository. Never run without the explicit `--yes` confirmation.
4. **`cv voice info <name>`** for a voice not in the bundled catalogue: one HTTPS GET to the public `MODEL_CARD` file of that model on huggingface.co, with a generic `User-Agent` and no data about you or your project.
5. **Rendering**: Remotion's font loader may fetch font files from Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`). These are generic, unauthenticated requests.
6. **Optional captures** (`cv capture`): the headless browser visits only `localhost` / `127.0.0.1` or hosts you explicitly allow-list.

Narration synthesis, music generation, caption timing and rendering otherwise run offline.

## 6. Credentials and secrets

Neither the plugin nor the engine reads, stores, logs or transmits passwords, API keys, tokens or credential files (no access to `.npmrc`, `.netrc`, cloud credential files or OS keychains). The plugin needs no API key and declares no user configuration. The only environment variables the engine reads are its own optional local path overrides (`CV_HOME`, `CV_PYTHON`, `CV_VOICES_DIR`, `CV_BROWSER`), never secrets and never sent anywhere.

Helper processes the engine starts (npm, pip, Python, ffmpeg, the Remotion CLI) inherit your shell environment, exactly as when you run them yourself; the engine does not read or forward that environment.

## 7. Web captures (optional, off by default)

Captures are disabled unless you create `video/captures.json` with `"authorized": true`. When enabled, the engine only navigates to `localhost` or hosts you list in `allowedHosts`, refuses to type into password fields, and applies a best-effort blur to password and credit-card fields before saving screenshots locally to `public/captures/`. Redaction is best effort: review every image. No capture data is sent anywhere.

## 8. Retention and control

All data lives in files under your control (the project folder and, for the voice setup, `~/.celeste-video/`). You control retention by keeping or deleting them. The publisher holds no copy, account or database.

## 9. Third-party services

Traffic to GitHub, npm, PyPI, Hugging Face or Google Fonts (§5) is subject to those services' own privacy policies. See `THIRD_PARTY.md` for third-party software and voice-model licences.

## 10. Your rights

The publisher collects, stores and transmits no personal data, so there is nothing held to request, export or erase. If you believe the plugin or engine behaves otherwise, open an issue or write to the publisher (§1).

This policy does not claim compliance with or certification under any specific regulation (e.g. GDPR); it factually describes what the software does.

## 11. Changes

This document is updated if data handling changes. The date at the top reflects the latest revision; changes are visible in the repository's commit history.
