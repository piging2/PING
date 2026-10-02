// Engine B: git CLI plumbing (ground truth). Exact fidelity by construction.
// Pre-read blob caps via `git cat-file -s` (T-03 in-stream enforcement),
// rename-aware change records via diffcore -M (exact vs inexact split),
// shallow-clone detection, repo-local config isolation via env.

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { CAPS, sanitizeMeta, validateTreeName, obs, personClaimId, pkgId, sha256hex, readRefs } from '../lib/common.mjs';

const GIT_ENV = { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null', GIT_CONFIG_NOSYSTEM: '1', GIT_OPTIONAL_LOCKS: '0' };
// Typed subprocess failure: the wrapper converts these to packet problems,
// never lets them crash the extractor.
export class GitFailure extends Error {
  constructor(args, stderr) {
    super(`git ${args.slice(0, 4).join(' ')} failed: ${String(stderr).split('\n')[0].slice(0, 160)}`);
    this.args = args; this.stderr = String(stderr);
  }
}
function git(dir, args, input) {
  try {
    return execFileSync('git', args, { cwd: dir, env: { ...process.env, ...GIT_ENV }, input, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    throw new GitFailure(args, e.stderr || e.message);
  }
}

function parseRawCommit(raw) {
  // raw from `git cat-file commit <sha>`: headers then blank then message
  const lines = raw.split('\n');
  const h = { parents: [] };
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line === '') break;
    const sp = line.indexOf(' ');
    const k = line.slice(0, sp), v = line.slice(sp + 1);
    if (k === 'tree') h.tree = v;
    else if (k === 'parent') h.parents.push(v);
    else if (k === 'author' || k === 'committer') {
      const m = v.match(/^(.*) <(.*)> (\d+) ([+-]\d{4})$/);
      h[k] = m ? { name: m[1], email: m[2], timestamp: Number(m[3]), tz: m[4] } : { name: v, email: '', timestamp: 0 };
    } else if (k === 'gpgsig') { h.gpgsig = true; i++; while (lines[i] && lines[i].startsWith(' ')) i++; i--; }
  }
  h.message = lines.slice(i + 1).join('\n');
  return h;
}

export async function extractCli(dir) {
  const problems = [], observations = [];
  const gitdir = path.join(dir, '.git');

  // ref snapshot via the shared reader (uniform T-12 behavior with engine A)
  const { resolved, problems: refProblems, headRaw } = await readRefs(gitdir);
  problems.push(...refProblems);
  const refSnapshot = { HEAD: headRaw };
  for (const [k, v] of Object.entries(resolved)) refSnapshot[k] = v;
  const headSha = headRaw && headRaw.symref ? resolved[headRaw.symref]
    : (headRaw && headRaw.sha ? headRaw.sha : null);
  const shallow = fs.existsSync(path.join(gitdir, 'shallow'));

  let origin = null;
  try { origin = git(dir, ['config', '--get', 'remote.origin.url']).trim() || null; } catch {}
  if (!headSha) return { engine: 'git-cli', quarantine: 'no-head', observations, problems, refSnapshot };

  const headTree = git(dir, ['rev-parse', `${headSha}^{tree}`]).trim();
  const repoId = 'repo:' + sha256hex((origin ?? 'no-origin') + '|' + headTree).slice(0, 24);
  observations.push(obs('Repository', repoId,
    { origin_url: origin, head: headSha, history_completeness: shallow ? 'partial-shallow' : 'full', ref_count: Object.keys(refSnapshot).length }, []));

  for (const [name, sha] of Object.entries(resolved)) {
    observations.push(obs('Ref', `ref:${name}`, { name, sha },
      [{ rel: 'points_to', to: `commit:${sha}` }, { rel: 'ref_of', to: repoId }]));
  }
  observations.push(obs('Ref', 'ref:HEAD', { name: 'HEAD', target: headSha },
    [{ rel: 'points_to', to: `commit:${headSha}` }, { rel: 'ref_of', to: repoId }]));

  const revList = (() => {
    try {
      return git(dir, ['rev-list', '--all']).trim().split('\n').filter(Boolean);
    } catch (e) {
      problems.push({ problem: 'rev-list-failed', err: e.message });
      return null;
    }
  })();
  if (!revList) {
    return { engine: 'git-cli', repo_id: repoId, ref_snapshot: refSnapshot, quarantine: 'repo-unreadable:rev-list-failed', problems, observations, counts: { commits: 0, files: 0 } };
  }
  const commits = revList.slice(0, CAPS.maxCommitsWalked);
  if (revList.length > CAPS.maxCommitsWalked) problems.push({ problem: 'max-commits-walked' });

  const seenTrees = new Set();
  const files = [];
  let quarantine = null, entryCount = 0, gitlinkCount = 0;

  for (const oid of commits) {
    let h;
    try {
      h = parseRawCommit(git(dir, ['cat-file', 'commit', oid]));
    } catch (e) {
      problems.push({ problem: 'commit-unreadable', commit: oid, err: e.message });
      continue;
    }
    const am = sanitizeMeta(h.message);
    const sig = h.gpgsig ? { present: true, valid: 'unverified', trusted: false } : { present: false };
    const cobs = obs('Commit', `commit:${oid}`, {
      sha: oid, parents: h.parents, tree: h.tree,
      claimed_author: { name: sanitizeMeta(h.author.name).text, email: sanitizeMeta(h.author.email).text, timestamp: h.author.timestamp },
      claimed_committer: { name: sanitizeMeta(h.committer.name).text, email: sanitizeMeta(h.committer.email).text, timestamp: h.committer.timestamp },
      message: am.text, message_truncated: am.truncated, signature: sig,
    }, h.parents.map(p => ({ rel: 'child_of', to: `commit:${p}` })));
    cobs.rels.push({ rel: 'in_repository', to: repoId }, { rel: 'has_tree', to: `tree:${h.tree}` });
    observations.push(cobs);
    for (const [role, p] of [['authored', h.author], ['committed', h.committer]]) {
      const pid = personClaimId(p.name, p.email);
      observations.push(obs('PersonClaim', pid,
        { claimed_name: sanitizeMeta(p.name).text, claimed_email: sanitizeMeta(p.email).text, verified: false },
        [{ rel: role, to: `commit:${oid}` }]));
    }

    // change records with rename detection (diffcore -M); exact vs inexact split
    const parent = h.parents[0];
    const diffArgs = parent
      ? ['diff-tree', '-r', '-M', '--find-renames', '--diff-algorithm=histogram', '-z', '--name-status', parent, oid]
      : ['diff-tree', '-r', '--root', '-z', '--name-status', oid];
    try {
      const dout = git(dir, diffArgs);
      const parts = dout.split('\x00').filter(s => s !== '');
      for (let i = 0; i < parts.length;) {
        // with -z, each record starts as ":<oldmode> <newmode> <oldsha> <newsha> <STATUS>"
        const status = parts[i++].split(' ').pop();
        if (status.startsWith('R')) {
          const sim = Number(status.slice(1)) / 100;
          const from = parts[i++], to = parts[i++];
          // exact rename iff similarity 1.0 (identical blob); else scored hypothesis
          observations.push(obs('Change', `change:${oid}:${from}->${to}`, {
            commit: oid, from_path: from, to_path: to,
            kind: sim >= 1 ? 'rename-exact' : 'rename-inexact',
            similarity: sim, certainty: sim >= 1 ? 1.0 : sim,
          }, [{ rel: 'changes', to: `commit:${oid}` }]));
        } else if (status.startsWith('C')) { i += 2; }
        else { const pth = parts[i++]; observations.push(obs('Change', `change:${oid}:${status}:${pth}`, { commit: oid, path: pth, kind: status }, [{ rel: 'changes', to: `commit:${oid}` }])); }
      }
    } catch (e) { problems.push({ problem: 'diff-failed', commit: oid, err: String(e).slice(0, 120) }); }

    if (!seenTrees.has(h.tree)) {
      seenTrees.add(h.tree);
      observations.push(obs('Tree', `tree:${h.tree}`, { sha: h.tree },
        [{ rel: 'in_repository', to: repoId }]));
      // tree walk with name gate; depth tracked via path depth.
      // git itself refuses to list malformed trees (fatal) -> typed quarantine, never a crash.
      let ls;
      try {
        ls = git(dir, ['ls-tree', '-r', '-z', h.tree]);
      } catch (e) {
        quarantine = quarantine || 'malformed-tree:unlistable-by-git';
        problems.push({ problem: 'tree-walk-failed', tree: h.tree, err: String(e.stderr || e).split('\n')[0].slice(0, 160) });
        continue;
      }
      const entries = ls.split('\x00').filter(Boolean);
      for (const line of entries) {
        if (entryCount++ > CAPS.maxTreeEntries) { problems.push({ problem: 'max-tree-entries' }); break; }
        const m = line.match(/^(\d{6}) (blob|tree|commit) ([0-9a-f]{40})\t(.*)$/s);
        if (!m) { problems.push({ problem: 'ls-tree-parse', line: line.slice(0, 80) }); continue; }
        const [, mode, type, o, p] = m;
        const comps = p.split('/');
        let bad = null;
        if (comps.length > CAPS.maxTreeDepth) bad = 'max-tree-depth';
        else for (const c of comps) { const r = validateTreeName(c); if (r) { bad = r; break; } }
        if (bad) { quarantine = `malformed-tree:${bad}`; problems.push({ problem: 'hostile-tree-entry', reason: bad }); continue; }
        if (type === 'commit') {
          if (gitlinkCount++ > CAPS.maxGitlinks) { problems.push({ problem: 'max-gitlinks' }); continue; }
          observations.push(obs('Submodule', `gitlink:${o}:${p}`, { path: p, sha: o, opaque: true }, [{ rel: 'pinned_by', to: repoId }]));
          continue;
        }
        let size;
        try {
          size = Number(git(dir, ['cat-file', '-s', o]).trim());
        } catch (e) {
          problems.push({ problem: 'blob-unreadable', oid: o, path: p, err: e.message });
          continue;
        }
        const fid = `blob:${o}`;
        const fprops = { path: p, mode, size, truncated: size > CAPS.maxBlobBytes, sha: o };
        if (mode === '120000') {
          // T-08: record target as data; bounded read for the target string only
          const target = size <= CAPS.maxSymlinkTarget
            ? execFileSync('git', ['cat-file', 'blob', o], { cwd: dir, env: { ...process.env, ...GIT_ENV }, encoding: 'utf8', maxBuffer: 65536 })
            : '[target-too-long]';
          fprops.symlink = true;
          fprops.symlink_target = sanitizeMeta(target, { allowNewlines: false }).text;
          files.push({ id: fid, path: p, content: null, mode });
        } else if (size > CAPS.maxBlobBytes) {
          fprops.truncated = true; // pre-read cap: content never inflated
          files.push({ id: fid, path: p, content: null, mode });
        } else {
          const content = execFileSync('git', ['cat-file', 'blob', o], { cwd: dir, env: { ...process.env, ...GIT_ENV }, maxBuffer: 64 * 1024 * 1024 });
          files.push({ id: fid, path: p, content, mode });
        }
        observations.push(obs('File', fid, fprops, [
          { rel: 'contained_in', to: `tree:${h.tree}` }, { rel: 'in_repository', to: repoId }]));
      }
    }
  }

  // manifest detectors (shared logic shape as iso engine; CLI gets real content)
  for (const f of files) {
    if (!f.content) continue;
    const text = f.content.toString('utf8');
    const base = f.path.split('/').pop();
    if (base === 'package.json') {
      try {
        const pkg = JSON.parse(text);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        for (const [name, ver] of Object.entries(deps)) {
          const pid = pkgId('npm', name, ver);
          observations.push(obs('Package', pid, { ecosystem: 'npm', name, version: ver }, [{ rel: 'depended_on_by', to: repoId }]));
          observations.push(obs('DependencyEdge', `dep:${repoId}:${pid}`, { from: repoId, rel: 'depends_on', to: pid, source: f.id }));
        }
      } catch { observations.push(obs('Manifest', `manifest:${f.id}`, { kind: 'package.json', unparseable: true })); }
    } else if (/^(openapi|swagger)\.(ya?ml|json)$/.test(base)) {
      const endpoints = [...text.matchAll(/^ {2}(\/\S*):/gm)].map(m => m[1]);
      observations.push(obs('Schema', `schema:${f.id}`, { kind: 'openapi', endpoint_count: endpoints.length, endpoints: endpoints.slice(0, 50) },
        [{ rel: 'defined_in', to: f.id }, { rel: 'describes_api_of', to: repoId }]));
    }
  }

  // annotated tags
  try {
    const tags = git(dir, ['for-each-ref', '--format=%(refname:short)%00%(objectname)%00%(*objectname)', 'refs/tags']).trim();
    if (tags) for (const line of tags.split('\n')) {
      const [name, sha, target] = line.split('\x00');
      observations.push(obs('Tag', `tag:${name}`, { name, tag_object: sha, target_commit: target || sha },
        [{ rel: 'tags', to: `commit:${target || sha}` }, { rel: 'tag_of', to: repoId }]));
    }
  } catch {}

  return { engine: 'git-cli', repo_id: repoId, ref_snapshot: refSnapshot, quarantine, problems, observations, counts: { commits: commits.length, files: files.length } };
}
