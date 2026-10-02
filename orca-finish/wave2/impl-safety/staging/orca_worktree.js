/**
 * orca_worktree.js — Per-run git worktree create/archive.
 *
 * DIRECT_REUSE of O-3 (orca-cli/orca internal/worktree, MIT), ported Go -> JS
 * with the ORCA-09 conditional-isolation policy adapted on top.
 *
 * Mechanism map record 16: per-run branch `orca/<runID>`; create off the base
 * branch with an empty-base guard; archive moves the tree to `_shipped` /
 * `_killed` BEFORE unregistering from git, so data is preserved even if the
 * prune fails; then `git worktree prune` removes the registry entry.
 *
 * Additive only: this module never mutates any existing checkout, scheduler,
 * or worker state. It owns only the directories it creates under
 * <repo>/.orca/runs/.
 *
 * Security: all git invocations go through execFileSync with an argv array
 * (no shell), so runIDs can never inject shell. runIDs are additionally
 * validated against a strict pattern to block path traversal.
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RUNS_DIR = '.orca/runs';
const RUN_BRANCH_PREFIX = 'orca/';

/** Returned when CreateForRun is called with a base branch that has no commits. */
class ErrEmptyBase extends Error {
  constructor(baseBranch) {
    super(`base branch has no commits: ${baseBranch}`);
    this.name = 'ErrEmptyBase';
    this.code = 'ERR_EMPTY_BASE';
  }
}

/** Returned when Archive/Path is called for a runID with no active worktree. */
class ErrNotFound extends Error {
  constructor(runID) {
    super(`worktree not found for run: ${runID}`);
    this.name = 'ErrNotFound';
    this.code = 'ERR_WORKTREE_NOT_FOUND';
  }
}

/** Thrown when a runID fails validation (path traversal / injection guard). */
class ErrBadRunID extends Error {
  constructor(runID) {
    super(`invalid runID: ${JSON.stringify(runID)}`);
    this.name = 'ErrBadRunID';
    this.code = 'ERR_BAD_RUN_ID';
  }
}

const RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function assertRunID(runID) {
  if (typeof runID !== 'string' || !RUN_ID_PATTERN.test(runID)) {
    throw new ErrBadRunID(runID);
  }
}

function git(dir, args) {
  try {
    return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    const err = new Error(`git ${args.join(' ')} failed: ${out.trim().slice(0, 500)}`);
    err.code = 'ERR_GIT';
    err.cause = e;
    throw err;
  }
}

/**
 * Resolve the absolute repo root for `root` (which may be any path inside the
 * repo, including a worktree subdirectory). Symlinks are resolved to the real
 * path so all derived paths are canonical.
 */
function repoRoot(root) {
  const out = git(root, ['rev-parse', '--show-toplevel']).trim();
  try {
    return fs.realpathSync(out);
  } catch {
    return out; // fall back to unresolved, as O-3 does
  }
}

function activePath(root, runID) {
  return path.join(root, RUNS_DIR, runID);
}

function archivedPath(root, runID, kind) {
  return path.join(root, RUNS_DIR, '_' + kind, runID);
}

/**
 * Create a new git worktree at <repo>/.orca/runs/<runID>/ tracking baseBranch.
 * Creates a per-run branch named `orca/<runID>` off baseBranch (the base cannot
 * be checked out directly: it is already checked out by the primary worktree).
 *
 * Returns the absolute path of the new worktree.
 * Throws ErrEmptyBase if baseBranch has no commits.
 */
function createForRun(root, runID, baseBranch) {
  assertRunID(runID);
  if (typeof baseBranch !== 'string' || baseBranch.length === 0) {
    throw new ErrBadRunID(`bad base branch: ${baseBranch}`);
  }
  const abs = repoRoot(root);

  // Detect empty branch: if git rev-parse <branch> fails, there are no commits.
  try {
    git(abs, ['rev-parse', '--verify', baseBranch]);
  } catch {
    throw new ErrEmptyBase(baseBranch);
  }

  const dest = activePath(abs, runID);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const runBranch = RUN_BRANCH_PREFIX + runID;
  git(abs, ['worktree', 'add', '-b', runBranch, dest, baseBranch]);

  return dest;
}

/**
 * Archive an active worktree: move <repo>/.orca/runs/<runID>/ to
 * <repo>/.orca/runs/_<kind>/<runID>/, then prune the git worktree registry.
 * kind must be 'shipped' or 'killed'.
 *
 * The move happens BEFORE the unregister, so data is preserved even if the
 * prune fails (the stale registry entry is cleaned up on the next prune).
 * Throws ErrNotFound if no active worktree exists for runID.
 */
function archive(root, runID, kind) {
  assertRunID(runID);
  if (kind !== 'shipped' && kind !== 'killed') {
    throw new Error(`archive kind must be 'shipped' or 'killed', got: ${JSON.stringify(kind)}`);
  }
  const abs = repoRoot(root);

  const src = activePath(abs, runID);
  if (!fs.existsSync(src)) {
    throw new ErrNotFound(runID);
  }

  const dest = archivedPath(abs, runID, kind);
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  // Move the directory first so data is preserved.
  fs.renameSync(src, dest);

  // Prune stale worktree entries now that the directory is gone from its
  // original location. Non-fatal: the worktree is already moved.
  try {
    git(abs, ['worktree', 'prune']);
  } catch {
    // The prune failure only leaves a stale .git/worktrees entry that will be
    // cleaned up on the next prune. Data is already safe in the archive dir.
  }
  return dest;
}

/**
 * Return the absolute path of the active worktree for runID.
 * Best-effort: returns a constructed path even if repo root resolution fails.
 * Does not check whether the path exists on disk.
 */
function pathFor(root, runID) {
  assertRunID(runID);
  try {
    return activePath(repoRoot(root), runID);
  } catch {
    return activePath(root, runID);
  }
}

/**
 * ORCA-09 conditional isolation policy (adapted): a dedicated worktree is
 * created only when writers would collide. Read-only lanes and sole-writer
 * lanes run directly in the checkout; the worktree is the price paid for
 * parallel writers.
 *
 * @param {{ accessMode: 'read'|'write', writerCount: number }} spec
 * @returns {'direct'|'worktree'}
 */
function needsIsolation({ accessMode, writerCount }) {
  if (accessMode === 'read') return 'direct';
  if (typeof writerCount === 'number' && writerCount > 1) return 'worktree';
  return 'direct';
}

module.exports = {
  ErrEmptyBase,
  ErrNotFound,
  ErrBadRunID,
  RUN_ID_PATTERN,
  RUN_BRANCH_PREFIX,
  createForRun,
  archive,
  pathFor,
  needsIsolation,
  repoRoot,
};
