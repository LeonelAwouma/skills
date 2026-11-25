# Subtitles

Built from the **real** narration, never from the script alone.

- Piper has no word timings. The generator measures each sentence's start/end on the produced audio and shares that time between phrases in proportion to their length (comma pauses weigh a little more). Error is typically a few tenths of a second inside a long sentence; sentence boundaries are exact.
- Phrases: <= `subtitles.maxChars` (27) characters, break after commas, French `?`, `!`, `:` glued with a non-breaking space, no orphan word.
- Burned in by the engine when narration exists and `subtitles.burn` is true: one line at a time, pill with 86 % dark background, white 700 weight, brand name in the accent colour. Portrait: top at 86 % of the height (above platform UI), landscape/square: lower third. Size scales with the canvas.
- SRT: written next to the video outputs by `cv voice generate`: `out/<slug>.<lang>.srt` (cue text identical to the burned captions). Upload it to platforms that accept sidecar captions, or set `subtitles.burn: false` to export a clean video.
- Without narration there are no captions (the on-screen text carries the message). If a silent video needs captions, add narration segments for it, or write the SRT by hand.

Check in review frames: caption not covering the logo, key interface elements, or contact info. In the templates the visual area ends above the caption band.
