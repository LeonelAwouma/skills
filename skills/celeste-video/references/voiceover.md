# Voice-over with Piper TTS

Local, free, no API. Piper has **no emotion control**: expressiveness comes from the model, punctuation, `speed` and the noise parameters (`noise_scale`, `noise_w_scale` per segment: higher = livelier, less stable). Never promise more than that.

## Setup (ask the user first)

```
cv voice setup --yes [--voices fr_FR-upmc-medium]
```
Creates `~/.celeste-video/venv` (Piper + onnxruntime, ~170 MB) and downloads models into `~/.celeste-video/voices` (60-80 MB each), shared by all projects. Override with `CV_HOME`, `CV_PYTHON`, `CV_VOICES_DIR`. Needs Python 3.10-3.13 (very new Python may lack an onnxruntime wheel: point `CV_PYTHON` at 3.12). A project-local `.venv-piper/` and `voices/` are also found. Check: `cv doctor`.

## Voices and licences (config/voices.json; verified from the official model cards)

| Voice | Type | Dataset licence | Commercial status |
| --- | --- | --- | --- |
| `fr_FR-upmc-medium` speaker 1 ("Pierre") | male | CC BY-SA 4.0 | allowed with attribution. Default. Ask a lawyer about share-alike before a paid campaign |
| `fr_FR-siwis-medium` | female | CC BY 4.0 | allowed with attribution |
| `fr_FR-mls-medium` | mixed, 125 speakers | CC BY 4.0 | allowed with attribution, **not recommended**: short phrases explode in length |
| `fr_FR-gilles-low` | male, 16 kHz | CC0 | allowed, **not recommended**: no nasal vowel marker (on/en broken) |
| `fr_FR-tom-medium` | male | AGPLv3 | **unclear**: refused for commercial use unless `--accept-licence-risk` |

A model not in the catalogue is `unverified`: `cv voice info <name>` fetches its MODEL_CARD; read the licence, then add it to the catalogue. `cv voice generate` refuses non-cleared voices when `commercialUse` is true (cv.config.json). It prints the attribution line to put in the post description.

## Generate / replace the voice

`cv voice generate [--voice N --speaker N --speed X --force]`. Segments are placed at `scene.start + narration.at`, durations are measured on the real WAV (never estimated), written to `public/audio/voiceover/` with `manifest.json` (text, duration, start, end, per-sentence timing, caption cues) copied to `src/generated/`. The stage is cached by a hash of text+voice+speed: changing only the voice reruns only this stage; the video, music and captions timing follow automatically.

Audio processing (only): DC removal, silence trim, 8/30 ms fades, equal speech loudness (-19 dB RMS) with a -1 dBFS ceiling. No effects, no pitch shifting.

If narration ends after the video: the build fails with the segment names. Shorten, raise `speed` by 0.05-0.1, or lengthen a scene. Never cut a sentence.

## Pronunciation

eSpeak adds false liaisons/plural -s in French (e.g. "logiciels et" -> "logiciels-z-et"). Always check new copy: `python generate-voiceover.py --script .cv/narration.json --phonemes` (with the Piper interpreter), listen, and fix with a lexicon: `video/pronunciation.json` = `{"word": "[[ phonemes ]]"}` (merged with `config/lexicon.fr.json`, which holds fixes verified on upmc). Brand names: verify `Céleste Corp` -> `selˈɛst kˈɔʁp`. Inline `[[ ]]` can also be written directly in a segment's `spoken`.

## Listening

You cannot listen. Say it. Give the user `public/audio/voiceover/voiceover-full.wav` (all segments on the timeline) and, for a comparison, generate the same excerpt with 2-3 cleared voices into `out/voice-samples/<voice>/`. Objective checks you can report: durations, peaks (< -1 dBFS), equal loudness, clean endings, no overlap.
