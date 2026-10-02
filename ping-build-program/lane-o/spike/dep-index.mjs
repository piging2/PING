/**
 * LANE O — dependency index, minimal viable implementation (spike).
 *
 * Implements DEPENDENCY-INDEX-DESIGN.md sections 4-7, 10-12 at pure-JS level:
 * content-hash early cutoff, reverse-dependency propagation with the dedup
 * rule, fan-out tripwire, cycle detection, ranked regeneration planning with
 * deterministic job ids and spill backpressure, atomic pin+watermark update,
 * rebuild-from-canonical loss recovery, and the pin-equivalence integrity
 * check.
 *
 * Zero dependencies. The index is a disposable derived projection: everything
 * here is recomputable from the canonical state it consumes.
 */
import { createHash } from "node:crypto";

export const INDEX_VERSION = "ping-dep-index@1";
export const FANOUT_LIMIT = 64;

export const ACTION_RANK = {
  "no-op": 0,
  "reverify-graph": 1,
  "review-owner-conflict": 2,
  "record-source-drift": 3,
  "regenerate-section": 4,
  "regenerate-page": 4,
};

const VOLATILE_FIELDS = new Set(["createdAt", "updatedAt", "generatedAt", "renderedAt"]);

export const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");
export const canon = (v) => JSON.stringify(v, Object.keys(v).sort());

/** Semantic field hash: volatile stamps excluded, never edges. */
export function fieldHash(canonical, objectId, field) {
  if (VOLATILE_FIELDS.has(field)) return null; // volatile: not a change, never a pin
  return sha256(canon([objectId, field, canonical.objects[objectId].fields[field] ?? null]));
}

function ownerId(canonical, binding) {
  return binding === "owner" ? canonical.businessObjectId : binding;
}

/** Pure rendered-content digest of one section: hash of canonical bound values. */
export function sectionDigest(canonical, sectionId) {
  const s = canonical.sections[sectionId];
  const bound = [];
  for (const b of s.binds) {
    const oid = ownerId(canonical, b);
    const fields = Object.keys(canonical.objects[oid].fields).sort();
    for (const f of fields) {
      if (VOLATILE_FIELDS.has(f)) continue;
      bound.push(oid + "|" + f + "=" + canonical.objects[oid].fields[f]);
    }
  }
  return sha256(canon({ sectionId, component: s.component, bound }));
}

/** Pure page HTML digest: join of section digests + tokens. */
export function pageDigest(canonical, index, slug) {
  const entries = canonical.pages[slug].map((sid) => [sid, sectionDigest(canonical, sid)]).sort();
  return sha256(canon({ slug, sections: entries, tokens: canonical.tokensDigest }));
}

export function recomputeDigest(canonical, index, nodeId) {
  const n = index.nodes[nodeId];
  if (!n) throw new Error("unknown node " + nodeId);
  // Newest fact wins: canonical.facts is append-only; a superseded obs/claim
  // keeps its identity (lineage), but its CURRENT value pin must track the
  // latest fact or the index would early-cutoff a real change.
  const newestFact = (pred) => {
    for (let i = canonical.facts.length - 1; i >= 0; i--) {
      if (pred(canonical.facts[i])) return canonical.facts[i];
    }
    return null;
  };
  switch (n.kind) {
    case "source": return n.detail.bytesDigest; // set by the refresher at build
    case "obs": {
      const f = newestFact((x) => x.sourceId === n.detail.sourceId && x.factRef === n.detail.factRef);
      return sha256(canon(["obs", f ? f.value : null]));
    }
    case "claim": {
      const f = newestFact((x) => x.claimId === n.detail.claimId);
      return sha256(canon(["claim", f ? f.value : null]));
    }
    case "objfield": return fieldHash(canonical, n.detail.objectId, n.detail.field);
    case "section": return sectionDigest(canonical, n.detail.sectionId);
    case "page": return pageDigest(canonical, index, n.detail.slug);
    default: throw new Error("no digest rule for kind " + n.kind);
  }
}

export const nodeId = {
  source: (id) => "source:" + id,
  obs: (sourceId, factRef, value) =>
    "obs:" + sha256([sourceId, factRef, canon(value)].join("|")).slice(0, 16),
  claim: (id) => "claim:" + id,
  objfield: (objectId, field) => "objfield:" + objectId + "|" + field,
  rel: (subject, predicate, object) =>
    "rel:" + sha256([subject, predicate, object].join("|")).slice(0, 16),
  section: (bindingId) => "section:" + bindingId,
  page: (slug) => "page:" + slug,
};

