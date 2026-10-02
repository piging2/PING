#!/usr/bin/env python3
"""Hunt 1b: parse oracle schema file for ALL tables, then per-column
write-site/read-site scan across the worktree.
WHERE-clause reads and JOIN reads now count (fixing the two parser misses).
"""
import os, re, sys, json

ROOT = "/home/nolan/worktrees/constitutional-convergence"
EXCLUDE_DIRS = {"node_modules", ".git", "archive", "evals", "test", "tests", "__tests__",
                "migration-certification", "hidden_files", "releases"}

SKIP = {"ping_events","canonical_events","event_processing","mission_events",
        "event_outbox","ping_missions","ping_bridge_cursors","repository_events"}

# parse schema snapshot
tables = {}
in_cols = False
with open("/home/nolan/oracle-schema-2026-09-20.txt", encoding="utf-8", errors="replace") as fh:
    for line in fh:
        line = line.rstrip("\n")
        if line.startswith("=== COLUMNS ==="):
            in_cols = True; continue
        if line.startswith("==="):
            if in_cols: break
            continue
        if in_cols and line.startswith("public."):
            parts = line.split("|")
            tcol = parts[0].split(".")
            t, c = tcol[1], tcol[2]
            if t not in SKIP:
                tables.setdefault(t, []).append(c)

print(f"{len(tables)} tables to scan", file=sys.stderr)

def iter_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for f in filenames:
            if f.endswith((".js", ".ts", ".mjs", ".cjs", ".sql")):
                yield os.path.join(dirpath, f)

FILES = list(iter_files())

def tpat(t):
    return re.compile(r"(?<![\w$])(?:\w+\.)?" + re.escape(t) + r"(?![\w$])", re.IGNORECASE)

def cpat(c):
    return re.compile(r"(?<![\w$])" + re.escape(c) + r"(?![\w$])", re.IGNORECASE)

results = {}
for table, cols in sorted(tables.items()):
    tp = tpat(table)
    col_w = {c: set() for c in cols}
    col_r = {c: set() for c in cols}
    wfiles, rfiles = set(), set()
    for path in FILES:
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
        except OSError:
            continue
        if not tp.search(text):
            continue
        rel = os.path.relpath(path, ROOT)
        tl = text.lower()
        # SQL writes
        for m in re.finditer(r"INSERT\s+INTO\s+(?:\w+\.)?" + re.escape(table) + r"\s*\(([^)]{0,3000})\)", text, re.IGNORECASE):
            wfiles.add(rel); cl = m.group(1).lower()
            for c in cols:
                if cpat(c).search(cl): col_w[c].add(rel)
        if re.search(r"INSERT\s+INTO\s+(?:\w+\.)?" + re.escape(table) + r"(?![\w$])", text, re.IGNORECASE):
            pass  # INSERT without collist caught above only; mark generic
        for m in re.finditer(r"UPDATE\s+(?:\w+\.)?" + re.escape(table) + r"(?![\w$])", text, re.IGNORECASE):
            wfiles.add(rel)
        # JS writes: key: or .col =
        for c in cols:
            if re.search(r"(?<![\w$'\"])" + re.escape(c) + r"\s*:\s*", text) or \
               re.search(r"\.\s*" + re.escape(c) + r"\s*=", text):
                col_w[c].add(rel + " [js]")
        # SQL reads: FROM/JOIN + SELECT list + WHERE + ORDER BY vicinity
        for m in re.finditer(r"(?:FROM|JOIN)\s+(?:\w+\.)?" + re.escape(table) + r"(?:\s+(?:AS\s+)?(\w+))?", text, re.IGNORECASE):
            rfiles.add(rel)
            alias = (m.group(1) or "").lower()
            start = max(0, m.start() - 4000)
            window = text[start:m.start() + 4000].lower()
            for c in cols:
                if cpat(c).search(window):
                    col_r[c].add(rel)
        # JS reads: .col (not followed by = or :) or ['col']
        for c in cols:
            if re.search(r"\.\s*" + re.escape(c) + r"(?![\w$=:\(])", text) or \
               re.search(r"\[\s*['\"]" + re.escape(c) + r"['\"]\s*\]", text):
                col_r[c].add(rel + " [js]")
    results[table] = {"cols": {c: {"w": sorted(col_w[c]), "r": sorted(col_r[c])} for c in cols},
                      "wfiles": sorted(wfiles), "rfiles": sorted(rfiles)}

with open("/tmp/laneA-hunt1b.json", "w") as fh:
    json.dump(results, fh, indent=1)

for table, r in results.items():
    asym = []
    for c, d in r["cols"].items():
        w = [x for x in d["w"]]; rd = d["r"]
        if rd and not w: asym.append(f"R-NO-W:{c}({len(rd)})")
        elif w and not rd: asym.append(f"W-NO-R:{c}({len(w)})")
    flag = " <== ASYMMETRY" if asym else ""
    print(f"{table}: wfiles={len(r['wfiles'])} rfiles={len(r['rfiles'])}{flag}")
    for a in asym: print(f"    {a}")
