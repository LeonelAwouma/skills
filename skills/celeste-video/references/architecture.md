# Architecture (for maintainers)

```
celeste-video/
  SKILL.md                 orchestration (what Claude reads on /celeste-video)
  README.md, LICENSE, THIRD_PARTY.md
  config/                  defaults.json (formats, memory thresholds, audio mix) | voices.json (licences)
                           lexicon.fr.json | themes/*.json (colour presets)
  scripts/
    cv.mjs                 CLI entry: one command per stage
    lib/                   util (paths, config, logging, process/tool discovery)  storyboard (validate, timeline, narration)
                           assets (prepare: theme + logo + generated JSON)       voice (Piper orchestration, catalogue)
                           music + synth (composer + instruments)                 capture (Playwright, safety)
                           memory (render planning) + render (safe render, chunks) + verify (ffprobe / volumedetect)
                           stills (review frames)  project (init, scaffold, doctor, clean)  cache  zip
    voice/generate-voiceover.py   Piper segments, trimming, loudness, manifest, caption cues, SRT
    package.mjs            portable ZIP
  templates/
    remotion-project/      the engine copied by `cv init` (src/engine, components, scenes, design)
    storyboards/           ad | demo | explainer
    snippets/              narration drop-ins for existing compositions
  examples/                complete storyboards
  tests/                   node:test + unittest
  install/                 install.ps1 / install.sh
```

## Data flow

`video/storyboard.json` + `video/theme.json` --(cv prepare)--> `src/generated/{storyboard,theme,assets}.json`
`cv voice generate` --> `public/audio/voiceover/*.wav` + `manifest.json` (+ copy in `src/generated/voiceover.manifest.json`, SRT in `out/`)
`cv music` --> `public/audio/music.wav`
`cv render` --> Remotion CLI (`main` composition, props `{format, shortSide}`) --> MP4 --> `verify`

The engine reads **only** `src/generated/*.json` and `public/`. Stages are independent and cached by input hash in `.cv/stages.json`.

## Engine (templates/remotion-project/src)

- `engine/Video.tsx`: stacks one `Sequence` per scene (`from = start - lead`, `+ TAIL`), mounts music (ducked by `voice.ts`), narration, captions, end fade.
- `engine/SceneShell.tsx`: entrance transitions (bloom, wipe, fade, push) and the exit half of a push. Scenes only use `useSceneTime()` (0 = nominal start).
- `engine/layout.tsx`: `computeLayout(W,H)` (portrait stacked / landscape two columns / square), `FitBox` (scale a fixed design canvas into a box), `fitFont`.
- `engine/i18n.ts`: UI vocabulary fr/en for the illustrations.
- `scenes/*`: one component per scene type. Illustrations live in `scenes/showcase/`.
- `Root.tsx`: one composition `main`; `calculateMetadata` derives the canvas from `props.format/shortSide`.

Rules for new scenes: deterministic (no `Math.random`; use `random(seed)`), time only from `useSceneTime`, sizes from `layout.u`, no CSS transitions/animations, no absolute pixel assumptions of one format.

## Adding a scene type

1. Component in `templates/remotion-project/src/scenes/`. 2. Types in `engine/types.ts`. 3. Register in `engine/Video.tsx`. 4. Add rules in `SCENE_RULES` (`scripts/lib/storyboard.mjs`) + document in `references/scenes.md`. 5. Test: validate a storyboard using it, `cv still`, `npx tsc`.

## Tests

`npm test` (Node `node:test`: storyboard, memory planning, cache, zip/package, capture rules, voice catalogue, themes, music, CLI behaviours, portability) and `npm run test:py` (caption cues, phrase splitting, SRT, audio finishing). They need no voice model, no browser and no network. Rendering/voice/capture are exercised by running the pipeline on a project (see README "Acceptance").

## Conventions

No third-party dependency in `scripts/` (Node >= 20 stdlib only). Every failure that a user can fix throws `CvError(message, hint)`. Paths in config are project-relative; no absolute path is baked into any shipped file (a test enforces it).
