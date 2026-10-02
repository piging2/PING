#!/usr/bin/env python3
"""Fleet ledger consistency audit v2. Read-only. Uses snapshot of ledger."""
import json, os, re, random
from collections import Counter, defaultdict
from datetime import datetime, timezone

BASE = os.path.expanduser("~/workspace/ping-build-program/fleet")
PBP = os.path.expanduser("~/workspace/ping-build-program")
HOME = os.path.expanduser("~")
PREFIX = {"oracle":"ORA","acquisition":"ACQ","backend":"BAC","connector":"CON","perfops":"PER","release":"REL"}
VERDICTS = {"PROVEN","REJECTED","ADAPT","NEEDS-FOLLOWUP","N-A"}
REQUIRED = {"mission_id","verdict","summary","confidence","evidence_files"}

# snapshot ledger
snap = f"{BASE}/AUDIT-ledger-snapshot-2026-09-24.jsonl"
if not os.path.exists(snap):
    open(snap,"w").write(open(f"{BASE}/ledger.jsonl").read())

out = {"defects": [], "checks": {}, "notes": []}
def defect(kind, detail, path=None, severity="defect"):
    out["defects"].append({"kind": kind, "severity": severity, "detail": detail, "path": path})

NOW = datetime.now(timezone.utc).isoformat()

def parse_ranges(rng):
    pairs = re.findall(r"(\d{4})-(\d{4})", str(rng))
    if pairs: return [(int(a),int(b)) for a,b in pairs]
    try:
        a,b = (int(x) for x in str(rng).split("-")); return [(a,b)]
    except Exception: return None

entries = []
for i, line in enumerate(open(snap), 1):
    line=line.strip()
    if not line: continue
    try: entries.append((i, json.loads(line)))
    except Exception as e: defect("ledger-parse", f"line {i}: {e}", "fleet/ledger.jsonl")
out["ledger_lines"] = len(entries)
out["audit_at_utc"] = NOW
out["checks"]["ledger_parse"] = True

# schema check
CANON = {"worker","category","range","missions","verdicts","at"}
for ln, e in entries:
    ks = set(e.keys())
    if ks != CANON and not (ks == CANON | {"note"}) and not (ks == CANON | {"matrix"}) and not (ks == CANON | {"matrix","note"}):
        defect("ledger-schema", f"line {ln}: non-conforming keys {sorted(ks)}", "fleet/ledger.jsonl")
# timestamp anomaly
future = [(ln, e.get("at") or e.get("ts")) for ln, e in entries if (e.get("at") or e.get("ts","")) > NOW[:19]]
for ln, t in future[:5]: pass
if future: defect("ledger-future-timestamps", f"{len(future)} ledger lines carry timestamps after audit time (max {(max(t for _,t in future))}); clock skew or pre-written", "fleet/ledger.jsonl", severity="warning")
out["future_timestamp_lines"] = len(future)

# load result files
resfiles = {}
for cat in PREFIX:
    rd = f"{BASE}/results/{cat}"
    resfiles[cat] = {f: os.path.join(rd,f) for f in os.listdir(rd) if f.endswith(".json")} if os.path.isdir(rd) else {}
out["result_file_counts"] = {c: len(v) for c,v in resfiles.items()}

jcache = {}
def get_json(p):
    if p not in jcache:
        try: jcache[p] = (True, json.load(open(p)))
        except Exception as e: jcache[p] = (False, str(e))
    return jcache[p]

# per-mission final-entry attribution
cover = defaultdict(list)  # (cat, mission) -> [line,...] in order
entry_missions = {}
for ln, e in entries:
    cat = e.get("category")
    if cat not in PREFIX: continue
    rngs = parse_ranges(e.get("range"))
    if not rngs: continue
    pre = PREFIX[cat]
    ms = [f"{pre}-{n:04d}" for a,b in rngs for n in range(a,b+1)]
    entry_missions[ln] = (cat, ms)
    for m in ms: cover[(cat,m)].append(ln)

