/**
 * Hardened git subprocess runner.
 *
 * Parse-only architecture (threat register global boundary #1):
 *  - Only plumbing subcommands from an explicit allowlist are runnable.
 *  - BANNED forever: checkout, clone, fetch (network), submodule, lfs,
 *    worktree, or anything that executes repo content (hooks, smudge/clean
 *    filters, diff drivers, ssh).
 *  - execFile with a fixed argv array, shell:false always. No repo-derived
 *    string ever becomes a command, flag, or shell metacharacter.
 *  - Config isolation: repo-local config is NEVER loaded. We run with
 *    GIT_CONFIG_NOSYSTEM=1, a blank global config, a scrubbed HOME/XDG, and
 *    explicit -c overrides. core.hooksPath is pointed at /dev/null so even
 *    a hostile .git/config cannot arm hooks for the plumbing we run.
 *    Every diff invocation carries --no-ext-diff so external diff drivers
 *    can never fire (T-09).
 *  - GIT_SSH_COMMAND is neutralized and GIT_TERMINAL_PROMPT=0: the
 *    ingestion stage must never open an interactive or network path.
 */
import { execFile } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CAPS } from "./config.mjs";

const ALLOWLIST = new Set([
  "rev-list", // commit graph walk (old..new)
  "cat-file", // object reads (commit/tree/blob headers)
  "diff-tree", // commit -> file changes (with --no-ext-diff)
  "ls-tree", // tree entry listing (names validated by model.mjs)
  "for-each-ref", // ref snapshot
  "show-ref", // ref snapshot fallback
  "check-ref-format", // ref name validation
  "rev-parse", // ref resolution (with hop cap in packet.mjs)
  "fsck", // optional integrity signal
]);

const BANNED_HINTS = [
  "checkout",
  "clone",
  "fetch",
  "pull",
  "push",
  "--recurse-submodules",
  "submodule",
  "lfs",
  "worktree",
  "bisect",
  "apply",
  "am",
  "rebase",
  "filter-repo",
  "filter-branch",
];

const SANDBOX_HOME = mkdtempSync(join(tmpdir(), "git-spike-home-"));
const BLANK_GLOBAL = join(SANDBOX_HOME, "gitconfig");
import { writeFileSync } from "node:fs";
writeFileSync(BLANK_GLOBAL, "# intentionally blank: repo-local config is never loaded\n");

const BANNED_SUBSTRINGS = [
  "upload-pack",
  "receive-pack",
];

function assertSafeArgs(subcommand, args) {
  if (!ALLOWLIST.has(subcommand)) {
    throw new Error(`git runner: subcommand not allowlisted: ${subcommand}`);
  }
  for (const a of args) {
    if (typeof a !== "string") throw new Error("git runner: non-string arg");
    if (a.startsWith("-")) {
      // Flags come only from our own literal call sites (proven by the G-15
      // lint test). Shape-check them loosely, then scan for dangerous tokens.
      // Bare "--" (end of options) is always safe.
      // Spaces are allowed: argv elements are never re-split (no shell),
      // so a space inside a fixed literal cannot smuggle a new argument.
      if (a !== "--" && !/^-{1,2}[a-zA-Z0-9][a-zA-Z0-9_=.,:+%()\/ -]*$/.test(a)) {
        throw new Error(`git runner: suspicious flag shape: ${a}`);
      }
    }
    const hay = a;
    for (const hint of [...BANNED_HINTS, ...BANNED_SUBSTRINGS]) {
      // Token-boundary match: "am" must not fire inside "refname".
      const esc = hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, "i").test(hay)) {
        throw new Error(`git runner: banned token in args: ${hint}`);
      }
    }
  }
}

function isolatedEnv(gitDir) {
  const env = { ...process.env };
  delete env.GIT_SSH;
  delete env.GIT_SSH_COMMAND;
  delete env.GIT_ASKPASS;
  delete env.SSH_AUTH_SOCK;
  return {
    ...env,
    GIT_DIR: gitDir,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: BLANK_GLOBAL,
    GIT_CONFIG_SYSTEM: BLANK_GLOBAL,
    GIT_TERMINAL_PROMPT: "0",
    GIT_OPTIONAL_LOCKS: "0",
    HOME: SANDBOX_HOME,
    XDG_CONFIG_HOME: SANDBOX_HOME,
  };
}

/**
 * Run one plumbing command. Never throws for git's own nonzero exits when
 * `allowNonZero` is set (used for validation probes like check-ref-format).
 * A timeout is a hard failure: the caller quarantines the packet.
 */
export function git(gitDir, subcommand, args = [], opts = {}) {
  const timeoutMs = opts.timeoutMs ?? CAPS.gitCommandTimeoutMs;
  const argv = [
    "-c",
    "gc.auto=0",
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "core.fsmonitor=",
    subcommand,
    ...args,
  ];
  return new Promise((resolve, reject) => {
    // Validation failures reject (never sync-throw) so callers can treat
    // them uniformly with git failures.
    try {
      assertSafeArgs(subcommand, args);
    } catch (e) {
      reject(e);
      return;
    }
    const child = execFile("git", argv, {
      env: isolatedEnv(gitDir),
      shell: false,
      timeout: timeoutMs,
      maxBuffer: opts.maxBuffer ?? 64 * 1024 * 1024,
      encoding: "buffer",
    }, (err, stdout, stderr) => {
      if (err) {
        if (err.killed && err.signal === "SIGTERM") {
          const e = new Error(`git ${subcommand}: command timeout after ${timeoutMs}ms`);
          e.code = "GIT_COMMAND_TIMEOUT";
          return reject(e);
        }
        if (opts.allowNonZero) {
          return resolve({ stdout, stderr, code: err.code ?? 1 });
        }
        const e = new Error(`git ${subcommand} failed: ${String(stderr).slice(0, 500)}`);
        e.code = "GIT_FAILED";
        e.exitCode = err.code;
        return reject(e);
      }
      resolve({ stdout, stderr, code: 0 });
    });
    if (opts.input !== undefined && child.stdin) {
      child.stdin.write(opts.input);
      child.stdin.end();
    }
  });
}

/** Expose the allowlist for the G-15 lint test. */
export function allowlistedCommands() {
  return [...ALLOWLIST].sort();
}
export function bannedHints() {
  return [...BANNED_HINTS];
}
