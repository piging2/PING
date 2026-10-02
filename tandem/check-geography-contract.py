#!/usr/bin/env python3
"""Geography-contract gate (self-audit 2026-09-21).

Deterministic rule: a research brief's objective must not name an
out-of-zone town in an inclusion context (prioritize / cover / target /
include). The standing geography authority is AGENTS.md ("Targeting":
Mesa County corridor + Delta, Montrose, Rifle, Carbondale; no
further-out towns). A brief that hardcodes its own priority-town list
contradicts the pack's GEOGRAPHY section, and the model obeys the brief:
it spends answer slots on out-of-zone businesses that verification then
discards.

Production evidence:
- Run 20260921-090637-a (2026-09-21): prompts/a-weak-website-hunt.md line 3
  said "Prioritize towns we have not covered yet: Palisade, Clifton,
  Delta, Cortez, Pagosa Springs, Rifle, Craig, Meeker." Meta AI obeyed
  and returned 3 out-of-zone businesses (Dickson Electric Cortez,
  C R Plumbing & Heating Cortez, Yerton Plumbing Co LLC Pagosa Springs)
  = 25% of the 12-slot answer wasted, all discarded at verification.
  The line predates the 2026-09-20 geography scale-back; nobody
  re-checked it when Nolan narrowed the zone.

The gate fails closed on KNOWN out-of-zone town names only; unknown
place names fail open (documented gap: the town dictionary is a curated
list, not an exhaustive gazetteer). Exclusion mentions ("no Cortez",
"exclude Pagosa Springs") are allowed: the check classifies each clause
as inclusion or exclusion, and only inclusion-context mentions of
out-of-zone towns flag.

Wiring: next-brief.py skips incompatible briefs (same as the
objective/contract gate) so one stale brief never stalls the rotation;
meta-pass.sh re-checks at dispatch as a backstop.

Usage: check-geography-contract.py <slug>
Exit codes: 0 = compatible (dispatch may proceed), 3 = incompatible
(fail closed: do not dispatch), 2 = infra/usage error.
"""
import os
import re
import sys

TANDEM = os.path.dirname(os.path.abspath(__file__))
PROMPTS = os.path.join(TANDEM, "prompts")
AGENTS_MD = os.path.expanduser("~/AGENTS.md")

# Curated recognizable Colorado place names that could plausibly appear in
# a brief. Multi-word forms must precede their prefixes. In-zone towns are
# parsed from AGENTS.md at runtime; everything else here is out-of-zone.
KNOWN_TOWNS = [
    "steamboat springs", "glenwood springs", "pagosa springs",
    "grand junction", "buena vista", "canon city", "del norte",
    "south fork", "lake city", "new castle", "battlement mesa",
    "el jebel", "colorado springs", "fort collins", "greenwood village",
    "cherry hills", "castle pines", "highlands ranch", "castle rock",
    "idaho springs", "winter park", "grand lake", "rocky ford",
    "la junta", "monte vista",
    "steamboat", "glenwood", "pagosa", "durango", "gunnison", "aspen",
    "craig", "meeker", "cortez", "telluride", "ouray", "ridgway",
    "paonia", "hotchkiss", "cedaredge", "olathe", "norwood", "naturita",
    "nucla", "silt", "parachute", "basalt", "eagle", "gypsum", "avon",
    "vail", "denver", "boulder", "longmont", "loveland", "greeley",
    "pueblo", "salida", "leadville", "alamosa", "creede", "silverton",
    "fraser", "georgetown", "evergreen", "morrison", "littleton",
    "lakewood", "arvada", "westminster", "thornton", "northglenn",
    "aurora", "centennial", "parker", "lone tree", "erie", "lafayette",
    "louisville", "broomfield", "golden", "palisade", "fruita",
    "clifton", "collbran", "loma", "mack", "delta", "montrose",
    "rifle", "carbondale", "de beque", "debeque",
]

INCLUSION_CUES = re.compile(
    r"\b(prioritiz\w*|includ\w*|cover\w*|target\w*|focus\w*|towns?|cities|"
    r"areas?|such as)\b|:", re.I)
