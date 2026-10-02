// Spike runner: fixture -> both engines -> cross-check -> determinism proof.
// Exit 0 only if: both engines agree on all cross-checked dimensions,
// iso packet is byte-identical across two runs (deterministic), and the
// expected red-surface facts hold (spoofed claimed_author, ANSI sanitized,
// symlink target recorded as data, gitlink opaque, exact rename found).

import fs from 'node:fs';
import path from 'node:path';
import { makeFixtureRepo } from './fixtures/make-repo.mjs';
import { extractIso } from './engines/iso.mjs';
import { extractCli } from './engines/gitcli.mjs';
import { stableStringify, writePacket } from './lib/common.mjs';

const OUT = new URL('./out/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const failures = [];
const check = (name, cond, detail = '') => {
  console.log((cond ? 'PASS' : 'FAIL') + ' ' + name + (detail && !cond ? ' :: ' + detail : ''));
  if (!cond) failures.push(name);
};

const { dir, commits } = makeFixtureRepo();
console.log('fixture repo:', dir);

const iso1 = await extractIso(dir);
const iso2 = await extractIso(dir);
const cli = await extractCli(dir);

await writePacket(path.join(OUT, 'packet-iso.json'), iso1);
await writePacket(path.join(OUT, 'packet-cli.json'), cli);

// ---- determinism: iso twice must be byte identical
check('determinism: iso packet byte-identical across runs',
  stableStringify(iso1) === stableStringify(iso2));

const byKind = p => {
  const m = {};
  for (const o of p.observations) (m[o.kind] ||= []).push(o);
  return m;
};
const I = byKind(iso1), C = byKind(cli);

// ---- cross-engine agreement
const isoCommits = new Set((I.Commit || []).map(o => o.props.sha));
const cliCommits = new Set((C.Commit || []).map(o => o.props.sha));
check('commit SHA sets agree', [...isoCommits].every(s => cliCommits.has(s)) && isoCommits.size === cliCommits.size,
  `iso=${isoCommits.size} cli=${cliCommits.size}`);

const isoFiles = new Set((I.File || []).map(o => o.props.path));
const cliFiles = new Set((C.File || []).map(o => o.props.path));
check('file path sets agree', [...isoFiles].every(p => cliFiles.has(p)) && isoFiles.size === cliFiles.size,
  'iso=' + [...isoFiles].sort().join(',') + ' cli=' + [...cliFiles].sort().join(','));

const isoRefs = Object.fromEntries(Object.entries(iso1.ref_snapshot).filter(([, v]) => typeof v === 'string'));
const cliRefs = Object.fromEntries(Object.entries(cli.ref_snapshot).filter(([, v]) => typeof v === 'string'));
check('ref snapshot agrees', stableStringify(isoRefs) === stableStringify(cliRefs),
  `iso=${stableStringify(isoRefs)} cli=${stableStringify(cliRefs)}`);

const isoRepo = I.Repository[0], cliRepo = C.Repository[0];
check('repo identity agrees', isoRepo.id === cliRepo.id, `${isoRepo.id} vs ${cliRepo.id}`);

// claimed authorship survives in both, as CLAIMED not identity
const spoofIso = (I.PersonClaim || []).find(o => o.props.claimed_name === 'Nolan Geske');
const spoofCli = (C.PersonClaim || []).find(o => o.props.claimed_name === 'Nolan Geske');
check('spoofed claimed_author present in both, verified=false',
  !!(spoofIso && spoofCli && spoofIso.props.verified === false && spoofCli.props.verified === false));
check('claimed author email preserved', spoofIso?.props.claimed_email === 'nolan@pingsocial.com');

// ANSI injection sanitized
const c2 = (I.Commit || []).find(o => o.props.sha === commits.C2);
check('commit message sanitized (no ESC)', c2 && !c2.props.message.includes('\x1b') && c2.props.message.includes('[INFO] FAKE LOG LINE'));

// symlink recorded as data
const link = (I.File || []).find(o => o.props.path === 'evil-link');
check('symlink target recorded as data, not resolved',
  !!(link && link.props.symlink === true && link.props.symlink_target === '/etc/passwd'));

// gitlink terminal-opaque
const gl = (I.File || []).find(o => o.props.path === 'vendor/lib');
const glSub = (I.Submodule || []).find(o => o.props.path === 'vendor/lib');
check('gitlink recorded opaque, no fetch', !!(glSub && glSub.props.opaque === true && !gl));

// signatures: unsigned commits
check('unsigned commits report signature.present=false',
  (I.Commit || []).every(o => o.props.signature.present === false));

// exact rename found by CLI diffcore (iso engine has no diff: documented gap)
const exactRename = (C.Change || []).find(o => o.props.kind === 'rename-exact');
check('exact rename detected with certainty 1.0',
  !!(exactRename && exactRename.props.certainty === 1.0 &&
    exactRename.props.from_path === 'src/old-name.js' && exactRename.props.to_path === 'src/new-name.js'),
  JSON.stringify((C.Change || []).map(o => o.props.kind)));

// manifests
const pkgs = (I.Package || []).map(o => o.id).sort();
check('package deps extracted', pkgs.includes('pkg:npm/lodash@4.17.21') && pkgs.includes('pkg:npm/jest@29.7.0'), pkgs.join(','));
const schema = (I.Schema || []).find(o => o.props.kind === 'openapi');
check('openapi endpoints extracted', !!(schema && schema.props.endpoints.includes('/widgets/{id}')),
  JSON.stringify(schema?.props.endpoints));
const dep = (I.DependencyEdge || []).find(o => o.props.to === 'pkg:npm/lodash@4.17.21');
check('Repository->depends_on->Package edge', !!(dep && dep.props.from === isoRepo.id));
const tag = (C.Tag || []).find(o => o.props.name === 'v1.0.0');
check('annotated tag captured', !!(tag && tag.props.target_commit === commits.C2));
const lic = (I.License || [])[0];
check('license family detected', lic?.props.family === 'MIT');
const co = (I.Ownership || []).map(o => o.props.owner).sort();
check('CODEOWNERS extracted', co.includes('@ada') && co.includes('@grace'), co.join(','));
const wf = (I.Workflow || [])[0];
check('CI workflow captured', !!(wf && wf.props.jobs.includes('build')));
const dc = (I.Deployment || [])[0];
check('docker-compose images captured', !!(dc && dc.props.images.includes('postgres:16')));
check('remote origin recorded as data', isoRepo.props.origin_url === 'https://example.invalid/acme/widgets.git');

// quarantine clean on the healthy fixture
check('no quarantine on healthy fixture', iso1.quarantine === null && cli.quarantine === null,
  `iso=${iso1.quarantine} cli=${cli.quarantine}`);

// relationship model sanity: every rel target is a known observation id
const ids = new Set(iso1.observations.map(o => o.id));
const dangling = [];
for (const o of iso1.observations) for (const r of o.rels) if (!ids.has(r.to)) dangling.push(o.id + ' -> ' + r.to);
check('no dangling relationship targets', dangling.length === 0, dangling.slice(0, 3).join('; '));

console.log('\nobservations: iso=' + iso1.observations.length + ' cli=' + cli.observations.length);
console.log(failures.length === 0 ? '\nSPIKE: ALL CHECKS PASSED' : '\nSPIKE FAILURES: ' + failures.join(', '));
// /tmp is a 512M tmpfs: clean up the throwaway fixture repo
import('node:child_process').then(({ execFileSync }) => {
  try { execFileSync('rm', ['-rf', dir]); } catch {}
});
process.exit(failures.length ? 1 : 0);
