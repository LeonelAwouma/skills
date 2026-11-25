# Music and mix

## Synthesised music (default, rights-free)

`audio.music.mode = "synth"`. `cv music` (or `cv build`) composes `public/audio/music.wav` from the storyboard: per-scene energy, bloom/wipe/fade transition effects (riser + boom + bell), end fade, optional `scene.sfx`. Deterministic: same storyboard -> same file (cached).

Styles (`audio.music.style`): `tech-uplift` (120 bpm, minor, drums + arpeggios), `bright-corporate` (110 bpm, major), `calm-ambient` (84 bpm, pads, no drums, energy capped at 1). Override `bpm`, `tonality` ("minor"|"major"). Scene energy defaults: problem-solution 3, showcase 3, logo-reveal 2, cta 2, value 1; override with `scene.music.energy`.

## Provided music

`{"mode":"file","file":"audio/track.mp3","license":"<licence / source proving the right to use it>"}` (file under `public/`). The license string is mandatory; never use a track whose rights are unknown. No music: `{"mode":"none"}`.

## Ducking and levels

With narration, music volume follows the voice: `volume` (0.62) in gaps, `ducked` (0.2) under speech, 8 frames attack, 16 release (`config/defaults.json` -> `audio`). Voice is -19 dB RMS speech, peaks <= -1 dBFS; synthesised music is normalised to 0.89 peak. `cv render` fails the verification if the final peak >= -0.1 dB (clipping) or the mean level is < -45 dB (silent). Inspect: `cv qa <mp4>` prints peak/mean.

Balance is judged by ear: you cannot. Report the measured levels and ask the user to listen; adjust `volume` / `ducked` and re-render if needed.
