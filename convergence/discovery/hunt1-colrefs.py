#!/usr/bin/env python3
"""Hunt 1: write-never/read-live + read-never/write-live fields.
For each table in the event family: enumerate schema columns, then grep the
worktree (JS/TS/SQL, excluding node_modules, tests dir, archive, evals)
for SQL writes (INSERT/UPDATE), SQL reads (SELECT), and JS property access.
Output per column: write-site files, read-site files.
Approximate; candidates get manual verification.
"""
import os, re, sys, json

ROOT = "/home/nolan/worktrees/constitutional-convergence"
EXCLUDE_DIRS = {"node_modules", ".git", "archive", "evals", "test", "tests", "__tests__",
                "migration-certification", "hidden_files", "releases"}

TABLES = {
    "ping_events": ["created_at","event_id","event_type","metadata","namespace","payload","processed","sequence","source","timestamp"],
    "canonical_events": ["actor","causation_id","correlation_id","created_at","event_id","event_type","event_version","last_error","metadata","payload","processed","processed_at","retries","sequence","source","tenant_id","timestamp","worker"],
    "event_processing": ["created_at","event_id","last_error","processed","processed_at","retries","worker"],
    "mission_events": ["created_at","event_data","event_id","event_type","mission_id","processed"],
    "event_outbox": ["aggregate_id","aggregate_type","causation_id","correlation_id","created_at","event_data","event_type","id","published"],
    "ping_missions": ["assigned_to","claimed_at","completed_at","created_at","created_by","error","lease_until","mission_id","mission_type","payload","priority","result","retries","retry_at","started_at","status"],
    "ping_bridge_cursors": ["last_event_id","source","updated_at"],
    "repository_events": ["aggregate_type","authority","authority_version","canonicaleventhash","causation_id","chain_root","correlation_id","created_at","event_id","event_type","object_id","payload","previouseventhash","reducerhash","replayhash","runtimeid","sequence","timestamp","witness","witnesshash"],
    "event_processed": [],
}

def iter_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for f in filenames:
            if f.endswith((".js", ".ts", ".mjs", ".cjs", ".sql")):
                yield os.path.join(dirpath, f)

FILES = list(iter_files())
print(f"scanning {len(FILES)} files", file=sys.stderr)

def tpat(t):
    return re.compile(r"(?<![\w$])(?:\w+\.)?" + re.escape(t) + r"(?![\w$])", re.IGNORECASE)

results = {}
for table, cols in TABLES.items():
    if not cols:
        continue
    tp = tpat(table)
    write_files = set()
    read_files = set()
    col_writes = {c: set() for c in cols}
    col_reads = {c: set() for c in cols}
    for path in FILES:
        try:
            with open(path, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
        except OSError:
            continue
        if not tp.search(text):
            continue
        rel = os.path.relpath(path, ROOT)
        # SQL write patterns
        for m in re.finditer(r"INSERT\s+INTO\s+(?:\w+\.)?" + re.escape(table) + r"\s*\(([^)]{0,2000})\)", text, re.IGNORECASE):
            write_files.add(rel)
            collist = m.group(1).lower()
            for c in cols:
                if re.search(r"(?<![\w$])" + re.escape(c) + r"(?![\w$])", collist):
                    col_writes[c].add(rel)
        if re.search(r"INSERT\s+INTO\s+(?:\w+\.)?" + re.escape(table) + r"\s+(VALUES|SELECT)", text, re.IGNORECASE):
            write_files.add(rel + " [VALUES-no-collist]")
        for m in re.finditer(r"UPDATE\s+(?:\w+\.)?" + re.escape(table) + r"\s+SET\s+(.{0,2000}?)(?:WHERE|;|$)", text, re.IGNORECASE | re.DOTALL):
            write_files.add(rel)
            setpart = m.group(1).lower()
            for c in cols:
                if re.search(r"(?<![\w$])" + re.escape(c) + r"\s*=", setpart):
                    col_writes[c].add(rel)
        # JS write patterns: quoted or bare key followed by colon in files mentioning the table
        # (approximate: property definition `col:` or `col =` or `.col =`)
        for c in cols:
            if re.search(r"(?<![\w$'\"])" + re.escape(c) + r"\s*:\s*", text) or \
               re.search(r"\.\s*" + re.escape(c) + r"\s*=", text):
                col_writes[c].add(rel + " [js-prop]")
        # SQL read patterns
        for m in re.finditer(r"SELECT\s+(.{0,2000}?)\s+FROM\s+(?:\w+\.)?" + re.escape(table) + r"(?![\w$])", text, re.IGNORECASE | re.DOTALL):
            read_files.add(rel)
            sel = m.group(1).lower()
            if "*" in sel:
                for c in cols:
                    col_reads[c].add(rel + " [select-*]")
            else:
                for c in cols:
                    if re.search(r"(?<![\w$])" + re.escape(c) + r"(?![\w$])", sel):
                        col_reads[c].add(rel)
        # JS read patterns: .col access or ['col']
        for c in cols:
            if re.search(r"\.\s*" + re.escape(c) + r"(?![\w$=(])", text) or \
               re.search(r"\[\s*['\"]" + re.escape(c) + r"['\"]\s*\]", text):
                col_reads[c].add(rel + " [js-access]")
    results[table] = {
        "write_files": sorted(write_files),
        "read_files": sorted(read_files),
        "columns": {
            c: {"writes": sorted(col_writes[c]), "reads": sorted(col_reads[c])}
            for c in cols
        },
    }

with open("/tmp/laneA-hunt1.json", "w") as fh:
    json.dump(results, fh, indent=1)
print("written /tmp/laneA-hunt1.json")

# Print the interesting asymmetries: read-but-never-written, written-but-never-read
for table, r in results.items():
    print(f"\n===== {table} =====")
    print(f"  files w/ table ref: writes={len(r['write_files'])} reads={len(r['read_files'])}")
    for c, d in r["columns"].items():
        w = [x for x in d["writes"] if not x.endswith("[js-prop]")]
        rds = d["reads"]
        if rds and not w:
            print(f"  READ-NO-WRITE {c}: reads={len(rds)}")
        if w and not rds:
            print(f"  WRITE-NO-READ {c}: writes={len(w)}")
