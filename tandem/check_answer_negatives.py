#!/usr/bin/env python3
"""Answer-adherence gate for Meta AI research answers.

A fresh answer is checked against the FULL tracked universe BEFORE any
independent-search verification is spent:

    union( merged_covered_names(brief),            # brief-aware pack negatives
           all pipeline.md staged rows (any status, any brief marker),
           canonical JSONL business names,
           prospect-archive.jsonl business names )

Names already tracked are RE-SERVED (never re-verified); only NOVEL names
enter the distill sweep's verification queue.

Production evidence (meta-ai-intel pass 2026-10-04):
  * 20261004-030413 d-segment-deep-dive: 9 of 12 names were already pipeline
    staged rows but the brief-aware pack negatives missed them because the
    rows carry no per-line d-brief marker (the 2026-10-01 Mesa Door Systems
    boundary, now proven systemic, not theoretical).
  * 20261004-030636 a-weak-website-hunt: 10 of 12 names were IN the pack
    negatives and Meta AI re-served them anyway. Machinery cannot force the
    worker to obey; it can only refuse to spend verification on re-serves.

The collision guard (outreach/check-prospect-collision.py) runs pre-MERGE,
after verification. This gate runs pre-VERIFICATION. Both are needed.

Usage:
  python3 check_answer_negatives.py <answer-file> [--brief <slug>]
  python3 check_answer_negatives.py --self-test
"""

import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import covered_names as cn

HOME = os.path.expanduser('~')
WS = os.path.join(HOME, 'workspace')
INTEL_DIR = os.path.join(
    WS, 'goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel')

# Findings are single lines shaped like:
#   "Artesian Services Inc - Grand Junction - Well & Pump - Website: ... - Verified: ..."
# (Meta AI did not number them despite the contract; the validator counts
# them by shape, so this parser does too.) A finding line starts with the
# business name, has at least two " - " separators, and carries one of the
# known field markers. The contract's own "1. Business Name - Town - Trade"
# example lives before the OUTPUT CONTRACT delimiter and is never parsed.
FINDING_MARKERS = ('Website:', 'Verified:', 'Weakness:')
CONTRACT_DELIM = 'OUTPUT CONTRACT'
EXAMPLE_NAMES = {'business name'}

ENTITY_SUFFIXES = {'inc', 'llc', 'co', 'corp', 'ltd', 'pllc', 'pa', 'lp',
                   'company', 'companies'}
# Connector/filler words too weak for subset matching (they caused a false
# "Catamount Drilling and Construction" ~ "J&R Construction" match via the
# bare token "and"+"construction").
STOPWORDS = {'and', 'the', 'of', 'for', 'a', 'an', 'or'}

# Generic trade-descriptor tokens: half the directory shares them, so a
# subset relation on descriptors alone must never auto-classify RE-SERVED
# (2026-10-04: "B & B Plumbing & Heating" ~ "Sanders & Johnson Heating,
# Cooling & Plumbing", "ASAP Sewer & Septic Services" ~ "B & R Septic
# Services, Inc.", and "Midnight Plumbing & Heating" ~ "S & R Plumbing &
# Heating" all false-matched on {plumbing, heating} / {septic, service}).
# Singular forms; norm_tokens already singularizes.
TRADE_DESCRIPTORS = frozenset({
    'plumbing', 'plumber', 'heating', 'hvac', 'septic', 'sewer', 'drain',
    'electric', 'electrical', 'electrician', 'roofing', 'roofer', 'roof',
    'landscape', 'landscaping', 'lawn', 'concrete', 'fence', 'fencing',
    'appliance', 'repair', 'service', 'clean', 'cleaning', 'construction',
    'contractor', 'mechanical', 'air', 'conditioning', 'cooling', 'pump',
    'drill', 'drilling', 'excavate', 'excavation', 'paint', 'painting',
    'painter', 'garage', 'door', 'pest', 'control', 'solar', 'chimney',
    'sweep', 'carpet', 'tree', 'move', 'moving', 'haul', 'hauling', 'junk',
    'removal', 'remodel', 'remodeling', 'handyman', 'inspect', 'inspection',
    'rooter',
})


def norm_tokens(name):
    """Variant-tolerant ordered token list. Mirrors the collision guard's
    norm_tokens (outreach/check-prospect-collision.py): lowercase, '&'->'and',
    punctuation stripped, entity suffixes dropped, crude singularization.
    Single-char fragments (possessives) and stopwords are dropped."""
    t = (name or '').lower().replace('&', ' and ')
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    toks = []
    for w in t.split():
        if w in ENTITY_SUFFIXES or w in STOPWORDS:
            continue
        if len(w) < 2:
            continue  # possessive fragments ("coven's" -> "coven s")
        if w.endswith('ies') and len(w) > 4:
            w = w[:-3] + 'y'
        elif w.endswith('s') and len(w) > 3 and not w.endswith('ss'):
            w = w[:-1]
        toks.append(w)
    return toks


