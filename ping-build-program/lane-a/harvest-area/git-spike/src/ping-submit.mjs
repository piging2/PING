#!/usr/bin/env node
/**
 * LANE A -> PING canonical boundary adapter.
 *
 * Maps acquisition-packet observations to POST /ingest envelopes for the
 * proven canonical event authority (UnifiedEventRuntime via
 * CanonicalizationService), per Phase 0's EVENT-AUTHORITY-VERDICT.
 *
 * Observed seam (read from the gateway source, not guessed):
 *   POST /ingest { source, eventType, payload, namespace?,
 *                   logicalId?, confidence?, evidence?, lifecycleStage? }
 *   -> 201 { eventId, objectId, canonicalHash, ... }
 *   -> 422 on unregistered eventType.
 *
 * Mapping contract:
 *   - eventType comes only from the gateway's registered vocabulary
 *     (OBJECT_CREATED, RELATIONSHIP_CREATED; verified in
 *     gateway/generated/event_registry.json).
 *   - logicalId is the native Git SHA (timestamp-free), which is exactly
 *     the "timestamp-stripped logical identity" the gateway's
 *     content-deterministic event IDs are built on. Acquisition time in
 *     the packet envelope therefore cannot break event idempotency.
 *   - confidence 0.5, lifecycleStage "observation": connector data is
 *     observation, not canonical provider-shaped truth.
 *   - evidence carries the packet evidence sha256 for audit.
 *
 * Modes:
 *   dry-run (default): print envelopes as JSONL. No network, no writes.
 *   live: POST each envelope to the gateway. Writes to the canonical
 *     ping_events journal. Requires --live AND PING_GIT_INGEST_LIVE=1 in
 *     the environment AND coordinator approval: this is persistent
 *     shared-state change, never run casually.
 *
 * Usage:
 *   node src/ping-submit.mjs --packets <packets.jsonl> [--live --gateway <url>]
 */
import { readFileSync } from "node:fs";

function arg(name, dflt = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}
const has = (name) => process.argv.includes(name);

const packetsPath = arg("packets");
if (!packetsPath) {
  console.error("usage: ping-submit.mjs --packets <packets.jsonl> [--live --gateway <url>]");
  process.exit(2);
}

const LIVE = has("--live");
const gateway = arg("gateway", "http://127.0.0.1:18099");
if (LIVE && process.env.PING_GIT_INGEST_LIVE !== "1") {
  console.error("live mode requires PING_GIT_INGEST_LIVE=1 (coordinator-approved only)");
  process.exit(2);
}

const SOURCE = "git-ingestor:lane-a";

function toEnvelopes(packet) {
  const out = [];
  const evidence = [packet.evidence.canonical_sha256];
  for (const o of packet.observations) {
    const base = {
      source: SOURCE,
      confidence: 0.5,
      lifecycleStage: "observation",
      evidence,
    };
    if (o.kind === "commit") {
      out.push({
        ...base,
        eventType: "OBJECT_CREATED",
        logicalId: `git:commit:${o.sha}`,
        payload: {
          kind: "git_commit",
          sha: o.sha,
          repo: packet.repo_slug,
          ref: packet.cursor.ref,
          tree: o.tree,
          parents: o.parents,
          claimed_author: o.claimed_author,
          claimed_committer: o.claimed_committer,
          message: o.message,
          signature: o.signature,
        },
      });
    } else if (o.kind === "commit_parent") {
      out.push({
        ...base,
        eventType: "RELATIONSHIP_CREATED",
        logicalId: `git:parent:${o.commit_sha}:${o.parent_sha}`,
        payload: {
          kind: "git_commit_parent",
          from_sha: o.commit_sha,
          to_sha: o.parent_sha,
          position: o.position,
          relationship: "parent",
          repo: packet.repo_slug,
        },
      });
    } else if (o.kind === "file_change") {
      out.push({
        ...base,
        eventType: "OBJECT_CREATED",
        logicalId: `git:filechange:${o.commit_sha}:${o.status}:${o.path}`,
        payload: {
          kind: "git_file_change",
          commit_sha: o.commit_sha,
          repo: packet.repo_slug,
          path: o.path,
          old_path: o.old_path ?? null,
          status: o.status,
          rename_exact: o.rename_exact ?? null,
          symlink_target: o.symlink_target ?? null,
          blob_sizes: { before: o.blob_before_size ?? null, after: o.blob_after_size ?? null },
          truncated: o.blob_after_truncated ?? o.blob_before_truncated ?? false,
        },
      });
    } else if (o.kind === "branch" || o.kind === "tag") {
      out.push({
        ...base,
        eventType: "OBJECT_CREATED",
        logicalId: `git:ref:${o.refname}`,
        payload: {
          kind: o.kind === "tag" ? "git_tag" : "git_branch",
          refname: o.refname,
          head_sha: o.head_sha,
          symref: o.symref ?? null,
          repo: packet.repo_slug,
        },
      });
    } else if (o.kind === "repository") {
      out.push({
        ...base,
        eventType: "OBJECT_CREATED",
        logicalId: `git:repo:${o.repo_slug}`,
        payload: { kind: "git_repository", repo_slug: o.repo_slug, observed_via: o.observed_via },
      });
    }
    // coverage_note observations are packet-local diagnostics, not events.
  }
  return out;
}

const packets = readFileSync(packetsPath, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
// Cross-packet novelty gate for snapshot-state observations: a repository or
// ref envelope is emitted only on first sight or when its head moves.
// (Exact-duplicate envelopes would also dedupe at the journal via the
// content-deterministic event ID, but there is no reason to send noise.)
const seenRepos = new Set();
const seenRefHeads = new Map(); // refname -> head_sha
let total = 0;
for (const p of packets) {
  if (p.status !== "OK") continue;
  const envelopes = [];
  for (const e of toEnvelopes(p)) {
    const lid = e.logicalId;
    if (lid.startsWith("git:repo:")) {
      if (seenRepos.has(lid)) continue;
      seenRepos.add(lid);
    } else if (lid.startsWith("git:ref:")) {
      const refname = lid.slice("git:ref:".length);
      if (seenRefHeads.get(refname) === e.payload.head_sha) continue;
      seenRefHeads.set(refname, e.payload.head_sha);
    }
    envelopes.push(e);
  }
  total += envelopes.length;
  if (!LIVE) {
    for (const e of envelopes) console.log(JSON.stringify(e));
  } else {
    for (const e of envelopes) {
      const res = await fetch(`${gateway}/ingest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(e),
      });
      const body = await res.json().catch(() => ({}));
      console.log(JSON.stringify({ logicalId: e.logicalId, http: res.status, eventId: body.eventId ?? null, error: body.error ?? null }));
      if (res.status !== 201) {
        console.error(`submit failed for ${e.logicalId}: ${res.status}`);
        process.exit(3);
      }
    }
  }
}
console.error(`envelopes: ${total} from ${packets.length} packets (mode=${LIVE ? "live" : "dry-run"})`);
