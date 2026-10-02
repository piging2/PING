#!/usr/bin/env python3
"""Entity dossier projection: business identity continuity and relationship evidence.

Reads ONLY existing machinery (no new database, no new truth store):
  - ~/workspace/outreach/pipeline.md (structured prospect lines + round prose)
  - canonical prospect JSONL (your_files copy, goal files copy as fallback)
  - meta-ai-intel provenance sidecars (verification/acceptance transitions)
  - ping_events via the read-only pg_probe (accepted observations, best effort)

Writes derived, rebuildable projections:
  - ~/workspace/tandem/knowledge/entity-index.json
  - ~/workspace/tandem/knowledge/dossiers/<normalized-key>.json

Every dossier answers, with source refs for each claim:
  what we know / why we believe it / what changed / connections / what
  opportunity or decision follows.

Edge rules (constitutional):
  - every relationship edge carries provenance (source_ref + basis quote) or is
    explicitly classified "inferred";
  - normalized-name identity matches are classification "inferred", never
    silently promoted to fact;
  - distinct spellings stay distinct dossiers unless an explicit same_identity
    edge with provenance links them.

Writes are atomic (temp + fsync + os.replace + directory fsync), per the
established durability invariant. Exit 0 = built, 2 = built with UNCHECKABLE
PING probe (projection still valid from file artifacts).
"""

import glob
import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from pg_probe import query_events, ProbeError
    HAVE_PROBE = True
except Exception:
    HAVE_PROBE = False

HOME = os.path.expanduser("~")
OUTREACH = os.path.join(HOME, "workspace/outreach")
GOAL = os.path.join(HOME, "workspace/goals/ping-social-outreach-campaign")
INTEL = os.path.join(GOAL, "hidden_files/meta-ai-intel")
OUT_DIR = os.path.join(HOME, "workspace/tandem/knowledge")
DOSSIER_DIR = os.path.join(OUT_DIR, "dossiers")

NOW = datetime.now(timezone.utc)

# Orphan event doctrine (standing mandate 2026-09-14): append-only does not
# imply retrieval treats every historical event as current truth. The event
# below is the known drill-error duplicate of 874da5ee (reconstructed-text
# retry during the ambiguous emit-retry drill). It is NOT deleted, mutated, or
# hidden in PING. This projection excludes it from decision-grade retrieval by
# this explicit test/provenance rule and lists it under excluded_from_decision
# with full provenance.
KNOWN_TEST_ARTIFACTS = {
    "2fd53ac8c3a17d5f945f27f46b8b4534893e67f861948bd433c17b719767082c":
        "operator drill error 2026-09-14: reconstructed-text retry created a "
        "semantically duplicate production event of 874da5ee; no provenance "
        "sidecar references it",
}


# ---------------------------------------------------------------- normalization

def norm_name(s):
    """Normalize a business name for identity matching. Documented as an
    inferred equivalence: two spellings that normalize alike are treated as
    the same candidate identity, recorded with classification 'inferred'."""
    s = (s or "").lower().replace(".", "").replace(",", "")
    s = s.replace("limited liability company", "llc")
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def key_slug(key):
    return re.sub(r"[^a-z0-9]+", "-", key).strip("-")


# ---------------------------------------------------------------- atomic writes

def atomic_write_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(obj, f, indent=1, sort_keys=True)
            f.write("\n")
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
        dfd = os.open(os.path.dirname(path), os.O_DIRECTORY)
        try:
            os.fsync(dfd)
        except OSError:
            pass
        finally:
            os.close(dfd)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)



def clean(s):
    """Normalize dashes from source artifacts on ingest: the standing rule
    forbids em dashes in anything written, so source text is normalized when
    copied into this projection. Recorded in provenance."""
    return (s or "").replace("\u2014", "-").replace("\u2013", "-")

# ---------------------------------------------------------------- sources

def load_pipeline_lines():
    """Parse structured '- STATUS | Name | Location | Notes | Priority | ...'
    lines from pipeline.md. Returns list of dicts with line numbers."""
    path = os.path.join(OUTREACH, "pipeline.md")
    out = []
    with open(path, encoding="utf-8", errors="replace") as f:
        for i, line in enumerate(f, start=1):
            m = re.match(r"^-\s+([A-Z0-9][A-Z0-9 /-]*)\s*\|\s*([^|]+?)\s*\|(.*)$",
                         line.rstrip("\n"))
            if not m:
                continue
            status, name, rest = m.group(1).strip(), m.group(2).strip(), m.group(3)
            fields = [clean(x.strip()) for x in rest.split("|")]
            name = clean(name)
            status = clean(status)
            out.append({
                "status": status,
                "name": name,
                "location": fields[0] if len(fields) > 0 else "",
                "notes": fields[1] if len(fields) > 1 else "",
                "priority": fields[2] if len(fields) > 2 else "",
                "opportunity": fields[3] if len(fields) > 3 else "",
                "extra": " | ".join(fields[4:]) if len(fields) > 4 else "",
                "source_ref": "pipeline.md:%d" % i,
            })
    return out


