# Branding and visual identity

`video/theme.json` (project) is merged over a preset from the skill (`config/themes/*.json`) by `cv prepare` into `src/generated/theme.json`.

```json
{
  "preset": "midnight-blue",
  "fonts": { "display": "PlusJakartaSans", "ui": "Inter" },
  "colors": { "blue": "#1F5BFF", "cyan": "#22D3EE" },
  "logo": { "src": "brand/logo.png", "focus": { "x": 0.6, "y": 0.4 }, "aspect": 0.75 }
}
```

- Presets: `midnight-blue` (default; navy, royal blue, cyan), `fresh-teal` (teal/mint), `sunset-warm` (plum/orange). Override any colour key; all keys are required in a preset (`navy950 navy900 navy800 navy700 ink royal blue sky cyan ice mist white slate line warn danger ok`). `warn/danger` are used for the "problem" scenes, keep them readable on navy.
- Pick colours **from the logo**: dark scenes use `navy*`, light scenes (logo reveal, CTA) use `white`/`mist` backgrounds with `ink` text. Logos with dark text need a light background: the reveal and CTA scenes are light for that reason. For a white logo set `logo.onDark: true` and use `kinetic`/`bullets` scenes (dark) instead of `logo-reveal`/`cta`.
- Fonts (Google Fonts via `@remotion/google-fonts`, fetched at render time, so internet is needed for the first render): `PlusJakartaSans`, `Inter`, `Manrope`, `Poppins`, `Sora`, `DMSans`. Add another family in `src/design/tokens.ts` (`LOADERS`) if you need it.
- **Logo**: put the file in `public/brand/` and reference it. It is only ever scaled uniformly, never redrawn or recoloured. PNG: aspect is read from the file; SVG/other: set `logo.aspect` (height / width). `logo.focus` = the visual centre of the mark (0-1) where the iris reveal opens. Check the file first (size, transparency); if it is missing the engine draws a vector mark (4-point star + brand name): say so, never fake the real logo.
- Multiple identities: one project = one theme. For several brands create one project folder per brand (cheap: engine + `video/`), sharing the same installed Piper and voices.
- Provided images: place under `public/` and reference by relative path (`screenshot` scenes). Do not use images without the right to.
