#!/usr/bin/env python3
"""Shared negative-signal (already-covered) derivation for the Meta AI tandem.

INVARIANT (self-audit 2026-09-24, negative-list parity): the set of business
names the contract validator rejects as duplicates MUST equal the set of names
the context pack showed the worker as "do not return". Both are the same
logical concept ("already covered for this brief's signal type") and both
must be derived from this one module over the same sources:

  1. canonical JSONL  ~/workspace/your_files/western-co-prospects.jsonl
  2. pipeline.md staged rows (any status: NEW/QUEUED/WARM/WATCH/...) carrying
     the brief's source markers
  3. prospect-archive.jsonl rows (archived names re-serve as "new" otherwise)

Evidence: meta-ai-intel pass 2026-09-23/24 served 13/22 re-serves; Wesley
Electric and JACG Roofing LLC appeared in captured findings despite pack
negative lists, and validate-research-contract.py (JSONL-only negative_keys)
did not flag them because they live in pipeline.md / the archive, not the
JSONL. The pack builder and the validator computed "already covered" from
different code; that divergence is now impossible by construction.

Public API:
  merged_covered_names(slug) -> list of (name, town) tuples, deduped,
      JSONL wins ties, archive included. Order: JSONL tail, then pipeline
      tail, then archive (append order within each source).
  format_for_pack(items) -> list of display strings, byte-compatible with
      the pack text build-context-pack.py emitted before this module existed
      ("Name (town)" for JSONL/archive-derived, bare name for pipeline rows).
"""

import json
import os
import re
import sys

HOME = os.path.expanduser('~')
WS = os.path.join(HOME, 'workspace')
JSONL = os.path.join(WS, 'your_files/western-co-prospects.jsonl')
ARCHIVE = os.path.join(WS, 'outreach/prospect-archive.jsonl')
PIPELINE = os.path.join(WS, 'outreach/pipeline.md')

# Brief-aware coverage markers (same filter family the pack builder used).
BRIEF_PIPELINE_MARKERS = {
    'a-weak-website-hunt': ('a-brief', 'a-weak-website-hunt', 'weak-website'),
    'b-new-business-radar': ('b-brief', 'b-new-business-radar', 'new-filing'),
    'c-review-complaint-signals': ('c-brief', 'c-review-complaint-signals', 'review-complaint'),
    'd-segment-deep-dive': ('d-brief', 'd-segment-deep-dive', 'segment-deep-dive'),
    'h-marketing-intelligence': ('h-brief', 'h-marketing-intelligence'),
}


def _read(p):
    try:
        with open(p, encoding='utf-8', errors='replace') as f:
            return f.read()
    except FileNotFoundError:
        return ''


def _brief_hit(slug, r):
    """JSONL/archive row carries this brief's coverage signal."""
    if slug == 'a-weak-website-hunt' and r.get('website_quality'):
        return True
    if slug == 'b-new-business-radar' and (r.get('new_filing_signal') or r.get('source') == 'new-filing'):
        return True
    if slug == 'c-review-complaint-signals' and r.get('notable_reviews'):
        return True
    if slug == 'd-segment-deep-dive':
        return True
    return False


def covered_names_jsonl(slug):
    """(name, town) from the canonical JSONL, brief-aware. Tail-capped."""
    out = []
    for line in _read(JSONL).splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        nm = (r.get('business_name') or '').strip()
        if not nm or not _brief_hit(slug, r):
            continue
        town = (r.get('city') or r.get('town') or '').strip()
        out.append((nm, town))
    return out[-80:]


def covered_names_archive(slug):
    """(name, town) from prospect-archive.jsonl, brief-aware.

    Archived businesses re-serve as "new" in fresh answers (JACG Roofing LLC
    and Western Slope Fleet Washing LLC, b-brief 20260924-030711) unless they
    are negative signals. The archive uses the same schema as the canonical
    JSONL, so the same brief-aware filter applies.
    """
    out = []
    for line in _read(ARCHIVE).splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        nm = (r.get('business_name') or '').strip()
        if not nm or not _brief_hit(slug, r):
            continue
        town = (r.get('city') or r.get('town') or '').strip()
        out.append((nm, town))
    return out


# Pipeline row statuses observed in the wild (2026-09-28 census): NEW, WATCH,
# QUEUED, DRAFTED, WARM, DM SENT, SENT, SKIPPED, REPEAT SIGHTING, RE-VERIFIED.
# Any all-caps status token means "already tracked". The all-caps requirement
# is what keeps bold "- **Name** | ..." mentions (Title Case) from matching.
STAGED_ROW_RE = re.compile(
    r'^\s*-\s*(?:\*\*)?([A-Z][A-Z /-]*)(?:\*\*)?\s*\|\s*([^|]+?)\s*\|')


def parse_staged_row(line):
    """(name, town) from a pipeline.md staged row, or None.

    Matches real staging rows of ANY status ("- NEW | Name | trade | Town (addr) | ...",
    "- WARM | ...", "- WATCH | ...", ...). Bold "- **Name** | ..." radar mentions
    and prose notes do not match. Town comes from the location (3rd) column with
    any parenthetical detail stripped.
    """
    m = STAGED_ROW_RE.match(line)
    if not m:
        return None
    nm = m.group(2).strip().strip('*').strip()
    if not nm:
        return None
    cols = line.split('|')
    town = ''
    if len(cols) >= 4:
        # columns: [marker, name, trade, location, ...]
        town = re.sub(r'\s*\(.*$', '', cols[3]).strip()
    return (nm, town)


