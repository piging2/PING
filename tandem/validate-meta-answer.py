#!/usr/bin/env python3
"""Validate a pulled Meta AI answer file before it enters the pipeline.

This is the pipeline's false-success boundary: a prompt-only capture must
NEVER be treated as a completed research result. The script decodes the raw
bytes (byte-exact, BOM-aware, strict UTF-8 that fails loudly), writes the
evidence .md file, then checks that an actual assistant answer is present.

Presence rule (all four research briefs demand a numbered list of 10):
  - at least MIN_NUMBERED_ITEMS parsed business entries in the answer region
  - total answer chars above MIN_ANSWER_CHARS
A file that fails is still WRITTEN (evidence is preserved); the caller must
rename it to .CAPTURE_FAILED and stamp the sidecar accordingly.

Freeform-extraction fallback (2026-10-03): when the answer region is long
(>= FREEFORM_MIN_CHARS chars) but yields ZERO parsed entries, a
deterministic extractor attempts business-name rescue (name + town +
contact/URL, verbatim from the source) BEFORE fail-closing. A rescue of
>= MIN_NUMBERED_ITEMS entries rewrites the artifact in the contract's
numbered format, bannered FREEFORM EXTRACTION / UNVERIFIED; the entries
must still pass the outreach engine's independent web-search verification
gate before entering the pipeline. Anything less still fail-closes.

numbered_items invariant (2026-09-19): the item count is the parsed
business-entry count (validate-research-contract.py's entry parser, the
same parser the contract gate uses), never the raw numbered-syntax count.
The old regex counted template numbers in the echoed prompt (known list,
OUTPUT CONTRACT boilerplate) and even the script's own run-ID header
("04)\n\nMarketing"), so the ledger recorded item counts that never
measured businesses (observed: 9-10 vs 5 real, 5 vs 14 real). One entry
definition shared by both validators; the gate and the metric can no
longer disagree.

Exit codes: 0 = answer_captured, 3 = capture_failed (prompt-only/empty/
malformed), 2 = infra/decode error.
"""
import importlib.util
import os
import re
import sys

MIN_NUMBERED_ITEMS = 3
MIN_ANSWER_CHARS = 1200


