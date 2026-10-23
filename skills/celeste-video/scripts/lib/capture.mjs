// Optional interface capture with Playwright. Disabled unless video/captures.json exists and
// declares "authorized": true. Designed so that no credential or private data ends up in a video.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { CvError, ensureDir, exists, readJson, sha, writeJson, IS_WIN } from "./util.mjs";

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "::1"];
const ALWAYS_REDACT = ['input[type="password"]', 'input[autocomplete*="cc-"]', "[data-cv-redact]"];
const ACTIONS = ["goto", "click", "type", "press", "scroll", "wait", "hover", "shot"];

/** Pure check, unit tested: may this URL be captured? */
export function hostAllowed(url, allowedHosts = []) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return LOCAL_HOSTS.includes(host) || allowedHosts.map((h) => h.toLowerCase()).includes(host.toLowerCase());
}

/** Pure validation of a captures file, unit tested. Returns a list of problems. */
export function validateCaptures(file, cfgHosts = []) {
  const problems = [];
  if (file.authorized !== true) problems.push('"authorized": true is required: only capture applications you own or are allowed to show');
  const hosts = [...cfgHosts, ...(file.allowedHosts ?? [])];
  (file.captures ?? []).forEach((c, i) => {
    const at = `captures[${i}]`;
    if (!/^[a-z0-9][a-z0-9-]*$/.test(c.id ?? "")) problems.push(`${at}.id: lowercase letters, digits, dashes`);
    if (!hostAllowed(c.url, hosts)) problems.push(`${at}.url: host not allowed (${c.url}). Local hosts are always allowed; others must be listed in allowedHosts`);
    (c.steps ?? []).forEach((s, j) => {
      if (!ACTIONS.includes(s.do)) problems.push(`${at}.steps[${j}].do: one of ${ACTIONS.join(", ")}`);
      if (["click", "type", "hover"].includes(s.do) && !s.selector) problems.push(`${at}.steps[${j}]: "selector" required`);
      if (s.do === "type" && typeof s.text !== "string") problems.push(`${at}.steps[${j}]: "text" required`);
      if (s.do === "goto" && s.url && !hostAllowed(s.url, hosts)) problems.push(`${at}.steps[${j}].url: host not allowed (${s.url})`);
    });
  });
  return problems;
}

function findBrowser(projectRoot) {
  if (process.env.CV_BROWSER && exists(process.env.CV_BROWSER)) return process.env.CV_BROWSER;
  const root = path.join(projectRoot, "node_modules", ".remotion", "chrome-headless-shell");
  if (!exists(root)) return null;
  const exe = IS_WIN ? "chrome-headless-shell.exe" : "chrome-headless-shell";
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name === exe) return p;
    }
  }
  return null;
}

function loadPlaywright(projectRoot) {
  const req = createRequire(path.join(projectRoot, "package.json"));
  for (const name of ["playwright-core", "playwright"]) {
    try {
      return req(name);
    } catch {
      /* try next */
    }
  }
  throw new CvError("Playwright is not installed in this project (it is optional).", "Run `npm install --save-dev playwright-core` in the project. It reuses Remotion's headless Chrome, so no extra browser download is needed.");
}

export async function runCaptures({ projectRoot, paths, cfg, log, force = false }) {
  const file = path.join(paths.video, "captures.json");
  if (!exists(file)) return { skipped: true, reason: "no video/captures.json (feature off)" };
  const def = readJson(file);
  const problems = validateCaptures(def, cfg.capture.allowedHosts);
  if (problems.length) throw new CvError(`captures.json refused:\n - ${problems.join("\n - ")}`);

  const outDir = path.join(paths.public, "captures");
  const hash = sha(def);
  const index = path.join(outDir, "captures.json");
  if (!force && exists(index) && readJson(index).hash === hash) {
    log.info("[capture] up to date, skipped");
    return { skipped: true, reason: "unchanged" };
  }

  const pw = loadPlaywright(projectRoot);
  const executablePath = findBrowser(projectRoot);
  const browser = await pw.chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  ensureDir(outDir);
  const shots = [];
  try {
    for (const c of def.captures) {
      const page = await browser.newPage({ viewport: c.viewport ?? { width: 1280, height: 800 }, deviceScaleFactor: c.deviceScaleFactor ?? 1 });
      const redact = [...ALWAYS_REDACT, ...(c.redact ?? [])].join(",");
      const applyRedaction = async () => {
        await page.addStyleTag({ content: `${redact}{filter:blur(9px) !important;} ${redact}::placeholder{color:transparent !important}` }).catch(() => {});
      };
      for (const [j, s] of (c.steps ?? [{ do: "goto" }, { do: "shot", name: c.id }]).entries()) {
        log.debug(`[capture] ${c.id} step ${j}: ${s.do}`);
        if (s.do === "goto") await page.goto(s.url ?? c.url, { waitUntil: "load", timeout: 45000 });
        else if (s.do === "click") await page.click(s.selector, { timeout: 10000 });
        else if (s.do === "hover") await page.hover(s.selector, { timeout: 10000 });
        else if (s.do === "press") await page.keyboard.press(s.key ?? "Enter");
        else if (s.do === "wait") await page.waitForTimeout(Math.min(s.ms ?? 500, 10000));
        else if (s.do === "scroll") await page.mouse.wheel(0, s.y ?? 400);
        else if (s.do === "type") {
          const kind = await page.$eval(s.selector, (el) => (el.getAttribute("type") || el.tagName).toLowerCase());
          if (kind === "password") throw new CvError(`Refused: step ${j} of "${c.id}" types into a password field.`, "Never put credentials in a demo. Use a pre-authenticated demo account/session or a public page.");
          await page.fill(s.selector, s.text);
        } else if (s.do === "shot") {
          await applyRedaction();
          const name = s.name ?? `${c.id}-${shots.length + 1}`;
          const dest = path.join(outDir, `${name}.png`);
          await page.screenshot({ path: dest, fullPage: !!s.fullPage });
          shots.push({ name, file: `captures/${name}.png`, source: c.id });
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }
  writeJson(index, { hash, shots, note: "Automatic redaction is best effort: review every image before publishing." });
  log.warn(`${shots.length} capture(s) written to public/captures/. Review each image: redaction is best effort and nothing confidential may appear.`);
  return { skipped: false, shots };
}