def load_round52_paragraph():
    """Return (qualified_text, excluded_text, ref) from the round-52
    b-new-business-radar prose paragraph in pipeline.md, or (None, None, None)."""
    path = os.path.join(OUTREACH, "pipeline.md")
    with open(path, encoding="utf-8", errors="replace") as f:
        lines = f.readlines()
    for i, line in enumerate(lines, start=1):
        if "10 named businesses independently verified 10/10" in line:
            ref = "pipeline.md:%d" % i
            m = re.search(r"3 qualified(.*?)7 excluded:(.*?)DISTILL:",
                          line, re.S)
            if m:
                return m.group(1), m.group(2), ref
            return None, None, ref
    return None, None, None


def load_prospect_jsonl():
    """Load canonical prospect JSONL rows. Prefers the your_files copy (the
    documented source of truth); falls back to the goal files copy."""
    cands = [
        os.path.join(HOME, "workspace/your_files/western-co-prospects.jsonl"),
        os.path.join(GOAL, "files/western-co-prospects.jsonl"),
    ]
    rows = []
    for path in cands:
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8", errors="replace") as f:
            for i, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                r["_source_ref"] = "western-co-prospects.jsonl:%d" % i
                r["_source_path"] = path
                for k, v in list(r.items()):
                    if isinstance(v, str) and not k.startswith("_"):
                        r[k] = clean(v)
                rows.append(r)
        break
    return rows


def load_sidecars():
    out = {}
    for f in glob.glob(os.path.join(INTEL, "*.provenance.json")):
        try:
            out[os.path.basename(f)] = json.load(open(f, encoding="utf-8"))
        except Exception:
            pass
    return out


def load_accepted_events():
    """Best-effort read of api:* events from ping_events. Returns
    (events, probe_state) where probe_state is 'ok' or 'UNCHECKABLE: reason'."""
    if not HAVE_PROBE:
        return [], "UNCHECKABLE: pg_probe helper unavailable"
    try:
        rows = query_events(
            "SELECT event_id, source, timestamp, payload::text "
            "FROM ping_events WHERE source LIKE 'api:%' ORDER BY timestamp;")
    except ProbeError as e:
        return [], "UNCHECKABLE: %s" % e
    events = []
    for r in rows:
        if len(r) < 4:
            continue
        try:
            payload = json.loads(r[3])
        except Exception:
            payload = {}
        obs = payload.get("observation", "")
        if not isinstance(obs, str):
            obs = json.dumps(obs)
        events.append({
            "event_id": r[0],
            "source": r[1],
            "accepted_at": r[2],
            "brief_id": payload.get("brief_id", ""),
            "observation": clean(obs),
        })
    return events, "ok"


# ---------------------------------------------------------------- extraction

FILING_DATE_RE = re.compile(r"(?:SOS formation|filed|SOS)\s+(\d{4}-\d{2}-\d{2})")
AGENT_RE = re.compile(r"\bagent\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})")
ADDR_RE = re.compile(
    r"\b(\d{1,5}\s+[A-Z][A-Za-z]+\s+(?:Ct|Dr|St|Ave|Rd|Ln|Way|Blvd|Terrace|Pl|Cir)\b[^,;)]*)")
NAME_PAREN_RE = re.compile(r"([A-Z][^,(;]+?)\s*\(([^()]*)\)")


def extract_facts_from_notes(notes, source_ref):
    facts = []
    for m in FILING_DATE_RE.finditer(notes):
        facts.append({
            "fact": "Colorado SOS formation date %s" % m.group(1),
            "kind": "filing_date",
            "value": m.group(1),
            "grade": "operational",
            "source_ref": source_ref,
        })
    for m in AGENT_RE.finditer(notes):
        agent = m.group(1).strip()
        kind = ("organization"
                if re.search(r"\b(LLC|Inc|Ltd|Corp)\b", agent) else "person")
        facts.append({
            "fact": "filing agent: %s" % agent,
            "kind": "filing_agent",
            "value": agent,
            "agent_kind": kind,
            "grade": "operational",
            "source_ref": source_ref,
        })
    for m in ADDR_RE.finditer(notes):
        facts.append({
            "fact": "address on filing: %s" % m.group(1).strip(),
            "kind": "address",
            "value": m.group(1).strip(),
            "grade": "operational",
            "source_ref": source_ref,
        })
    if re.search(r"no phone|no email|no website|filing-only|filing only", notes, re.I):
        facts.append({
            "fact": "no published phone, email, or website; filing-only presence",
            "kind": "contact_absence",
            "grade": "operational",
            "source_ref": source_ref,
        })
    return facts


