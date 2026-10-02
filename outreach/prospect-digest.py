#!/usr/bin/env python3
"""Build the human-readable prospect digest for Nolan.
Reads ~/workspace/your_files/western-co-prospects.jsonl
Writes ~/workspace/your_files/prospect-digest.md (atomic: tmp + verify + os.replace)
Step 5: content-hash the source; skip the rebuild when the source is unchanged.
The digest is DERIVED and never a source of truth; provenance lives in
~/workspace/your_files/prospect-digest.provenance.json.
No em dashes anywhere in the output.
"""
import hashlib
import json, os, re
from datetime import date, datetime, timezone

HOME = os.path.expanduser("~")
JSONL = HOME + "/workspace/your_files/western-co-prospects.jsonl"
OUT = HOME + "/workspace/your_files/prospect-digest.md"
SIDECAR = HOME + "/workspace/your_files/prospect-digest.provenance.json"
DIGEST_SCHEMA = "1"  # bump when the digest layout changes
TODAY = date.today()
ACTIVE_CAP = 300

def source_hash():
    h = hashlib.sha256()
    with open(JSONL, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()

def last_provenance():
    try:
        with open(SIDECAR, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}

OPP_LABELS = {
    "NEW_BUSINESS_SETUP": "New business setup",
    "MISSED_CALL_LEAD_CAPTURE": "Missed-call capture",
    "WEBSITE_REVAMP": "Website revamp",
    "SEO": "SEO",
    "AEO_AI_DISCOVERABILITY": "AI search visibility",
    "SOCIAL_PRESENCE": "Social presence",
    "AUTOMATION": "Automation",
    "INTEGRATION": "Integration",
    "UNKNOWN": "Not yet assessed",
    "": "Not yet assessed",
}

def load():
    recs = []
    with open(JSONL, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                recs.append(json.loads(line))
    return recs

def contact_status(r):
    sig = (r.get("last_signal") or "").upper()
    sup = (r.get("suppression_state") or "").lower()
    if "SENT" in sig or "SUBMITTED" in sig or "DM SENT" in sig:
        return "Contacted"
    if "ladder" in sup:
        return "In follow-up"
    return "Not yet contacted"

def recent(r):
    for field in ("intel_updated", "last_signal"):
        m = re.search(r"(\d{4})-(\d{2})-(\d{2})", r.get(field) or "")
        if m:
            try:
                d = date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
            except ValueError:
                continue
            if 0 <= (TODAY - d).days <= 7:
                return d.isoformat()
    return None

def main():
    shash = source_hash()
    prev = last_provenance()
    if prev.get("source_hash") == shash and prev.get("schema_version") == DIGEST_SCHEMA:
        print(f"digest unchanged (source sha256:{shash[:12]}); skipping rebuild")
        return
    recs = load()
    total = len(recs)
    by_prio = {}
    for r in recs:
        p = r.get("priority_state") or "Not yet classified"
        by_prio[p] = by_prio.get(p, 0) + 1
    by_contact = {}
    for r in recs:
        s = contact_status(r)
        by_contact[s] = by_contact.get(s, 0) + 1
    active = sum(1 for r in recs if r.get("priority_state") != "SUPPRESS")
    notes_flagged = sum(1 for r in recs if r.get("_migration_note"))

    L = []
    L.append("# PING Social prospect digest")
    L.append(f"_Derived from western-co-prospects.jsonl (sha256:{shash[:12]}). "
             f"This file is a snapshot, not a source of truth._")
    L.append(f"Updated {TODAY.isoformat()}. {total} businesses tracked, {active} active (cap {ACTIVE_CAP}).")
    L.append("")
    L.append("## Counts by priority")
    for p in ["HOT", "WARM", "WATCH", "SUPPRESS", "Not yet classified"]:
        if p in by_prio:
            L.append(f"- {p}: {by_prio[p]}")
    L.append("")
    L.append("## Counts by contact status (derived from newest signal)")
    for s in ["Contacted", "In follow-up", "Not yet contacted"]:
        if s in by_contact:
            L.append(f"- {s}: {by_contact[s]}")
    L.append("")

    hot = [r for r in recs if r.get("priority_state") == "HOT"]
    L.append(f"## HOT prospects ({len(hot)})")
    if hot:
        L.append("| Business | Town | Trade | Opportunity | Newest signal | Next action |")
        L.append("|---|---|---|---|---|---|")
        for r in hot:
            L.append("| " + " | ".join([
                r.get("business_name", ""), r.get("city", ""), r.get("trade", ""),
                OPP_LABELS.get(r.get("opportunity_primary", ""), r.get("opportunity_primary", "")),
                r.get("last_signal", ""), r.get("next_eligible_action", ""),
            ]) + " |")
    else:
        L.append("None right now.")
    L.append("")

    warm = [r for r in recs if r.get("priority_state") == "WARM"]
    L.append(f"## WARM prospects ({len(warm)})")
    if warm:
        L.append("| Business | Town | Trade | Opportunity | Next action |")
        L.append("|---|---|---|---|---|")
        for r in warm:
            L.append("| " + " | ".join([
                r.get("business_name", ""), r.get("city", ""),
                r.get("trade", ""),
                OPP_LABELS.get(r.get("opportunity_primary", ""), r.get("opportunity_primary", "")),
                r.get("next_eligible_action", ""),
            ]) + " |")
    else:
        L.append("None right now.")
    L.append("")

    changed = [(recent(r), r) for r in recs]
    changed = [(d, r) for d, r in changed if d]
    changed.sort(key=lambda t: t[0], reverse=True)
    L.append(f"## Recently changed ({len(changed)} in the last 7 days)")
    for d, r in changed[:30]:
        sig = r.get("last_signal") or r.get("notes") or ""
        sig = sig[:90]
        L.append(f"- {d}: {r.get('business_name','')} ({r.get('city','')}) - {sig}")
    if not changed:
        L.append("Nothing new in the last 7 days.")
    L.append("")
    L.append("## Data health")
    L.append(f"- {notes_flagged} rows carry older field values kept verbatim from the retired spreadsheet (flagged for cleanup, nothing lost).")
    L.append(f"- Quality cap: {active} active of {ACTIVE_CAP} max.")
    L.append("")
    text = "\n".join(L) + "\n"
    assert "\u2014" not in text, "em dash found in digest"
    tmp = OUT + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        f.write(text)
    with open(tmp, encoding="utf-8") as f:
        assert f.read() == text, "digest verify failed"
    os.replace(tmp, OUT)
    prov = {
        "source_ref": "workspace/your_files/western-co-prospects.jsonl",
        "source_hash": shash,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "schema_version": DIGEST_SCHEMA,
        "generator": "workspace/outreach/prospect-digest.py",
        "note": "derived snapshot; the JSONL is the source of truth",
    }
    ptmp = SIDECAR + ".tmp"
    with open(ptmp, "w", encoding="utf-8") as f:
        json.dump(prov, f, indent=2)
    os.replace(ptmp, SIDECAR)
    print(f"digest written: {OUT} ({len(text)} chars, source sha256:{shash[:12]})")

if __name__ == "__main__":
    main()
