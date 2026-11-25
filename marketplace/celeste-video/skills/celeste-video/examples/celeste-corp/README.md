# Example: Céleste Corp ad (35 s, 9:16)

The storyboard version of the first Céleste Corp advertisement: problem -> solution on one continuous visual, logo reveal, four services, value promise, call to action, French narration, synthesised music, captions.

```
mkdir celeste-demo && cd celeste-demo
node <ENGINE_DIR>/scripts/cv.mjs init . --no-install       # engine + video/ folder (then `npm install`, ~700 MB)
copy <ENGINE_DIR>\examples\celeste-corp\storyboard.json video\storyboard.json
copy <ENGINE_DIR>\examples\celeste-corp\theme.json video\theme.json
# put the official logo (PNG, transparent) in public/brand/celeste-corp-logo.png
node <ENGINE_DIR>/scripts/cv.mjs build
node <ENGINE_DIR>/scripts/cv.mjs render
```
`<ENGINE_DIR>` is the Celeste Video engine folder (see `ENGINE.md` at the plugin root). The same JSON files are in this folder of the plugin.

The logo is **not** included in the package (brand asset). Without it the engine draws a vector mark and prints a warning; with it, the logo is used unchanged. The original hand-coded version of this ad (before the skill) is kept in the author's project and is not a dependency of the skill.
