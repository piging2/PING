/**
 * INVARIANT 04 — worktree collision → mutation refused
 * ============================================================
 * GROUNDING: DRAFT-UNGROUNDED.
 *   No worktree manager exists in the CRX runtime (practice is ad-hoc;
 *   verified against the pig-src snapshot and the 2026-09-22 crx-audit).
 *   This draft PROPOSES the interface it tests, modeled on Orca's
 *   internal/worktree/worktree.go (MIT, HARVEST_DIRECTLY — see
 *   ORCA-ARCHAEOLOGY-2026-09-23.md §1.A5) ported to the runtime's
 *   language, WITH the four hardenings Orca itself lacks:
 *     ping-runtime/orchestration/worktree_manager.js
 *       createForRun(repoRoot, runId, baseBranch) -> absolute path
 *         throws ERR_WORKTREE_EXISTS on collision (typed, not a git
 *         stderr wrap); throws ERR_EMPTY_BASE on a branch with no commits
 *       archive(repoRoot, runId, kind) — kind is a closed enum:
 *         'shipped' | 'killed'; anything else throws ERR_INVALID_KIND
 *         throws ERR_WORKTREE_NOT_FOUND when nothing is active
 *         moves data BEFORE unregistering (prune failure is non-fatal)
 *   Do NOT invent the implementation to satisfy this test. The file
 *   skips cleanly until the module exists.
 *
 * INVARIANT: two attempts never share a worktree, and no mutation
 * proceeds on a collision — the second create is refused with a typed
 * error, the first attempt's work is untouched, and archival never
 * destroys data (move-then-unregister).
 *
 * Run: node --test 04-worktree-collision-mutation-refused.test.mjs
 * Expected today: the file SKIPS with the gap statement.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const CRX_REPO = process.env.CRX_REPO || '/home/nolan/ping';
const MODULE_PATH = path.join(CRX_REPO, 'ping-runtime/orchestration/worktree_manager.js');

function loadWorktreeManager() {
  try {
    return require(MODULE_PATH);
  } catch {
    return null;
  }
}

async function git(cwd, ...args) {
  return execFileAsync('git', args, { cwd });
}

async function newRepo() {
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wt-test-'));
  await git(root, 'init', '-b', 'main');
  await git(root, 'config', 'user.email', 'test@local');
  await git(root, 'config', 'user.name', 'wt-test');
  await git(root, 'commit', '--allow-empty', '-m', 'init');
  return root;
}

test('second createForRun with the same runId is refused; first worktree untouched', async (t) => {
  const wm = loadWorktreeManager();
  if (!wm) {
    t.skip(
      'DRAFT-UNGROUNDED: ping-runtime/orchestration/worktree_manager.js does not exist. ' +
      'Port Orca internal/worktree/worktree.go (MIT) with the four hardenings in ' +
      'ORCA-ARCHAEOLOGY-2026-09-23.md §1.A5, then re-run.'
    );
    return;
  }
  const root = await newRepo();
  try {
    const p1 = await wm.createForRun(root, 'run_abc123', 'main');
    assert.ok((await fs.promises.stat(p1)).isDirectory(), 'first worktree created');

    // Write a marker file in the first worktree to prove it is untouched.
    await fs.promises.writeFile(path.join(p1, 'marker.txt'), 'first');

    await assert.rejects(
      wm.createForRun(root, 'run_abc123', 'main'),
      (err) => {
        assert.equal(err.code, 'ERR_WORKTREE_EXISTS', 'collision is a TYPED refusal, not a git stderr wrap');
        return true;
      },
      'second create with the same runId must be refused'
    );

    const marker = await fs.promises.readFile(path.join(p1, 'marker.txt'), 'utf8');
    assert.equal(marker, 'first', 'first attempt work is untouched by the refused collision');

    // A different runId on the same base proceeds — isolation, not a global lock.
    const p2 = await wm.createForRun(root, 'run_def456', 'main');
    assert.ok((await fs.promises.stat(p2)).isDirectory(), 'parallel attempt gets its own worktree');
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test('archive refuses invalid kind and missing worktrees; never destroys data', async (t) => {
  const wm = loadWorktreeManager();
  if (!wm) {
    t.skip('DRAFT-UNGROUNDED: worktree_manager.js does not exist (see above).');
    return;
  }
  const root = await newRepo();
  try {
    await wm.createForRun(root, 'run_ship1', 'main');

    await assert.rejects(
      wm.archive(root, 'run_ship1', 'bogus'),
      (err) => {
        assert.equal(err.code, 'ERR_INVALID_KIND');
        return true;
      },
      'unvalidated kind strings must not create arbitrary archive dirs (Orca gap #1)'
    );

    await assert.rejects(
      wm.archive(root, 'run_nope', 'shipped'),
      (err) => {
        assert.equal(err.code, 'ERR_WORKTREE_NOT_FOUND');
        return true;
      },
      'archiving a non-existent worktree is a typed refusal'
    );

    await wm.archive(root, 'run_ship1', 'shipped');
    const active = path.join(root, '.orca', 'runs', 'run_ship1');
    const archived = path.join(root, '.orca', 'runs', '_shipped', 'run_ship1');
    assert.ok(!(await fs.promises.stat(active).then(() => true).catch(() => false)), 'active path gone');
    assert.ok((await fs.promises.stat(archived)).isDirectory(), 'archived data preserved');

    const { stdout } = await git(root, 'worktree', 'list');
    assert.ok(!stdout.includes('run_ship1'), 'git worktree registry no longer lists the archived run');
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});

test('empty base branch is refused with a typed error', async (t) => {
  const wm = loadWorktreeManager();
  if (!wm) {
    t.skip('DRAFT-UNGROUNDED: worktree_manager.js does not exist (see above).');
    return;
  }
  const root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'wt-empty-'));
  try {
    await git(root, 'init', '-b', 'main'); // no commits
    await assert.rejects(
      wm.createForRun(root, 'run_empty', 'main'),
      (err) => {
        assert.equal(err.code, 'ERR_EMPTY_BASE');
        return true;
      },
      'base branch with no commits is refused before any mutation'
    );
  } finally {
    await fs.promises.rm(root, { recursive: true, force: true });
  }
});