/**
 * Build the index from canonical state. Pure: same canonical -> same
 * index_digest (modulo built_at). Sections in canonical that no edge
 * reaches are recorded as unbound (typed gap), never silently passed.
 */
export function buildIndex(canonical, opts = {}) {
  const tenant = canonical.tenantId;
  const nodes = {};
  const edges = [];
  const addEdge = (from, to, kind, via) => edges.push({ from, to, kind, via });
  const addNode = (id, kind, identity, pin, detail = {}) =>
    (nodes[id] = { kind, identity, pin, detail });

  // Source -> obs -> claim -> objfield edges, from the fact registry.
  for (const fact of canonical.facts) {
    const sid = nodeId.source(fact.sourceId);
    const oid = nodeId.obs(fact.sourceId, fact.factRef, fact.value);
    const cid = nodeId.claim(fact.claimId);
    const fid = nodeId.objfield(fact.objectId, fact.field);
    addNode(sid, "source", fact.sourceId, sha256(canon(["bytes", fact.sourceBytes])), { bytesDigest: sha256(canon(["bytes", fact.sourceBytes])) });
    addNode(oid, "obs", fact.factRef, null, { sourceId: fact.sourceId, factRef: fact.factRef });
    addNode(cid, "claim", fact.claimId, null, { claimId: fact.claimId });
    addNode(fid, "objfield", fact.objectId + "|" + fact.field, null,
      { objectId: fact.objectId, field: fact.field });
    addEdge(sid, oid, "feeds", "stage-1/2");
    addEdge(oid, cid, "resolves", "stage-3");
    addEdge(cid, fid, "materializes", "stage-4");
  }

  // objfield/rel -> section edges from the planner manifest (authoritative).
  const boundSections = new Set();
  for (const b of canonical.manifest.bindings) {
    const secId = nodeId.section(b.bindingId);
    addNode(secId, "section", b.bindingId, null, { sectionId: b.bindingId });
    boundSections.add(b.bindingId);
    for (const ofKey of b.objectFields) {
      const [oid, field] = ofKey.split("|");
      if (VOLATILE_FIELDS.has(field)) continue; // stamps are never edges (design sec 7)
      const fid = nodeId.objfield(oid, field);
      if (!nodes[fid]) {
        // Manifest references a field with no lineage fact: register the node
        // (pin computed) but the edge is still emitted. The pin lets
        // propagation work; the missing fact is a lineage gap, not ours.
        addNode(fid, "objfield", ofKey, null, { objectId: oid, field });
        nodes[fid].pin = fieldHash(canonical, oid, field);
      }
      addEdge(fid, secId, "binds", "planner@" + canonical.manifest.plannerVersion);
    }
  }
  // section -> page edges from spec.pages.
  for (const slug of Object.keys(canonical.pages)) {
    const pid = nodeId.page(slug);
    addNode(pid, "page", slug, null, { slug });
    for (const secId of canonical.pages[slug]) {
      const sNode = nodeId.section(secId);
      if (nodes[sNode]) addEdge(sNode, pid, "renders", "spec@" + canonical.specDigest.slice(0, 12));
    }
  }

  // Pin every recomputable node. Uses canonical: identical canonical always
  // yields identical pins (built_at is excluded from the digest).
  const tmp = { nodes };
  for (const id of Object.keys(nodes)) {
    if (nodes[id].pin === null) nodes[id].pin = recomputeDigest(canonical, tmp, id);
  }

  // Typed gap: sections the renderer produces but the manifest never bound.
  const unbound = Object.keys(canonical.sections)
    .filter((sid) => !boundSections.has(sid))
    .map((sid) => nodeId.section(sid));

  const indexDigest = sha256(canon({ nodes, edges }));
  const index = {
    index_version: INDEX_VERSION,
    tenant_id: tenant,
    built_at: opts.builtAt || new Date().toISOString(),
    index_digest: indexDigest,
    nodes, edges,
    unbound_sections: unbound,
    watermark: canonical.watermark || { stream: "ping_events", seq: 0, at: new Date(0).toISOString() },
  };
  return index;
}

