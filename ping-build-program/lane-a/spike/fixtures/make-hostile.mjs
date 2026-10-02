// Hostile fixtures for red-team assertions (G-01 tree names, G-14 ref cycle).
// Built with plumbing only; git fsck would flag these, git checkout refuses
// them. The ingestion wrapper must quarantine, not crash.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ENV = {
  GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@t.t',
  GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@t.t',
  GIT_AUTHOR_DATE: '2026-01-01T10:00:00+00:00', GIT_COMMITTER_DATE: '2026-01-01T10:00:00+00:00',
  GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
};
function git(dir, args, input) {
  return execFileSync('git', ['-c', 'init.defaultBranch=main', ...args], {
    cwd: dir, env: { ...process.env, ...ENV }, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  });
}

// G-01: tree with hostile entry names. git mktree refuses these, so craft
// raw tree bytes and write with `git hash-object -t tree -w --stdin`:
// entry = <mode> SP <name> NUL <20-byte-sha>
export function makeHostileTreeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanea-hostile-'));
  git(dir, ['init', '-q']);
  fs.writeFileSync(path.join(dir, 'ok.txt'), 'fine\n');
  git(dir, ['add', 'ok.txt']);
  git(dir, ['commit', '-q', '-m', 'base']);
  const blobHex = git(dir, ['hash-object', '-w', path.join(dir, 'ok.txt')]).trim();
  const blobBin = Buffer.from(blobHex, 'hex');
  const names = ['..', '../../evil', 'a/b', '.', '.git', '', 'ok.txt'];
  const parts = [];
  for (const n of names) {
    parts.push(Buffer.concat([Buffer.from('100644 ' + n), Buffer.from([0]), blobBin]));
  }
  const treeBuf = Buffer.concat(parts);
  const tree = execFileSync('git', ['hash-object', '-t', 'tree', '--literally', '-w', '--stdin'], {
    cwd: dir, env: { ...process.env, ...ENV }, input: treeBuf, encoding: 'utf8',
  }).trim();
  const commit = git(dir, ['commit-tree', tree, '-m', 'hostile tree commit']).trim();
  git(dir, ['update-ref', 'refs/heads/hostile', commit]);
  return { dir, tree, commit };
}

// G-14: symref cycle refs/heads/a <-> refs/heads/b
export function makeRefCycleRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanea-refcycle-'));
  git(dir, ['init', '-q']);
  fs.writeFileSync(path.join(dir, 'f.txt'), 'x\n');
  git(dir, ['add', 'f.txt']);
  git(dir, ['commit', '-q', '-m', 'base']);
  git(dir, ['symbolic-ref', 'refs/heads/a', 'refs/heads/b']);
  git(dir, ['symbolic-ref', 'refs/heads/b', 'refs/heads/a']);
  return { dir };
}

if (process.argv[1] && process.argv[1].endsWith('make-hostile.mjs')) {
  console.log(JSON.stringify(makeHostileTreeRepo(), null, 2));
}
