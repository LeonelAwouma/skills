# Example: Céleste Corp ad (35 s, 9:16)

The storyboard version of the first Céleste Corp advertisement: problem -> solution on one continuous visual, logo reveal, four services, value promise, call to action, French narration, synthesised music, captions.

```
mkdir celeste-demo && cd celeste-demo
node <skill>/scripts/cv.mjs init . --no-install       # engine + video/ folder (then `npm install`, ~700 MB)
copy examples\celeste-corp\storyboard.json video\storyboard.json
copy examples\celeste-corp\theme.json video\theme.json
# put the official logo (PNG, transparent) in public/brand/celeste-corp-logo.png
node <skill>/scripts/cv.mjs build
node <skill>/scripts/cv.mjs render
```

The logo is **not** included in the package (brand asset). Without it the engine draws a vector mark and prints a warning; with it, the logo is used unchanged. The original hand-coded version of this ad (before the skill) is kept in the author's project and is not a dependency of the skill.
