// Engine A: isomorphic-git (MIT, pure JS, zero native deps) read-only extractor.
// Demonstrates: ref snapshot, commit walk, tree walk with T-01 name gate,
// blob reads with post-read cap enforcement (LIMITATION: isomorphic-git
// inflates packfile objects regardless of requested format, so pre-read
// size caps are NOT enforceable here; see engines/gitcli.mjs).
// Symlinks recorded as data (T-08), gitlinks terminal-opaque (T-02),
// authorship as claimed_* (T-05), messages sanitized (T-11).

import git from 'isomorphic-git';
import fs from 'node:fs';
import path from 'node:path';
import { CAPS, sanitizeMeta, validateTreeName, obs, personClaimId, pkgId, sha256hex, readRefs } from '../lib/common.mjs';

const fsp = fs.promises;


async function walkTree(dir, treeOid, prefix, depth, state) {
  if (depth > CAPS.maxTreeDepth) { state.problems.push({ problem: 'max-tree-depth', at: prefix }); return; }
  let tree;
  try {
    ({ tree } = await git.readTree({ fs, dir, oid: treeOid }));
  } catch (e) {
    // isomorphic-git refuses unsafe paths itself; convert the throw to quarantine
    state.quarantine = state.quarantine || 'malformed-tree:engine-refused';
    state.problems.push({ problem: 'tree-walk-failed', tree: treeOid, err: String(e && e.message || e).slice(0, 160) });
    return;
  }
  state.observations.push(obs('Tree', `tree:${treeOid}`,
    { sha: treeOid, entry_count: tree.length },
    [{ rel: 'in_repository', to: state.repoId }]));
  for (const e of tree) {
    if (state.entryCount++ > CAPS.maxTreeEntries) { state.problems.push({ problem: 'max-tree-entries' }); return; }
    const bad = validateTreeName(e.path);
    if (bad) {
      state.quarantine = `malformed-tree:${bad}`;
      state.problems.push({ problem: 'hostile-tree-entry', reason: bad });
      continue; // never emit the bad name downstream
    }
    const full = prefix ? prefix + '/' + e.path : e.path;
    if (e.type === 'tree') { await walkTree(dir, e.oid, full, depth + 1, state); continue; }
    if (e.type === 'commit') {
      if (state.gitlinkCount++ > CAPS.maxGitlinks) { state.problems.push({ problem: 'max-gitlinks' }); continue; }
      state.observations.push(obs('Submodule', `gitlink:${e.oid}:${full}`, { path: full, sha: e.oid, opaque: true },
        [{ rel: 'pinned_by', to: state.repoId }]));
      continue;
    }
    // blob
    const isSymlink = e.mode === '120000';
    let blobBytes = 0, content = null, truncated = false;
    try {
      const { blob } = await git.readBlob({ fs, dir, oid: e.oid });
      blobBytes = blob.length;
      if (blob.length > CAPS.maxBlobBytes) { truncated = true; }
      else content = Buffer.from(blob);
    } catch (err) { state.problems.push({ problem: 'blob-read-failed', oid: e.oid, err: String(err).slice(0, 200) }); continue; }
    const fileId = `blob:${e.oid}`;
    const fileProps = { path: full, mode: e.mode, size: blobBytes, truncated, sha: e.oid };
    if (isSymlink) {
      // T-08: target is data, never resolved
      const target = content ? content.toString('utf8', 0, Math.min(content.length, CAPS.maxSymlinkTarget)) : '';
      fileProps.symlink_target = sanitizeMeta(target, { allowNewlines: false }).text;
      fileProps.symlink = true;
    }
    state.observations.push(obs('File', fileId, fileProps, [
      { rel: 'contained_in', to: `tree:${treeOid}` },
      { rel: 'in_repository', to: state.repoId },
    ]));
    state.files.push({ id: fileId, path: full, content, mode: e.mode });
  }
}

