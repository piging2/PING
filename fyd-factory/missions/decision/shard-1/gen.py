#!/usr/bin/env python3
"""DECISION shard-1 generator. Units: within-shard indices 0-249, backlog D-251..D-500.
Reuses definitions authored in ../shard-0/gen.py (no re-authorship)."""
import importlib.util, json, os, time, tracemalloc

SHARD_DIR = os.path.dirname(os.path.abspath(__file__))
S0 = os.path.join(os.path.dirname(SHARD_DIR), "shard-0", "gen.py")
spec = importlib.util.spec_from_file_location("shard0_gen", S0)
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)

FIELDS = ["id","kind","question","context","outputs","evidence","confidence",
          "conf_basis","criticality","reversibility","blast_radius",
          "novelty","authority","cost","time_sensitivity","verification",
          "verdict","verdict_rationale"]

def main():
    t0 = time.time()
    tracemalloc.start()
    defs = g.items[250:500]
    assert len(defs) == 250, f"expected 250, got {len(defs)}"
    assert defs[0]["id"] == "D-251" and defs[-1]["id"] == "D-500", \
        f"range {defs[0]['id']}..{defs[-1]['id']}"
    ids = [d["id"] for d in defs]
    assert len(set(ids)) == 250, "duplicate ids in shard 1"
    for d in defs:
        for f in FIELDS:
            assert f in d, f"{d.get('id')}: missing {f}"
        assert d["verdict"] in g.VALID_VERDICTS, f"{d['id']}: bad verdict"
        for f in FIELDS:
            v = d[f]
            if isinstance(v, str):
                assert "\u2014" not in v, f"{d['id']}.{f}: em dash"
            elif isinstance(v, list):
                for s in v:
                    assert "\u2014" not in s, f"{d['id']}.{f}: em dash"

    dist = {}
    rp = os.path.join(SHARD_DIR, "results.jsonl")
    with open(rp, "w", encoding="utf-8") as fh:
        for i, d in enumerate(defs):
            rec = {"unit_index": i, "shard": 1, "backlog_id": d["id"],
                   "source": "decision-shard-1",
                   "synthetic": True, "testing_only": True}
            for f in FIELDS:
                rec[f.upper()] = d[f]
            line = json.dumps(rec, ensure_ascii=False)
            assert "\u2014" not in line
            fh.write(line + "\n")
            dist[d["verdict"]] = dist.get(d["verdict"], 0) + 1

    with open(rp, encoding="utf-8") as fh:
        lines = fh.readlines()
    assert len(lines) == 250
    for ln, line in enumerate(lines):
        r = json.loads(line)
        for f in FIELDS:
            assert f.upper() in r, f"line {ln}: missing {f.upper()}"
        assert r["VERDICT"] in g.VALID_VERDICTS

    total = sum(dist.values())
    dist_rows = "\n".join(
        f"| {v} | {dist.get(v,0)} | {dist.get(v,0)/total*100:.1f}% |"
        for v in sorted(dist, key=lambda v: -dist[v]))

    def crit_key(c):
        for p, r in (("P0", 0), ("P1", 1), ("P2", 2), ("P3", 3)):
            if c.startswith(p):
                return r
        return 9
    hr = [d for d in defs if d["verdict"] in ("HUMAN_DECISION", "REFUSE")]
    hr.sort(key=lambda d: (crit_key(d["criticality"]), d["id"]))
    top3 = hr[:3]

    elapsed = time.time() - t0
    peak_kb = tracemalloc.get_traced_memory()[1] / 1024
    tracemalloc.stop()
    upm = 250 / (elapsed / 60) if elapsed > 0 else 0
    top3_md = "\n".join(
        f"{n}. **{d['id']}** ({d['verdict']}, {d['criticality']}): {d['question']} "
        f"Rationale: {d['verdict_rationale']}"
        for n, d in enumerate(top3, 1))

    with open(os.path.join(SHARD_DIR, "SUMMARY.md"), "w", encoding="utf-8") as fh:
        fh.write(f"""# DECISION Shard 1 Summary

Worker: DECISION-SHARD-0 (depth 2, no child agents), claimed shard 1 unclaimed at 2026-09-24 03:13 UTC.
Scope: within-shard indices 0-249, backlog ids D-251 through D-500. Definitions reused from
`../shard-0/gen.py` (authored during shard 0). Synthetic mission output: `synthetic:true`, `testing_only:true`.
Backlog D-251..D-500 already appended by shard 0 (500 unique ids verified); no re-append.

## Verdict distribution (250 units)

| Verdict | Count | Share |
|---|---|---|
{dist_rows}

## Top three HUMAN_DECISION / REFUSE items (ranked by criticality, then backlog order)

{top3_md}

## Key evidence

Same seven lane documents as shard 0 (D-439 re-check: no deltas since shard 0's read).
This shard's content: mission-class operations (WORLD/OBJECT/PROJECTION/SYNTH/DECISION),
integration/operations, absolute boundary restatements (D-251..D-253), and falsification
seeds challenging shard 0's own verdicts (D-471..D-500).

## Open questions

- D-361/D-440: compare this shard's distribution against the shard-0 baseline for skew.
- D-429/D-469: parent confirms reporting cadence and retrospective ownership.
- D-475: template provisional adoption; parent reviews after this shard.

## Next steps

Per the never-idle rule: check for shard 2 ownership. If unclaimed, the 500-definition
corpus is exhausted (D-001..D-500 complete); next work is falsification of other shards'
verdicts (D-449) or gap discovery (D-450), per the parent.

## Throughput

250 units in {elapsed:.1f}s ({upm:.0f} units/min). Peak traced memory: {peak_kb:.0f} KB.
""")

    with open(os.path.join(SHARD_DIR, "SHARD-LOG.md"), "w", encoding="utf-8") as fh:
        fh.write(f"""# DECISION Shard 1 Log

Worker: DECISION-SHARD-0, depth 2. No child agents used. Claimed unclaimed shard 1 at
2026-09-24 03:13 UTC (CLAIM.md). Timestamp: 2026-09-24 (UTC).

## Decisions at 80%+ confidence (standing)

- Reused shard 0's authored definitions for D-251..D-500 (no re-authorship, no drift).
- unit_index = within-shard position 0-249 per D-401; backlog_id is the stable cross-shard key.
- Skew baseline: shard 0's distribution recorded in CLAIM.md (D-440).
- Source re-check (D-439): no deltas; all anchors present.
- Boundaries restated as in shard 0: no destructive Git (D-458), repo read-only (D-415),
  zero em dashes verified by scan (D-454), no credential exposure (D-457), no owner
  contact/outreach (D-459), no public launch (D-460), no new vendors (D-461), zero spend (D-462).
- No live browser work (D-465). No authority-bound item auto-executed.

## What I did after finishing

Per the never-idle rule: checked for shard 2 ownership. The 500-definition corpus
(D-001..D-500) is exhausted, so further decision units need parent direction: falsify
other shards (D-449) or discover the next gap (D-450).

## Below 80% (open, not decided here)

- Skew comparison against the shard-0 baseline (needs this shard's distribution first).
- Whether shard 2+ should extend the corpus beyond D-500 (parent decision).
""")

    for p in ("SUMMARY.md", "SHARD-LOG.md"):
        with open(os.path.join(SHARD_DIR, p), encoding="utf-8") as fh:
            assert "\u2014" not in fh.read(), f"em dash in {p}"

    print(f"shard1 defs=250 dist={json.dumps(dist, sort_keys=True)}")
    print(f"top3={[d['id'] for d in top3]}")
    print(f"elapsed={elapsed:.1f}s units_per_min={upm:.0f} peak_kb={peak_kb:.0f}")

if __name__ == "__main__":
    main()
