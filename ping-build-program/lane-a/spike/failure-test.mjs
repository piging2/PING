// Failure tests: hostile/degenerate repo shapes through the REAL engines.
// F-01 pack bomb (per-blob cap, pre-read enforcement, memory bound)
// F-02 corrupt object (typed failure, no crash)
// F-03 shallow clone (partial-history marking)
// F-04 inexact rename (scored hypothesis, not a fact)

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeFixtureRepo } from './fixtures/make-repo.mjs';
import { extractIso } from './engines/iso.mjs';
import { extractCli } from './engines/gitcli.mjs';
import { CAPS } from './lib/common.mjs';

const failures = [];
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' failtest:' + name + (detail && !cond ? ' :: ' + detail : ''));
  if (!cond) failures.push(name);
};
const ENV = { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' };
const g = (dir, a, input) => execFileSync('git', ['-c', 'init.defaultBranch=main', ...a],
  { cwd: dir, env: { ...process.env, ...ENV }, input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

// ---- F-01 pack bomb: 5 MB declared blob of zeros, spike cap is 1 MiB
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanea-packbomb-'));
  g(dir, ['init', '-q']); g(dir, ['config', 'user.email', 't@t.t']); g(dir, ['config', 'user.name', 't']);
  const big = Buffer.alloc(5 * 1024 * 1024, 0);
  fs.writeFileSync(path.join(dir, 'zeros.bin'), big);
  fs.writeFileSync(path.join(dir, 'small.txt'), 'tiny\n');
  g(dir, ['add', '-A']); g(dir, ['commit', '-qm', 'bomb']);
  const memBefore = process.memoryUsage().heapUsed;
  let pkt;
  try { pkt = await extractCli(dir); } catch (e) { pkt = { threw: String(e).slice(0, 200) }; }
  const memAfter = process.memoryUsage().heapUsed;
  check('F-01: no throw on pack bomb', !pkt.threw, pkt.threw);
  const f = (pkt.observations || []).find(o => o.kind === 'File' && o.props.path === 'zeros.bin');
  check('F-01: blob truncated by pre-read cap, content never inflated',
    !!(f && f.props.truncated === true && f.props.size === 5 * 1024 * 1024), JSON.stringify(f?.props));
  check('F-01: heap delta under 8 MiB despite 5 MiB declared blob',
    (memAfter - memBefore) < 8 * 1024 * 1024, `delta=${((memAfter - memBefore) / 1048576).toFixed(1)} MiB`);
  const small = (pkt.observations || []).find(o => o.kind === 'File' && o.props.path === 'small.txt');
  check('F-01: small blob still ingested', !!(small && small.props.truncated === false));
  // iso engine: documents the gap (post-read enforcement only)
  const ipkt = await extractIso(dir);
  const if_ = (ipkt.observations || []).find(o => o.kind === 'File' && o.props.path === 'zeros.bin');
  check('F-01: iso marks truncated (post-read; pre-read cap NOT enforceable)',
    !!(if_ && if_.props.truncated === true));
}

// ---- F-02 corrupt object: flip bytes in a loose blob
{
  const { dir } = makeFixtureRepo();
  const objs = [];
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name.length === 2) walk(p); }
      else if (!['pack', 'info'].includes(e.name)) objs.push(p);
    }
  };
  walk(path.join(dir, '.git', 'objects'));
  const victim = objs.find(p => p.endsWith('.idx') === false) || objs[0];
  const buf = fs.readFileSync(victim);
  buf[Math.floor(buf.length / 2)] ^= 0xff;
  fs.writeFileSync(victim, buf);
  let threw = null, pkt = null;
  try { pkt = await extractCli(dir); } catch (e) { threw = String(e).slice(0, 160); }
  check('F-02: corrupt repo does not crash the extractor', threw === null, threw);
  check('F-02: corruption surfaces as typed problem/quarantine',
    (pkt.problems || []).length > 0 || !!pkt.quarantine,
    JSON.stringify((pkt.problems || []).slice(0, 2)));
}

// ---- F-03 shallow clone
{
  const { dir: src } = makeFixtureRepo();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanea-shallow-'));
  fs.rmdirSync(dir);
  execFileSync('git', ['clone', '-q', '--depth', '1', `file://${src}`, dir],
    { env: { ...process.env, ...ENV } });
  const pkt = await extractCli(dir);
  check('F-03: shallow history marked partial',
    pkt.observations.find(o => o.kind === 'Repository')?.props.history_completeness === 'partial-shallow');
  check('F-03: shallow walk sees fewer commits than full',
    pkt.counts.commits < 4, `commits=${pkt.counts.commits}`);
}

// ---- F-04 renames: exact (pure mv) vs inexact (small edit)
{
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lanea-rename-'));
  g(dir, ['init', '-q']); g(dir, ['config', 'user.email', 't@t.t']); g(dir, ['config', 'user.name', 't']);
  const body = Array.from({ length: 50 }, (_, i) => `line ${i} of the guide`).join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'guide.md'), body);
  fs.writeFileSync(path.join(dir, 'exact.txt'), 'identical content\n');
  g(dir, ['add', '-A']); g(dir, ['commit', '-qm', 'base']);
  g(dir, ['mv', 'exact.txt', 'exact-moved.txt']);
  fs.renameSync(path.join(dir, 'guide.md'), path.join(dir, 'manual.md'));
  const edited = body.replace('line 25 of the guide', 'line 25 of the manual (updated)');
  fs.writeFileSync(path.join(dir, 'manual.md'), edited);
  g(dir, ['add', '-A']); g(dir, ['commit', '-qm', 'rename both']);
  const pkt = await extractCli(dir);
  const changes = (pkt.observations || []).filter(o => o.kind === 'Change');
  const exact = changes.find(o => o.props.kind === 'rename-exact');
  const inexact = changes.find(o => o.props.kind === 'rename-inexact');
  check('F-04: pure mv is rename-exact with certainty 1.0',
    !!(exact && exact.props.certainty === 1.0), JSON.stringify(changes.map(c => c.props.kind)));
  check('F-04: edited rename is rename-inexact with 0 < similarity < 1',
    !!(inexact && inexact.props.similarity > 0 && inexact.props.similarity < 1),
    JSON.stringify(inexact?.props));
  check('F-04: inexact rename recorded as hypothesis (certainty < 1)',
    !!(inexact && inexact.props.certainty < 1.0));
}

console.log(failures.length === 0 ? '\nFAILTEST: ALL CHECKS PASSED' : '\nFAILTEST FAILURES: ' + failures.join(', '));
// /tmp is a 512M tmpfs: clean up fixture repos
try { execFileSync('rm', ['-rf', ...fs.readdirSync(os.tmpdir()).filter(n => n.startsWith('lanea-')).map(n => path.join(os.tmpdir(), n))]); } catch {}
process.exit(failures.length ? 1 : 0);
