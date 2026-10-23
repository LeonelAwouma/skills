# Privacy Policy — Celeste Video (Claude Code plugin)

Last updated: 2026-10-23

## 1. Publisher and contact

Celeste Video is published by **Celeste Corp** (an independent developer identity, not a registered legal entity).

For privacy questions, data concerns, or to report an issue, contact:

- Email: leonelawouma65@gmail.com
- Issues: https://github.com/LeonelAwouma/skills/issues

## 2. What the plugin is

Celeste Video is a Claude Code skill that generates video ads, demos and explainers from a text brief. It writes a storyboard, renders animated scenes with React/Remotion, synthesizes narration locally with Piper TTS, generates a royalty-free soundtrack, times captions to the narration, and exports a verified MP4. Every step runs as a local Node.js/Python process on the machine running Claude Code; the plugin has no backend server and Celeste Corp operates no service that the plugin talks to.

## 3. Data the plugin processes

All of the following are **provided by you** (directly, or through the project files you point the skill at) and are processed **locally**, inside the project folder:

- Text you write for the video: brand name, taglines, narration script, calls to action, duration, target language.
- Brand assets you supply: logo files, theme colors, fonts you select.
- Pronunciation overrides you add to `video/pronunciation.json`.
- Optionally, screenshots of a web app you own or are authorized to show, if you create and opt into `video/captures.json` (see §7).
- Local system information used only to size the render job: free/total RAM and CPU count (via Node's `os` module), and installed Node/npm/Python versions (for the `cv doctor` diagnostic). This information is read to make local decisions (how many render workers to run, whether a dependency is missing) and is never transmitted anywhere.

The plugin does not ask for, collect, or require your name, email address, or any account information to function. The contact email above is the publisher's own, for support purposes, not something the plugin reads from your machine.

## 4. What is stored locally, and where

Running the skill writes files only inside the project you run it in (or, for the optional one-time voice setup, in a shared location on your machine):

| Location | Contents |
| --- | --- |
| `video/` | `storyboard.json`, `theme.json`, `pronunciation.json`, `captures.json` — your inputs |
| `public/audio/voiceover/` | Synthesized narration `.wav` files and a timing manifest, derived from your script |
| `public/audio/music.wav` | Generated soundtrack |
| `public/captures/` | Screenshots, only if you explicitly enabled and configured `cv capture` |
| `.cv/cache/` | Hashes and an intermediate narration script, used to skip pipeline stages that haven't changed |
| `.cv/logs/cv.log` | Plain-text operational log (timestamps, command names, stage names, counts, warnings/errors). It is not designed to capture your narration text, file contents, or environment variable values, but a file path or file name you chose may appear in a log line (e.g. "rendering video/storyboard.json") |
| `out/` | The rendered `.mp4` and `.srt` |
| `~/.celeste-video/` (or project-local `.venv-piper/`) | A Python virtual environment and downloaded Piper voice model files (`.onnx`), created only after you explicitly confirm with `--yes` to `cv voice setup` |

None of this data is synced, uploaded, or made available to Celeste Corp. It stays on your filesystem until you delete it yourself (deleting the project folder, `.cv/`, `out/`, or `~/.celeste-video/` removes the corresponding data; there is no remote copy to also delete).

## 5. Communications with external services

The plugin's own code makes network requests in exactly these cases, each triggered by an explicit command you run:

1. **`cv init`** — runs `npm install` against your configured npm registry to download Remotion and its headless Chrome renderer. Standard Node.js package installation; no project content is sent, only the usual package-manager handshake.
2. **`cv voice setup --yes`** — after you type `--yes` to confirm, runs `pip install piper-tts` (from PyPI) and `python -m piper.download_voices` (from the Hugging Face `rhasspy/piper-voices` repository) to download the Piper engine and the voice model `.onnx` files you asked for. This step is never run without your explicit confirmation flag.
3. **`cv voice info <name>`**, for a voice not already in the bundled catalogue — makes a single HTTPS GET to a static, public `MODEL_CARD` file under `huggingface.co/rhasspy/piper-voices/...` to read that model's license text. The request carries only a generic `User-Agent` header; no data about you, your project, or your narration text is sent.
4. **Rendering** — Remotion's font loader (`@remotion/google-fonts`) may fetch font files from Google Fonts' CDN (`fonts.googleapis.com`, `fonts.gstatic.com`) while rendering the video in its headless browser. These are generic, unauthenticated font-file requests; no personal data is included.

Outside of these four cases, the plugin makes no network calls. Narration synthesis (Piper), music generation, caption timing, and video rendering itself all run fully offline once the one-time setup above has completed.

## 6. Credentials and secrets

The plugin does not read, store, log, or transmit passwords, API keys, tokens, or credential files (it does not access `.npmrc`, `.netrc`, cloud credential files, or OS keychains). The only environment variables it reads are its own optional configuration overrides (`CV_HOME`, `CV_PYTHON`, `CV_VOICES_DIR`, `CV_BROWSER`) — local path overrides you may set yourself, never secrets, and never sent anywhere.

When the plugin starts a local helper process (pip, Python, npm, ffmpeg, the Remotion CLI), that process inherits your shell's environment variables, the same way it would if you ran that command yourself in a terminal. This is standard behavior for any tool that shells out to other local programs, and is necessary for those programs to find things like `PATH` and `HOME`. The plugin's own code does not read, inspect, or forward the contents of that environment anywhere; any network activity those helper processes perform is their own standard operation (installing a package from PyPI/npm, downloading a model from Hugging Face), identical to running them directly.

## 7. Web captures (optional, off by default)

The `cv capture` feature is disabled unless you create `video/captures.json` and explicitly set `"authorized": true` in it. When enabled:

- It only navigates to `localhost`/`127.0.0.1`, or to hosts you explicitly list in `allowedHosts` — hosts you are telling the tool you own or are authorized to capture.
- It refuses, in code, to type into any field detected as `type="password"`, and always applies a best-effort blur to password fields and credit-card-autocomplete fields before saving a screenshot.
- Resulting screenshots are written locally to `public/captures/`, with a note reminding you to review each image before using it, since automatic redaction is best-effort, not a guarantee.

No capture data is sent anywhere by the plugin; it is written only to your local project folder.

## 8. Data retention and your control

All data described above lives only in files under your control: the project folder, and, for the one-time voice setup, `~/.celeste-video/` (or `.venv-piper/` inside a project). There is no Celeste Corp server, account, or database retaining any of it. You control retention entirely by keeping or deleting those files and folders; there is nothing further to request deletion of, since nothing is held outside your machine.

## 9. Third-party services and their own policies

When the plugin's helper processes contact PyPI, npm, Hugging Face, or Google Fonts (§5), that traffic is subject to those services' own privacy policies and terms, not Celeste Corp's. See `THIRD_PARTY.md` in this repository for the full list of third-party software and voice-model licenses involved.

## 10. Your rights

Because no personal data is collected, stored, or transmitted by Celeste Corp, there is no Celeste-Corp-held data to request, export, or erase. If you believe this plugin behaves otherwise, or if you have any privacy question, contact leonelawouma65@gmail.com or open an issue at https://github.com/LeonelAwouma/skills/issues.

This policy does not claim compliance with, or certification under, any specific data-protection regulation (e.g. GDPR); it is a factual description of what this software does, intended to let you assess that for yourself.

## 11. Changes to this policy

This document will be updated if the plugin's data handling changes (for example, a new feature that contacts a new external service). The "Last updated" date at the top reflects the latest revision. Material changes will be noted in the repository's commit history.
