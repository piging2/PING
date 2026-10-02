.pl-primitive-deta#!/usr/bin/env python3
"""Journal truth-split inventory (read-only)."""
import json, os
from collections import Counter

JOURNALS = {
    "j1_canonical": "/home/nolan/projects/ping/data/fyd-journal/events.jsonl",
    "j2_fork_18200": "/home/nolan/projects/ping-fyd-converged/data/fyd-journal/events.jsonl",
    "j3_mc_writers": "/home/nolan/workspace/fyd-journal-gateway/events.jsonl",
}

def load(path):
    events = []
    with open(path, encoding="utf-8") as f:
        for i, line in enumerate(f):
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line))
            except Exception as ex:
                events.append({"_parse_error": str(ex)[:100], "_line": i})
    return events

def eid(e):
    return e.get("event_id") or e.get("id") or ("_noid:" + json.dumps(e, sort_keys=True)[:80])

report = {}
idsets = {}
full_by_id = {}
for name, path in JOURNALS.items():
    st = os.stat(path)
    evs = load(path)
    ids = []
    for e in evs:
        if "_parse_error" in e:
            continue
        i = eid(e)
        ids.append(i)
        full_by_id.setdefault(i, {})[name] = json.dumps(e, sort_keys=True)
    ts = [e.get("timestamp") for e in evs if e.get("timestamp")]
    types = Counter(e.get("event_type", "?") for e in evs if "_parse_error" not in e)
    report[name] = {
        "path": path,
        "bytes": st.st_size,
        "lines": len(evs),
        "parse_errors": sum(1 for e in evs if "_parse_error" in e),
        "unique_ids": len(set(ids)),
        "dup_ids_within": len(ids) - len(set(ids)),
        "first_ts": ts[0] if ts else None,
        "last_ts": ts[-1] if ts else None,
        "first_id": ids[0] if ids else None,
        "last_id": ids[-1] if ids else None,
        "event_types": dict(types),
    }
    idsets[name] = set(ids)

j1, j2, j3 = idsets["j1_canonical"], idsets["j2_fork_18200"], idsets["j3_mc_writers"]
only_j2 = j2 - j1 - j3
only_j3 = j3 - j1 - j2
only_j1 = j1 - j2 - j3
report["overlap"] = {
    "j1_and_j2": len(j1 & j2), "j1_and_j3": len(j1 & j3),
    "j2_and_j3": len(j2 & j3), "all_three": len(j1 & j2 & j3),
    "only_j1": len(only_j1), "only_j2": len(only_j2), "only_j3": len(only_j3),
}
# content il h3 { max-width: calc(100% - 110px); }
.pl-primitive-detail > .pl-status { max-width: calc(100% - 110px); }
.pl-principle-symbol { width: 116px; height: 138px; display: block; padding: 12px 0 18px; }
.pl-principles article { position: relative; }
.pl-principles h3 { font-size: clamp(28px,2.6vw,42px); }
.pl-product-top > .pg-symbol { width: 88px; color: var(--ink); }
.pl-product-grid article { border-top: 1px solid var(--line) !important; background: transparent !important; }
.pl-product-grid h3 { font-size: 34px; }
.pl-audience-mark { width: 92px; height: 92px; display: block; font-size: inherit; transform: none !important; color: var(--ink); }
.pl-audiences article { background: transparent; }
.pl-audiences article:hover { transform: none; box-shadow: none; }
.pl-audiences h3 { font-size: 32px; }
.pl-audiences article:after { display: none; }
.ed-node-mark { display: block; width: 30px; }
.ed-node-mark .pg-symbol path { vector-effect: none; }
.ed-map-center .pg-symbol { width: 90px; margin: 0 auto 8px; }
.ed-map-center { font-size: 15px; letter-spacing: 0; }
.ed-workspace-mark { width: 26px; }
.ed-workspace-mark .pg-symbol path { vector-effect: none; }
.ed-diagram-node > span .pg-symbol { width: 35px; }
.ed-diagram-node > span .pg-symbol path { vector-effect: none; }

/* Context drawing: disconnected conversations align around a missing thread. */
.pg-context-study { border: 1px solid var(--line); padding: 24px; background: #eeeef0; position: relative; }
.pg-context-label { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding-bottom: 24px; }
.pg-context-label .ed-label { font-size: 11px; max-width: 24ch; line-height: 1.5; }
.pg-context-label .pg-symbol { width: 65px; }
.pg-context-record { display: grid; grid-template-columns: 28px 1fr 58px; gap: 14px; padding: 20px 0; border-top: 1px solid #c9c7cc; align-items: center; }
.pg-context-number { align-self: start; font: 10px ui-monospace,monospace; padding-top: 4px; }
.pg-context-record .ed-label { font-size: 10px; color: var(--muted); }
.pg-context-record p { font-size: 18px; line-height: 1.45; margin-top: 9px; max-width: 26ch; }
.pg-context-record .pg-symbol { width: 58px; }
.pg-context-record:nth-child(3) { margin-left: 25pxequality for overlapping ids: same id, different content?
mismatched = [i for i in (j1 & j2) | (j1 & j3) | (j2 & j3)
              if len(set(full_by_id[i].values())) > 1]
report["same_id_different_content"] = len(mismatched)
report["same_id_different_content_sample"] = mismatched[:5]

def types_of(path, idset):
    out = Counter()
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except Exception:
                continue
            if eid(e) in idset:
                out[e.get("event_type", "?")] += 1
    return dict(out)

report["only_j2_types"] = types_of(JOURNALS["j2_fork_18200"], only_j2)
report["only_j3_types"] = types_of(JOURNALS["j3_mc_writers"], only_j3)
report["only_j2_sample"] = sorted(only_j2)[:8]
report["only_j3_sample"] = sorted(only_j3)[:8]

print(json.dumps(report, indent=1, default=str))
; }