EXCLUSION_CUES = re.compile(
    r"\b(no|not|never|exclud\w*|except|avoid\w*|outside|beyond)\b|out of",
    re.I)

CLAUSE_SPLIT = re.compile(r"[,:;()]")


def parse_in_zone():
    """Parse the in-zone town set from AGENTS.md. Returns (set, raw_line)
    or (None, reason) when the authority line cannot be parsed."""
    try:
        text = open(AGENTS_MD, encoding="utf-8").read()
    except OSError as e:
        return None, f"cannot read AGENTS.md: {e}"
    line = None
    for ln in text.splitlines():
        if "Mesa County corridor" in ln:
            line = ln
            break
    if not line:
        return None, "AGENTS.md has no 'Mesa County corridor' targeting line"
    seg = line.split("neighbors:", 1)
    if len(seg) != 2:
        return None, "targeting line has no 'neighbors:' segment"
    seg = seg[1].split("No further-out")[0].split("unless")[0]
    towns = set()
    for part in re.split(r",|;", seg):
        for sub in part.split("plus"):
            name = sub.strip().rstrip(".").lower()
            if name and re.fullmatch(r"[a-z ]+", name):
                towns.add(name)
    if len(towns) < 5:
        return None, f"parsed only {len(towns)} towns from targeting line"
    return towns, line.strip()[:120]


def brief_text(slug):
    path = os.path.join(PROMPTS, slug + ".md")
    if not os.path.isfile(path):
        return None
    return open(path, encoding="utf-8").read()


def find_mentions(text):
    """Yield (town, start) for each known-town mention, longest match first."""
    found = []
    lowered = text.lower()
    for town in KNOWN_TOWNS:
        for m in re.finditer(r"\b" + re.escape(town) + r"\b", lowered):
            found.append((town, m.start()))
    # Drop prefix shadows: e.g. "pagosa" inside "pagosa springs".
    found.sort(key=lambda t: t[1])
    kept = []
    for town, start in found:
        end = start + len(town)
        if any(s <= start and end <= e for _, s, e in kept):
            continue
        kept.append((town, start, end))
    return kept


def check(slug):
    """Return (verdict, message). Verdict is 'compatible', 'incompatible',
    or 'infra'."""
    text = brief_text(slug)
    if text is None:
        return ("infra", f"prompt file not found: prompts/{slug}.md")
    in_zone, authority = parse_in_zone()
    if in_zone is None:
        return ("infra", f"geography authority unreadable: {authority}")
    sentences = re.split(r"(?<=[.!?])\s+", text)
    violations = []
    for sent in sentences:
        if not INCLUSION_CUES.search(sent):
            continue
        for town, start, end in find_mentions(sent):
            if town in in_zone:
                continue
            # Clause containing the mention: exclusion cue here means the
            # brief is excluding the town, which is allowed.
            clause_start = max([0] + [m.end() for m in
                                      CLAUSE_SPLIT.finditer(sent[:start])])
            clause_end_candidates = [m.start() for m in
                                    CLAUSE_SPLIT.finditer(sent[end:])]
            clause_end = end + (clause_end_candidates[0]
                                if clause_end_candidates else len(sent) - end)
            clause = sent[clause_start:clause_end]
            if EXCLUSION_CUES.search(clause):
                continue
            violations.append(town)
    if violations:
        uniq = sorted(set(violations))
        return ("incompatible",
                f"{slug}: objective names out-of-zone towns in an inclusion "
                f"context: {', '.join(uniq)}. Standing geography (AGENTS.md): "
                f"in-zone = {', '.join(sorted(in_zone))}; these are not. "
                f"Fix the brief's priority-town list to in-zone towns only, "
                f"or get the zone change approved explicitly.")
    return ("compatible",
            f"{slug}: brief town mentions are within the standing geography; "
            f"dispatch may proceed")


def main():
    if len(sys.argv) != 2:
        print("usage: check-geography-contract.py <slug>", file=sys.stderr)
        return 2
    verdict, message = check(sys.argv[1])
    print(f"{verdict}: {message}")
    return {"compatible": 0, "incompatible": 3, "infra": 2}[verdict]


if __name__ == "__main__":
    sys.exit(main())