/** Serialize to JSONL (header + node chunks + edge chunks), per the factory note. */
export function serializeIndex(index) {
  const lines = [];
  lines.push(JSON.stringify({ record: "index_header", index_version: index.index_version,
    tenant_id: index.tenant_id, built_at: index.built_at, index_digest: index.index_digest,
    watermark: index.watermark, unbound_sections: index.unbound_sections }));
  const ids = Object.keys(index.nodes).sort();
  for (let i = 0; i < ids.length; i += 500) {
    const pins = {};
    for (const id of ids.slice(i, i + 500)) pins[id] = index.nodes[id];
    lines.push(JSON.stringify({ record: "node_pins", chunk: i / 500, pins }));
  }
  for (let i = 0; i < index.edges.length; i += 1000) {
    lines.push(JSON.stringify({ record: "edges", chunk: i / 1000,
      edges: index.edges.slice(i, i + 1000) }));
  }
  return lines.join("\n");
}

export function deserializeIndex(text) {
  const nodes = {}, edges = [];
  let header = null;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    if (r.record === "index_header") header = r;
    else if (r.record === "node_pins") Object.assign(nodes, r.pins);
    else if (r.record === "edges") edges.push(...r.edges);
  }
  return { index_version: header.index_version, tenant_id: header.tenant_id,
    built_at: header.built_at, index_digest: header.index_digest, nodes, edges,
    unbound_sections: header.unbound_sections, watermark: header.watermark };
}

/**
 * Structural cycle check over the edge list (load-time semantic).
 * A cycle is a defect in edge registration, never a valid state; detected
 * once per index load, not per propagation. Propagation is still bounded
 * independently by its visited set.
 */
export function detectCycles(edges) {
  const adj = new Map();
  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e.to);
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map();
  const found = new Set();
  const stack = [];
  for (const start of adj.keys()) {
    if (color.get(start) === BLACK || color.get(start) === GRAY) continue;
    const work = [[start, 0]];
    while (work.length) {
      const [n, i] = work[work.length - 1];
      if (color.get(n) === undefined) { color.set(n, GRAY); stack.push(n); }
      const outs = adj.get(n) || [];
      if (i < outs.length) {
        work[work.length - 1][1] = i + 1;
        const m = outs[i];
        if (color.get(m) === GRAY) {
          const cyc = stack.slice(stack.indexOf(m)).concat(m);
          cyc.forEach((x) => found.add(x));
        } else if (color.get(m) === undefined) {
          work.push([m, 0]);
        }
      } else {
        color.set(n, BLACK);
        stack.pop();
        work.pop();
      }
    }
  }
  return [...found];
}

/**
 * Propagation: changed events -> invalidation plan.
 * Events: { eventId, kind, nodeId, newValue? } where kind is one of
 * source_bytes | field_changed | relationship_changed | owner_assertion |
 * capability_changed. Pin pre-check drops no-op events HERE (early cutoff at
 * the source of the walk); events that move only volatile stamps are dropped.
 * Cycles are detected structurally by detectCycles (load-time semantic); the
 * visited set independently bounds every run.
 */
