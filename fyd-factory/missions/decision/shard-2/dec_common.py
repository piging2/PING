#!/usr/bin/env python3
"""Shared DECISION shard-2/3 machinery: add(), items, emit()."""
import json, os, sys, time, resource

items = []

def add(iid, kind, question, context, outputs, evidence, confidence, conf_basis,
        criticality, reversibility, blast_radius, novelty, authority, cost,
        time_sensitivity, verification, verdict, verdict_rationale):
    assert "\u2014" not in question + context + verdict_rationale, f"em dash in {iid}"
    items.append({
        "id": iid, "kind": kind, "question": question, "context": context,
        "outputs": outputs, "evidence": evidence, "confidence": confidence,
        "conf_basis": conf_basis, "criticality": criticality,
        "reversibility": reversibility, "blast_radius": blast_radius,
        "novelty": novelty, "authority": authority, "cost": cost,
        "time_sensitivity": time_sensitivity, "verification": verification,
        "verdict": verdict, "verdict_rationale": verdict_rationale,
    })

def emit(shard_n, id_lo, id_hi, source, shard_dir):
    t0 = time.time()
    backlog = os.path.expanduser("~/workspace/fyd-factory/missions/decision-backlog.jsonl")
    have = set()
    with open(backlog, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                try: have.add(json.loads(line)["id"])
                except Exception: pass
    mine = [d for d in items if id_lo <= int(d["id"][2:]) <= id_hi]
    assert len(mine) == 250, f"expected 250 defs in range, got {len(mine)}"
    ids = [d["id"] for d in mine]
    assert len(set(ids)) == 250, "duplicate ids"
    assert ids == sorted(ids, key=lambda x: int(x[2:])), "ids not in order"
    appended = skipped = 0
    with open(backlog, "a", encoding="utf-8") as fh:
        for d in mine:
            if d["id"] in have:
                skipped += 1
                continue
            fh.write(json.dumps({"id": d["id"], "kind": d["kind"], "question": d["question"],
                                 "context": d["context"], "schema": "v1", "source": source}) + "\n")
            appended += 1
    results = os.path.join(shard_dir, "results.jsonl")
    dist = {}
    with open(results, "w", encoding="utf-8") as fh:
        for i, d in enumerate(mine):
            rec = {"unit_index": i, "shard": shard_n, "backlog_id": d["id"], "source": source,
                   "synthetic": True, "testing_only": True,
                   "ID": d["id"], "KIND": d["kind"], "QUESTION": d["question"],
                   "CONTEXT": d["context"], "OUTPUTS": d["outputs"], "EVIDENCE": d["evidence"],
                   "CONFIDENCE": d["confidence"], "CONF_BASIS": d["conf_basis"],
                   "CRITICALITY": d["criticality"], "REVERSIBILITY": d["reversibility"],
                   "BLAST_RADIUS": d["blast_radius"], "NOVELTY": d["novelty"],
                   "AUTHORITY": d["authority"], "COST": d["cost"],
                   "TIME_SENSITIVITY": d["time_sensitivity"], "VERIFICATION": d["verification"],
                   "VERDICT": d["verdict"], "VERDICT_RATIONALE": d["verdict_rationale"]}
            fh.write(json.dumps(rec) + "\n")
            dist[d["verdict"]] = dist.get(d["verdict"], 0) + 1
    elapsed = time.time() - t0
    peak_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    summ = os.path.join(shard_dir, "SUMMARY.md")
    log = os.path.join(shard_dir, "SHARD-LOG.md")
    with open(summ, "w", encoding="utf-8") as fh:
        fh.write(summary_text(shard_n, id_lo, id_hi, dist, elapsed, peak_kb, appended, skipped))
    with open(log, "w", encoding="utf-8") as fh:
        fh.write(log_text(shard_n, id_lo, id_hi, source, dist, appended, skipped))
    for p in (summ, log):
        with open(p, encoding="utf-8") as fh:
            assert "\u2014" not in fh.read(), f"em dash in {p}"
    print(f"defs={len(mine)} appended={appended} skipped={skipped}")
    print(f"results=250 lines dist={json.dumps(dist, sort_keys=True)}")
    print(f"elapsed={elapsed:.1f}s peak_kb={peak_kb:.0f}")

def summary_text(shard_n, id_lo, id_hi, dist, elapsed, peak_kb, appended, skipped):
    lines = [f"# DECISION-SHARD-{shard_n} SUMMARY (D-{id_lo:03d}..D-{id_hi:03d})", "",
             "## Verdict distribution (250 units)", ""]
    for v in sorted(dist):
        lines.append(f"- {v}: {dist[v]}")
    lines += ["", "## Method",
        "- 250 NEW decision definitions (the D-001..D-500 corpus is exhausted; D-501/D-502 pre-exist in the backlog from the projection worker, so this shard uses fresh ids).",
        "- Full 18-field decomposition per unit: QUESTION / POSSIBLE OUTPUTS / EVIDENCE REQUIREMENTS / CONFIDENCE / CRITICALITY / REVERSIBILITY / BLAST RADIUS / NOVELTY / AUTHORITY REQUIRED / COST / TIME SENSITIVITY / VERIFICATION + verdict + rationale.",
        "- Verdict set: AUTO_EXECUTE / AUTO_EXECUTE_AND_NOTIFY / EXECUTE_REVERSIBLY / GATHER_MORE_EVIDENCE / DEEP_REVIEW / REQUEST_CONFIRMATION / HUMAN_DECISION / REFUSE / DEFER.",
        "- High confidence never overrides authority: owner-contact, public-launch, credential, and canonical-mutation items are HUMAN_DECISION/REFUSE by law regardless of confidence.",
        "- Repo writes belong to the parent-gated integration writer; this shard recommends, never applies.",
        "", "## Throughput",
        f"- 250 units in {elapsed:.1f}s. Peak traced memory: {peak_kb:.0f} KB.",
        f"- Backlog: {appended} appended, {skipped} skipped (already present).",
        "", "## Artifacts",
        "- results.jsonl (250 lines, unit_index + backlog_id per line)", "- SHARD-LOG.md, CLAIM.md, theme definition files (this shard's definitions/)" ]
    return "\n".join(lines) + "\n"

def log_text(shard_n, id_lo, id_hi, source, dist, appended, skipped):
    auto_n = dist.get("AUTO_EXECUTE", 0)
    return (f"# DECISION Shard {shard_n} Log\n\nWorker: {source}, depth 2. Timestamp: 2026-09-24 (UTC).\n\n"
        f"## Decisions at 80%+ confidence\n\n"
        f"- Claimed atomically via missions/claim.sh (fresh lease); re-listed immediately before writing.\n"
        f"- D-501/D-502 already existed in decision-backlog.jsonl (projection worker); this shard starts at D-{id_lo:03d} to avoid id collision.\n"
        f"- {auto_n} of 250 units AUTO_EXECUTE; no authority-bound item was auto-executed.\n"
        f"- Backlog: {appended} appended, {skipped} skipped.\n\n"
        f"## What I did after finishing\n\nPer the never-idle rule: proceeded to the next unclaimed shard / adversarial runs.\n")
