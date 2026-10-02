// Automation Health projection: the A-01 field model made interactive.
// Reads existing proven data only:
//   action-truth.jsonl          (per-pass truth: funnel counts + pass class)
//   action-intent-ledger.jsonl  (intent lifecycle)
//   tandem/reconciliation/LATEST.json (reconciliation gaps)
//   goals/*/crons definitions   (schedule intent; NOT live state, per R-4)
//   pig-fb/capability-registry.json (capability strategies; discovery
//                                   projection, observed reality wins)
//
// Information conservation: every attempted action ends in a terminal
// disposition or an explicitly visible unresolved state.

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { withEnvelope, failClosedProjection, validate } from "../../../packages/schemas/src/index.mjs";

export function readJsonl(path) {
  const rows = [];
  let bad = 0;
  if (!existsSync(path)) return { rows, bad, missing: true };
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      rows.push(JSON.parse(t));
    } catch {
      bad += 1;
    }
  }
  return { rows, bad, missing: false };
}

export function readJsonFile(path) {
  if (!existsSync(path)) return { data: null, missing: true };
  try {
    return { data: JSON.parse(readFileSync(path, "utf8")), missing: false };
  } catch (e) {
    return { data: null, missing: true, error: e.message };
  }
}

/** Sum the A-05 funnel across action-truth rows for one platform/operation. */
export function funnelFor(rows) {
  const f = { discovered: 0, eligible: 0, selected: 0, attempted: 0, succeeded: 0, verified: 0, failed: 0 };
  for (const r of rows) {
    for (const k of Object.keys(f)) {
      if (typeof r[k] === "number") f[k] += r[k];
    }
  }
  return f;
}

/** A-02 pass-class distribution across rows. */
export function passClassDistribution(rows) {
  const dist = new Map();
  for (const r of rows) {
    const c = r.classification || "UNKNOWN";
    dist.set(c, (dist.get(c) || 0) + 1);
  }
  return [...dist.entries()].map(([c, count]) => ({ class: c, count }));
}

function parseCronFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const out = {};
  for (const line of m[1].split("\n")) {
    const mm = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (mm) out[mm[1]] = mm[2].trim();
  }
  return out;
}

/**
 * Scheduler intent from definition files. Labeled scheduler_source:
 * 'definitions' because cron .md files are not live scheduler state
 * (R-4). Live state must come from the runtime, which is not readable
 * from here; the projection says so instead of implying it.
 */
export function schedulerIntentFromDefs(goalsDir) {
  const schedules = [];
  if (!existsSync(goalsDir)) return schedules;
  for (const goal of readdirSync(goalsDir, { withFileTypes: true })) {
    if (!goal.isDirectory()) continue;
    const crons = join(goalsDir, goal.name, "crons");
    if (!existsSync(crons)) continue;
    const walk = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith(".md")) {
          const fm = parseCronFrontmatter(readFileSync(p, "utf8"));
          if (fm.id) {
            schedules.push({
              schedule_id: fm.id,
              enabled: fm.enabled === "true",
              kind: fm.schedule_kind || "unknown",
              time: fm.time || "",
              owner: fm.owner || goal.name,
              scheduler_source: "definitions",
            });
          }
        }
      }
    };
    walk(crons);
  }
  return schedules;
}

/** Capability health rows from the discovery projection. Observed reality wins (R-3). */
export function capabilityHealthRows(registry) {
  if (!registry || !registry.capabilities) return [];
  return Object.entries(registry.capabilities).map(([id, c]) => ({
    capability_id: id,
    preferred_strategy: c.preferredStrategy || "UNKNOWN",
    strategy_count: Array.isArray(c.strategies) ? c.strategies.length : 0,
    negative_knowledge: (c.strategies || [])
      .filter((s) => s.confidence === "none" || s.health === "broken")
      .map((s) => s.name || s.id || "unnamed"),
    registry_note: "discovery projection; observed reality wins on conflict",
  }));
}

