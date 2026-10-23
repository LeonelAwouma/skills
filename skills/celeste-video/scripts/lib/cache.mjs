// Stage cache: a stage is skipped when its input hash is unchanged AND its outputs still exist.
import path from "node:path";
import { exists, readJson, writeJson } from "./util.mjs";

const file = (cacheDir) => path.join(cacheDir, "stages.json");

export function load(cacheDir) {
  return exists(file(cacheDir)) ? readJson(file(cacheDir)) : {};
}

/** true when the stage can be skipped. `outputs` are absolute paths that must exist. */
export function isFresh(cacheDir, stage, inputHash, outputs = []) {
  const entry = load(cacheDir)[stage];
  return !!entry && entry.hash === inputHash && outputs.every((o) => exists(o));
}

export function record(cacheDir, stage, inputHash, extra = {}) {
  const all = load(cacheDir);
  all[stage] = { hash: inputHash, at: new Date().toISOString(), ...extra };
  writeJson(file(cacheDir), all);
}

export function invalidate(cacheDir, stage) {
  const all = load(cacheDir);
  delete all[stage];
  writeJson(file(cacheDir), all);
}