final_of = {(cat,m): max(lns) for (cat,m), lns in cover.items()}

# check 1: existence, parse, fields; verdict counts vs FINAL drain only
missing = Counter(); jerr = Counter(); ferr = Counter()
final_mismatch = []; superseded_lines = 0
per_cat_json_verdicts = defaultdict(Counter)
for ln, e in entries:
    cat, ms = entry_missions.get(ln, (None, []))
    if not cat: continue
    vc = e.get("verdicts") or e.get("results") or {}
    final_ms = [m for m in ms if final_of.get((cat,m)) == ln]
    if not final_ms:
        superseded_lines += 1
        continue
    counts = Counter()
    for m in final_ms:
        p = resfiles[cat].get(m+".json")
        if not p:
            missing[cat] += 1
            defect("missing-result", f"line {ln} {cat}/{e.get('range')} matrix={e.get('matrix','-')}: no result JSON for {m} (final drain)", f"fleet/results/{cat}/{m}.json")
            continue
        ok, d = get_json(p)
        if not ok:
            jerr[cat] += 1; defect("json-parse", f"{m}.json unparsable: {d}", f"fleet/results/{cat}/{m}.json"); continue
        miss = REQUIRED - set(d.keys())
        if miss:
            ferr[cat] += 1; defect("missing-fields", f"{m}.json missing {sorted(miss)}", f"fleet/results/{cat}/{m}.json")
        if d.get("mission_id") != m:
            defect("mission-id-mismatch", f"{m}.json mission_id={d.get('mission_id')!r}", f"fleet/results/{cat}/{m}.json")
        v = d.get("verdict")
        if v not in VERDICTS:
            defect("bad-verdict", f"{m}.json verdict={v!r}", f"fleet/results/{cat}/{m}.json")
        else:
            counts[v] += 1; per_cat_json_verdicts[cat][v] += 1
        if v == "PROVEN" and isinstance(d.get("evidence_files"), list) and len(d["evidence_files"]) == 0:
            defect("proven-no-evidence", f"{m}.json verdict PROVEN with empty evidence_files (protocol: PROVEN requires evidence or cited measurement)", f"fleet/results/{cat}/{m}.json", severity="warning")
        ef = d.get("evidence_files")
        if not isinstance(ef, list):
            defect("evidence-not-list", f"{m}.json evidence_files not a list", f"fleet/results/{cat}/{m}.json")
    led = Counter({k: v for k,v in vc.items() if k in VERDICTS})
    if counts != led:
        # compare only when all final missions produced verdicts; missing ones already defected
        if len(final_ms) == len(ms):
            final_mismatch.append((ln, cat, e.get("range"), e.get("matrix","-"), dict(led), dict(counts), len(final_ms)))
            defect("verdict-count-mismatch", f"line {ln} {cat}/{e.get('range')} matrix={e.get('matrix','-')}: FINAL-drain ledger {dict(led)} vs current JSONs {dict(counts)} over {len(final_ms)} final missions", "fleet/ledger.jsonl")
        else:
            out["notes"].append(f"line {ln} {cat}/{e.get('range')}: partially superseded by later drain(s); aggregate verdicts not comparable to current JSONs (informational, not a defect)")
out["checks"]["results_exist_parse_fields"] = (sum(missing.values())==0 and sum(jerr.values())==0 and sum(ferr.values())==0)
out["checks"]["verdict_counts_match_final"] = (len(final_mismatch)==0)
out["superseded_ledger_lines"] = superseded_lines
out["missing_results"] = dict(missing)

# evidence file resolution with normalization
def resolve(rel):
    if not isinstance(rel, str): return None
    s = rel.strip()
    if s.startswith("http://") or s.startswith("https://"): return "URL"
    if s.startswith("~/"): s = os.path.join(HOME, s[2:])
    elif s.startswith("workspace/"): s = os.path.join(HOME, s)
    elif s.startswith("fleet/"): s = os.path.join(PBP, s)
    else: s = os.path.join(PBP, s)
    return s if os.path.exists(s) else None