def covered_names_pipeline(slug):
    """(name, town) from pipeline.md staged rows (any status), brief-aware."""
    markers = BRIEF_PIPELINE_MARKERS.get(slug, ())
    if not markers:
        return []
    out = []
    seen = set()
    for line in _read(PIPELINE).splitlines():
        parsed = parse_staged_row(line)
        if not parsed:
            continue
        low = line.lower()
        if not any(mk in low for mk in markers):
            continue
        key = parsed[0].lower()
        if key not in seen:
            seen.add(key)
            out.append(parsed)
    return out[-60:]


def merged_covered_names(slug):
    """Deduped (name, town) tuples across all sources. JSONL wins ties."""
    merged = []
    bare_seen = set()
    for nm, town in covered_names_jsonl(slug):
        merged.append((nm, town))
        bare_seen.add(nm.lower())
    for nm, town in covered_names_archive(slug):
        if nm.lower() not in bare_seen:
            merged.append((nm, town))
            bare_seen.add(nm.lower())
    for nm, town in covered_names_pipeline(slug):
        if nm.lower() not in bare_seen:
            merged.append((nm, town))
            bare_seen.add(nm.lower())
    return merged


def format_for_pack(items):
    """Display strings for the pack's Negative signals section.

    Byte-compatible with the pre-module pack text: JSONL/archive-derived
    entries render as "Name (town)" (town omitted when empty); pipeline rows
    render as the bare name, exactly as before.
    """
    return [f'{nm} ({town})' if town else nm for nm, town in items]


def self_test():
    failures = []

    def check(name, cond):
        if not cond:
            failures.append(name)

    # Structural invariants.
    a = merged_covered_names('a-weak-website-hunt')
    b = merged_covered_names('b-new-business-radar')
    check('a-nonempty', len(a) > 50)
    check('b-nonempty', len(b) > 10)
    check('tuples', all(isinstance(nm, str) and isinstance(tw, str) for nm, tw in a))
    check('dedup', len({nm.lower() for nm, _ in a}) == len(a))

    # Production-evidence cases (meta-ai-intel pass 2026-09-23/24).
    a_low = {nm.lower() for nm, _ in a}
    b_low = {nm.lower() for nm, _ in b}
    check('pipeline-only-in-a', 'wesley electric' in a_low)          # pipeline.md NEW row, not JSONL
    check('archive-in-b', 'jacg roofing llc' in b_low)               # archive row, re-served as new
    check('archive-in-b-2', 'western slope fleet washing llc' in b_low)
    check('pack-negative-in-b', 'srs construction, llc' in b_low)   # was in pack list, re-served anyway

    # Pipeline town parsing.
    nm, town = parse_staged_row(
        '- NEW | Weeds Trees N Debris LLC | landscaping | Clifton (616 Susan St, 81520) | x |')
    check('parse-name', nm == 'Weeds Trees N Debris LLC')
    check('parse-town', town == 'Clifton')
    check('parse-bold-excluded',
          parse_staged_row('- **JACG Roofing LLC** | roofing | Grand Junction | x |') is None)
    # 2026-09-28 invariant: pipeline rows of ANY status are already-covered.
    # The evening d-segment-deep-dive pack omitted WARM/WATCH rows and the
    # brief re-served them (collision guard blocked 20/32 that pass).
    nm, town = parse_staged_row(
        '- WARM | Owens & Sons Plumbing, Septic and Drains | septic + plumbing | '
        'Grand Junction (710 Bunker Dr) | x |')
    check('parse-warm-name', nm == 'Owens & Sons Plumbing, Septic and Drains')
    check('parse-warm-town', town == 'Grand Junction')
    nm, town = parse_staged_row(
        '- WATCH | Sergeant and Sons Septic and Excavating | septic + excavating | '
        'Mesa, CO (10519 52 1/2 Rd) | x |')
    check('parse-watch-name', nm == 'Sergeant and Sons Septic and Excavating')
    check('parse-watch-town', town == 'Mesa, CO')
    nm, town = parse_staged_row(
        '- DM SENT | Example Shop LLC | plumbing | Fruita (123 Main St) | x |')
    check('parse-dm-sent', nm == 'Example Shop LLC' and town == 'Fruita')
    nm, town = parse_staged_row(
        '- DRAFTED | Draft Co | hvac | Delta | x |')
    check('parse-drafted', nm == 'Draft Co' and town == 'Delta')
    check('parse-prose-excluded',
          parse_staged_row('Already-tracked, left as-is (13): Goodwin Septic (L883)') is None)
    d_low = {nm.lower() for nm, _ in merged_covered_names('d-segment-deep-dive')}
    check('warm-row-in-d-negatives', 'owens & sons plumbing, septic and drains' in d_low)
    check('watch-row-in-d-negatives', 'sergeant and sons septic and excavating' in d_low)
    check('unknown-slug', merged_covered_names('zzz-no-such-brief') == [])

    # Pack-text parity: format_for_pack on JSONL-derived entries matches the
    # old "Name (town)" rendering the validator and pack both consumed.
    sample = [('Acme Plumbing', 'Grand Junction'), ('Solo Shop', '')]
    check('pack-format', format_for_pack(sample) == ['Acme Plumbing (Grand Junction)', 'Solo Shop'])

    if failures:
        print('COVERED-NAMES SELF-TEST FAILURES: ' + ', '.join(failures))
        return 1
    print(f'covered-names self-test: all checks passed (a={len(a)} b={len(b)})')
    return 0


if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == '--self-test':
        sys.exit(self_test())
    slug = sys.argv[1] if len(sys.argv) > 1 else 'a-weak-website-hunt'
    for s in format_for_pack(merged_covered_names(slug)):
        print(s)