function detectManifests(state) {
  for (const f of state.files) {
    if (f.truncated || !f.content) continue;
    const text = f.content.toString('utf8');
    const base = f.path.split('/').pop();
    try {
      if (base === 'package.json') {
        const pkg = JSON.parse(text);
        const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        for (const [name, ver] of Object.entries(deps)) {
          const pid = pkgId('npm', name, ver);
          state.observations.push(obs('Package', pid, { ecosystem: 'npm', name, version: ver },
            [{ rel: 'depended_on_by', to: state.repoId }]));
          state.observations.push(obs('DependencyEdge', `dep:${state.repoId}:${pid}`,
            { from: state.repoId, rel: 'depends_on', to: pid, source: f.id }));
        }
        state.observations.push(obs('Manifest', `manifest:${f.id}`,
          { kind: 'package.json', name: pkg.name, version: pkg.version, dep_count: Object.keys(deps).length },
          [{ rel: 'describes', to: state.repoId }]));
      } else if (base === 'package-lock.json') {
        try {
          const lock = JSON.parse(text);
          state.observations.push(obs('Manifest', `manifest:${f.id}`,
            { kind: 'package-lock', lockfileVersion: lock.lockfileVersion ?? 'unknown' },
            [{ rel: 'describes', to: state.repoId }]));
        } catch { state.observations.push(obs('Manifest', `manifest:${f.id}`, { kind: 'package-lock', unparseable: true })); }
      } else if (/^(openapi|swagger)\.(ya?ml|json)$/.test(base)) {
        const endpoints = [];
        for (const m of text.matchAll(/^ {2}(\/\S*):/gm)) endpoints.push(m[1]);
        const sid = `schema:${f.id}`;
        state.observations.push(obs('Schema', sid,
          { kind: base.startsWith('openapi') ? 'openapi' : 'swagger', endpoint_count: endpoints.length, endpoints: endpoints.slice(0, 50) },
          [{ rel: 'defined_in', to: f.id }, { rel: 'describes_api_of', to: state.repoId }]));
      } else if (base === 'docker-compose.yml' || base === 'compose.yml') {
        const images = [...text.matchAll(/image:\s*([^\s,}]+)/g)].map(m => m[1]);
        state.observations.push(obs('Deployment', `deploy:${f.id}`,
          { kind: 'docker-compose', images }, [{ rel: 'deploys', to: state.repoId }]));
      } else if (f.path.startsWith('.github/workflows/') && f.path.endsWith('.yml')) {
        const name = (text.match(/^name:\s*(.+)$/m) || [])[1]?.trim() || base;
        const jobs = [...text.matchAll(/^  ([A-Za-z0-9_-]+):/gm)].map(m => m[1]);
        const wid = `workflow:${f.id}`;
        state.observations.push(obs('Workflow', wid, { name, jobs },
          [{ rel: 'defined_in', to: f.id }]));
        state.observations.push(obs('WorkflowEdge', `wfe:${wid}`,
          { from: wid, rel: 'tests_builds_deploys', to: state.repoId, declared_only: true }));
      } else if (base === 'CODEOWNERS') {
        const owners = new Set();
        for (const line of text.split('\n')) {
          if (!line.trim() || line.startsWith('#')) continue;
          for (const tok of line.split(/\s+/).slice(1)) if (tok.startsWith('@')) owners.add(tok);
        }
        for (const o of owners) {
          const pid = personClaimId(o, '');
          state.observations.push(obs('Ownership', `own:${state.repoId}:${pid}`,
            { owner: o }, [{ rel: 'owns_paths_in', to: state.repoId }]));
        }
      } else if (base === 'LICENSE' || base === 'LICENCE') {
        const first = text.split('\n')[0] || '';
        const family = /mit/i.test(first) ? 'MIT' : /apache/i.test(first) ? 'Apache-2.0' : /gpl/i.test(first) ? 'GPL' : 'unknown';
        state.observations.push(obs('License', `license:${f.id}`, { family, first_line: sanitizeMeta(first).text },
          [{ rel: 'licenses', to: state.repoId }]));
      } else if (base === 'README.md') {
        const headings = [...text.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m => m[1].trim()).slice(0, 20);
        state.observations.push(obs('Doc', `doc:${f.id}`, { kind: 'readme', headings },
          [{ rel: 'documents', to: state.repoId }]));
      }
    } catch (err) {
      state.observations.push(obs('Manifest', `manifest:${f.id}`, { kind: base, unparseable: true, error: String(err).slice(0, 120) }));
    }
  }
}

