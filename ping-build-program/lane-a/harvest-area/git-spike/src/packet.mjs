/**
 * Packet builder: one incremental ingestion packet for a repository.
 *
 * Protocol (T-07): snapshot refs -> walk objects BY OID from the snapshot ->
 * re-read refs -> compare. A moved ref marks the packet STALE; the cursor
 * never advances on a STALE or QUARANTINED packet.
 *
 * Packet shape (JSON-serializable):
 *   {
 *     packet_id,            // sha256 of canonical bytes; deterministic identity
 *     repo_slug, ingested_at,
 *     cursor: { ref, old_head, new_head },
 *     ref_snapshot, ref_snapshot_end,
 *     status: "OK" | "STALE" | "QUARANTINED:<reason>",
 *     quarantine_detail,
 *     observations: [ ...typed records with relationships... ],
 *     coverage: { commits_walked, commits_capped, blobs_truncated, ... },
 *     evidence: { canonical_sha256, canonical_bytes }
 *   }
 *
 * Observation kinds model git WITH RELATIONSHIPS; git SHAs stay native:
 *   repository, branch, tag, commit, commit_parent, file_change.
 */
import { git } from "./git-runner.mjs";
import { CAPS, QUARANTINE } from "./config.mjs";
import {
  openSync,
  readSync,
  closeSync,
  readdirSync,
  lstatSync,
  statSync,
  existsSync,
  readFileSync,
} from "node:fs";
import { join } from "node:path";
import {
  parseCommitObject,
  validateTreePath,
  sanitizeMeta,
  neutralizeBidi,
  canonicalizeJson,
  evidenceHash,
} from "./model.mjs";

const ZERO_SHA = "0000000000000000000000000000000000000000";

function splitNul(buf) {
  const parts = buf.toString("utf8").split("\0");
  if (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts;
}

export class QuarantineError extends Error {
  constructor(reason, detail) {
    super(`quarantined: ${reason}`);
    this.reason = reason;
    this.detail = detail;
  }
}

/** Ref-store enumeration.
 *
 * Git's own `for-each-ref` / `show-ref` silently OMIT unresolvable symrefs
 * (cycles, dangling targets). A hostile ref configuration would therefore be
 * INVISIBLE rather than handled. We enumerate the ref store directly
 * (packed-refs + loose refs + HEAD): read-only, first-line-capped reads,
 * symlinks never followed, and resolve symrefs ourselves with a hop cap,
 * a visited set, and per-ref fault isolation (one hostile ref never blocks
 * ingesting the others, but is never silently trusted either).
 *
 * Scope: the main ref store only. Per-worktree refs (under .git/worktrees)
 * are out of scope for slice 1 (bare-mirror ingestion).
 */
const MAX_REF_LINE_BYTES = 512;

function readFirstLine(path) {
  const fd = openSync(path, "r");
  try {
    const buf = Buffer.alloc(MAX_REF_LINE_BYTES + 1);
    const n = readSync(fd, buf, 0, buf.length, 0);
    const slice = buf.subarray(0, n);
    const nl = slice.indexOf(0x0a);
    return slice.subarray(0, nl === -1 ? slice.length : nl).toString("utf8").replace(/\r$/, "");
  } finally {
    closeSync(fd);
  }
}

function parseRefLine(line) {
  if (/^[0-9a-f]{40}$/.test(line)) return { kind: "direct", sha: line };
  const m = /^ref: (\S+)$/.exec(line);
  if (m) return { kind: "symref", target: m[1] };
  return { kind: "invalid", raw: line.slice(0, 64) };
}

function enumerateRefStore(gitDir) {
  const entries = new Map(); // refname -> {kind, sha?, target?}
  const packed = join(gitDir, "packed-refs");
  if (existsSync(packed)) {
    if (statSync(packed).size > CAPS.maxPackedRefsBytes) {
      throw new QuarantineError(QUARANTINE.CAP_EXCEEDED, "packed-refs exceeds cap");
    }
    for (const line of readFileSync(packed, "utf8").split("\n")) {
      if (!line || line.startsWith("#") || line.startsWith("^")) continue;
      const m = /^([0-9a-f]{40}) (\S+)$/.exec(line);
      if (m && !entries.has(m[2])) entries.set(m[2], { kind: "direct", sha: m[1] });
    }
  }
  const refsDir = join(gitDir, "refs");
  if (existsSync(refsDir)) {
    const stack = [refsDir];
    while (stack.length) {
      const dir = stack.pop();
      const base = dir.slice(refsDir.length);
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        const st = lstatSync(full);
        if (st.isDirectory()) {
          stack.push(full); // lstat: symlinks-to-dirs are NOT descended
        } else if (st.isFile()) {
          entries.set("refs" + base + "/" + name, parseRefLine(readFirstLine(full)));
        }
        // sockets, fifos, symlinks, etc: ignored, never trusted
      }
    }
  }
  const headPath = join(gitDir, "HEAD");
  if (existsSync(headPath)) entries.set("HEAD", parseRefLine(readFirstLine(headPath)));
  return entries;
}