def parse_round52(qualified_text, excluded_text):
    """Parse the accepted round-52 record. Returns (qualified, excluded):
    qualified maps raw name -> filing date; excluded maps raw name -> reason.
    Both quote the durable record; exclusion-kind classification is recorded
    as inferred."""
    qualified, excluded = {}, {}
    if qualified_text:
        # drop the header ("...inside 60-90 days):") so the first captured
        # name is the business, not the header prose
        q = qualified_text
        if "days):" in q:
            q = q.split("days):", 1)[1]
        for m in NAME_PAREN_RE.finditer(q):
            name, paren = m.group(1).strip(), m.group(2)
            dm = FILING_DATE_RE.search(paren)
            if dm and len(name.split()) >= 2:
                qualified[clean(name)] = dm.group(1)
    if excluded_text:
        for m in NAME_PAREN_RE.finditer(excluded_text):
            name, reason = m.group(1).strip(), m.group(2).strip()
            if len(name.split()) >= 2 and len(reason) > 3:
                excluded[clean(name)] = clean(reason[:400])
    return qualified, excluded


def classify_exclusion(reason):
    r = reason.lower()
    if "dup" in r:
        return "duplicate_of_batch", "inferred"
    if "dissolved" in r or "delinquent" in r:
        return "dead_entity", "inferred"
    if any(k in r for k in ("operating since", "serving since",
                            "advertising since", "listing from",
                            "heuristic disproven")):
        return "established_mislabeled_as_new", "inferred"
    return "excluded", "inferred"


# ---------------------------------------------------------------- assembly

def new_dossier(canonical_name, key):
    return {
        "canonical_name": canonical_name,
        "identity": {
            "key": key,
            "spellings": [],
            "match_basis": "normalized-name equivalence across source "
                           "artifacts (inferred; distinct spellings are kept "
                           "as evidence, never silently merged)",
        },
        "pipeline": {},
        "prospect_record": {},
        "facts": [],
        "verification": {},
        "ping_knowledge": [],
        "relationships": [],
        "opportunity": {},
        "decisions": [],
        "open_questions": [],
        "sync_gaps": [],
        "identity_confidence": "inferred",
        "identity_conflicts": [],
        "next_justified_action": {},
        "provenance": {"sources": []},
    }


def add_spelling(d, spelling, source_ref):
    for s in d["identity"]["spellings"]:
        if s["spelling"] == spelling and s["source_ref"] == source_ref:
            return
    d["identity"]["spellings"].append(
        {"spelling": spelling, "source_ref": source_ref})
    if source_ref not in d["provenance"]["sources"]:
        d["provenance"]["sources"].append(source_ref)


def add_edge(d, relation, target_key, target_name, basis, source_ref,
             classification, resolved=True, extra=None):
    edge = {
        "relation": relation,
        "target_key": target_key,
        "target_name": target_name,
        "basis": basis,
        "source_ref": source_ref,
        "classification": classification,
        "resolved": resolved,
    }
    if extra:
        edge.update(extra)
    for e in d["relationships"]:
        if (e["relation"], e["target_key"], e["source_ref"]) == (
                relation, target_key, source_ref):
            return
    d["relationships"].append(edge)


