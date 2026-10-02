/**
 * Lane J prototype: the five-query surface (`runq`). Pure functions over
 * run records. No server, no database.
 *
 * 1. runs({connector_id, tenant_id, from, to, status})  - runs by source+time
 * 2. changes(run_id)                                   - what changed in run X
 * 3. whyRejected(observation_id)                       - why was Y rejected
 * 4. cost({connector_id, from, to, group_by})           - cost/tokens/bytes
 * 5. whyChanged(entity_id, field, at?)                  - WHY DID FYD CHANGE
 */

export function runs(records, q = {}) {
  const { connector_id, tenant_id, from, to, status } = q;
  return records
    .filter((r) => !connector_id || r.connector_id === connector_id)
    .filter((r) => !tenant_id || r.tenant_id === tenant_id)
    .filter((r) => !status || r.status === status)
    .filter((r) => !from || r.started_at >= from)
    .filter((r) => !to || r.started_at <= to)
    .sort((a, b) => (a.started_at < b.started_at ? -1 : 1))
    .map((r) => ({
      run_id: r.run_id,
      seq: r.seq,
      trigger: r.trigger,
      status: r.status,
      started_at: r.started_at,
      finished_at: r.finished_at,
      duration_ms: r.duration_ms,
      observations: r.observations,
      conflicts: (r.conflicts || []).length,
      errors: (r.errors || []).length,
      cost_usd: r.cost?.usd ?? 0,
      ai_tokens_in: r.ai_tokens?.input ?? 0,
      ai_tokens_out: r.ai_tokens?.output ?? 0,
      checkpoint_in: r.checkpoint_in,
      checkpoint_out: r.checkpoint_out,
      prior_ledger_gap: !!r.prior_ledger_gap,
    }));
}

/** What changed in run X: the changes[] list with before/after + links. */
export function changes(records, run_id) {
  const r = records.find((x) => x.run_id === run_id);
  if (!r) return { found: false, run_id };
  return {
    found: true,
    run_id: r.run_id,
    status: r.status,
    started_at: r.started_at,
    trigger: r.trigger,
    checkpoint_in: r.checkpoint_in,
    checkpoint_out: r.checkpoint_out,
    changes: (r.changes || []).map((c) => ({
      entity_id: c.entity_id,
      field: c.field,
      kind: c.kind,
      before: c.before,
      after: c.after,
      confidence: c.confidence,
      observation_id: c.observation_id,
      claim_id: c.claim_id,
      before_event_id: c.before_event_id,
      after_event_id: c.after_event_id,
    })),
    conflicts: r.conflicts || [],
    rejections: (r.rejections || []).map((x) => ({
      observation_id: x.observation_id,
      code: x.code,
      detail: x.detail,
    })),
  };
}

/** Why was observation Y rejected: taxonomy code + detail + raw payload ref. */
export function whyRejected(records, observation_id) {
  for (const r of records) {
    const hit = (r.rejections || []).find((x) => x.observation_id === observation_id);
    if (hit) {
      return {
        found: true,
        run_id: r.run_id,
        started_at: r.started_at,
        connector_id: r.connector_id,
        code: hit.code,
        detail: hit.detail,
        evidence_ref: hit.evidence_ref,
        claim_id: hit.claim_id,
      };
    }
  }
  return { found: false, observation_id, note: "no rejection recorded for this observation id" };
}

/** Cost / tokens / bytes by source over time. group_by: "day" | "connector". */
export function cost(records, q = {}) {
  const { connector_id, from, to, group_by = "day" } = q;
  const sel = records
    .filter((r) => !connector_id || r.connector_id === connector_id)
    .filter((r) => !from || r.started_at >= from)
    .filter((r) => !to || r.started_at <= to);
  const groups = new Map();
  for (const r of sel) {
    const key =
      group_by === "connector"
        ? r.connector_id
        : `${r.connector_id}|${String(r.started_at).slice(0, 10)}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        group: key,
        runs: 0,
        usd: 0,
        ai_tokens_in: 0,
        ai_tokens_out: 0,
        bytes_inbound: 0,
        provider_calls: 0,
        rate_limited_runs: 0,
      };
      groups.set(key, g);
    }
    g.runs++;
    g.usd += r.cost?.usd ?? 0;
    g.ai_tokens_in += r.ai_tokens?.input ?? 0;
    g.ai_tokens_out += r.ai_tokens?.output ?? 0;
    g.bytes_inbound += r.bytes?.inbound ?? 0;
    g.provider_calls += r.rate_limits?.provider_calls ?? 0;
    if (r.rate_limits?.limited) g.rate_limited_runs++;
  }
  g_round(groups);
  return [...groups.values()].sort((a, b) => (a.group < b.group ? -1 : 1));
}

function g_round(groups) {
  for (const g of groups.values()) g.usd = Math.round(g.usd * 1e6) / 1e6;
}

/**
 * WHY DID FYD CHANGE. Latest run whose changes[] touches (entity, field).
 * Lane J owns the run -> change -> observation resolution; the caller hands
 * observation_id to lane N (lineage) and (entity, field) to lane O
 * (dependency index / regen targets).
 */
export function whyChanged(records, entity_id, field, at) {
  const hits = [];
  for (const r of records) {
    if (at && r.started_at > at) continue;
    for (const c of r.changes || []) {
      if (c.entity_id === entity_id && c.field === field) {
        hits.push({ run: r, change: c });
      }
    }
  }
  if (!hits.length) return { found: false, entity_id, field };
  hits.sort((a, b) => (a.run.started_at < b.run.started_at ? 1 : -1));
  const { run, change } = hits[0];
  const history = hits.map(({ run: r, change: c }) => ({
    run_id: r.run_id,
    started_at: r.started_at,
    kind: c.kind,
    before: c.before,
    after: c.after,
  }));
  return {
    found: true,
    entity_id,
    field,
    latest: {
      run_id: run.run_id,
      seq: run.seq,
      connector_id: run.connector_id,
      trigger: run.trigger,
      started_at: run.started_at,
      status: run.status,
      kind: change.kind,
      before: change.before,
      after: change.after,
      confidence: change.confidence,
      observation_id: change.observation_id,
      claim_id: change.claim_id,
      before_event_id: change.before_event_id,
      after_event_id: change.after_event_id,
      checkpoint_in: run.checkpoint_in,
      checkpoint_out: run.checkpoint_out,
    },
    handoff: {
      lineage_input: { observation_id: change.observation_id, claim_id: change.claim_id },
      regen_input: { entity_id, field },
      note: "hand observation_id to lane N lineage tracer; hand (entity, field) to lane O dependency index",
    },
    history,
  };
}

/** Surface sequence gaps: runs the ledger never saw. */
export function ledgerGaps(records, connector_id, tenant_id) {
  const seqs = records
    .filter((r) => r.connector_id === connector_id && r.tenant_id === tenant_id)
    .map((r) => r.seq)
    .sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < seqs.length; i++) {
    for (let s = seqs[i - 1] + 1; s < seqs[i]; s++) gaps.push(s);
  }
  return gaps;
}
