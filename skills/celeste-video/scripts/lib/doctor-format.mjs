import { snapshot } from "./memory.mjs";

export function memorySnapshotText() {
  const s = snapshot();
  return { free: s.freeGB, text: `${s.freeGB.toFixed(1)} GB free of ${s.totalGB.toFixed(1)} GB, ${s.cpus} CPU threads` };
}

export function formatChecks(checks) {
  const icon = { ok: "OK  ", warn: "WARN", fail: "FAIL" };
  return checks.map((c) => `${icon[c.level]} ${c.name}: ${c.detail}${c.ok ? "" : `\n       -> ${c.fix}`}`).join("\n");
}
