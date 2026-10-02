// Shared deterministic primitives for the lane-a git ingestion spike.
// Parse-only: this module never executes repo content, never materializes
// trees to disk, never resolves symlinks.

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

// ---------------------------------------------------------------- caps
// One config module for every resource boundary (see threat doc table).
export const CAPS = {
  maxBlobBytes: 1 * 1024 * 1024,        // spike-scale per-blob cap (prod: 64 MiB)
  maxTreeDepth: 32,
  maxTreeEntries: 100000,
  maxCommitsWalked: 10000,
  maxRefs: 5000,
  maxMetaField: 10 * 1024,              // commit messages etc
  maxSymlinkTarget: 4 * 1024,
  maxGitlinks: 1000,
  symrefHops: 5,
  packetTimeoutMs: 120_000,
};

// ---------------------------------------------------------------- sanitize
// T-11: neutralize ANSI escapes, C0/C1 controls, bidi overrides at the
// ingestion boundary. Returns {text, truncated}.
const ANSI_RE = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[()#][0-9A-Z]/g;
const CONTROL_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g;
const BIDI_RE = /[\u202a-\u202e\u2066-\u2069]/g;

export function sanitizeMeta(s, { allowNewlines = true } = {}) {
  let t = String(s ?? '');
  t = t.replace(ANSI_RE, '[ansi]');
  t = t.replace(BIDI_RE, '[bidi]');
  t = t.replace(CONTROL_RE, '');
  if (!allowNewlines) t = t.replace(/\n/g, ' ');
  let truncated = false;
  if (t.length > CAPS.maxMetaField) { t = t.slice(0, CAPS.maxMetaField) + '[truncated]'; truncated = true; }
  return { text: t, truncated };
}

// ---------------------------------------------------------------- tree-name gate (T-01)
// Same gates as git fsck: reject empty, '.', '..', '.git', names with '/'.
export function validateTreeName(name) {
  if (typeof name !== 'string' || name.length === 0) return 'empty-name';
  if (name === '.' || name === '..') return 'dot-component';
  if (name.toLowerCase() === '.git') return 'dotgit';
  if (name.includes('/')) return 'full-pathname';
  if (name.includes('\0')) return 'nul-byte';
  if (Buffer.byteLength(name) > 255) return 'name-too-long';
  return null; // valid
}

// ---------------------------------------------------------------- ref reader
// Own ref enumeration (not `git for-each-ref`, which silently drops
// unresolvable symrefs): full control for T-12 mitigations — name
// validation, symref hop cap, explicit cycle/collision reporting.
// Returns { raw, resolved, problems, headRaw }. `resolved` maps every
// resolvable non-HEAD ref to exactly one SHA; HEAD stays symbolic in
// `raw`/`headRaw` so the snapshot records the aliasing separately.
const BAD_REF_RE = /(^|\/)\.|(\.\.)|(^\/)|(\/$)|(\/\/)|[ ~^:?*[]|\\.lock$/;

export async function readRefs(gitdir) {
  const problems = [];
  const refs = {};
  const packedPath = path.join(gitdir, 'packed-refs');
  const packed = {};
  try {
    const txt = await fs.readFile(packedPath, 'utf8');
    for (const line of txt.split('\n')) {
      if (!line || line.startsWith('#') || line.startsWith('^')) continue;
      const [sha, name] = line.split(' ');
      if (sha && name) packed[name] = sha;
    }
  } catch { /* no packed-refs */ }
  async function scan(dir, prefix) {
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      const name = prefix + e.name;
      if (e.isDirectory()) { await scan(full, name + '/'); continue; }
      if (e.name.endsWith('.lock')) continue;
      const raw = (await fs.readFile(full, 'utf8')).trim();
      refs[name] = raw.startsWith('ref: ') ? { symref: raw.slice(5) } : { sha: raw };
    }
  }
  await scan(path.join(gitdir, 'refs'), 'refs/');
  for (const [k, v] of Object.entries(packed)) if (!(k in refs)) refs[k] = { sha: v };
  try {
    const head = (await fs.readFile(path.join(gitdir, 'HEAD'), 'utf8')).trim();
    refs['HEAD'] = head.startsWith('ref: ') ? { symref: head.slice(5) } : { sha: head };
  } catch { /* detached/absent */ }

  const resolved = {};
  function resolve(name, hops = 0, seen = []) {
    if (hops > CAPS.symrefHops) { problems.push({ ref: name, problem: 'ref-cycle-or-too-deep', seen }); return null; }
    const r = refs[name];
    if (!r) return null;
    if (r.sha) return r.sha;
    if (seen.includes(name)) { problems.push({ ref: name, problem: 'ref-cycle-detected', seen }); return null; }
    return resolve(r.symref, hops + 1, [...seen, name]);
  }
  const valid = {};
  for (const [name, r] of Object.entries(refs)) {
    if (BAD_REF_RE.test(name)) { problems.push({ ref: name, problem: 'invalid-ref-name', dropped: true }); continue; }
    valid[name] = r;
  }
  let count = 0;
  for (const name of Object.keys(valid)) {
    if (name === 'HEAD') continue;
    if (++count > CAPS.maxRefs) { problems.push({ problem: 'max-refs-exceeded' }); break; }
    const sha = resolve(name);
    if (sha) resolved[name] = sha;
  }
  return { raw: valid, resolved, problems, headRaw: valid['HEAD'] ?? null };
}

// ---------------------------------------------------------------- stable json
export function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (v === undefined) return 'null';
  if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
  const keys = Object.keys(v).filter(k => v[k] !== undefined).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
}

export function sha256hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// ---------------------------------------------------------------- observations
// Every observation: {kind, id, props, rels:[{rel, to, weight?}]}.
// ids are content-derived: git SHAs stay source-native; derived ids are
// sha256 of their defining key, never random.
export function obs(kind, id, props = {}, rels = []) {
  return { kind, id, props, rels };
}

export function personClaimId(name, email) {
  return 'personclaim:' + sha256hex((name ?? '') + '|' + (email ?? '')).slice(0, 16);
}

export function pkgId(ecosystem, name, version) {
  return `pkg:${ecosystem}/${name}@${version ?? 'unknown'}`;
}

export function writePacket(path, packet) {
  const body = stableStringify(packet);
  return fs.writeFile(path, body + '\n');
}