export function propagate(index, canonical, events, tickId) {
  const consumers = new Map(); // node -> [edge]
  for (const e of index.edges) {
    if (!consumers.has(e.from)) consumers.set(e.from, []);
    consumers.get(e.from).push(e);
  }

  const invalid = new Map(); // nodeId -> {pin_before, causes[], invalidated_at}
  const dropped = [];
  const earlyCutoffs = [];
  let dedupMerges = 0;
  const fanoutFlags = [];

  // --- seed: pin pre-check on each event ---
  const seeds = [];
  for (const ev of events) {
    const n = index.nodes[ev.nodeId];
    if (!n) { dropped.push({ eventId: ev.eventId, reason: "unknown-node" }); continue; }
    let candidatePin = null;
    if (ev.kind === "field_changed") {
      if (VOLATILE_FIELDS.has(n.detail.field)) {
        dropped.push({ eventId: ev.eventId, reason: "volatile-stamp-not-a-change" });
        continue;
      }
      candidatePin = sha256(canon([n.detail.objectId, n.detail.field, ev.newValue]));
    } else if (ev.kind === "source_bytes") {
      candidatePin = sha256(canon(["bytes", ev.newValue]));
    } else {
      candidatePin = "__force__"; // relationship/owner/capability: structural, always propagates
    }
    if (candidatePin === n.pin) {
      dropped.push({ eventId: ev.eventId, reason: "pin-equal-no-semantic-change" });
      continue;
    }
    if (!seeds.find((s) => s.nodeId === ev.nodeId)) seeds.push({ nodeId: ev.nodeId, ev });
  }

  // --- BFS with the dedup rule: each (tenant, node, tick) visited at most once ---
  const visited = new Set();
  const queue = seeds.map((s) => ({ nodeId: s.nodeId, cause: { node_id: s.nodeId, change_ref: s.ev.eventId, kind: s.ev.kind } }));
  const tmpIndex = { nodes: index.nodes };
  const cyclesDetected = detectCycles(index.edges); // structural, load-time semantic

  while (queue.length) {
    const { nodeId: nid, cause } = queue.shift();
    const key = index.tenant_id + "|" + nid + "|" + tickId;
    if (visited.has(key)) { dedupMerges++; attachCause(invalid, nid, cause); continue; }
    visited.add(key);

    for (const edge of consumers.get(nid) || []) {
      const c = edge.to;
      const ckey = index.tenant_id + "|" + c + "|" + tickId;
      if (visited.has(ckey)) { dedupMerges++; attachCause(invalid, c, cause); continue; }
      const cNode = index.nodes[c];
      const newPin = cNode.kind === "source"
        ? cNode.detail.bytesDigest // source pins move only via refresher; never self-recomputed
        : recomputeDigest(canonical, tmpIndex, c);
      if (newPin === cNode.pin) {
        earlyCutoffs.push({ node: c, from: nid }); // branch dies here
        continue;
      }
      const rec = invalid.get(c) || { pin_before: cNode.pin, causes: [], invalidated_at: new Date().toISOString() };
      rec.causes.push(Object.assign({ from: nid }, cause));
      invalid.set(c, rec);
      queue.push({ nodeId: c, cause: { node_id: c, change_ref: cause.change_ref, kind: "propagated" } });
    }
    const fanout = (consumers.get(nid) || []).length;
    if (fanout > FANOUT_LIMIT) fanoutFlags.push({ node_id: nid, fanout });
  }

  function attachCause(invMap, target, cause) {
    const rec = invMap.get(target);
    if (rec && !rec.causes.find((c) => c.change_ref === cause.change_ref && c.from === cause.from)) {
      rec.causes.push(cause);
    }
  }

  const plan = {
    plan_id: "inv_" + index.tenant_id + "_" + tickId + "_" + sha256(canon(events.map((e) => e.eventId).sort())).slice(0, 8),
    tenant_id: index.tenant_id,
    tick_id: tickId,
    changed: seeds.map((s) => s.nodeId), // seeds that passed the pin pre-check
    invalidations: [...invalid.entries()].map(([node_id, r]) => Object.assign({ node_id }, r)),
    dropped,
    early_cutoffs: earlyCutoffs.length,
    dedup_merges: dedupMerges,
    fanout_flags: fanoutFlags,
    cycles_detected: [...new Set(cyclesDetected)],
    unbound_sections: index.unbound_sections,
  };
  return plan;
}

/**
 * Regeneration planner: ranked, ordered, bounded, idempotent jobs.
 * Deterministic job_id = rg_<sha256(tenant|tick|action|target)[:16]>.
 */
export function planRegeneration(index, plan, policy) {
  const jobs = [];
  const seen = new Set();
  const addJob = (action, target, causes, budgetClass) => {
    const jobId = "rg_" + sha256([plan.tenant_id, plan.tick_id, action, target].join("|")).slice(0, 16);
    if (seen.has(jobId)) return;
    seen.add(jobId);
    jobs.push({
      job_id: jobId,
      tenant_id: plan.tenant_id,
      tick_id: plan.tick_id,
      action,
      target,
      rank: ACTION_RANK[action],
      causes: causes.map((c) => c.change_ref || c.node_id),
      idempotency_key: jobId,
      budget_class: budgetClass,
    });
  };

  for (const inv of plan.invalidations) {
    const kind = index.nodes[inv.node_id].kind;
    if (kind === "objfield" || kind === "claim" || kind === "obs") {
      const oid = index.nodes[inv.node_id].detail.objectId || index.nodes[inv.node_id].detail.value;
      addJob("reverify-graph", "graph:" + (index.nodes[inv.node_id].detail.objectId || inv.node_id), inv.causes, "critical");
    } else if (kind === "section") {
      addJob("regenerate-section", inv.node_id, inv.causes, "critical");
    } else if (kind === "page") {
      addJob("regenerate-page", inv.node_id, inv.causes, "standard");
    }
  }
  // Re-attest the changed seed nodes themselves (reverify-graph): this is
  // what moves their pins, so a re-delivered event dies at the pre-check.
  for (const nid of plan.changed || []) {
    const k = index.nodes[nid] && index.nodes[nid].kind;
    if (["objfield", "obs", "claim", "rel"].includes(k)) {
      addJob("reverify-graph", "graph:" + nid,
        [{ node_id: nid, change_ref: plan.tick_id }], "critical");
    }
  }
  // Unbound sections are not in the index: bounded coarse fallback, always re-verified by full render compare.
  for (const u of plan.unbound_sections || []) {
    addJob("regenerate-section", u, [{ node_id: u, change_ref: "coarse-fallback:unbound" }], "standard");
  }

  // Execution order: (rank, job_id). Bound with spill.
  jobs.sort((a, b) => a.rank - b.rank || (a.job_id < b.job_id ? -1 : a.job_id > b.job_id ? 1 : 0));
  const max = policy.maxRegenUnits;
  return jobs.map((j, i) => Object.assign(j, { spilled: i >= max }));
}

