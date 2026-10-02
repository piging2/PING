# Proposal: smallest ownership + max-age-bound patch for dump.py projections (F77)

**Provisional finding:** W4-F3 (target 3 of the AGENT-04 open-items probe)
**Agent:** AGENT-04 open-items probe (owns: dump-projection + read-seam contract per WRITER-OWNERSHIP.md line 15)
**Mode:** PROPOSE ONLY. Live core file; no agent applies. For coordinator + core owner.
**Status at filing:** unapplied. F77 staleness defect stands.

## WHY

dump.py produces the projection the public site renders as truth (`/home/nolan/ping/var/fyd-projections/<slug>.json`), runs manually (no cron/scheduler anywhere), and nothing bounds its freshness: the read seam verifies digests (tamper) but never age. The site can render a >24h-old projection with no signal while Ask FYD reasons over a different, live journal fold (F77 dual truth). The live projections are currently produced by uncommitted v1.1.0 code (W4-F3a).

## EVIDENCE

- dump.py writes `meta.dumpedAt` but no age bound (`tools/fyd-site-projection/dump.py`, `SITES` config at :87-97 has `fixture`/`generatedAt`/`eventSequences` only).
- Read seam: `src/fyd/data/ping-object-source.ts:166-182, 228-241` verifies `graphDigest` + `presentationIntentDigest`, no age check.
- `grep` for scheduler/cron references to `fyd-projections` in core gateway/ping-runtime/tools: empty (manual invocation only).
- The uncommitted v1.1.0 diff (87+/9-, presentation-intent layer) is characterized in the probe report; the max-age change is independent of it.

## MINIMUM CHANGE (diff sketch, proposed against live core — NOT APPLIED)

In `tools/fyd-site-projection/dump.py`:
```diff
+DEFAULT_MAX_AGE_SECONDS = 86400  # 24h; per-site override in SITES cfg
 SITES = {
     "happy-place": {
         "fixture": REPO + "/src/fyd/proceduralize/__fixtures__/happy-place-graph.ts",
         "generatedAt": "2026-09-21T12:00:00.000Z",
         "eventSequences": [65, 83],
+        "maxAgeSeconds": 86400,
     },
     "coppersmith-plumbing": {
         ...
+        "maxAgeSeconds": 86400,
     },
 }
 # in dump_site meta dict:
+            "maxAgeSeconds": cfg.get("maxAgeSeconds", DEFAULT_MAX_AGE_SECONDS),
```

In the served read seam `src/fyd/data/ping-object-source.ts` (after digest verification passes):
```diff
+// FRESHNESS SIGNAL: the projection is honest about its age.
+// Tamper-verified first (digests), then age-checked. Signal, not trigger:
+// the seam exposes `stale: true`; consumers decide (public page badges,
+// Ask FYD may escalate to fail-closed). This patch never re-runs dump.py.
+const ageSeconds = (Date.now() - Date.parse(doc.meta.dumpedAt)) / 1000;
+const maxAge = doc.meta.maxAgeSeconds ?? 86400;
+const stale = ageSeconds > maxAge;
```

## OWNERSHIP

The dumper (dump.py) and its read-seam verifier (ping-object-source.ts) are ONE contract — owned by the projection lane (agent04-projection, WRITER-OWNERSHIP line 15). Both change in this single proposal; no second authority is created.

## WHAT STAYS

- Invocation remains manual; no cron, no scheduler, no auto-rebuild trigger added. The bound is a **signal**, not a trigger.
- Deliberately left open for the coordinator: who owns re-running dump.py (F77 cadence), and whether Ask FYD falls back to D1 when the journal is dark. This patch does not preempt those calls.
- v1.1.0 vs v1.0.0 convergence (which dumper is canonical) remains the coordinator's commit decision (AGENT-04 §7 Q4).

## TEST (acceptance, not yet run)

1. Run `dump.py <slug>`; assert output JSON contains `meta.maxAgeSeconds` (86400 default) and `meta.dumpedAt`.
2. Read seam test: tamper-verified fixture with `dumpedAt` older than `maxAgeSeconds` → view carries `stale: true`; fresh fixture → `stale: false`. Digest-failure path unchanged (fail-closed before the age check).
3. Regression: existing read-seam tests (`ping-object-source` suite) pass unmodified.

## RESULT

NOT APPLIED — awaiting coordinator + core owner (agent-20 conflict check on the live core file).