def build(out_dir=OUT_DIR, dossier_dir=DOSSIER_DIR):
    dossiers = {}
    key_locations = {}

    def get(key, canonical):
        if key not in dossiers:
            dossiers[key] = new_dossier(canonical, key)
        return dossiers[key]

    def note_location(key, location, source_ref):
        location = (location or "").strip()
        if location:
            key_locations.setdefault(key, []).append((location, source_ref))

    # 1. pipeline.md structured lines
    for pl in load_pipeline_lines():
        key = norm_name(pl["name"])
        d = get(key, pl["name"])
        note_location(key, pl["location"], pl["source_ref"])
        add_spelling(d, pl["name"], pl["source_ref"])
        d["pipeline"] = {
            "status": pl["status"],
            "location": pl["location"],
            "priority": pl["priority"],
            "opportunity_raw": pl["opportunity"],
            "source_ref": pl["source_ref"],
        }
        if pl["notes"]:
            d["facts"].append({
                "fact": pl["notes"][:500],
                "kind": "pipeline_note",
                "grade": "operational",
                "source_ref": pl["source_ref"],
            })
        for f in extract_facts_from_notes(pl["notes"], pl["source_ref"]):
            d["facts"].append(f)
            if f["kind"] == "filing_agent":
                add_edge(d, "filing_agent", None, f["value"],
                         "filing agent named in pipeline notes",
                         pl["source_ref"], "explicit", resolved=False,
                         extra={"agent_kind": f.get("agent_kind", "unknown")})
        if pl["opportunity"]:
            d["opportunity"]["pipeline_opportunity"] = pl["opportunity"]
            d["opportunity"]["pipeline_opportunity_ref"] = pl["source_ref"]
        if pl["priority"]:
            d["decisions"].append({
                "decision": "priority %s" % pl["priority"],
                "detail": (pl["notes"][:220] + " " + pl["opportunity"][:220])[:400],
                "source_ref": pl["source_ref"],
            })

    # 2. canonical prospect JSONL
    jsonl_rows = load_prospect_jsonl()
    for r in jsonl_rows:
        name = r.get("business_name", "")
        if not name:
            continue
        key = norm_name(name)
        d = get(key, name)
        note_location(key, r.get("city", ""), r["_source_ref"])
        add_spelling(d, name, r["_source_ref"])
        d["prospect_record"] = {
            "trade": r.get("trade", ""),
            "city": r.get("city", ""),
            "owner_name": r.get("owner_name", ""),
            "phone": r.get("phone", ""),
            "email": r.get("email", ""),
            "website": r.get("website", ""),
            "priority_state": r.get("priority_state", ""),
            "opportunity_primary": r.get("opportunity_primary", ""),
            "opportunity_secondary": r.get("opportunity_secondary", ""),
            "opportunity_confidence": r.get("opportunity_confidence", ""),
            "opportunity_evidence": r.get("opportunity_evidence", ""),
            "new_filing_signal": r.get("new_filing_signal", ""),
            "last_signal": r.get("last_signal", ""),
            "suppression_state": r.get("suppression_state", ""),
            "next_eligible_action": r.get("next_eligible_action", ""),
            "source_ref": r["_source_ref"],
        }
        if r.get("opportunity_primary"):
            d["opportunity"]["primary"] = r["opportunity_primary"]
            d["opportunity"]["confidence"] = r.get("opportunity_confidence", "")
            d["opportunity"]["evidence"] = r.get("opportunity_evidence", "")
            d["opportunity"]["source_ref"] = r["_source_ref"]
        if r.get("owner_name"):
            add_edge(d, "owner", None, r["owner_name"],
                     "owner_name field in canonical prospect record",
                     r["_source_ref"], "explicit", resolved=False,
                     extra={"agent_kind": "person"})

    # 3. accepted PING observations (best effort)
    events, probe_state = load_accepted_events()
    sidecars = load_sidecars()
    sidecar_text = json.dumps(sidecars)
    accepted_event = None
    for e in events:
        if e["brief_id"] == "b-new-business-radar" and e["event_id"].startswith("874da5ee"):
            accepted_event = e
            break
    for e in events:
        obs = e["observation"]
        if not obs:
            continue
        nobs = norm_name(obs)
        linked = e["event_id"] in sidecar_text
        for key, d in dossiers.items():
            bare = re.sub(r"\s+(llc|inc|ltd|co)$", "", key)
            if key in nobs or (len(bare) > 6 and bare in nobs):
                entry = {
                    "event_id": e["event_id"],
                    "brief_id": e["brief_id"],
                    "accepted_at": e["accepted_at"],
                    "excerpt": obs[:280],
                    "linkage": ("sidecar-linked" if linked
                                else "unlinked: no provenance sidecar "
                                     "references this event"),
                }
                if e["event_id"] in KNOWN_TEST_ARTIFACTS:
                    entry["excluded_from_decision"] = KNOWN_TEST_ARTIFACTS[e["event_id"]]
                    d.setdefault("excluded_from_decision", []).append(entry)
                else:
                    d["ping_knowledge"].append(entry)
    for d in dossiers.values():
        seen, uniq = set(), []
        for p in d["ping_knowledge"]:
            if p["event_id"] not in seen:
                seen.add(p["event_id"])
                uniq.append(p)
        d["ping_knowledge"] = uniq

    # 4. accepted round-52 record: verification, decisions, exclusion edges
    q_text, x_text, prose_ref = load_round52_paragraph()
    qualified, excluded = parse_round52(q_text, x_text)
    b_sidecar_name = None
    b_cands = [(f, s) for f, s in sidecars.items()
               if s.get("brief_id") == "b-new-business-radar"]
    # prefer the sidecar whose transitions record the PING acceptance;
    # otherwise the latest timestamped one (dict order is not recency)
    for f, s in b_cands:
        for t in s.get("transitions", []):
            if t.get("state") == "accepted_by_ping" and (
                    not accepted_event or
                    t.get("event_id") == accepted_event["event_id"]):
                b_sidecar_name = f
                break
        if b_sidecar_name:
            break
    if not b_sidecar_name and b_cands:
        b_sidecar_name = sorted(b_cands, key=lambda fs: fs[1].get("timestamp", ""))[-1][0]
    for raw_name, filing_date in qualified.items():
        key = norm_name(raw_name)
        d = get(key, raw_name)
        add_spelling(d, raw_name, prose_ref or "pipeline.md")
        d["verification"] = {
            "status": "verified",
            "method": "independent web search by outreach engine (round 52); "
                      "10/10 named businesses verified",
            "accepted_by_ping": accepted_event["event_id"] if accepted_event else None,
            "accepted_at": accepted_event["accepted_at"] if accepted_event else None,
            "brief_id": "b-new-business-radar",
            "sidecar": ("meta-ai-intel/%s" % b_sidecar_name) if b_sidecar_name else None,
            "grade": "verified",
            "source_ref": prose_ref or "pipeline.md",
        }
        d["facts"].append({
            "fact": "Colorado SOS formation date %s inside 60-90 day window "
                    "(accepted PING knowledge)" % filing_date,
            "kind": "filing_date",
            "value": filing_date,
            "grade": "verified",
            "source_ref": ("ping_events:%s" % accepted_event["event_id"][:12]
                           if accepted_event else prose_ref),
        })
        d["decisions"].append({
            "decision": "qualified as genuine new filing; pipeline NEW, WATCH "
                        "until a contact route surfaces; no outreach drafts",
            "date": "2026-09-14",
            "source_ref": prose_ref or "pipeline.md",
        })
        d["open_questions"].append({
            "question": "whether the filing has any operating presence beyond "
                        "the filing (no published phone, email, or website)",
            "source": "accepted PING observation UNCERTAIN section",
            "source_ref": ("ping_events:%s" % accepted_event["event_id"][:12]
                           if accepted_event else prose_ref),
        })

    for raw_name, reason in excluded.items():
        key = norm_name(raw_name)
        d = get(key, raw_name)
        add_spelling(d, raw_name, prose_ref or "pipeline.md")
        kind, cls = classify_exclusion(reason)
        d["verification"] = {
            "status": ("verified_not_new"
                       if kind == "established_mislabeled_as_new"
                       else "verified_excluded"),
            "method": "independent web search by outreach engine (round 52)",
            "brief_id": "b-new-business-radar",
            "grade": "verified",
            "source_ref": prose_ref or "pipeline.md",
        }
        d["decisions"].append({
            "decision": "excluded from new-business pipeline: %s" % kind,
            "detail": reason[:300],
            "date": "2026-09-14",
            "source_ref": prose_ref or "pipeline.md",
        })
        r = reason.lower()
        if "dup" in r:
            if "pipeline.md:1370" in reason:
                add_edge(d, "excluded_as_batch_duplicate",
                         None, "round-49 excluded gutter batch",
                         reason[:300], prose_ref or "pipeline.md",
                         "explicit", resolved=False,
                         extra={"batch_ref": "pipeline.md:1370"})
            elif "leads.md:1518" in reason or "pipeline.md:630" in reason:
                target = norm_name("Pride Plumbing, Heating & Cooling")
                add_edge(d, "same_identity", target,
                         "Pride Plumbing, Heating & Cooling",
                         "round-52 verification matched Meta AI 'Pride "
                         "Plumbing' to the established Pride Plumbing, "
                         "Heating & Cooling (serving since 2016)",
                         prose_ref or "pipeline.md", "explicit", resolved=True)
                est = get(target, "Pride Plumbing, Heating & Cooling")
                add_edge(est, "same_identity", key, raw_name,
                         "round-52 verification: Meta AI 'Pride Plumbing' "
                         "newness claim matched this established business",
                         prose_ref or "pipeline.md", "explicit", resolved=True)
        if "near-miss" in r or "near miss" in r:
            mt = re.search(r"near-miss to ([A-Z][A-Za-z. &'\-]+?)"
                           r"(?:,|;|\)|$)", reason)
            target_name = mt.group(1).strip() if mt else "unparsed near-miss target"
            add_edge(d, "disambiguated_from", None, target_name,
                     reason[:300], prose_ref or "pipeline.md",
                     "explicit", resolved=False)

    # 5. sync gaps: pipeline NEW/QUEUED but absent from canonical JSONL
    jsonl_keys = {norm_name(r.get("business_name", "")) for r in jsonl_rows
                  if r.get("business_name")}
    for key, d in dossiers.items():
        st = d["pipeline"].get("status", "")
        if st in ("NEW", "QUEUED") and key not in jsonl_keys:
            d["sync_gaps"].append(
                "pipeline status %s but absent from canonical prospect JSONL "
                "(identity-continuity seam: entity known to the engine but "
                "missing from the canonical store)" % st)

    # 6. identity collision guard: same normalized name, different places.
    # Preserve UNKNOWN rather than false-merge.
    for key, d in dossiers.items():
        locs = key_locations.get(key, [])
        distinct = sorted({loc for loc, _ in locs})
        if len(distinct) > 1:
            d["identity_confidence"] = "uncertain"
            d["identity_conflicts"].append({
                "issue": "same normalized name appears in %d distinct locations; "
                         "possible collision, not merged" % len(distinct),
                "locations": [{"location": loc, "source_ref": ref}
                              for loc, ref in locs],
            })

    # 7. next justified action: the Marketing Business Agent decision question.
    # "What is happening with this business and what is the next justified
    # action?" Every action cites its evidence; UNKNOWN stays UNKNOWN.
    for key, d in dossiers.items():
        ver = d["verification"].get("status", "")
        pipe = d["pipeline"]
        pr = d["prospect_record"]
        contact_absent = any(f.get("kind") == "contact_absence" for f in d["facts"])
        excluded_kind = next(
            (x["decision"] for x in d["decisions"] if x["decision"].startswith("excluded ")),
            None)
        if excluded_kind:
            d["next_justified_action"] = {
                "action": "no_action_excluded",
                "because": excluded_kind,
                "evidence_ref": d["decisions"][0]["source_ref"],
            }
        elif d["sync_gaps"]:
            d["next_justified_action"] = {
                "action": "sync_first",
                "because": "entity is known to the engine but absent from the "
                           "canonical prospect JSONL; no outreach decision "
                           "should be made from the JSONL alone until synced",
                "evidence_ref": pipe.get("source_ref", ""),
                "detail": d["sync_gaps"][0],
            }
        elif pipe.get("status") == "QUEUED":
            d["next_justified_action"] = {
                "action": "send_per_queue",
                "because": "queued for outreach in pipeline order",
                "evidence_ref": pipe.get("source_ref", ""),
            }
        elif contact_absent:
            d["next_justified_action"] = {
                "action": "watch_no_outreach",
                "because": "filing-only presence: no published phone, email, "
                           "or website; outreach has no honest channel",
                "evidence_ref": next((f["source_ref"] for f in d["facts"]
                                      if f.get("kind") == "contact_absence"),
                                     pipe.get("source_ref", "")),
            }
        elif pr.get("next_eligible_action"):
            d["next_justified_action"] = {
                "action": pr["next_eligible_action"],
                "because": "canonical prospect record eligibility",
                "evidence_ref": pr.get("source_ref", ""),
            }
        elif (pipe.get("priority") or pr.get("priority_state")) in ("HOT", "WARM") \
                and (d["opportunity"].get("primary") or
                     d["opportunity"].get("pipeline_opportunity")):
            d["next_justified_action"] = {
                "action": "proceed_with_opportunity",
                "because": d["opportunity"].get("primary") or
                           d["opportunity"].get("pipeline_opportunity", ""),
                "evidence_ref": d["opportunity"].get("source_ref") or
                                d["opportunity"].get("pipeline_opportunity_ref", ""),
            }
        else:
            d["next_justified_action"] = {
                "action": "unknown_insufficient_evidence",
                "because": "no verified status, queue position, or opportunity "
                           "supports an action; do not act",
                "evidence_ref": pipe.get("source_ref", "") or pr.get("source_ref", ""),
            }

    # provenance + write
    for d in dossiers.values():
        d["provenance"].update({
            "built_at": NOW.isoformat(),
            "builder": "tandem/entity-dossier.py",
            "ping_probe": probe_state,
            "note": "Derived projection only. Rebuildable from the source "
                    "artifacts listed in provenance.sources. Not a source of "
                    "truth; if deleted it is regenerated. Source text is dash-normalized " \
                    "on ingest (em/en dashes become hyphens). This dossier asserts no " \
                    "independent business facts: every fact carries its source " \
                    "artifact and grade, and every identity relation is " \
                    "evidence-backed and reconstructible.",
        })
    os.makedirs(dossier_dir, exist_ok=True)
    for key, d in dossiers.items():
        atomic_write_json(os.path.join(dossier_dir, key_slug(key) + ".json"), d)
    index = {}
    for key, d in dossiers.items():
        index[key] = {
            "canonical_name": d["canonical_name"],
            "spellings": [s["spelling"] for s in d["identity"]["spellings"]],
            "sources": d["provenance"]["sources"],
            "dossier": "dossiers/%s.json" % key_slug(key),
            "pipeline_status": d["pipeline"].get("status", ""),
            "priority": d["pipeline"].get("priority", "") or
                        d["prospect_record"].get("priority_state", ""),
            "verification": d["verification"].get("status", ""),
            "accepted_events": [p["event_id"][:12] for p in d["ping_knowledge"]],
            "sync_gap": bool(d["sync_gaps"]),
            "edge_count": len(d["relationships"]),
        }
    atomic_write_json(os.path.join(out_dir, "entity-index.json"), {
        "built_at": NOW.isoformat(),
        "builder": "tandem/entity-dossier.py",
        "entity_count": len(index),
        "ping_probe": probe_state,
        "coverage": "pipeline.md structured lines + canonical prospect JSONL "
                    "+ accepted b-new-business-radar record (round-52 prose, "
                    "sidecar, PING payload). Prose mining beyond the accepted "
                    "round-52 record is intentionally out of scope.",
        "entities": index,
    })
    return dossiers, probe_state


