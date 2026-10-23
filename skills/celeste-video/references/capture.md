# Interface captures (optional, Playwright)

Off by default: it only runs when `video/captures.json` exists. Use it to turn a **local or authorised** web app into real screenshots that the `screenshot` scene animates with camera moves (zoom/pan).

## Install (ask first)

```
npm install --save-dev playwright-core        # ~2 MB; reuses Remotion's headless Chrome (no second browser download)
```
If Remotion's browser is not found, set `CV_BROWSER` to a Chrome/Chromium executable or run `npx playwright install chromium`.

## video/captures.json

```json
{
  "authorized": true,
  "allowedHosts": ["staging.example.com"],
  "captures": [
    { "id": "accueil", "url": "http://localhost:3000",
      "viewport": { "width": 1280, "height": 800 },
      "redact": [".user-email", "#account-number"],
      "steps": [
        { "do": "goto" },
        { "do": "wait", "ms": 800 },
        { "do": "shot", "name": "accueil" },
        { "do": "click", "selector": "#nav-orders" },
        { "do": "wait", "ms": 600 },
        { "do": "shot", "name": "parcours" },
        { "do": "scroll", "y": 500 },
        { "do": "shot", "name": "resultat" }
      ] }
  ]
}
```

Actions: `goto` (url optional), `click`, `hover`, `type` (`selector`, `text`), `press` (`key`), `scroll` (`y`), `wait` (`ms`, max 10000), `shot` (`name`, `fullPage`). Output: `public/captures/<name>.png` + `captures.json` index (hash: unchanged definitions are skipped). Reference them in `screenshot` scenes (`"image": "captures/accueil.png"`).

## Safety rules (enforced by the code)

- `"authorized": true` is required: only capture apps the user owns or may show. Ask the user to confirm, and for any remote URL add its host to `allowedHosts`. `localhost`/`127.0.0.1` are always allowed; any other host is refused.
- Typing into a `password` field is refused. Never use real credentials: use a public page, a seeded demo account, or a pre-authenticated demo session prepared by the user.
- Password fields, `autocomplete="cc-*"` inputs, elements with `data-cv-redact`, and everything in `redact` are blurred before each screenshot. This is **best effort**: view every PNG (Read it) and delete or redo any image that shows emails, names, tokens, ids, internal URLs, customer data.
- Demo data should be fictional. Never publish a capture you did not look at.
- Captures show an interface that really exists; if you use conceptual `showcase` illustrations instead, they are labelled as illustrations automatically.

## Camera moves

`focus: [{ "x": 0.3, "y": 0.3, "zoom": 1.0, "at": 0 }, { "x": 0.7, "y": 0.4, "zoom": 1.6, "at": 5 }]` : x/y in 0-1 inside the image, `at` in seconds from the scene start; the camera eases between points. Several `images` in a showcase `screenshot` visual play one after the other. Missing images show a placeholder and a warning.