random.seed(20260924)
ev_missing = Counter(); ev_url = Counter(); ev_sloppy = Counter()
for cat in PREFIX:
    pairs = []
    for fn, p in resfiles[cat].items():
        ok, d = get_json(p)
        if not ok: continue
        ef = d.get("evidence_files")
        if isinstance(ef, list):
            for x in ef: pairs.append((d.get("mission_id"), x))
    n = max(1, len(pairs)//10) if pairs else 0
    samp = random.sample(pairs, n) if pairs else []
    for m, rel in samp:
        r = resolve(rel)
        if r == "URL":
            ev_url[cat] += 1
            defect("evidence-is-url", f"{m}.json cites URL as evidence_file (not a file on disk): {rel}", f"fleet/results/{cat}/{m}.json", severity="warning")
        elif r is None:
            # one known systematic typo: file lives under sandbox/tree/
            alt = None
            if isinstance(rel, str) and "/sandbox/" in rel:
                alt = resolve(rel.replace("/sandbox/", "/sandbox/tree/"))
            if alt and alt != "URL":
                defect("evidence-path-mismatch", f"{m}.json evidence path has wrong directory (file exists at {rel.replace('/sandbox/','/sandbox/tree/')})", f"fleet/results/{cat}/{m}.json", severity="warning")
            else:
                ev_missing[cat] += 1
                defect("evidence-missing", f"{m}.json evidence not resolvable on disk: {rel}", f"fleet/results/{cat}/{m}.json")
        else:
            norm = rel.strip()
            if norm.startswith("workspace/") or (norm.startswith("~/") and False):
                ev_sloppy[cat] += 1
    out.setdefault("evidence_sample", {})[cat] = {"claimed": len(pairs), "sampled": n,
        "missing": ev_missing[cat], "url_citations": ev_url[cat], "sloppy_prefix": ev_sloppy[cat]}
out["checks"]["evidence_sample"] = (sum(ev_missing.values())==0)

# check 2: double-drain
key = defaultdict(list)
for ln, e in entries:
    cat = e.get("category")
    if cat in PREFIX:
        key[(cat, e.get("matrix") or "default", str(e.get("range")))].append((ln, e.get("worker"), dict(e.get("verdicts") or e.get("results") or {}), e.get("note") or e.get("notes","")))
double = {k: v for k,v in key.items() if len(v) > 1}
benign = [k for k,v in double.items() if len(set(tuple(sorted(x[2].items())) for x in v))==1]
real = {k: v for k,v in double.items() if k not in benign}
out["benign_double_drains"] = [{"key": list(k), "lines": [x[0] for x in v], "workers": [x[1] for x in v]} for k,v in ((k,double[k]) for k in benign)]
out["differing_double_drains"] = [{"key": list(k), "drains": [{"line":x[0],"worker":x[1],"verdicts":x[2],"note":x[3][:120]} for x in v]} for k,v in real.items()]
for k, v in real.items():
    defect("double-drain", f"{k}: {len(v)} drains with DIFFERENT verdicts: " + "; ".join(f"line{x[0]} {x[1]} {x[2]}" for x in v), "fleet/ledger.jsonl")
out["checks"]["double_drain"] = (len(real)==0)

# check 3: claim hygiene
def claim_range(fn):
    m = re.search(r"(\d{4})-(\d{4})", fn); return (int(m.group(1)),int(m.group(2))) if m else None
def ov(a1,b1,a2,b2): return a1<=b2 and a2<=b1
led_ranges = defaultdict(list)
for ln, e in entries:
    cat = e.get("category")
    if cat in PREFIX:
        rngs = parse_ranges(e.get("range")) or []
        for a,b in rngs: led_ranges[(cat, e.get("matrix") or "default")].append((a,b))

unclaimed = 0
claims_root = f"{BASE}/claims"
for cdir in sorted(os.listdir(claims_root)):
    cd = os.path.join(claims_root, cdir)
    if not os.path.isdir(cd): continue
    for fn in sorted(os.listdir(cd)):
        if not fn.endswith(".claim"): continue
        r = claim_range(fn)
        if not r:
            defect("claim-name", f"unparseable claim filename {fn}", f"fleet/claims/{cdir}/{fn}"); continue
        a,b = r
        size = os.path.getsize(os.path.join(cd,fn))
        if cdir in ("oracle","oracle-v2","oracle-v3"): spaces=[("oracle",m) for m in ("default","oracle-v2","oracle-v3")]
        elif cdir in ("oracle-superseded","oracle-v3-redrain"): spaces=[]
        else: spaces=[(cdir,"default")]
        for sp in spaces:
            for la,lb in led_ranges.get(sp, []):
                if ov(a,b,la,lb):
                    unclaimed += 1
                    defect("unclaimed-overlap", f"claims/{cdir}/{fn} [{a}-{b}] (size {size}B) overlaps ledgered {sp[0]}/{sp[1]} range {la:04d}-{lb:04d} yet sits unclaimed", f"fleet/claims/{cdir}/{fn}", severity="warning")
                    break
out["checks"]["claim_hygiene_unclaimed"] = (unclaimed==0)
out["unclaimed_overlap_count"] = unclaimed

inprog_root = f"{BASE}/inprogress"
workers_in_ledger = set(e[1].get("worker") for e in entries)
inprog_workers = sorted(d for d in os.listdir(inprog_root) if os.path.isdir(os.path.join(inprog_root,d)))
gone = [w for w in inprog_workers if w not in workers_in_ledger]
for w in gone: defect("inprogress-orphan-worker", f"inprogress/{w}/: worker never appears in ledger", f"fleet/inprogress/{w}/")
out["checks"]["inprogress_worker_gone"] = (len(gone)==0)
out["orphan_workers"] = gone

# inprogress claims overlapping ledgered ranges (by any worker/matrix)
wcat = {"fleet-acq-1":"acquisition","fleet-acq-2":"acquisition","fleet-be-1":"backend","fleet-con-1":"connector",
        "fleet-ora-1":"oracle","fleet-ora-2":"oracle","fleet-po-1":"perfops"}
inprog_ov = []
for w in inprog_workers:
    cat = wcat.get(w)
    for fn in sorted(os.listdir(os.path.join(inprog_root,w))):
        if not fn.endswith(".claim"): continue
        r = claim_range(fn)
        if not r: continue
        a,b = r
        for mx in ("default","oracle-v2","oracle-v3","mixed v1+v2"):
            for la,lb in led_ranges.get((cat,mx), []):
                if ov(a,b,la,lb):
                    inprog_ov.append((w,fn,cat,mx,la,lb)); break
# flag only those ledgered by a DIFFERENT worker (same worker re-drain in progress is normal)
diff_worker = 0
for w,fn,cat,mx,la,lb in inprog_ov:
    led_workers = set(entries[ln-1][1].get("worker") for ln2 in cover.get((cat, f"{PREFIX[cat]}-{la:04d}"), []) for ln in [ln2])
    if w not in led_workers:
        diff_worker += 1
        defect("inprogress-cross-worker-overlap", f"inprogress/{w}/{fn} overlaps range ledgered by {sorted(led_workers)} (matrix {mx})", f"fleet/inprogress/{w}/{fn}", severity="warning")
out["inprogress_overlap_ledgered"] = len(inprog_ov)
out["inprogress_overlap_diff_worker"] = diff_worker

# results with no ledger coverage and no visible claim
claimed_ranges = defaultdict(list)
for cdir in os.listdir(claims_root):
    cd = os.path.join(claims_root, cdir)
    if not os.path.isdir(cd): continue
    for fn in os.listdir(cd):
        r = claim_range(fn)
        if r and cdir in PREFIX: claimed_ranges[cdir].append(r)
for w in inprog_workers:
    cat = wcat.get(w)
    for fn in os.listdir(os.path.join(inprog_root,w)):
        r = claim_range(fn)
        if r and cat: claimed_ranges[cat].append(r)
orphan_results = defaultdict(list)
for cat, pre in PREFIX.items():
    for fn in resfiles[cat]:
        m = fn[:-5]; n = int(m.split("-")[1])
        in_led = any(ov(n,n,la,lb) for mx in ("default","oracle-v2","oracle-v3","mixed v1+v2","acquisition","backend") for la,lb in led_ranges.get((cat,mx),[]))
        in_claim = any(ov(n,n,la,lb) for la,lb in claimed_ranges.get(cat,[]))
        if not in_led and not in_claim: orphan_results[cat].append(m)
for cat, ms in orphan_results.items():
    if ms: defect("results-no-ledger-no-claim", f"{len(ms)} result files in {cat} with no ledger entry and no visible claim (in-flight drain or missing ledger): {sorted(ms)[:8]}{'...' if len(ms)>8 else ''}", f"fleet/results/{cat}/", severity="warning")
out["orphan_results"] = {c: len(v) for c,v in orphan_results.items()}

# check 4: v3 coverage
v3_m = [l.split("\t")[0] for l in open(f"{BASE}/matrix-oracle-v3.tsv").read().splitlines() if l.strip()][1:]
v3_cov = set()
for ln, e in entries:
    if e.get("category")=="oracle" and e.get("matrix")=="oracle-v3":
        for a,b in parse_ranges(e.get("range")) or []: v3_cov.update(range(a,b+1))
v3_ids = set(v3_m)
v3_covered_ids = set(f"ORA-{n:04d}" for n in v3_cov)
v3_missing_files = [m for m in v3_m if m+".json" not in resfiles["oracle"]]
v3_range_gap = sorted(v3_ids - v3_covered_ids)
out["v3"] = {"matrix_size": len(v3_m), "ledgered_ranges": sum(1 for ln,e in entries if e.get("category")=='oracle' and e.get('matrix')=='oracle-v3'),
             "missions_in_ledgered_ranges": len(v3_cov), "missing_result_files": v3_missing_files[:20], "range_gaps": v3_range_gap[:20]}
for m in v3_missing_files: defect("v3-missing-result", f"matrix-oracle-v3 mission {m} has no result JSON", f"fleet/results/oracle/{m}.json")
for m in v3_range_gap: defect("v3-range-gap", f"matrix-oracle-v3 mission {m} not covered by any oracle-v3 ledger range", "fleet/ledger.jsonl")
out["checks"]["v3_coverage"] = (len(v3_missing_files)==0 and len(v3_range_gap)==0)

# totals per category
for cat in PREFIX:
    out.setdefault("per_category", {})[cat] = {
        "ledgered_missions_sum": sum((e[1].get("missions") or 0) for e in entries if e[1].get("category")==cat),
        "unique_missions_covered": len(set(m for (c,m) in cover if c==cat)),
        "result_files": len(resfiles[cat]),
        "final_verdicts": dict(per_cat_json_verdicts[cat]),
    }

json.dump(out, open(f"{BASE}/AUDIT-data.json","w"), indent=1)
print("lines:", len(entries))
print("checks:", json.dumps(out["checks"], indent=1))
print("defects:", len(out["defects"]))
print(Counter((d["kind"],d["severity"]) for d in out["defects"]))
print("orphan_results:", out["orphan_results"])
print("evidence_sample:", json.dumps(out["evidence_sample"]))
print("v3:", {k:(v if not isinstance(v,list) else len(v)) for k,v in out["v3"].items()})