# ---------------------------------------------------------------- self test

def self_test():
    import shutil
    failures = []

    def check(cond, msg):
        if not cond:
            failures.append(msg)

    t1 = tempfile.mkdtemp(prefix="dossier-a-")
    t2 = tempfile.mkdtemp(prefix="dossier-b-")
    try:
        d1, ps1 = build(out_dir=os.path.join(t1, "knowledge"),
                        dossier_dir=os.path.join(t1, "knowledge", "dossiers"))
        d2, ps2 = build(out_dir=os.path.join(t2, "knowledge"),
                        dossier_dir=os.path.join(t2, "knowledge", "dossiers"))
        probe_ok = (ps1 == "ok" and ps2 == "ok")
        if not probe_ok:
            print("PROBE UNCHECKABLE (%s / %s): determinism and PING-linkage "
                  "assertions skipped" % (ps1, ps2))

        def canon(path):
            with open(path, encoding="utf-8") as f:
                o = json.load(f)
            if isinstance(o, dict):
                o.pop("built_at", None)
                if "entities" in o:
                    pass
            return json.dumps(o, sort_keys=True)

        files1, files2 = set(), set()
        for root, _, fs in os.walk(os.path.join(t1, "knowledge")):
            for fn in fs:
                files1.add(os.path.relpath(os.path.join(root, fn),
                                           os.path.join(t1, "knowledge")))
        for root, _, fs in os.walk(os.path.join(t2, "knowledge")):
            for fn in fs:
                files2.add(os.path.relpath(os.path.join(root, fn),
                                           os.path.join(t2, "knowledge")))
        check(files1 == files2, "rebuild file sets differ")
        for rel in files1:
            a = canon(os.path.join(t1, "knowledge", rel))
            b = canon(os.path.join(t2, "knowledge", rel))
            # strip per-dossier built_at inside provenance
            a = re.sub(r'"built_at": "[^"]*"', '"built_at": "X"', a)
            b = re.sub(r'"built_at": "[^"]*"', '"built_at": "X"', b)
            if probe_ok:
                check(a == b, "rebuild differs for %s" % rel)

        # em dash guard: the mandate forbids em dashes in anything written
        for root, _, fs in os.walk(os.path.join(t1, "knowledge")):
            for fn in fs:
                p = os.path.join(root, fn)
                with open(p, encoding="utf-8") as f:
                    check("\u2014" not in f.read(),
                          "em dash found in %s" % fn)

        # the worked example: Captain Ron Handyman L.L.C.
        key = norm_name("Captain Ron Handyman L.L.C.")
        check(key in d1, "captain ron dossier missing (key %s)" % key)
        if key in d1:
            d = d1[key]
            check(any(s["spelling"] == "Captain Ron Handyman L.L.C."
                      for s in d["identity"]["spellings"]),
                  "pipeline spelling not recorded")
            check(d["verification"].get("status") == "verified",
                  "verification status wrong: %s" % d["verification"])
            if probe_ok:
                check((d["verification"].get("accepted_by_ping") or "")
                      .startswith("874da5ee"),
                      "PING acceptance linkage missing")
            check(any("2026-07-14" in f.get("value", "")
                      for f in d["facts"] if f.get("kind") == "filing_date"),
                  "filing date fact missing")
            check(any(e["relation"] == "filing_agent" and
                      e["target_name"] == "Ronald Reagan Cummings"
                      for e in d["relationships"]),
                  "filing agent edge missing")
            check(any("absent from canonical prospect JSONL" in g
                      for g in d["sync_gaps"]),
                  "sync gap not flagged")
            check(d["decisions"], "no decisions recorded")
            check(d["open_questions"], "no open questions recorded")
            if probe_ok:
                check(d["ping_knowledge"], "no PING knowledge linked")
            # every edge has provenance or is explicitly inferred
            for e in d["relationships"]:
                check(e.get("source_ref") and e.get("classification")
                      in ("explicit", "inferred"),
                      "edge missing provenance/classification: %s" % e)

        # Pride Plumbing identity edge
        pk = norm_name("Pride Plumbing")
        check(pk in d1, "pride plumbing dossier missing")
        if pk in d1:
            check(any(e["relation"] == "same_identity" and e["resolved"]
                      for e in d1[pk]["relationships"]),
                  "pride plumbing same_identity edge missing")

        # orphan event doctrine: 2fd53ac8 excluded from decision-grade
        # retrieval by explicit rule, still listed with provenance when linked
        check("2fd53ac8c3a17d5f945f27f46b8b4534893e67f861948bd433c17b719767082c"
              in KNOWN_TEST_ARTIFACTS,
              "orphan test event missing from KNOWN_TEST_ARTIFACTS rule")
        for k2, d2 in d1.items():
            if probe_ok:
                check(not any(p["event_id"].startswith("2fd53ac8")
                              for p in d2["ping_knowledge"]),
                      "orphan test event leaked into decision-grade "
                      "ping_knowledge for %s" % k2)
            for p in d2.get("excluded_from_decision", []):
                check(bool(p.get("excluded_from_decision")),
                      "excluded entry missing reason for %s" % k2)
        if key in d1:
            d = d1[key]
            # next justified action serves the MBA decision question
            nja = d.get("next_justified_action", {})
            check(nja.get("action") == "sync_first",
                  "captain ron next action wrong: %s" % nja.get("action"))
            check(nja.get("evidence_ref"), "next action missing evidence_ref")

        # excluded entities resolve to no_action_excluded
        mk = norm_name("Mascarenas Lawn Care")
        if mk in d1:
            check(d1[mk]["next_justified_action"].get("action") ==
                  "no_action_excluded",
                  "excluded entity next action wrong")

        # identity: confidence present everywhere; collisions stay UNKNOWN
        for k2, d2 in d1.items():
            check(d2.get("identity_confidence") in ("inferred", "uncertain"),
                  "identity_confidence missing for %s" % k2)
            if d2.get("identity_conflicts"):
                check(d2["identity_confidence"] == "uncertain",
                      "collision not marked uncertain for %s" % k2)
        n_uncertain = sum(1 for d2 in d1.values()
                          if d2["identity_confidence"] == "uncertain")
        print("identity-uncertain (possible collisions): %d" % n_uncertain)

        print("entities built: %d" % len(d1))
        print("probe state: %s" % ps1)
        sync_gaps = sum(1 for d in d1.values() if d["sync_gaps"])
        print("entities with sync gaps: %d" % sync_gaps)
    finally:
        shutil.rmtree(t1, ignore_errors=True)
        shutil.rmtree(t2, ignore_errors=True)

    if failures:
        print("SELF-TEST FAILURES:")
        for f in failures:
            print(" - %s" % f)
        return 1
    print("SELF-TEST PASS")
    return 0


def main():
    if "--self-test" in sys.argv:
        sys.exit(self_test())
    dossiers, probe_state = build()
    sync_gaps = sum(1 for d in dossiers.values() if d["sync_gaps"])
    print("built %d dossiers, %d with sync gaps, probe=%s"
          % (len(dossiers), sync_gaps, probe_state))
    return 0 if probe_state == "ok" else 2


if __name__ == "__main__":
    sys.exit(main())