export async function extractIso(dir) {
  const gitdir = path.join(dir, '.git');
  const state = {
    observations: [], files: [], problems: [],
    quarantine: null, entryCount: 0, gitlinkCount: 0, repoId: null,
  };
  // ref snapshot first (T-07 seam; end snapshot compared by caller)
  const { raw: rawRefs, resolved, problems, headRaw } = await readRefs(gitdir);
  state.problems.push(...problems);
  const refSnapshot = { HEAD: headRaw };
  for (const [k, v] of Object.entries(resolved)) refSnapshot[k] = v;

  // repo identity: sha256 of origin url + root tree of HEAD (stable, derived)
  let origin = null;
  try { origin = (await fsp.readFile(path.join(gitdir, 'config'), 'utf8')).match(/url = (.+)/)?.[1]?.trim() ?? null; } catch {}
  const rawHeadSymref = headRaw && headRaw.symref ? headRaw.symref : null;
  const headSha = rawHeadSymref ? resolved[rawHeadSymref] : (typeof headRaw === 'object' && headRaw.sha ? headRaw.sha : null);
  if (!headSha) return { engine: 'isomorphic-git', quarantine: 'no-head', observations: [], problems: state.problems, refSnapshot };
  const headCommit = await git.readCommit({ fs, dir, oid: headSha });
  state.repoId = 'repo:' + sha256hex((origin ?? 'no-origin') + '|' + headCommit.commit.tree).slice(0, 24);
  state.observations.push(obs('Repository', state.repoId,
    { origin_url: origin, head: headSha, head_symref: rawHeadSymref, ref_count: Object.keys(resolved).length },
    []));

  const walkShas = new Set();
  for (const [name, sha] of Object.entries(resolved)) {
    if (!sha) continue;
    if (name.startsWith('refs/tags/')) {
      const short = name.slice('refs/tags/'.length);
      try {
        const { tag } = await git.readTag({ fs, dir, oid: sha });
        const tm = sanitizeMeta(tag.message);
        const target = tag.object;
        walkShas.add(target);
        state.observations.push(obs('TagObject', `tagobj:${sha}`,
          { sha, tagger: tag.tagger ? { name: sanitizeMeta(tag.tagger.name).text, email: sanitizeMeta(tag.tagger.email).text } : null, message: tm.text },
          [{ rel: 'points_to', to: `commit:${target}` }]));
        state.observations.push(obs('Tag', `tag:${short}`,
          { name: short, tag_object: sha, target_commit: target },
          [{ rel: 'tags', to: `commit:${target}` }, { rel: 'tag_of', to: state.repoId }]));
        state.observations.push(obs('Ref', `ref:${name}`, { name, sha },
          [{ rel: 'points_to', to: `tag:${short}` }, { rel: 'ref_of', to: state.repoId }]));
        continue;
      } catch { /* lightweight tag: fall through */ }
    }
    state.observations.push(obs('Ref', `ref:${name}`,
      { name, sha, symbolic: false }, [{ rel: 'points_to', to: `commit:${sha}` }, { rel: 'ref_of', to: state.repoId }]));
    walkShas.add(sha);
  }
  state.observations.push(obs('Ref', 'ref:HEAD', { name: 'HEAD', target: headSha },
    [{ rel: 'points_to', to: `commit:${headSha}` }, { rel: 'ref_of', to: state.repoId }]));

  // commit walk: every resolved ref (not just HEAD) so hostile branches are seen
  const commitMap = new Map();
  for (const sha of walkShas) {
    try {
      const log = await git.log({ fs, dir, ref: sha });
      for (const c of log.slice(0, CAPS.maxCommitsWalked)) commitMap.set(c.oid, c);
    } catch (e) { state.problems.push({ problem: 'log-failed', ref: sha, err: String(e).slice(0, 120) }); }
  }
  const commits = [...commitMap.values()];
  if (commitMap.size >= CAPS.maxCommitsWalked) state.problems.push({ problem: 'max-commits-walked' });
  const seenTrees = new Set();
  for (const { oid, commit } of commits) {
    const am = sanitizeMeta(commit.message);
    const author = { name: sanitizeMeta(commit.author.name).text, email: sanitizeMeta(commit.author.email).text, timestamp: commit.author.timestamp };
    const committer = { name: sanitizeMeta(commit.committer.name).text, email: sanitizeMeta(commit.committer.email).text, timestamp: commit.committer.timestamp };
    const sig = commit.gpgsig ? { present: true } : { present: false };
    const cobs = obs('Commit', `commit:${oid}`,
      { sha: oid, parents: commit.parent, tree: commit.tree, claimed_author: author, claimed_committer: committer, message: am.text, message_truncated: am.truncated, signature: sig },
      commit.parent.map(p => ({ rel: 'child_of', to: `commit:${p}` })));
    cobs.rels.push({ rel: 'in_repository', to: state.repoId });
    cobs.rels.push({ rel: 'has_tree', to: `tree:${commit.tree}` });
    state.observations.push(cobs);
    // PersonClaim nodes: claimed only, never identity (T-05)
    for (const [role, p] of [['authored', author], ['committed', committer]]) {
      const pid = personClaimId(p.name, p.email);
      state.observations.push(obs('PersonClaim', pid, { claimed_name: p.name, claimed_email: p.email, verified: false },
        [{ rel: role, to: `commit:${oid}` }]));
    }
    if (!seenTrees.has(commit.tree)) {
      seenTrees.add(commit.tree);
      await walkTree(dir, commit.tree, '', 0, state);
    }
  }

  detectManifests(state);
  // drop raw contents from files list for packet
  for (const f of state.files) delete f.content;

  return {
    engine: 'isomorphic-git',
    repo_id: state.repoId,
    ref_snapshot: refSnapshot,
    quarantine: state.quarantine,
    problems: state.problems,
    observations: state.observations,
    counts: { commits: commits.length, files: state.files.length },
  };
}