/**
 * Apply completed job results: verify pin_after, update pins, advance the
 * watermark. repinNodeIds are nodes the refresher re-pinned this tick
 * (source/obs/claim re-pinning at stages 1-3). Returns a NEW index; the
 * caller persists (index + watermark) in ONE atomic write. Crash before
 * persist = replay from the old watermark is safe because pins are only
 * advisory and re-application is idempotent (deterministic job ids +
 * pin comparison make re-execution a no-op).
 */
export function applyTickResults(index, canonical, jobs, results, repin, newWatermark) {
  const byId = new Map(jobs.map((j) => [j.job_id, j]));
  const nodes = JSON.parse(JSON.stringify(index.nodes));
  const tmp = { nodes: index.nodes };
  for (const r of results) {
    const job = byId.get(r.job_id);
    if (!job || r.status !== "done" || job.spilled) continue;
    const target = job.target.startsWith("graph:") ? job.target.slice("graph:".length) : job.target;
    if (target && nodes[target] && r.pin_after) nodes[target].pin = r.pin_after;
  }
  for (const r of repin || []) {
    if (!nodes[r.nodeId]) continue;
    nodes[r.nodeId].pin = r.pin || recomputeDigest(canonical, tmp, r.nodeId);
    if (nodes[r.nodeId].kind === "source" && r.bytesDigest) {
      nodes[r.nodeId].detail.bytesDigest = r.bytesDigest;
    }
  }
  const next = Object.assign({}, index, { nodes, watermark: newWatermark });
  next.index_digest = sha256(canon({ nodes: next.nodes, edges: next.edges }));
  return next;
}

/** Loss recovery: rebuild from canonical state, verify against pinned digest. */
export function rebuildIndex(canonical, pinnedDigest, builtAt) {
  const rebuilt = buildIndex(canonical, { builtAt: builtAt || new Date().toISOString() });
  const verified = pinnedDigest ? rebuilt.index_digest === pinnedDigest : null;
  const divergent = verified === false ? ["index_digest-mismatch"] : [];
  return { index: rebuilt, verified, divergentNodes: divergent };
}

/** Scheduled integrity check: rebuild pins from canonical, compare. */
export function verifyEquivalence(index, canonical) {
  const divergentNodes = [];
  const tmp = { nodes: index.nodes };
  for (const id of Object.keys(index.nodes)) {
    const n = index.nodes[id];
    if (n.kind === "source") continue; // refresher-owned pin
    const fresh = recomputeDigest(canonical, tmp, id);
    if (fresh !== n.pin) divergentNodes.push(id);
  }
  return { equivalent: divergentNodes.length === 0, divergentNodes };
}

/** Serving-layer staleness check: pin older than invalidated_at must not serve as fresh. */
export function serveCheck(plan, pageNodeId, refreshedAtByNode) {
  const inv = plan.invalidations.find((i) => i.node_id === pageNodeId);
  if (!inv) return { page: pageNodeId, fresh: true, reason: "not-invalidated" };
  const refreshedAt = refreshedAtByNode[pageNodeId];
  if (!refreshedAt || refreshedAt < inv.invalidated_at) {
    return { page: pageNodeId, fresh: false, reason: "pin-older-than-invalidated_at" };
  }
  return { page: pageNodeId, fresh: true, reason: "regenerated-after-invalidation" };
}