/** Resolve one ref inside the enumerated map. Never throws for hostile
 *  shapes: cycles and dangling targets are REPORTED, not followed. */
function resolveRefEntry(entries, refname) {
  const first = entries.get(refname);
  if (!first || (first.kind !== "direct" && first.kind !== "symref")) {
    return { sha: null, symref: null, cycle: false, dangling: false, invalid: true };
  }
  if (first.kind === "direct") {
    return { sha: first.sha, symref: null, cycle: false, dangling: false, invalid: false };
  }
  const seen = new Set([refname]);
  let current = first.target;
  const symref = first.target;
  for (let hop = 0; hop < CAPS.maxSymrefHops; hop++) {
    if (seen.has(current)) {
      return { sha: null, symref, cycle: true, dangling: false, invalid: false };
    }
    seen.add(current);
    const e = entries.get(current);
    if (!e) return { sha: null, symref, cycle: false, dangling: true, invalid: false };
    if (e.kind === "direct") {
      return { sha: e.sha, symref, cycle: false, dangling: false, invalid: false };
    }
    if (e.kind !== "symref") {
      return { sha: null, symref, cycle: false, dangling: true, invalid: false };
    }
    current = e.target;
  }
  return { sha: null, symref, cycle: true, dangling: false, invalid: false };
}

async function refnameOk(gitDir, refname) {
  // HEAD is a pseudoref: check-ref-format rejects it, so allow it explicitly.
  if (refname === "HEAD") return true;
  const chk = await git(gitDir, "check-ref-format", [refname], { allowNonZero: true });
  return chk.code === 0;
}

/** Ref snapshot: {refname: {sha, symref, cycle, dangling, invalid}}.
 *  Per-ref fault isolation: one hostile ref is recorded, never trusted,
 *  and never blocks the rest of the snapshot. */
export async function refSnapshot(gitDir) {
  const entries = enumerateRefStore(gitDir);
  const snap = {};
  let count = 0;
  for (const refname of entries.keys()) {
    if (++count > CAPS.maxRefsPerPacket) {
      throw new QuarantineError(QUARANTINE.CAP_EXCEEDED, "too many refs");
    }
    if (!(await refnameOk(gitDir, refname))) {
      snap[refname] = { sha: null, symref: null, cycle: false, dangling: false, invalid: true };
      continue;
    }
    const r = resolveRefEntry(entries, refname);
    if (r.symref && !(await refnameOk(gitDir, r.symref))) {
      snap[refname] = { sha: null, symref: r.symref, cycle: false, dangling: false, invalid: true };
      continue;
    }
    snap[refname] = { sha: r.sha, symref: r.symref, cycle: r.cycle, dangling: r.dangling, invalid: r.invalid };
  }
  return snap;
}

/** Ref-movement detector (T-07): any difference between the start and end
 *  snapshots means the packet is STALE. Exported for unit testing. */
export function detectStale(snapStart, snapEnd) {
  return JSON.stringify(snapStart) !== JSON.stringify(snapEnd);
}

/** Commit SHAs in old..new (topo order). Empty oldHead => initial ingest. */
export async function commitRange(gitDir, oldHead, newHead) {
  const range = oldHead ? `${oldHead}..${newHead}` : newHead;
  const { stdout } = await git(gitDir, "rev-list", [
    "--topo-order",
    `--max-count=${CAPS.maxCommitsPerPacket + 1}`,
    range,
    "--",
  ]);
  const shas = stdout.toString("utf8").split("\n").filter(Boolean);
  const capped = shas.length > CAPS.maxCommitsPerPacket;
  return { shas: shas.slice(0, CAPS.maxCommitsPerPacket), capped };
}

