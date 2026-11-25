# Example: Atelier Lumen (fictional brand, 30 s, 9:16 / 16:9 / 1:1)

A made-up company used to prove that the skill does not depend on Céleste Corp: other brand name, other theme (`fresh-teal`), no logo file (vector mark generated), same engine.

```
node <ENGINE_DIR>/scripts/cv.mjs init . --template ad          # in an empty folder
copy <ENGINE_DIR>\examples\atelier-lumen\*.json video\     # storyboard.json + theme.json (after checking video\ holds nothing to keep)
node <ENGINE_DIR>/scripts/cv.mjs build
node <ENGINE_DIR>/scripts/cv.mjs render --format 16:9           # or 9:16, 1:1
```
`<ENGINE_DIR>` is the Celeste Video engine folder (see `ENGINE.md` at the plugin root). The same JSON files are in this folder of the plugin.
All names, e-mail addresses and claims are fictional (`.example` domain).
