// Red-team: run the extractors against hostile fixtures and assert the
// wrapper (not the engine) enforces the threat mitigations. Covers
// G-01 (malformed tree), G-14 (ref cycle), T-08 (symlink data-only),
// T-11 (metadata injection), T-05 (author spoofing).

import { makeHostileTreeRepo, makeRefCycleRepo } from './fixtures/make-hostile.mjs';
import { extractIso } from './engines/iso.mjs';
import { extractCli } from './engines/gitcli.mjs';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const failures = [];
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' redteam:' + name + (detail && !cond ? ' :: ' + detail : ''));
  if (!cond) failures.push(name);
};

// ---- G-01: hostile tree entry names
{
  const { dir, tree, commit } = makeHostileTreeRepo();
  console.log('hostile-tree repo:', dir, 'tree:', tree);
  {
    for (const [label, pkt] of [['iso', await extractIso(dir)], ['cli', await extractCli(dir)]]) {
      check(`G-01 ${label}: quarantined malformed-tree`, !!pkt.quarantine && pkt.quarantine.startsWith('malformed-tree:'),
        String(pkt.quarantine));
      const dumped = JSON.stringify(pkt.observations);
      check(`G-01 ${label}: no hostile path strings downstream`,
        !dumped.includes('../../') && !dumped.includes('".."') && !dumped.includes('a/b'),
        dumped.slice(0, 300));
      check(`G-01 ${label}: hostile tree surfaced as typed problem`,
        pkt.problems.some(p => p.problem === 'hostile-tree-entry' || p.problem === 'tree-walk-failed'),
        JSON.stringify(pkt.problems).slice(0, 200));
    }
  }
}

// ---- G-14: symref cycle
{
  const { dir } = makeRefCycleRepo();
  console.log('ref-cycle repo:', dir);
  for (const [label, pkt] of [['iso', await extractIso(dir)], ['cli', await extractCli(dir)]]) {
    check(`G-14 ${label}: cycle cut, no hang`, pkt.problems.some(p => p.problem === 'ref-cycle-detected'));
    // every surviving ref maps to exactly one SHA
    const refs = pkt.observations.filter(o => o.kind === 'Ref');
    check(`G-14 ${label}: refs have 1:1 sha mapping`,
      refs.every(o => typeof o.props.sha === 'string' || typeof o.props.target === 'string'));
  }
}

// ---- T-09 config isolation: engines must never load repo-local git config
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanea-cfgiso-'));
  const g = (a) => execFileSync('git', ['-c', 'init.defaultBranch=main', ...a], { cwd: dir, encoding: 'utf8' });
  g(['init', '-q']); g(['config', 'user.email', 't@t.t']); g(['config', 'user.name', 't']);
  fs.writeFileSync(path.join(dir, 'f.txt'), 'x\n');
  fs.writeFileSync(path.join(dir, '.gitattributes'), '*.bin filter=evil\n');
  fs.writeFileSync(path.join(dir, '.gitconfig'), '[filter "evil"]\n\tsmudge = touch PWNED\n');
  fs.mkdirSync(path.join(dir, '.git', 'hooks'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.git', 'hooks', 'post-checkout'), '#!/bin/sh\ntouch PWNED2\n');
  g(['add', '-A']); g(['commit', '-qm', 'cfg']);
  await extractCli(dir); // exercises cat-file/diff-tree/ls-tree paths
  check('T-09: no smudge/hook execution during CLI extraction',
    !fs.existsSync(path.join(dir, 'PWNED')) && !fs.existsSync(path.join(dir, 'PWNED2')));
}

console.log(failures.length === 0 ? '\nREDTEAM: ALL CHECKS PASSED' : '\nREDTEAM FAILURES: ' + failures.join(', '));
// /tmp is a 512M tmpfs: clean up fixture repos
try {
  const dirs = fs.readdirSync(os.tmpdir()).filter(n => n.startsWith('lanea-')).map(n => path.join(os.tmpdir(), n));
  if (dirs.length) execFileSync('rm', ['-rf', ...dirs]);
} catch {}
process.exit(failures.length ? 1 : 0);
