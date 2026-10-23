# Storyboard (video/storyboard.json)

Single source of truth. Validate with `cv storyboard validate`. Everything is derived from it.

```jsonc
{
  "version": 1,
  "meta": { "brand": "Atelier Lumen", "lang": "fr", "slug": "pub-lumen",
            "audience": "...", "tone": "...", "goal": "..." },
  "video": { "fps": 30, "format": "9:16", "shortSide": 1080, "duration": 30 },
  "theme": "midnight-blue",                       // preset name, see branding.md
  "audio": {
    "music": { "mode": "synth", "style": "tech-uplift", "bpm": 120, "tonality": "minor",
               "volume": 0.62, "ducked": 0.2 },   // or {"mode":"file","file":"audio/x.mp3","license":"..."} / {"mode":"none"}
    "voice": { "enabled": true, "voice": "fr_FR-upmc-medium", "speaker": 1, "speed": 1.05,
               "pause": 0.3, "sentencePause": 0.16 }
  },
  "subtitles": { "burn": true, "maxChars": 27 },
  "scenes": [ { "id": "hook", "type": "...", "duration": 6, "transition": {"type": "bloom"},
                "narration": [ { "at": 0.2, "text": "...", "spoken": "...", "speed": 1.0 } ] } ]
}
```

- `{brand}` in any string is replaced by `meta.brand`.
- Scene `duration` in seconds (1.5-60); their **sum must equal** `video.duration` (the validator tells you; `cv storyboard scaffold --duration N` rescales a template).
- `transition.type` (entrance of the scene): `cut` (first scene), `fade`, `bloom` (white/dark iris, use before a light scene such as logo or CTA), `wipe` (diagonal light line, good dark->dark), `push` (slide, best between consecutive showcases). The previous scene is covered by the transition: nothing to configure.
- `narration[].at` = seconds after the scene start. `text` is shown in captions; `spoken` (optional) is what Piper reads (phonetic fixes). A segment may run past its scene; it must still end before the video does (the build fails otherwise; nothing is cut).
- Scene extras: `music: {"energy": 0-3, "fast": true}` (0 pad only, 1 bass+bells, 2 +soft drums+arp, 3 full), `sfx: [{"at": 1.2, "kind": "click|bell|whoosh|boom|tick"}]`, `bg: "dark|light"` (kinetic only).

## Text rules (legibility on a phone)

- `lines`: 1-4 lines, <= 34 visible characters each; mark emphasis with `*words*` (accent gradient; red-orange in a problem line via the `problem-solution` scene). Break lines yourself, the engine only shrinks a line that is too wide.
- Headline <= 8 words. One idea per scene. Never put the same sentence in headline and narration verbatim for more than a scene: narration complements.
- Safe areas are handled by the engine (portrait: 150 px top, ~270 px bottom, captions at 86 % height).

## Timing rules

- Spoken French ~ 2.5-3 words/second at speed 1.0-1.05. Narration length (s) ~ words / 2.7. Keep each scene's narration shorter than the scene minus 0.5 s, except deliberate spills.
- Hook within 3 s. Do not open with a static logo. Logo reveal at 20-30 % of the video, CTA in the last 15-20 %, contact on screen for >= 3 s.
- 30 s ad skeleton: problem/solution 6 s, brand reveal 4 s, 3 services x 4 s, promise 4 s, CTA 4 s (`ad` template). 45 s demo: hook 5 s, 3 screenshot scenes 9 s, benefits 8 s, CTA 5 s (`demo`). 30 s explainer: `explainer`.

## Copywriting for conversion (ads)

Problem in the audience's words -> promise -> proof of competence (what you build, concretely) -> reassurance (partner, accompaniment) -> one clear action. Do not invent figures, clients, awards or testimonials; illustrations are labelled "conceptual illustration" automatically. Name only clients the user explicitly allowed. Keep the brand name identical everywhere (captions highlight it).

## Multilingual

`meta.lang` selects the UI vocabulary in the illustrations (fr, otherwise English) and the default voice (only `fr` has a verified default; other languages need `audio.voice.voice` set to an installed model whose licence you checked: `cv voice info <name>`).
