# Third-party components and licences

Nothing below is bundled in the package (no `node_modules`, no Python environment, no voice model). They are downloaded on the user's machine when installed. Verify the terms that apply to **your** use, especially for commercial distribution.

## Software

| Component | Used for | Licence (as published; check the version you install) |
| --- | --- | --- |
| Remotion (`remotion`, `@remotion/cli`, `@remotion/media`, `@remotion/google-fonts`) | video rendering | **Remotion License**: free for individuals and companies up to a size threshold, paid company licence above it. Read https://www.remotion.dev/license before commercial use in a company |
| React, React DOM | UI | MIT |
| TypeScript | type checking | Apache-2.0 |
| FFmpeg (bundled by Remotion, or system) | muxing, probing, audio analysis | LGPL/GPL depending on build; used as a separate executable |
| Chrome Headless Shell (downloaded by Remotion) | rendering | Chromium licences (BSD-style + components) |
| Piper TTS (`piper-tts` 1.x) | speech synthesis | **GPL-3.0** (software). The WAV files it produces are not covered by the software licence; the voice model licence applies (below) |
| onnxruntime, numpy, protobuf, flatbuffers | Piper dependencies | MIT / BSD-3 |
| espeak-ng (inside piper-tts) | phonemisation | GPL-3.0 |
| Playwright / playwright-core (optional) | captures | Apache-2.0 |
| Google Fonts used by themes (Plus Jakarta Sans, Inter, Manrope, Poppins, Sora, DM Sans) | typography | SIL Open Font License 1.1 (Poppins: OFL as well) |

## Voice models (downloaded from https://huggingface.co/rhasspy/piper-voices)

Datasets licences read from each model card (config/voices.json keeps them with the attribution text):

| Model | Dataset licence | Commercial use |
| --- | --- | --- |
| fr_FR-upmc-medium (UPMC / MaryTTS "Pierre", "Jessica") | CC BY-SA 4.0 | Allowed with attribution; share-alike applies to adaptations of the dataset: have counsel confirm for paid campaigns |
| fr_FR-siwis-medium | CC BY 4.0 | Allowed with attribution |
| fr_FR-mls-medium (Multilingual LibriSpeech) | CC BY 4.0 | Allowed with attribution |
| fr_FR-gilles-low | CC0 | Allowed |
| fr_FR-tom-medium | AGPLv3 | Unclear for generated audio: not cleared by default |

Models not in this table are "unverified": the tool refuses them for commercial use until you decide otherwise. This document is information, not legal advice.

## Generated content

- Music: composed by code in `scripts/lib/music.mjs` / `synth.mjs`, original, released under the skill's MIT licence together with the output you generate.
- Narration: your text + the voice model above. Attribution line to publish is printed by `cv voice generate`.
- Provided music, images, logos and captures: your responsibility (`audio.music.license` is mandatory for provided music).
