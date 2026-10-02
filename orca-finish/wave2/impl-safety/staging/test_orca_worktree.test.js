/**
 * Tests for orca_worktree.js — per-run git worktree create/archive (O-3 port).
 * Run: node --test lib/orca/test/
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const wt = require('../orca_worktree.js');

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** Fresh temp git repo with one commit. */
function newRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-wt-test-'));
  git(dir, ['init', '-b', 'main']);
  git(dir, ['config', 'user.email', 'test@local']);
  git(dir, ['config', 'user.name', 'test']);
  fs.writeFileSync(path.join(dir, 'README.md'), 'hi\n');
  git(dir, ['add', '.']);
  git(dir, ['commit', '-m', 'init']);
  return dir;
}

function newEmptyRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'orca-wt-empty-'));
  git(dir, ['init', '-b', 'main']);
  return dir;
}

test('createForRun happy path: isolated tree on orca/<runID> branch', () => {
  const root = newRepo();
  const runID = 'run_abc12345';
  const p = wt.createForRun(root, runID, 'main');
  assert.equal(p, path.join(fs.realpathSync(root), '.orca', 'runs', runID));
  const st = fs.statSync(p);
  assert.ok(st.isDirectory());
  // Valid git repo inside.
  const head = git(p, ['rev-parse', 'HEAD']).trim();
  assert.match(head, /^[0-9a-f]{40}$/);
  // Per-run branch exists. --format strips git's worktree marker ('+ '),
  // which git branch --list adds for branches checked out in linked
  // worktrees (this branch was just checked out by createForRun).
  const branch = git(root, ['branch', '--list', '--format=%(refname:short)', 'orca/' + runID]).trim();
  assert.equal(branch, 'orca/' + runID);
});

test('createForRun on empty base throws ErrEmptyBase', () => {
  const root = newEmptyRepo();
  assert.throws(() => wt.createForRun(root, 'run_empty', 'main'), (e) => {
    assert.ok(e instanceof wt.ErrEmptyBase);
    assert.equal(e.code, 'ERR_EMPTY_BASE');
    return true;
  });
});

test('createForRun collision: same runID twice throws (branch exists)', () => {
  const root = newRepo();
  wt.createForRun(root, 'run_dup', 'main');
  assert.throws(() => wt.createForRun(root, 'run_dup', 'main'), /git worktree add/);
});

test('archive shipped: data preserved, registry pruned', () => {
  const root = newRepo();
  const runID = 'run_ship1234';
  const p = wt.createForRun(root, runID, 'main');
  fs.writeFileSync(path.join(p, 'WORK.txt'), 'precious run data\n');

  const dest = wt.archive(root, runID, 'shipped');

  assert.ok(!fs.existsSync(path.join(fs.realpathSync(root), '.orca', 'runs', runID)), 'active tree gone');
  assert.equal(dest, path.join(fs.realpathSync(root), '.orca', 'runs', '_shipped', runID));
  const st = fs.statSync(dest);
  assert.ok(st.isDirectory());
  assert.equal(fs.readFileSync(path.join(dest, 'WORK.txt'), 'utf8'), 'precious run data\n');

  const list = git(root, ['worktree', 'list']);
  assert.ok(!list.includes(runID), `registry must not contain ${runID} after archive:\n${list}`);
});

test('archive killed goes to _killed', () => {
  const root = newRepo();
  const runID = 'run_kill1';
  wt.createForRun(root, runID, 'main');
  const dest = wt.archive(root, runID, 'killed');
  assert.ok(dest.endsWith(path.join('_killed', runID)));
  assert.ok(fs.statSync(dest).isDirectory());
});

test('archive missing run throws ErrNotFound', () => {
  const root = newRepo();
  assert.throws(() => wt.archive(root, 'run_notexist', 'shipped'), (e) => {
    assert.ok(e instanceof wt.ErrNotFound);
    return true;
  });
});

test('runID validation blocks path traversal', () => {
  const root = newRepo();
  for (const bad of ['../evil', 'a/b', '', '.hidden', '-lead']) {
    assert.throws(() => wt.createForRun(root, bad, 'main'), wt.ErrBadRunID, `runID ${JSON.stringify(bad)}`);
  }
});

test('pathFor returns expected structure without touching disk', () => {
  const root = newRepo();
  const got = wt.pathFor(root, 'run_pathtest');
  assert.equal(got, path.join(fs.realpathSync(root), '.orca', 'runs', 'run_pathtest'));
});

test('needsIsolation: ORCA-09 conditional policy', () => {
  assert.equal(wt.needsIsolation({ accessMode: 'read', writerCount: 5 }), 'direct');
  assert.equal(wt.needsIsolation({ accessMode: 'write', writerCount: 1 }), 'direct');
  assert.equal(wt.needsIsolation({ accessMode: 'write', writerCount: 0 }), 'direct');
  assert.equal(wt.needsIsolation({ accessMode: 'write', writerCount: 2 }), 'worktree');
  assert.equal(wt.needsIsolation({ accessMode: 'write', writerCount: 10 }), 'worktree');
});