def norm_substr(name):
    """Loose normalized string for the pipeline-text substring tier."""
    t = (name or '').lower().replace('&', ' and ')
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9\s]', ' ', t)).strip()


def names_match(a, b):
    """True when two business names denote the same business.

    Exact normalized equality, or a subset relation where the smaller side
    has >= 2 tokens fully contained in the larger side (catches
    "Coven's Plumbing" vs "Covens Plumbing and Heating", "Shelton Drilling
    Corporation" vs "Shelton Drilling Corp."). Never matches on a single
    shared token. The subset branch additionally requires at least one
    distinctive (non-trade-descriptor) token in the shared set: a subset
    relation on generic descriptors alone ("plumbing heating", "septic
    service") is not evidence of identity (2026-10-04 self-audit).
    """
    ta, tb = norm_tokens(a), norm_tokens(b)
    if not ta or not tb:
        return False
    if ta == tb:
        return True
    sa, sb = set(ta), set(tb)
    small, big = (sa, sb) if len(sa) <= len(sb) else (sb, sa)
    return (len(small) >= 2 and small <= big
            and bool(small - TRADE_DESCRIPTORS))


def _split_finding(line):
    parts = [p.strip() for p in line.split(' - ')]
    if len(parts) < 3:
        return None
    name, town = parts[0], parts[1]
    if not name or name.lower() in EXAMPLE_NAMES:
        return None
    if not re.match(r'^[A-Z0-9]', name):
        return None
    return (name, town)


def parse_findings(path):
    """(name, town) for each finding line after the OUTPUT CONTRACT
    delimiter (the contract's own example lives before it and is skipped;
    the literal example name is skipped too)."""
    text = open(path, encoding='utf-8', errors='replace').read()
    lines = text.splitlines()
    start = 0
    for i, line in enumerate(lines):
        if CONTRACT_DELIM in line:
            start = i + 1
    out = []
    for line in lines[start:]:
        line = line.strip()
        if ' - ' not in line:
            continue
        if not any(m in line for m in FINDING_MARKERS):
            continue
        parsed = _split_finding(line)
        if parsed:
            out.append(parsed)
    return out


def _read(p):
    try:
        with open(p, encoding='utf-8', errors='replace') as f:
            return f.read()
    except FileNotFoundError:
        return ''


PIPELINE_STATUS_RE = re.compile(
    r'^(NEW|WARM|WATCH|SENT|DRAFT|QUEUED|SKIPPED|HOLD|CONTACTED|'
    r'SUBMITTED|DM SENT|EXCLUDED|ARCHIVED|NEAR-MISS|LEAD|PROSPECT)\b',
    re.IGNORECASE)


def pipeline_row_names():
    """Business names from pipeline.md staged rows, BOTH shapes:
    "- STATUS | <name> | ..." and "- <name> | <trade> | ..." (older rows omit
    the status marker). Mirrors the collision guard's row parsing, plus two
    anti-prose guards: the line must contain a '|' (real rows are columnar)
    and the name/status field must be short (prose audit notes that start
    with "- " are sentences, not rows)."""
    out = []
    for line in _read(cn.PIPELINE).splitlines():
        if not line.startswith('- ') or '|' not in line:
            continue
        fields = [f.strip().strip('*').strip() for f in line[2:].split('|')]
        if not fields:
            continue
        if PIPELINE_STATUS_RE.match(fields[0]) and len(fields) > 1:
            nm = fields[1]
        else:
            nm = fields[0]
        # A usable business name has >= 2 tokens and is short; a sentence
        # fragment would subset-match everything.
        if nm and len(nm.split()) >= 2 and len(nm) <= 60:
            out.append(nm)
    return out


def tracked_universe(brief_slug):
    """Every already-tracked business name: brief negatives + ALL pipeline
    staged rows regardless of brief marker + canonical JSONL + archive."""
    universe = []
    seen = set()

    def add(name, source):
        if not name:
            return
        key = ' '.join(norm_tokens(name))
        if key and key not in seen:
            seen.add(key)
            universe.append((name, source))

    for nm, _town in cn.merged_covered_names(brief_slug):
        add(nm, 'brief-negatives')
    for nm in pipeline_row_names():
        add(nm, 'pipeline')
    for p in (cn.JSONL, cn.ARCHIVE):
        for line in _read(p).splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            nm = (r.get('business_name') or '').strip()
            add(nm, 'jsonl' if p == cn.JSONL else 'archive')
    return universe


