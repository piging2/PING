#!/usr/bin/env python3
"""Pre-merge collision guard for the canonical prospect store.

Round-112 lesson: the meta-ai-intel-pass sweep merged 8 rows into the canonical
JSONL claiming "zero pipeline collisions" without checking pipeline.md or
prospect-archive.jsonl. All 8 were already pipeline-staged; 3 had been archived.

MANDATORY before any merge into ~/workspace/your_files/western-co-prospects.jsonl:
  python3 ~/workspace/outreach/check-prospect-collision.py "Business Name" [...]

Exit 0 = all names clear (no collision anywhere).
Exit 1 = at least one collision found; details on stdout. Do NOT merge colliding
names as new. Either enrich the existing record or leave the archived record alone.

Checks, per name (normalized: lowercase, stripped):
  1. canonical JSONL (your_files/western-co-prospects.jsonl)
  2. pipeline.md rows (substring scan; up to 3 matched lines printed with line
     numbers so a prose-only mention is distinguishable from a real row.
     Blocking semantics unchanged: any hit blocks the merge; the agent judges
     real-row vs prose from the printed lines instead of grepping.)
  3. prospect-archive.jsonl (a hit here means: do NOT re-add as new; the archive
     reason controls unless genuinely new material evidence exists)
"""
import json
import re
import sys
from pathlib import Path

HOME = Path('/home/hatch')
JSONL = HOME / 'workspace/your_files/western-co-prospects.jsonl'
PIPELINE = HOME / 'workspace/outreach/pipeline.md'
ARCHIVE = HOME / 'workspace/outreach/prospect-archive.jsonl'


def norm(name):
    return re.sub(r'\s+', ' ', (name or '').strip().lower())


ENTITY_SUFFIXES = {'inc', 'llc', 'co', 'corp', 'ltd', 'pllc', 'pa', 'lp'}


def norm_tokens(name):
    """Variant-tolerant token set: lowercase, '&' -> 'and', punctuation
    stripped, entity suffixes dropped, crude singularization (trailing 's'
    stripped from tokens longer than 3 chars, 'ies' -> 'y'). Used only for
    the SUSPECT tier; never replaces the exact-match collision check."""
    t = (name or '').lower().replace('&', ' and ')
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    toks = []
    for w in t.split():
        if w in ENTITY_SUFFIXES:
            continue
        if w.endswith('ies') and len(w) > 4:
            w = w[:-3] + 'y'
        elif w.endswith('s') and len(w) > 3 and not w.endswith('ss'):
            w = w[:-1]
        toks.append(w)
    return set(toks)


def token_overlap(a, b):
    """True when a and b are near-duplicate names: one's token set is a
    subset of the other's, or Jaccard similarity >= 0.8."""
    if not a or not b:
        return False
    if a <= b or b <= a:
        return True
    inter = len(a & b)
    union = len(a | b)
    return union and (inter / union) >= 0.8


def main(names):
    jsonl_names = set()
    jsonl_tokens = {}
    for line in JSONL.read_text().splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        nm = norm(r.get('business_name'))
        jsonl_names.add(nm)
        jsonl_tokens[nm] = norm_tokens(r.get('business_name'))

    pipeline_lines = PIPELINE.read_text().splitlines()
    pipeline_text = '\n'.join(pipeline_lines).lower()
    # Row names: "- <STATUS> | <name> | ..." or "- <name> | <trade> | ..."
    # (older rows omit the status marker). Prose lines skipped.
    STATUS_RE = re.compile(
        r'^(NEW|WARM|WATCH|SENT|DRAFT|QUEUED|SKIPPED|HOLD|CONTACTED|'
        r'SUBMITTED|DM SENT|EXCLUDED|ARCHIVED|NEAR-MISS|LEAD|PROSPECT)\b',
        re.IGNORECASE)
    pipeline_rows = []
    for i, ln in enumerate(pipeline_lines):
        if not ln.startswith('- '):
            continue
        fields = [f.strip() for f in ln[2:].split('|')]
        if not fields:
            continue
        if STATUS_RE.match(fields[0]) and len(fields) > 1:
            nm = fields[1]
        else:
            nm = fields[0]
        # Guard: a usable business name has >= 2 tokens; a single token
        # (trade word, status fragment) would subset-match everything.
        if nm and len(nm.split()) >= 2:
            pipeline_rows.append((i + 1, nm, norm_tokens(nm)))
    archive_hits = {}
    archive_tokens = {}
    for line in ARCHIVE.read_text().splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        nm = norm(r.get('business_name'))
        archive_hits[nm] = r.get('archive_reason', '')
        archive_tokens[nm] = norm_tokens(r.get('business_name'))

    collisions = 0
    for raw in names:
        n = norm(raw)
        nt = norm_tokens(raw)
        hits = []
        if n in jsonl_names:
            hits.append('canonical JSONL')
        pipe_matches = []
        if n:
            pipe_matches = [(i + 1, ln[:170])
                            for i, ln in enumerate(pipeline_lines)
                            if n in ln.lower()][:3]
        if pipe_matches:
            hits.append('pipeline.md')
        if n in archive_hits:
            hits.append('prospect-archive.jsonl (archived: %s)' % archive_hits[n][:80])
        # SUSPECT tier: token-variant near-miss, non-blocking, must be resolved
        suspects = []
        if n and nt and not hits:
            for store, label in ((jsonl_tokens, 'canonical JSONL'),
                                 (archive_tokens, 'prospect-archive.jsonl')):
                for snm, st in store.items():
                    if token_overlap(nt, st):
                        suspects.append('%s ~ %s' % (label, snm))
                        break
            for lineno, rname, rt in pipeline_rows:
                if token_overlap(nt, rt):
                    suspects.append('pipeline.md L%d ~ %s' % (lineno, rname))
                    if len(suspects) >= 3:
                        break
        if hits:
            collisions += 1
            print('COLLISION: %s -> %s' % (raw, '; '.join(hits)))
            for lineno, line in pipe_matches:
                print('  pipeline.md L%d: %s' % (lineno, line))
        else:
            if suspects:
                print('SUSPECT (variant near-miss, resolve before merge): %s' % raw)
                for s in suspects[:3]:
                    print('  %s' % s)
            else:
                print('CLEAR: %s' % raw)

    if collisions:
        print('\n%d of %d names collide. Do NOT merge colliding names as new.' % (collisions, len(names)))
        return 1
    print('\nAll %d names clear.' % len(names))
    return 0


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('usage: check-prospect-collision.py "Business Name" [...]', file=sys.stderr)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
