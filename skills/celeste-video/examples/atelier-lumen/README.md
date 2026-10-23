# Example: Atelier Lumen (fictional brand, 30 s, 9:16 / 16:9 / 1:1)

A made-up company used to prove that the skill does not depend on Céleste Corp: other brand name, other theme (`fresh-teal`), no logo file (vector mark generated), same engine.

```
node <skill>/scripts/cv.mjs init . --template ad          # in an empty folder
copy examples\atelier-lumen\*.json video\                  # storyboard.json + theme.json
node <skill>/scripts/cv.mjs build
node <skill>/scripts/cv.mjs render --format 16:9           # or 9:16, 1:1
```
All names, e-mail addresses and claims are fictional (`.example` domain).