def check_file(path, brief_slug):
    findings = parse_findings(path)
    universe = tracked_universe(brief_slug)
    pipeline_text = _read(cn.PIPELINE).lower()
    items = []
    for name, town in findings:
        hit = next((u for u in universe if names_match(name, u[0])), None)
        source = None
        if hit:
            source = '%s [%s]' % (hit[0], hit[1])
        else:
            # Substring tier: catches prose/audit-note mentions that are not
            # staged rows (e.g. "Controlled Hydronics" in a 2026-09-30 audit
            # note). Length floor keeps short names from matching everywhere.
            ns = norm_substr(name)
            if len(ns) >= 12 and ns in pipeline_text:
                source = 'pipeline-text'
        items.append({
            'name': name,
            'town': town,
            'status': 'RE-SERVED' if source else 'NOVEL',
            'matched_as': source,
        })
    return {
        'file': os.path.basename(path),
        'brief': brief_slug,
        'findings': len(items),
        'reserves': sum(1 for i in items if i['status'] == 'RE-SERVED'),
        'novel': sum(1 for i in items if i['status'] == 'NOVEL'),
        'items': items,
    }


def self_test():
    failures = []

    def check(name, cond):
        if not cond:
            failures.append(name)

    # Name-variant matching.
    check('exact', names_match('Valley Pump Co', 'Valley Pump Co.'))
    check('amp-and', names_match('Wildcat Drilling and Pumps',
                                 'Wildcat Drilling & Pump'))
    check('suffix', names_match('Shelton Drilling Corporation',
                                'Shelton Drilling Corp.'))
    check('apostrophe-subset', names_match('Covens Plumbing and Heating',
                                          "Coven's Plumbing"))
    check('distinct-1', not names_match('San Juan Pump Co', 'San Juan Drilling'))
    check('distinct-2', not names_match('Valley Pump Co', 'Valley Drilling Co'))
    check('distinct-3', not names_match('All Temp Heating & Air',
                                        'All Temp Services Inc.'))
    check('single-token', not names_match('Pump Co', 'Valley Pump Co'))
    # 2026-10-04 production misattributions: subset relations on generic
    # trade descriptors alone must not match (all three were proven
    # distinct entities by independent verification).
    check('descriptor-subset-1',
          not names_match('B & B Plumbing & Heating',
                          'Sanders & Johnson Heating, Cooling & Plumbing'))
    check('descriptor-subset-2',
          not names_match('ASAP Sewer & Septic Services',
                          'B & R Septic Services, Inc.'))
    check('descriptor-subset-3',
          not names_match('Midnight Plumbing & Heating',
                          'S & R Plumbing & Heating'))
    # Positive controls: distinctive-token subset matches must keep working.
    check('distinctive-subset-1',
          names_match('Down Valley Septic and Drain',
                      'Down Valley Septic & Drain Inc.'))
    check('distinctive-subset-2',
          names_match('Goodwin Septic Tank Services',
                      'Goodwin Septic Tank Service, Inc.'))

    # Production evidence: this pass's two answers.
    a = check_file(os.path.join(INTEL_DIR,
                                '20261004-030636-a-weak-website-hunt.md'),
                   'a-weak-website-hunt')
    check('a-findings-12', a['findings'] == 12)
    check('a-reserves-12', a['reserves'] == 12)
    check('a-novel-0', a['novel'] == 0)
    d = check_file(os.path.join(INTEL_DIR,
                                '20261004-030413-d-segment-deep-dive.md'),
                   'd-segment-deep-dive')
    check('d-findings-12', d['findings'] == 12)
    check('d-reserves-10', d['reserves'] == 10)
    check('d-novel-2', d['novel'] == 2)
    novel_names = {i['name'] for i in d['items']
                   if i['status'] == 'NOVEL'}
    check('d-novel-set', novel_names == {'Catamount Drilling and Construction',
                                        'EmTech Inc Warehouse / EmTech Pump Sales'})

    if failures:
        print('ADHERENCE SELF-TEST FAILURES: ' + ', '.join(failures))
        return 1
    print('answer-adherence self-test: all checks passed '
          '(a: %d reserves/%d novel, d: %d reserves/%d novel)'
          % (a['reserves'], a['novel'], d['reserves'], d['novel']))
    return 0


def main(argv):
    if '--self-test' in argv:
        return self_test()
    if not argv:
        print('usage: check_answer_negatives.py <answer-file> '
              '[--brief <slug>]', file=sys.stderr)
        return 2
    path = argv[0]
    brief = None
    if '--brief' in argv:
        brief = argv[argv.index('--brief') + 1]
    if not brief:
        m = re.search(r'\d{6}-\d{6}-([a-z0-9-]+)\.md$', path)
        brief = m.group(1) if m else 'a-weak-website-hunt'
    print(json.dumps(check_file(path, brief), indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
