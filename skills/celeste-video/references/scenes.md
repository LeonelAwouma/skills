# Scene catalogue

All scenes adapt to 9:16 (stacked), 1:1 (stacked, compact) and 16:9 (two columns). Text uses `*accent*` markers.

| type | Purpose | Required | Optional |
| --- | --- | --- | --- |
| `kinetic` | Big kinetic headline (hook, section) | `lines` | `sub`, `tone: "warn"` (accent in amber), `variant: "slam"` (impact flash, for hooks), `bg: "light"` |
| `problem-solution` | One continuous visual: scattered, alert-flagged app windows become an ordered grid; headline switches at `split` | `problem.lines`, `solution.lines` | `split` (0.43 = fraction of the scene where order starts) |
| `logo-reveal` | Iris reveal of the logo (light background) + tagline | none | `lines` |
| `showcase` | Tag + headline + illustration | `lines`, `visual` | `tag`, `note` (caption under the visual; defaults to "Conceptual illustration"; empty string hides it) |
| `value` | Tangle -> one line -> many possibilities (promise) | `lines` (2 + 2 lines works best) | `sub` |
| `bullets` | Headline + 2-5 cards | `lines`, `items[{title,text?,icon?}]` | `tag`; icons: check, star, bolt, shield, heart, clock |
| `screenshot` | Real captured UI with camera moves | `image` | `lines`, `focus[{x,y,zoom,at}]`, `caption` |
| `cta` | Logo, call to action, contacts | `lines` | `cta`, `contactLabel`, `contacts[{kind: email|phone|web|address, value}]` |

## showcase visuals

- `{"kind":"app","appTitle":"...","nav":["Dashboard","Customers","Orders","Reports"]}` : web app, cursor navigates pages, phone twin. `nav` needs 4 entries.
- `{"kind":"automation","source","node","before","after","done","steps":[3 words]}` : documents flow through an automation node into a table.
- `{"kind":"integrations","hub":"Unified view","tools":[{"label":"CRM","icon":"users"}, ...]}` : 3-6 tools around a hub. Icons: users, card, mail, box, calc, chat (others show a circle).
- `{"kind":"timeline","steps":[{"title","sub","icon"}...],"done":"Live"}` : 3-5 stages ending with a status. Icons: idea, code, shield, flag.
- `{"kind":"screenshot","images":[{"src":"captures/a.png","focus":[...]}]}` : several captures one after the other.

Default labels come from `meta.lang` (fr / en); every label can be overridden in `visual`.

## Pairing and transitions that work

`problem-solution` -> `bloom` -> `logo-reveal` (light) -> `wipe` -> `showcase` x N (`push` between them) -> `wipe` -> `value` -> `bloom` -> `cta` (light). Light scenes: `logo-reveal`, `cta`, `kinetic` with `bg: light`; the transition into them should be `bloom`.

## Beyond the catalogue

If a request needs a visual no scene offers: copy `src/scenes/ShowcaseScene.tsx` to a new scene file in the project, register it in `src/engine/Video.tsx` (`renderScene`), add its type to `src/engine/types.ts` and to `SCENE_RULES` in the skill's `scripts/lib/storyboard.mjs` only if you want validation (project-local scenes can skip it by using an existing type name with extra props). Use `useSceneTime()` for time, `useLayout()` + `FitBox` for format adaptation, `interpolate`/`spring` only (no CSS animations), and keep it deterministic. Run `npx tsc` in the project before rendering.
