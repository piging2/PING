// Builds a deterministic throwaway fixture repo with rich structure:
// manifests, openapi, docker-compose, CI workflow, CODEOWNERS, license,
// a rename across a branch, a merge, an annotated tag, a symlink,
// a gitlink (submodule, never fetched), a spoofed author claim, and an
// ANSI-injection commit message. All dates and env fixed: byte-deterministic
// apart from nothing.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FIXED_ENV = {
  GIT_AUTHOR_NAME: 'Ada Lovelace', GIT_AUTHOR_EMAIL: 'ada@example.com',
  GIT_COMMITTER_NAME: 'Ada Lovelace', GIT_COMMITTER_EMAIL: 'ada@example.com',
  GIT_AUTHOR_DATE: '2026-01-01T10:00:00+00:00', GIT_COMMITTER_DATE: '2026-01-01T10:00:00+00:00',
  GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null',
};

function git(dir, args, extraEnv = {}, input = undefined) {
  return execFileSync('git', ['-c', 'init.defaultBranch=main', ...args], {
    cwd: dir, env: { ...process.env, ...FIXED_ENV, ...extraEnv },
    input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  });
}

const w = (dir, p, content) => {
  fs.mkdirSync(path.dirname(path.join(dir, p)), { recursive: true });
  fs.writeFileSync(path.join(dir, p), content);
};

export function makeFixtureRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanea-fixture-'));
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.name', 'Ada Lovelace']);
  git(dir, ['config', 'user.email', 'ada@example.com']);

  const PKG = {
    name: 'acme-widgets', version: '1.0.0',
    dependencies: { lodash: '4.17.21', 'node-fetch': '3.3.2' },
    devDependencies: { jest: '29.7.0' },
  };
  const OPENAPI = `openapi: 3.0.3
info: {title: Widgets API, version: 1.0.0}
paths:
  /widgets: {get: {operationId: listWidgets, responses: {'200': {description: ok}}}}
  /widgets/{id}: {get: {operationId: getWidget, responses: {'200': {description: ok}}}}}`;
  const COMPOSE = `services:
  web: {image: acme/widgets:1.0.0, ports: ["8080:8080"]}
  db: {image: postgres:16, environment: {POSTGRES_PASSWORD: changeme}}`;
  const CI = `name: ci
on: [push]
jobs:
  build: {runs-on: ubuntu-latest, steps: [{uses: actions/checkout@v4}, {run: npm test}]}`;
  const CODEOWNERS = `* @ada\n/src/ @ada @grace\n`;
  const LICENSE = `MIT License\nCopyright (c) 2026 Acme Widgets\nPermission is hereby granted...\n`;

  w(dir, 'README.md', '# Acme Widgets\n\nWe make widgets.\n');
  w(dir, 'package.json', JSON.stringify(PKG, null, 2) + '\n');
  w(dir, 'package-lock.json', JSON.stringify({ name: 'acme-widgets', version: '1.0.0', lockfileVersion: 3, packages: { '': { dependencies: PKG.dependencies } } }, null, 2));
  w(dir, 'src/old-name.js', 'module.exports = function widget() { return 1; };\n');
  w(dir, 'openapi.yaml', OPENAPI + '\n');
  w(dir, 'docker-compose.yml', COMPOSE + '\n');
  w(dir, '.github/workflows/ci.yml', CI + '\n');
  w(dir, 'CODEOWNERS', CODEOWNERS);
  w(dir, 'LICENSE', LICENSE);
  git(dir, ['add', '-A']);
  const c1 = git(dir, ['commit', '-q', '-m', 'Initial commit: widgets service skeleton']).trim();
  const C1 = git(dir, ['rev-parse', 'HEAD']).trim();

  // commit 2: spoofed author claim + ANSI-injection message (red-team surface)
  w(dir, 'README.md', '# Acme Widgets\n\nWe make widgets.\n\nUpdated docs.\n');
  w(dir, 'src/old-name.js', 'module.exports = function widget() { return 2; };\n');
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '-m', 'Docs update\x1b[2J\x1b]0;pwned\x07[INFO] FAKE LOG LINE'], {
    GIT_AUTHOR_NAME: 'Nolan Geske', GIT_AUTHOR_EMAIL: 'nolan@pingsocial.com',
  });
  const C2 = git(dir, ['rev-parse', 'HEAD']).trim();

  // feature branch: pure rename (exact, certainty 1.0), symlink, gitlink
  git(dir, ['checkout', '-q', '-b', 'feature/rename']);
  git(dir, ['mv', 'src/old-name.js', 'src/new-name.js']);
  fs.symlinkSync('/etc/passwd', path.join(dir, 'evil-link'));
  git(dir, ['add', '-A']);
  // gitlink: opaque terminal entry, no fetch ever happens.
  // NOTE: cacheinfo must come AFTER `git add -A`; add prunes index entries
  // whose paths do not exist in the working tree.
  const fakeSha = 'f'.repeat(40);
  git(dir, ['update-index', '--add', '--cacheinfo', '160000', fakeSha, 'vendor/lib']);
  git(dir, ['commit', '-q', '-m', 'Rename widget module, add vendor pin']);
  const C3 = git(dir, ['rev-parse', 'HEAD']).trim();

  // back on main: tag the spoofed commit, then merge
  git(dir, ['checkout', '-q', 'main']);
  git(dir, ['tag', '-a', 'v1.0.0', '-m', 'Release 1.0.0', C2]);
  git(dir, ['merge', '-q', '--no-ff', 'feature/rename', '-m', 'Merge feature/rename']);
  const C4 = git(dir, ['rev-parse', 'HEAD']).trim();

  // remote recorded as data only, never fetched
  git(dir, ['remote', 'add', 'origin', 'https://example.invalid/acme/widgets.git']);

  return { dir, commits: { C1, C2, C3, C4 } };
}

if (process.argv[1] && process.argv[1].endsWith('make-repo.mjs')) {
  const { dir, commits } = makeFixtureRepo();
  console.log(JSON.stringify({ dir, commits }, null, 2));
}
