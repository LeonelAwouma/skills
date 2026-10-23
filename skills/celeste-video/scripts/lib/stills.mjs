// Review stills: bundle once, render several frames. Uses the project's own Remotion packages.
import { createRequire } from "node:module";
import net from "node:net";
import path from "node:path";
import { CvError, ensureDir } from "./util.mjs";
import { planRender, snapshot } from "./memory.mjs";

const freePort = () =>
  new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });

/** @returns {Promise<string[]>} written PNG paths */
export async function renderStills({ projectRoot, cfg, log, frames, props, outDir, prefix }) {
  const snap = snapshot();
  const plan = planRender(snap, cfg.render.memory, { width: props.width ?? 1080, height: props.height ?? 1920, frames: 1 });
  if (plan.verdict === "insufficient") {
    throw new CvError(`Only ${snap.freeGB.toFixed(1)} GB free: not enough to open the renderer safely.`, "Close heavy applications and retry.", 3);
  }
  const req = createRequire(path.join(projectRoot, "package.json"));
  let bundler;
  let renderer;
  try {
    bundler = req("@remotion/bundler");
    renderer = req("@remotion/renderer");
  } catch {
    throw new CvError("Remotion is not installed in this project.", "Run `cv init` (or `npm install`) in the project folder.");
  }
  ensureDir(outDir);
  const port = await freePort();
  log.info(`[still] bundling (${frames.length} frame(s), ${snap.freeGB.toFixed(1)} GB free)`);
  const serveUrl = await bundler.bundle({ entryPoint: path.join(projectRoot, "src", "index.ts") });
  const inputProps = { format: props.format, shortSide: props.shortSide };
  const composition = await renderer.selectComposition({ serveUrl, id: cfg.render.composition, inputProps, port });
  const out = [];
  for (const frame of frames) {
    if (frame < 0 || frame >= composition.durationInFrames) {
      log.warn(`frame ${frame} is outside 0-${composition.durationInFrames - 1}, skipped`);
      continue;
    }
    const output = path.join(outDir, `${prefix}-f${frame}.png`);
    await renderer.renderStill({ composition, serveUrl, frame, output, inputProps, imageFormat: "png", port });
    out.push(output);
  }
  return out;
}
