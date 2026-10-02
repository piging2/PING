#!/usr/bin/env node
/**
 * Dogfood query: answer "what changed in <path> between <shaA> and <shaB>"
 * from ingested packets, with evidence citations.
 *
 * Every claim cites: commit SHA (native git identity) + packet evidence
 * hash. No packet -> no claim ("absence reads as absence").
 *
 * Usage:
 *   node src/query.mjs --state <stateRoot> --slug <repo> --path <prefix> --from <shaA> --to <shaB>
 */
import { loadPackets } from "./cursor.mjs";

function arg(name, dflt = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

const stateRoot = arg("state");
const slug = arg("slug");
const pathPrefix = arg("path", "");
const from = arg("from");
const to = arg("to");
if (!stateRoot || !slug || !from || !to) {
  console.error("usage: query.mjs --state <root> --slug <repo> --path <prefix> --from <shaA> --to <shaB>");
  process.exit(2);
}

const packets = loadPackets(stateRoot, slug);
// Order packets by ingestion; commits carry no global order across packets,
// so we scope strictly to the requested range via parent-walk membership.
const commits = new Map(); // sha -> {commit, packet_id, changes[]}
for (const p of packets) {
  if (p.status !== "OK") continue;
  for (const o of p.observations) {
    if (o.kind === "commit") commits.set(o.sha, { commit: o, packet_id: p.packet_id, changes: [] });
    else if (o.kind === "file_change") commits.get(o.commit_sha)?.changes.push(o);
  }
}

if (!commits.has(from) || !commits.has(to)) {
  console.log(JSON.stringify({
    answer: "unknown",
    reason: "one or both SHAs are outside ingested knowledge; ingest the range first",
    from_known: commits.has(from),
    to_known: commits.has(to),
  }, null, 1));
  process.exit(0);
}

// Walk from `to` back through parents until `from` (bounded).
const inRange = new Set();
const stack = [to];
let guard = 0;
while (stack.length && guard++ < 20000) {
  const sha = stack.pop();
  if (sha === from || inRange.has(sha)) continue;
  inRange.add(sha);
  const rec = commits.get(sha);
  if (rec) for (const par of rec.commit.parents) stack.push(par);
}

const hits = [];
for (const sha of inRange) {
  const rec = commits.get(sha);
  if (!rec) continue;
  const touched = rec.changes.filter((c) => c.path.startsWith(pathPrefix) || (c.old_path && c.old_path.startsWith(pathPrefix)));
  if (touched.length) hits.push({ rec, touched });
}

const answer = {
  question: `what changed in ${pathPrefix || "(repo)"} between ${from.slice(0, 12)} and ${to.slice(0, 12)}`,
  commits_in_range: inRange.size,
  commits_touching_path: hits.length,
  changes: hits.map(({ rec, touched }) => ({
    commit: rec.commit.sha,
    claimed_author: `${rec.commit.claimed_author.claimed_name} <${rec.commit.claimed_author.claimed_email}> (unverified claim)`,
    committed_at: rec.commit.claimed_committer.time ? new Date(rec.commit.claimed_committer.time * 1000).toISOString() : null,
    message_first_line: rec.commit.message.split("\n")[0].slice(0, 120),
    files: touched.map((c) => ({ path: c.path, status: c.status, old_path: c.old_path, rename_exact: c.rename_exact })),
    evidence: { commit_sha: rec.commit.sha, packet_evidence_sha256: rec.packet_id },
  })),
  evidence_note: "Each change cites its commit SHA and the packet evidence hash it was ingested in.",
};
console.log(JSON.stringify(answer, null, 1));
