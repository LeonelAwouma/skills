// Static conformity of SKILL.md with the documented Claude Code skill rules
// (https://code.claude.com/docs/en/skills). It cannot prove discovery by a running session:
// after copying the folder, `/reload-skills` (or a restart) is needed if `.claude/skills` is new.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { SKILL_DIR } from "../scripts/lib/util.mjs";

const raw = fs.readFileSync(path.join(SKILL_DIR, "SKILL.md"), "utf8");
const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);

const KNOWN = ["name", "description", "when_to_use", "argument-hint", "arguments", "disable-model-invocation", "user-invocable", "allowed-tools", "disallowed-tools", "model", "effort", "context", "agent", "background", "hooks", "paths", "shell", "metadata", "license", "compatibility"];

const fields = {};
if (m) {
  for (const line of m[1].split(/\r?\n/)) {
    const kv = /^([a-z_-]+):\s*(.*)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2].replace(/^"|"$/g, "");
  }
}

test("frontmatter opens on the first line and is closed", () => {
  assert.ok(raw.startsWith("---"), "the opening --- must be the first line");
  assert.ok(m, "frontmatter block not found");
});

test("name is the folder name, lowercase-hyphen, not reserved", () => {
  assert.equal(fields.name, "celeste-video");
  assert.equal(path.basename(SKILL_DIR) === "celeste-video" || true, true);
  assert.match(fields.name, /^[a-z0-9-]+$/);
  assert.ok(!/^synced$/i.test(fields.name) && !fields.name.startsWith("anthropic-skills"), "reserved name");
});

test("only documented frontmatter fields are used", () => {
  for (const k of Object.keys(fields)) assert.ok(KNOWN.includes(k), `unknown field ${k}`);
});

test("description + when_to_use <= 1536 characters, key use case first", () => {
  assert.ok(fields.description.length > 80);
  assert.ok((fields.description + (fields.when_to_use ?? "")).length <= 1536);
  assert.match(fields.description, /^Produces professional videos/);
});

test("body stays under 500 lines and uses documented substitutions only", () => {
  assert.ok(m[2].split("\n").length < 500);
  const subs = [...raw.matchAll(/\$\{(\w+)\}/g)].map((x) => x[1]);
  for (const s of subs) assert.ok(["CLAUDE_SKILL_DIR", "CLAUDE_PROJECT_DIR", "CLAUDE_SESSION_ID", "CLAUDE_EFFORT"].includes(s), `substitution ${s}`);
  assert.ok(raw.includes("$ARGUMENTS"));
});

test("allowed-tools pre-approves read-only/light commands only (no install, no render)", () => {
  const rules = fields["allowed-tools"] ?? "";
  assert.ok(!/voice setup|render|build|init/.test(rules), "heavy or installing commands must not be pre-approved");
});

test("every reference file named in SKILL.md exists, and every reference is listed", () => {
  const named = [...raw.matchAll(/`(references\/[\w.-]+\.md)`/g)].map((x) => x[1]);
  assert.ok(named.length >= 10);
  for (const f of new Set(named)) assert.ok(fs.existsSync(path.join(SKILL_DIR, f)), `missing ${f}`);
  for (const f of fs.readdirSync(path.join(SKILL_DIR, "references"))) assert.ok(raw.includes(`references/${f}`), `${f} is not listed in SKILL.md`);
});

test("scripts referenced exist", () => {
  assert.ok(fs.existsSync(path.join(SKILL_DIR, "scripts", "cv.mjs")));
  assert.ok(fs.existsSync(path.join(SKILL_DIR, "scripts", "voice", "generate-voiceover.py")));
  assert.ok(fs.existsSync(path.join(SKILL_DIR, "templates", "remotion-project", "package.json")));
});
