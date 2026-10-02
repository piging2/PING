import re, sys
data = open(sys.argv[1], encoding="utf-8", errors="replace").read()
for tbl in ["events", "objects", "observations", "projections", "audit_log",
            "relationships", "lineage", "system_metadata", "artifact_registry",
            "authority_objects", "claims", "entities", "topics",
            "event_processing", "repository_objects", "citations"]:
    m = re.search(r"COPY public\." + tbl + r" .*? FROM stdin;\n(.*?)\n\\\.", data, re.S)
    if not m:
        print(tbl, "NO-COPY-SECTION")
    else:
        rows = [l for l in m.group(1).splitlines() if l.strip()]
        print(tbl, len(rows))
