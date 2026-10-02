/**
 * G-15 no-execution lint: static scan of the spike's own source.
 *
 * Fails the build if the ingestion codebase can invoke anything that
 * executes repository content: checkout, clone/fetch of untrusted sources,
 * submodule recursion, LFS, worktrees, external diff drivers, shells, eval.
 *
 * The check is structural, not a string blacklist: every git() call site's
 * subcommand literal must be in the runner's allowlist, and the allowlist
 * itself must not intersect the banned set.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { allowlistedCommands } from "../src/git-runner.mjs";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "../src");
const srcFiles = readdirSync(SRC).filter((f) => f.endsWith(".mjs"));

const BANNED_COMMANDS = new Set([
  "checkout", "clone", "fetch", "pull", "push",
  "submodule", "worktree", "lfs", "bisect", "apply", "am", "rebase",
]);

test("G-15 allowlist contains no execution-capable subcommand", () => {
  const allowed = allowlistedCommands();
  for (const c of allowed) {
    assert.ok(!BANNED_COMMANDS.has(c), `allowlist contains banned command: ${c}`);
  }
  // The allowlist is plumbing-only: every entry must be a read.
  const READ_ONLY = new Set([
    "rev-list", "cat-file", "diff-tree", "ls-tree", "for-each-ref",
    "show-ref", "check-ref-format", "rev-parse", "fsck", "count-objects",
  ]);
  for (const c of allowed) {
    assert.ok(READ_ONLY.has(c), `unexpected allowlist entry (not proven read-only): ${c}`);
  }
});

test("G-15 every git() call site uses a literal allowlisted subcommand", () => {
  const allowed = new Set(allowlistedCommands());
  const callRe = /\bgit\(\s*gitDir\s*,\s*"([^"]+)"|\bgit\(\s*[a-zA-Z_$][\w$]*\s*,\s*"([^"]+)"/g;
  for (const f of srcFiles) {
    const body = readFileSync(join(SRC, f), "utf8");
    for (const m of body.matchAll(callRe)) {
      const sub = m[1] ?? m[2];
      assert.ok(allowed.has(sub), `${f}: git() call with non-allowlisted subcommand "${sub}"`);
    }
  }
});

test("G-15 no shell, no eval, no child_process outside the runner", () => {
  for (const f of srcFiles) {
    const body = readFileSync(join(SRC, f), "utf8");
    assert.ok(!body.includes("shell: true"), `${f}: shell:true forbidden`);
    assert.ok(!/\beval\s*\(/.test(body), `${f}: eval forbidden`);
    assert.ok(!/new Function\s*\(/.test(body), `${f}: new Function forbidden`);
    if (f !== "git-runner.mjs") {
      assert.ok(!body.includes("child_process"), `${f}: subprocess spawn only via git-runner.mjs`);
    }
  }
  // The runner itself spawns exactly one way: execFile("git", argv, {shell:false,...}).
  const runner = readFileSync(join(SRC, "git-runner.mjs"), "utf8");
  assert.ok(runner.includes('shell: false'), "runner must pin shell:false");
  assert.ok(runner.includes('execFile("git"'), "runner spawns only the git binary");
});

test("G-15 no recurse-submodules, no external diff driver invocation", () => {
  for (const f of srcFiles) {
    let body = readFileSync(join(SRC, f), "utf8");
    // The runner's own banned-token DATA table is not an invocation.
    body = body.replace(/const BANNED_HINTS = \[[\s\S]*?\];/, "");
    const lines = body.split("\n").filter(
      (l) => !l.trim().startsWith("*") && !l.trim().startsWith("//")
    );
    const code = lines.join("\n");
    assert.ok(!code.includes("--recurse-submodules"), `${f}: --recurse-submodules in code`);
    assert.ok(!code.includes("--ext-diff"), `${f}: external diff driver flag in code`);
    assert.ok(!code.includes("GIT_SSH_COMMAND=") || code.includes("delete env.GIT_SSH_COMMAND"),
      `${f}: ssh command must only ever be neutralized`);
  }
  // Every diff invocation in packet.mjs carries --no-ext-diff.
  const packet = readFileSync(join(SRC, "packet.mjs"), "utf8");
  const diffCalls = [...packet.matchAll(/"diff-tree",\s*args/g)];
  assert.ok(diffCalls.length >= 1, "expected diff-tree call sites");
  assert.ok(packet.includes('"--no-ext-diff"'), "diff-tree calls must pin --no-ext-diff");
});