def _contract_parser():
    """Shared entry parser: validate-research-contract.py owns the entry
    definition (authority boundary); this module only consumes it."""
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "validate-research-contract.py")
    spec = importlib.util.spec_from_file_location(
        "tandem_research_contract", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_CONTRACT = None


def count_business_entries(text: str) -> int:
    """Number of parsed business entries in the answer region.

    The prompt echo and UI chrome are stripped by the contract validator's
    answer_region() before parsing, so echoed template numbers can never
    count. An entry is accepted only when it carries at least one explicit
    labeled field (the contract's phantom-entry rule).
    """
    global _CONTRACT
    if _CONTRACT is None:
        _CONTRACT = _contract_parser()
    region = _CONTRACT.answer_region(text)
    return len(_CONTRACT.parse_entries(region))


# --------------------------------------------------------------------------
# Freeform-extraction fallback (2026-10-03, Nolan: "very important").
# The b brief fails ~39% of runs with long freeform prose and zero
# parseable numbered entries (emblematic: 14669 chars, 0 items); the
# evidence was discarded via .CAPTURE_FAILED. When the answer region is
# long but yields zero entries, this fallback deterministically extracts
# business mentions (name + town + any contact/URL present) BEFORE
# fail-closing. It never invents businesses: every extracted name is
# taken verbatim from a numbered, bold, or labeled line in the source
# text. Rescued entries are emitted in the contract's numbered format and
# marked UNVERIFIED; they must still pass the outreach engine's
# independent web-search verification gate before entering the pipeline.
# Rescue requires >= MIN_NUMBERED_ITEMS extracted entries; anything less
# still fail-closes.
# --------------------------------------------------------------------------

FREEFORM_MIN_CHARS = 3000  # answer-region chars that count as "high"

FREEFORM_TRADES = (
    'plumbing', 'hvac', 'heating', 'air conditioning', 'electrical',
    'electrician', 'roofing', 'roofer', 'landscaping', 'landscaper',
    'concrete', 'fence', 'garage door', 'pest control', 'exterminator',
    'snow removal', 'carpet cleaning', 'well', 'pump', 'septic', 'chimney',
    'appliance repair',
)

# Corridor towns first, then wider Colorado. The downstream web-search
# verification gate is the truth boundary; this list is a precision aid.
FREEFORM_TOWNS = (
    'grand junction', 'fruita', 'palisade', 'clifton', 'collbran', 'loma',
    'mack', 'de beque', 'delta', 'montrose', 'rifle', 'carbondale',
    'cedaredge', 'hotchkiss', 'paonia', 'crawford', 'olathe', 'eckert',
    'whitewater', 'gateway', 'naturita', 'nucla', 'norwood', 'telluride',
    'ouray', 'ridgway', 'gunnison', 'cortez', 'durango', 'pagosa springs',
    'glenwood springs', 'aspen', 'vail', 'steamboat springs', 'craig',
    'meeker', 'denver', 'aurora', 'lakewood', 'littleton', 'arvada',
    'westminster', 'thornton', 'centennial', 'parker', 'castle rock',
    'colorado springs', 'pueblo', 'fort collins', 'greeley', 'loveland',
    'longmont', 'boulder', 'brighton', 'commerce city', 'northglenn',
    'golden', 'evergreen', 'conifer', 'morrison', 'idaho springs',
    'georgetown', 'winter park', 'fraser', 'granby', 'kremmling',
    'leadville', 'fairplay', 'buena vista', 'salida', 'canon city',
    'florence', 'walsenburg', 'trinidad', 'la junta', 'lamar',
    'sterling', 'fort morgan', 'yuma', 'burlington',
)

PHONE_RE = re.compile(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b')
URL_RE = re.compile(
    r'https?://[^\s)]+|www\.[^\s)]+'
    r'|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|biz|us|co)\b', re.I)
EMAIL_RE = re.compile(r'[\w.+-]+@[\w-]+\.[\w.]+')
FREEFORM_NUMBERED_RE = re.compile(r'^\s*\d{1,2}[.)]\s+(.+?)\s*$')
FREEFORM_BOLD_RE = re.compile(r'^\s*\*\*(.+?)\*\*')
FREEFORM_NAME_LABEL_RE = re.compile(r'(?i)^\s*business(?: name)?:\s*(.+?)\s*$')
FREEFORM_SUFFIX_RE = re.compile(
    r'\b(llc|inc|co|corp|services|company|pros|experts|llp|pllc|group)\b', re.I)
FREEFORM_CHROME = {'today', 'show thinking', 'ask meta ai'}


def _freeform_clean_name(raw):
    t = re.sub(r'\*\*', '', raw).strip()
    t = re.split(r'\s+[-–—]\s+|\s*\([^)]*\)\s*$', t)[0].strip()
    t = t.split(',')[0].strip().strip('"\'“”‘’')
    return t


def _freeform_find_town(block):
    low = block.lower()
    for town in FREEFORM_TOWNS:
        if re.search(r'\b' + re.escape(town) + r'\b', low):
            return town.title()
    return ''


def _freeform_find_trade(block):
    low = block.lower()
    for kw in FREEFORM_TRADES:
        if re.search(r'\b' + re.escape(kw) + r'\b', low):
            return kw
    return ''


def _freeform_find_contact(block):
    bits = []
    for rx in (PHONE_RE, URL_RE, EMAIL_RE):
        for m in rx.finditer(block):
            bits.append(m.group(0).rstrip('.,;:'))
    out, seen = [], set()
    for b in bits:
        if b and b not in seen:
            seen.add(b)
            out.append(b)
    return ', '.join(out)


def _freeform_looks_like_name(name, trade):
    words = name.split()
    if not (1 <= len(words) <= 6):
        return False
    if len(name) < 3 or not re.search(r'[A-Za-z]', name):
        return False
    if name.lower() in FREEFORM_CHROME:
        return False
    if FREEFORM_SUFFIX_RE.search(name):
        return True
    if trade and trade in name.lower():
        return True
    if all(re.match(r"^[A-Z0-9][\w&'.-]*$", w) for w in words):
        return True
    return False


def freeform_extract(region):
    """Deterministically extract business mentions from freeform prose.

    Returns [{'business', 'town', 'trade', 'contact', 'evidence'}].
    Name + town are required; contact/URL are best-effort. Names come
    only from numbered, bold, or business-labeled lines in the source.
    """
    entries, seen = [], set()
    blocks = [b for b in re.split(r'\n\s*\n', region) if b.strip()]
    for block in blocks:
        first = block.splitlines()[0].strip()
        name = ''
        m = FREEFORM_NUMBERED_RE.match(first)
        if m:
            name = _freeform_clean_name(m.group(1))
        elif FREEFORM_BOLD_RE.match(first):
            name = _freeform_clean_name(FREEFORM_BOLD_RE.match(first).group(1))
        else:
            lm = FREEFORM_NAME_LABEL_RE.match(first)
            if lm:
                name = _freeform_clean_name(lm.group(1))
        if not name:
            continue
        town = _freeform_find_town(block)
        if not town:
            continue  # name + town is the minimum; townless prose is not a lead
        trade = _freeform_find_trade(block)
        if not _freeform_looks_like_name(name, trade):
            continue
        key = re.sub(r'[^a-z0-9 ]', ' ', name.lower())
        key = ' '.join(w for w in key.split()
                       if w not in {'llc', 'inc', 'co', 'corp', 'the'})
        if key in seen:
            continue
        seen.add(key)
        evidence = re.sub(r'\s+', ' ', block).strip()[:220]
        entries.append({
            'business': name,
            'town': town,
            'trade': trade.title() if trade else 'Unspecified',
            'contact': _freeform_find_contact(block),
            'evidence': evidence,
        })
    return entries


def render_freeform_md(slug, ts, chars, entries, region):
    """Render rescued entries in the contract's numbered format, with a
    machine-readable provenance banner and the source prose appended after
    a section-end marker (so the entry parser never reads the appendix as
    entries). Every entry is marked UNVERIFIED."""
    lines = [
        f'# Meta AI intel pass: {slug} ({ts[:8]} {ts[9:11]}:{ts[11:13]})',
        '',
        '# FREEFORM EXTRACTION (machine-rescued 2026-10-03). The source answer',
        f'# was {chars} chars of freeform prose with 0 parseable numbered entries.',
        f'# The {len(entries)} entries below were deterministically extracted',
        '# (business name, town, and contact/URL exactly as printed in the source)',
        '# and are UNVERIFIED. Each entry must pass the independent web-search',
        '# verification gate (business name plus town) before entering the',
        '# pipeline. No business was invented.',
        '',
    ]
    for i, e in enumerate(entries, 1):
        lines.append(f"{i}. {e['business']} - {e['town']} - {e['trade']}")
        lines.append(f"Business: {e['business']}")
        lines.append(f"Town: {e['town']}")
        lines.append(f"Trade: {e['trade']}")
        if e['contact']:
            lines.append(f"Contact: {e['contact']}")
        lines.append(f"Evidence new: {e['evidence']}")
        lines.append('Verification: UNVERIFIED - freeform extraction; '
                     'requires independent web search')
        lines.append('')
    lines.append('Sources and uncertainty')
    lines.append('')
    lines.append(region[:30000])
    lines.append('')
    lines.append('What could NOT be verified: every entry above is UNVERIFIED '
                 'until the independent web-search gate confirms the business exists.')
    lines.append('')
    return '\n'.join(lines)


def decode_raw(raw: bytes) -> str:
    if raw[:2] == b'\xff\xfe':
        text = raw.decode('utf-16')
    elif raw[:2] == b'\xfe\xff':
        text = raw.decode('utf-16-be')
    elif raw[:3] == b'\xef\xbb\xbf':
        text = raw.decode('utf-8-sig')
    else:
        text = raw.decode('utf-8')  # strict: never guess, fail loudly
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    cut = text.find('Ask Meta AI.')
    if cut > 0:
        text = text[:cut]
    return text.strip()


def main() -> int:
    if len(sys.argv) != 5:
        print('usage: validate-meta-answer.py <raw.bin> <out.md> <slug> <ts>', file=sys.stderr)
        return 2
    raw_path, out_path, slug, ts = sys.argv[1:5]
    try:
        raw = open(raw_path, 'rb').read()
    except OSError as e:
        print(f'INFRA read_failed {e}', file=sys.stderr)
        return 2
    try:
        text = decode_raw(raw)
    except (UnicodeDecodeError, ValueError) as e:
        print(f'CAPTURE decode_failed {e}', file=sys.stderr)
        return 3
    header = f'# Meta AI intel pass: {slug} ({ts[:8]} {ts[9:11]}:{ts[11:13]})\n\n'
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(header + text + '\n')
    items = count_business_entries(text)
    chars = len(text)
    print(f'answer chars: {chars}, numbered items: {items}')
    if items == 0:
        # Freeform-extraction fallback: long prose, zero parseable entries.
        # Attempt deterministic rescue BEFORE fail-closing to .CAPTURE_FAILED.
        # _CONTRACT is initialized by count_business_entries above.
        region = _CONTRACT.answer_region(text)
        if len(region) >= FREEFORM_MIN_CHARS:
            rescued = freeform_extract(region)
            if len(rescued) >= MIN_NUMBERED_ITEMS:
                with open(out_path, 'w', encoding='utf-8') as f:
                    f.write(render_freeform_md(slug, ts, chars, rescued,
                                               region))
                print(f'FREEFORM_EXTRACTED n={len(rescued)} (source {chars} '
                      f'chars freeform prose, 0 parseable entries; entries '
                      f'UNVERIFIED, independent web-search gate still required)')
                return 0
            print(f'freeform extraction found {len(rescued)} entries '
                  f'(<{MIN_NUMBERED_ITEMS}); failing closed', file=sys.stderr)
    if items < MIN_NUMBERED_ITEMS or chars < MIN_ANSWER_CHARS:
        print(f'CAPTURE answer_missing_or_malformed '
              f'(need >={MIN_NUMBERED_ITEMS} business entries and >{MIN_ANSWER_CHARS} chars)',
              file=sys.stderr)
        return 3
    return 0


if __name__ == '__main__':
    sys.exit(main())