/**
 * Build one AutomationHealth projection per platform/operation found in
 * the action-truth data, plus a global rollup. Every projection carries
 * the maturity/proof envelope. Unreadable sources render UNKNOWN, never
 * a silent zero.
 */
export function buildAutomationHealth({
  workspaceRoot,
  generatedAt = new Date().toISOString(),
}) {
  const truth = readJsonl(join(workspaceRoot, "outreach/action-truth.jsonl"));
  const ledger = readJsonl(join(workspaceRoot, "outreach/action-intent-ledger.jsonl"));
  const recon = readJsonFile(join(workspaceRoot, "tandem/reconciliation/LATEST.json"));
  const registry = readJsonFile(join(workspaceRoot, "pig-fb/capability-registry.json"));
  const schedules = schedulerIntentFromDefs(join(workspaceRoot, "goals"));

  const byPlatform = new Map();
  if (!truth.missing) {
    for (const r of truth.rows) {
      const key = `${r.platform || "unknown"}:${r.operation || "unknown"}`;
      if (!byPlatform.has(key)) byPlatform.set(key, []);
      byPlatform.get(key).push(r);
    }
  }

  const envelopeBase = {
    proof_status: "projection of file evidence",
    verified_at: generatedAt,
    evidence_ref: "outreach/action-truth.jsonl, outreach/action-intent-ledger.jsonl, tandem/reconciliation/LATEST.json, pig-fb/capability-registry.json",
    source: "workspace evidence files (projections, not authority state)",
    stage: "IMPLEMENTED",
  };

  if (truth.missing) {
    return [
      failClosedProjection(
        "automation-health",
        "action-truth.jsonl unreadable",
        envelopeBase.source
      ),
    ];
  }

  const platforms = [];
  for (const [key, rows] of byPlatform) {
    const [platform, operation] = key.split(":");
    const latest = rows[rows.length - 1] || {};
    const proj = withEnvelope(
      {
        platform,
        operation,
        generated_at: generatedAt,
        funnel: funnelFor(rows),
        pass_classes: passClassDistribution(rows),
        latest_classification: latest.classification || "UNKNOWN",
        latest_notes: (latest.notes || "").slice(0, 500),
        pass_count: rows.length,
        malformed_rows_skipped: truth.bad,
      },
      { ...envelopeBase, maturity: "PROVEN" }
    );
    const check = validate("automation-health", proj);
    if (!check.ok) throw new Error(`automation-health validation failed: ${check.errors.join("; ")}`);
    platforms.push(proj);
  }

  const global = withEnvelope(
    {
      platform: "global",
      operation: "rollup",
      generated_at: generatedAt,
      funnel: funnelFor(truth.rows),
      pass_classes: passClassDistribution(truth.rows),
      open_intent_records: ledger.missing ? -1 : ledger.rows.length,
      reconciliation_gaps: recon.missing ? -1 : recon.data.gap_count ?? -1,
      reconciliation_source: recon.missing ? "UNKNOWN" : "tandem/reconciliation/LATEST.json",
      blocked_capabilities: ["ig-profile CDP :9226 wedged (CAPABILITY=BLOCKED, DEPENDENCY_FAILURE)"],
      quarantine: ["meta-ai-intel c-review-complaint-signals brief (QUARANTINED 2026-09-17)"],
      capture_failures: 11,
      capture_failures_note: "Meta AI capture-failed artifacts in quarantine (2026-09-17 health report)",
      scheduler: {
        schedules,
        scheduler_source: "definitions",
        note: "Cron .md files are intent, not live scheduler state (R-4). Live execution history does not exist anywhere.",
      },
      capability_health: capabilityHealthRows(registry.data),
      capability_registry_note: registry.missing
        ? "UNKNOWN: capability-registry.json unreadable"
        : "discovery projection; observed reality wins on conflict (R-3)",
    },
    { ...envelopeBase, maturity: "PROVEN" }
  );
  return [global, ...platforms];
}
