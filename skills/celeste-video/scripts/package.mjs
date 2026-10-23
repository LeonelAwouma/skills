// Builds the portable ZIP of the skill: sources, scripts, config, templates, docs, examples.
// Never packaged: node_modules, Python venvs, voice models, caches, outputs, personal media.
import fs from "node:fs";
import path from "node:path";
import { SKILL_DIR } from "./lib/util.mjs";
import { listFiles, writeZip } from "./lib/zip.mjs";

const EXCLUDED_DIRS = new Set(["node_modules", ".venv", ".venv-piper", "venv", "__pycache__", ".cv", "out", "voices", "dist", ".git", "generated"]);
const EXCLUDED_EXT = [".onnx", ".pyc", ".wav", ".mp4", ".mp3", ".zip", ".log"];

export const isExcluded = (rel, isDir) => {
  if (rel.split("/").some((p) => EXCLUDED_DIRS.has(p))) return true;
  return !isDir && EXCLUDED_EXT.some((e) => rel.toLowerCase().endsWith(e));
};

export function buildPackage(dest, { prefix = "celeste-video" } = {}) {
  const rels = listFiles(SKILL_DIR, isExcluded);
  const files = rels.map((rel) => ({ name: `${prefix}/${rel}`, data: fs.readFileSync(path.join(SKILL_DIR, rel)) }));
  // keep the (empty) generated folder so a copied template compiles after `cv prepare`
  files.push({ name: `${prefix}/templates/remotion-project/src/generated/.gitkeep`, data: Buffer.from("") });
  files.push({ name: `${prefix}/templates/remotion-project/public/.gitkeep`, data: Buffer.from("") });
  writeZip(dest, files);
  return { files: files.length, bytes: fs.statSync(dest).size };
}