/** Parse `git diff-tree -z --name-status` output into file-change records. */
function parseDiffZ(buf, commitSha) {
  const parts = splitNul(buf);
  const changes = [];
  let i = 0;
  while (i < parts.length) {
    const info = parts[i++];
    const m = info.match(/^:(\d{6}) (\d{6}) ([0-9a-f]{40}) ([0-9a-f]{40}) ([ACDMRTUX])(\d*)$/);
    if (!m) {
      throw new QuarantineError(QUARANTINE.MALFORMED_TREE, `unparseable diff-tree line for ${commitSha}`);
    }
    const [, oldMode, newMode, oldSha, newSha, status, score] = m;
    const rawPath = parts[i++];
    let rawOldPath = null;
    if (status === "R" || status === "C") rawOldPath = parts[i++];
    if (rawPath === undefined) {
      throw new QuarantineError(QUARANTINE.MALFORMED_TREE, `diff-tree path missing for ${commitSha}`);
    }
    // Bidi overrides are neutralized before any validation or recording (T-11).
    const np = neutralizeBidi(rawPath);
    const nop = rawOldPath !== null ? neutralizeBidi(rawOldPath) : null;
    const path = np.text;
    const oldPath = nop ? nop.text : null;
    const nameNeutralized = np.neutralized || (nop ? nop.neutralized : false);
    const badNew = validateTreePath(path);
    if (badNew) throw new QuarantineError(QUARANTINE.MALFORMED_TREE, `path gate ${badNew} in ${commitSha}`);
    if (oldPath) {
      const badOld = validateTreePath(oldPath);
      if (badOld) throw new QuarantineError(QUARANTINE.MALFORMED_TREE, `path gate ${badOld} in ${commitSha}`);
    }
    const norm = (s) => (s === ZERO_SHA ? null : s);
    const isGitlink = newMode === "160000" || oldMode === "160000";
    const isSymlink = newMode === "120000" || oldMode === "120000";
    changes.push({
      kind: "file_change",
      commit_sha: commitSha,
      path,
      old_path: oldPath,
      name_neutralized: nameNeutralized,
      status,
      rename_score: status === "R" || status === "C" ? Number(score || 0) : null,
      // Exact-phase renames are certain lineage edges; inexact are scored hypotheses.
      rename_exact: status === "R" ? Number(score || 0) === 100 : null,
      old_mode: oldMode,
      new_mode: newMode,
      blob_before: norm(oldSha),
      blob_after: norm(newSha),
      is_gitlink: isGitlink,
      is_symlink: isSymlink,
      symlink_target: null, // filled by caller after size-capped blob read
    });
  }
  return changes;
}

async function diffForCommit(gitDir, commit) {
  const out = [];
  const pairs = commit.parents.length ? commit.parents : [null];
  for (const parent of pairs) {
    const args = ["--no-commit-id", "--raw", "-r", "-z", "--no-ext-diff", "-M"];
    if (parent) args.push(parent, commit.sha);
    else args.push("--root", commit.sha);
    args.push("--");
    const { stdout } = await git(gitDir, "diff-tree", args, {
      maxBuffer: 256 * 1024 * 1024,
    });
    const changes = parseDiffZ(stdout, commit.sha);
    for (const c of changes) c.diff_parent = parent;
    out.push(...changes);
  }
  return out;
}

/** Size-capped blob metadata; never reads content above the cap. */
async function blobMeta(gitDir, shas, coverage) {
  const meta = {};
  const uniq = [...new Set(shas.filter(Boolean))];
  if (!uniq.length) return meta;
  const { stdout } = await git(
    gitDir,
    "cat-file",
    ["--batch-check=%(objectname) %(objecttype) %(objectsize)"],
    { input: uniq.join("\n") + "\n" }
  );
  for (const line of stdout.toString("utf8").split("\n")) {
    const [sha, type, sizeStr] = line.trim().split(" ");
    if (!sha) continue;
    const size = Number(sizeStr);
    if (type !== "blob" || !Number.isFinite(size)) {
      meta[sha] = { present: false, note: `unexpected type ${type}` };
      continue;
    }
    if (size > CAPS.maxBlobBytes) {
      coverage.blobs_truncated++;
      meta[sha] = { present: true, size, truncated: true, note: "blob-truncated: over per-blob cap" };
    } else {
      meta[sha] = { present: true, size, truncated: false };
    }
  }
  return meta;
}

async function readSmallBlob(gitDir, sha, maxBytes, coverage) {
  const { stdout } = await git(gitDir, "cat-file", ["blob", sha], { maxBuffer: maxBytes + 1024 });
  coverage.packet_bytes += stdout.length;
  if (coverage.packet_bytes > CAPS.maxPacketBytes) {
    throw new QuarantineError(QUARANTINE.CAP_EXCEEDED, "cumulative packet byte cap");
  }
  return stdout;
}

