# Celeste Video (Claude Code plugin)

Describe a video in one sentence, get a storyboard, then a verified MP4:

```
/celeste-video Crée une vidéo publicitaire de 30 secondes pour mon entreprise, avec voix off française, musique, sous-titres et export MP4.
```

Published by **Leonel Awouma** under the **Céleste Corp** brand name (an independent developer identity, not a registered company).

## What is in this plugin

One skill, `celeste-video`, made of instructions and reference documents:

- how to turn a brief into a structured storyboard (goal, audience, tone, brand, duration, format, language, narration);
- the 8 scene types, transitions and formats (9:16, 16:9, 1:1), copywriting and timing rules;
- narration with Piper voices and their licences, synthesised music with ducking, synced captions (SRT and burned-in);
- a memory-safe rendering protocol and the checks an MP4 must pass before it is called done;
- privacy rules for web-app captures; two complete example storyboards.

The plugin contains **no executable code** and pre-approves **no command**.

## What you need: the Celeste Video engine

Rendering is done by the open-source Celeste Video engine, installed separately (Node.js 20+, plus Python and Piper for narration). See [ENGINE.md](ENGINE.md) for prerequisites, the manual install (`git clone`), commands, updates and limits.

When you ask for a video, Claude first looks for the engine. If it is missing, Claude explains how to install it and waits; it never installs or downloads anything without your agreement. When it is present, Claude proposes each engine command and you approve it through Claude Code's normal permission prompt. Without the engine, Claude can still write and review the storyboard, but no video is produced.

## Use

1. `/celeste-video <what you want>`: goal, audience, brand, duration, format, language.
2. Claude writes `video/storyboard.json`, shows you a summary, builds narration and music, shows review frames, renders and verifies the MP4.
3. To change something later, ask Claude or edit the storyboard; only changed stages are rebuilt.

## Limits

- Claude cannot listen to audio: listen to the narration and the final mix yourself.
- Piper voices have no emotion control; check each voice licence before commercial use (`cv voice list`).
- Illustrations are conceptual unless you provide authorised captures of your own app.
- A render needs about 1.6 GB of free RAM.

## Privacy, licence, support

- Privacy: [PRIVACY.md](PRIVACY.md). Everything runs locally; nothing is sent to the publisher.
- Licence: [LICENSE](LICENSE) (MIT). Third-party software and voice models: [THIRD_PARTY.md](THIRD_PARTY.md).
- Issues: https://github.com/LeonelAwouma/skills/issues