export async function buildPacket(gitDir, repoSlug, ref, oldHead, seenSet) {
  const t0 = Date.now();
  const withDeadline = async (p) => {
    const msLeft = CAPS.packetTimeoutMs - (Date.now() - t0);
    if (msLeft <= 0) throw new QuarantineError(QUARANTINE.PACKET_TIMEOUT, "packet deadline exceeded");
    return Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => {
        const e = new QuarantineError(QUARANTINE.PACKET_TIMEOUT, "packet deadline exceeded");
        rej(e);
      }, msLeft)),
    ]);
  };

  const packet = {
    packet_id: null,
    repo_slug: repoSlug,
    ingested_at: new Date().toISOString(),
    cursor: { ref, old_head: oldHead, new_head: null },
    ref_snapshot: null,
    ref_snapshot_end: null,
    status: "OK",
    quarantine_detail: null,
    observations: [],
    coverage: {
      commits_walked: 0,
      commits_capped: false,
      commits_skipped_seen: 0,
      file_changes: 0,
      diff_truncated_commits: 0,
      blobs_truncated: 0,
      gitlinks: 0,
      packet_bytes: 0,
    },
    evidence: null,
  };

  const finalize = (status, detail) => {
    packet.status = status;
    packet.quarantine_detail = detail ?? null;
    const canonical = canonicalizeJson({ ...packet, packet_id: undefined, evidence: undefined });
    packet.evidence = {
      canonical_sha256: evidenceHash(canonical),
      canonical_bytes: Buffer.byteLength(canonical, "utf8"),
    };
    packet.packet_id = packet.evidence.canonical_sha256;
    return packet;
  };

  try {
    return await withDeadline((async () => {
      const snapStart = await refSnapshot(gitDir);
      packet.ref_snapshot = snapStart;
      const headEntry = snapStart[ref];
      if (!headEntry) throw new Error(`ref not found in snapshot: ${ref}`);
      if (headEntry.invalid) {
        throw new QuarantineError(QUARANTINE.INVALID_REF, `requested ref invalid or unparseable: ${ref}`);
      }
      if (headEntry.cycle) {
        throw new QuarantineError(QUARANTINE.REF_CYCLE, `symref cycle at requested ref: ${ref}`);
      }
      const newHead = headEntry.sha;
      if (!newHead) {
        throw new QuarantineError(QUARANTINE.INVALID_REF, `dangling symref, no resolvable head: ${ref}`);
      }
      // The requested head must be a commit object. A ref pointing at a
      // blob/tree/tag object is ref confusion, not a walkable history.
      // (Annotated tags are NOT peeled in slice 1; that is a typed quarantine.)
      const headType = await git(gitDir, "cat-file", ["-t", newHead]);
      if (headType.stdout.toString("utf8").trim() !== "commit") {
        throw new QuarantineError(QUARANTINE.MALFORMED_COMMIT, `ref does not resolve to a commit: ${ref}`);
      }
      packet.cursor.new_head = newHead;

      if (oldHead && oldHead === newHead) {
        packet.coverage.commits_walked = 0;
        packet.ref_snapshot_end = await refSnapshot(gitDir);
        return finalize("OK", null);
      }

      const { shas, capped } = await commitRange(gitDir, oldHead, newHead);
      packet.coverage.commits_capped = capped;

      const observations = [
        { kind: "repository", repo_slug: repoSlug, observed_via: "git-spike/0.1" },
      ];
      for (const [refname, e] of Object.entries(snapStart)) {
        if (e.invalid) continue; // never trusted, never observed
        if (refname === "HEAD") continue; // pseudoref; its target branch is observed
        const kind = refname.startsWith("refs/tags/") ? "tag" : "branch";
        const obs = { kind, refname, head_sha: e.sha, symref: e.symref ?? null };
        if (e.cycle) obs.cycle = true;
        if (e.dangling) obs.dangling = true;
        observations.push(obs);
      }

      const freshShas = [];
      for (const sha of shas) {
        if (seenSet.has(sha)) {
          packet.coverage.commits_skipped_seen++;
          continue;
        }
        freshShas.push(sha);
      }

      for (const sha of freshShas) {
        const { stdout } = await git(gitDir, "cat-file", ["commit", sha]);
        packet.coverage.packet_bytes += stdout.length;
        const commit = parseCommitObject(sha, stdout);
        packet.coverage.commits_walked++;

        // Tree-name gate over the full recursive listing (defense in depth;
        // git's own parser already refused structurally invalid trees).
        // If git itself rejects the tree, that is also quarantine, not a crash.
        try {
          const { stdout: treeOut } = await git(gitDir, "ls-tree", ["-r", "-z", "--name-only", commit.tree]);
          for (const p of splitNul(treeOut)) {
            if (!p) continue;
            const bad = validateTreePath(neutralizeBidi(p).text);
            if (bad) {
              throw new QuarantineError(QUARANTINE.MALFORMED_TREE, `tree gate ${bad} in ${sha}`);
            }
          }
        } catch (err) {
          if (err instanceof QuarantineError) throw err;
          throw new QuarantineError(QUARANTINE.MALFORMED_TREE, `git rejected tree of ${sha}: ${err.message.slice(0, 200)}`);
        }

        observations.push({
          kind: "commit",
          sha: commit.sha,
          tree: commit.tree,
          parents: commit.parents,
          is_merge: commit.is_merge,
          claimed_author: commit.claimed_author,
          claimed_committer: commit.claimed_committer,
          message: commit.message,
          signature: commit.signature,
        });
        commit.parents.forEach((p, i) =>
          observations.push({ kind: "commit_parent", commit_sha: sha, parent_sha: p, position: i })
        );

        let changes;
        try {
          changes = await diffForCommit(gitDir, commit);
        } catch (err) {
          if (err instanceof QuarantineError) throw err;
          throw new QuarantineError(QUARANTINE.MALFORMED_TREE, `git rejected diff of ${sha}: ${err.message.slice(0, 200)}`);
        }
        if (changes.length > CAPS.maxFileChangesPerCommit) {
          packet.coverage.diff_truncated_commits++;
          changes = changes.slice(0, CAPS.maxFileChangesPerCommit);
          changes.truncated = true;
        }
        packet.coverage.file_changes += changes.length;

        // Blob size metadata (cap-checked before any content read).
        const blobShas = [];
        for (const c of changes) {
          blobShas.push(c.blob_before, c.blob_after);
          if (c.is_gitlink) {
            packet.coverage.gitlinks++;
            if (packet.coverage.gitlinks > CAPS.maxGitlinksPerPacket) {
              throw new QuarantineError(QUARANTINE.CAP_EXCEEDED, "too many gitlinks");
            }
          }
        }
        const bmeta = await blobMeta(gitDir, blobShas, packet.coverage);

        for (const c of changes) {
          const after = c.blob_after ? bmeta[c.blob_after] : null;
          // Symlink targets are DATA, never resolved: size-capped read only.
          if (c.is_symlink && c.blob_after && after && after.present && !after.truncated) {
            const raw = await readSmallBlob(gitDir, c.blob_after, CAPS.maxSmallFieldBytes, packet.coverage);
            c.symlink_target = sanitizeMeta(raw.toString("utf8"), CAPS.maxSmallFieldBytes);
            c.blob_after_size = after.size;
          } else if (c.blob_after) {
            c.blob_after_size = after ? after.size : null;
            c.blob_after_truncated = after ? !!after.truncated : null;
          }
          if (c.blob_before) {
            const before = bmeta[c.blob_before];
            c.blob_before_size = before ? before.size : null;
          }
          observations.push(c);
        }
        if (changes.truncated) {
          observations.push({
            kind: "coverage_note",
            commit_sha: sha,
            note: "diff_truncated: file changes exceeded per-commit cap; list is a prefix",
          });
        }
      }

      const snapEnd = await refSnapshot(gitDir);
      packet.ref_snapshot_end = snapEnd;
      packet.observations = observations;
      if (detectStale(snapStart, snapEnd)) {
        return finalize(`STALE`, "ref moved during ingest; packet emitted for audit, cursor NOT advanced");
      }
      return finalize("OK", null);
    })());
  } catch (err) {
    if (err instanceof QuarantineError) {
      try {
        packet.ref_snapshot_end = await refSnapshot(gitDir);
      } catch { /* best effort */ }
      return finalize(`QUARANTINED:${err.reason}`, err.detail);
    }
    if (err.code === "GIT_COMMAND_TIMEOUT") {
      return finalize(`QUARANTINED:${QUARANTINE.COMMAND_TIMEOUT}`, err.message);
    }
    throw err;
  }
}
