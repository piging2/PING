#!/usr/bin/env python3
"""Mechanically validate a Meta AI research answer against its machine-checkable
contract (~/workspace/tandem/contracts/<brief>.json).

This is the FIRST-directive boundary: the model may not satisfy the contract
merely by saying it did. Every candidate is re-derived deterministically:
required fields, geography from the run's own pack GEOGRAPHY section, trade
from the pack TARGET section, problem-category vocabulary membership, a cited
1/2/3-star review, review timing parsed and checked against the 90-day window,
a verification method naming a real source, no reviewer quotes in the problem
or timing fields, one explicit classification per candidate from the fixed
taxonomy, deterministic dedup against the canonical JSONL plus the
brief-aware negative-signal list, an uncertainty statement, and the UNVERIFIED
marking.

Truth checks the machine cannot do (does the business really exist, is the
review real) stay with the outreach engine's step-4e web-search verification
gate. This validator owns the contract; the engine owns the truth.

Exit codes: 0 = PASS, 3 = REJECTED (fail closed), 2 = infra/usage error.
A rejected artifact's report is still written; the caller must keep the
artifact out of extraction (same convention as .CAPTURE_FAILED).
"""
import argparse
import difflib
import json
import os
import re
import sys
from datetime import date, datetime
from urllib.parse import urlparse

HOME = os.path.expanduser('~')
DEFAULT_JSONL = os.path.join(HOME, 'workspace/your_files/western-co-prospects.jsonl')

MONTHS = {m: i + 1 for i, m in enumerate(
    'january february march april may june july august september october november december'.split())}

CHROME_LINES = {'today', 'show thinking'}


# --------------------------------------------------------------------------
# Answer region: drop the prompt echo and UI chrome; validate only the answer.
# --------------------------------------------------------------------------

def answer_region(text):
    """Return only the model's answer.

    Primary boundary: the UI chrome line ('Show thinking') that the capture
    places between the prompt echo and the streamed answer. Fallback: text
    after the last OUTPUT CONTRACT delimiter, with leading chrome lines
    removed. The prompt echo must never be validated as if it were the
    answer: it contains towns, trades, and ratings that would satisfy every
    check for free."""
    lines = text.splitlines()
    chrome_idx = max(
        (i for i, ln in enumerate(lines) if ln.strip().lower() == 'show thinking'),
        default=None)
    if chrome_idx is not None:
        return '\n'.join(lines[chrome_idx + 1:]).strip()
    delim = '================ OUTPUT CONTRACT ================'
    idx = text.rfind(delim)
    region = text[idx + len(delim):] if idx >= 0 else text
    out = []
    skipping = True
    for ln in region.splitlines():
        s = ln.strip()
        if skipping and (not s or s.lower() in CHROME_LINES):
            continue
        skipping = False
        out.append(ln)
    return '\n'.join(out).strip()


# --------------------------------------------------------------------------
# Entry parsing. Real captures are blank-line-delimited blocks: an entry
# opens with a "Business - Town - Trade" header line (numbered "N. ..." or
# bare) followed by labeled fields that may sit in later blocks. A block is
# only accepted as an entry when it carries at least one explicit labeled
# field, so title lines like "Signals - Phone/Response - Window" cannot
# become phantom entries.
# --------------------------------------------------------------------------

HEADER_NUM_RE = re.compile(r'^\s*\d{1,2}[.)]\s+(.*)$')
LABEL_RE = re.compile(r'^\s*([A-Za-z /]+):\s*(.*)$')
SECTION_END_RE = re.compile(
    r'^\s*(what could NOT be verified|uncertainty|sources|what remains uncertain)\b', re.I)


def header_parts(line):
    m = HEADER_NUM_RE.match(line)
    t = m.group(1).strip() if m else line.strip()
    return [p.strip() for p in t.split(' - ')]


def looks_like_header(line):
    lm = LABEL_RE.match(line)
    if lm and lm.group(1).strip().lower() in LABEL_MAP:
        return False
    parts = header_parts(line)
    return len(parts) >= 3 and all(len(p) >= 2 for p in parts[:3])


def parse_entries(region):
    entries = []
    current = None
    auto_index = 0

    for block in re.split(r'\n\s*\n', region):
        lines = [ln for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        if SECTION_END_RE.match(lines[0]):
            break
        if looks_like_header(lines[0]):
            auto_index += 1
            m = re.match(r'^\s*(\d{1,2})[.)]\s+', lines[0])
            current = {'index': int(m.group(1)) if m else auto_index,
                       'header_text': lines[0],
                       'fields': {}, 'explicit_labels': set(),
                       'raw_lines': []}
            entries.append(current)
            lines = lines[1:]
        if current is None:
            continue  # preamble before the first entry
        current_label = None
        for ln in lines:
            current['raw_lines'].append(ln)
            lm = LABEL_RE.match(ln)
            if lm and lm.group(1).strip().lower() in LABEL_MAP:
                current_label = LABEL_MAP[lm.group(1).strip().lower()]
                current['explicit_labels'].add(current_label)
                current['fields'][current_label] = lm.group(2).strip()
            elif current_label and ln.strip():
                current['fields'][current_label] += ' ' + ln.strip()
    # Promote header parts into fields when labels are absent.
    for e in entries:
        parts = header_parts(e['header_text'])
        f = e['fields']
        if len(parts) >= 3:
            f.setdefault('business', parts[0])
            f.setdefault('town', parts[1])
            f.setdefault('trade', ' - '.join(parts[2:]))
    # Inline labeled fragments (2026-09-19): the one-line entry style carries
    # its fields inline ("Name - Town - Trade - Website: ... - Weakness: ...").
    # A header-shaped line whose dash-separated parts include an explicit
    # "Label:" fragment from LABEL_MAP carries explicit labeled content, so
    # it is not a phantom entry. (Title-shaped lines with no labels, e.g.
    # "Signals - Phone/Response - Window", are still dropped below.)
    for e in entries:
        for part in e['header_text'].split(' - '):
            lm = re.match(r'^\s*([A-Za-z /]+):\s*(.*)$', part)
            if not lm:
                continue
            lab = lm.group(1).strip().lower()
            if lab in LABEL_MAP:
                f = e['fields']
                f.setdefault(LABEL_MAP[lab], lm.group(2).strip())
                e['explicit_labels'].add(LABEL_MAP[lab])
    # Drop phantom entries: no explicit labeled field, only a header-shaped line.
    entries = [e for e in entries if e['explicit_labels']]
    for e in entries:
        del e['explicit_labels']
    # Renumber sequentially in acceptance order.
    for i, e in enumerate(entries, 1):
        e['index'] = i
    return entries

LABEL_MAP = {
    'business': 'business', 'business name': 'business',
    'town': 'town', 'city': 'town',
    'trade': 'trade',
    'problem category': 'problem_category', 'problem': 'problem_category',
    'roughly when': 'review_timing', 'review timing': 'review_timing',
    'when': 'review_timing',
    'review rating': 'review_rating', 'rating': 'review_rating',
    'website': 'website',
    'weakness': 'weakness', 'weakness/opportunity': 'weakness',
    'weak signal': 'weakness',
    'evidence new': 'newness_evidence',
    'contact': 'contact',
    'verification': 'verification_method', 'verified': 'verification_method',
    'how verified': 'verification_method',
    'classification': 'classification',
}


# --------------------------------------------------------------------------
# Geography and target trades, read from the run's own pack file.
# --------------------------------------------------------------------------

def pack_section(pack_text, title):
    m = re.search(r'## ' + re.escape(title) + r'\s*\n(.*?)(?:\n## |\Z)', pack_text, re.S)
    return m.group(1).strip() if m else ''


def extract_towns(pack_text):
    sec = pack_section(pack_text, 'Geography (strict priority)')
    first_para = sec.split('\n\n')[0]
    first_para = first_para.replace(' and ', ', ')
    towns = []
    for tok in first_para.split(','):
        t = tok.strip().rstrip('.')
        low = t.lower()
        if not t or 'surrounding' in low or 'western colorado' in low or 'expand outward' in low:
            continue
        towns.append(t)
    return towns


def extract_trades(pack_text):
    sec = pack_section(pack_text, 'Target')
    m = re.search(r'\(([^)]*(?:plumbing|hvac)[^)]*)\)', sec, re.I)
    if not m:
        return []
    return [t.strip().lower() for t in m.group(1).split(',') if t.strip()]


def norm_town(t):
    t = t.lower().strip()
    t = re.sub(r',?\s*co(lorado)?\.?$', '', t).strip()
    return t


def norm_trade(t, rules):
    t = t.lower().strip()
    for keyword, canonical in rules:
        if keyword in t:
            return canonical
    return t


# --------------------------------------------------------------------------
# Review-timing parser. Returns a date, or None when the timing cannot be
# resolved to a calendar date. Unresolvable is NOT stale: missing evidence
# must never become negative evidence.
# --------------------------------------------------------------------------

def parse_timing(text, run_date):
    if not text:
        return None
    t = text.lower()
    m = re.search(r'(\d+)\s+days?\s+ago', t)
    if m:
        return shift(run_date, int(m.group(1)))
    m = re.search(r'(\d+)\s+weeks?\s+ago', t)
    if m:
        return shift(run_date, int(m.group(1)) * 7)
    m = re.search(r'(\d+)\s+months?\s+ago', t)
    if m:
        return shift(run_date, int(m.group(1)) * 30)
    if re.search(r'\blast month\b', t):
        return shift(run_date, 30)
    if re.search(r'\blast week\b', t):
        return shift(run_date, 7)
    m = re.search(r'(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})', t)
    if m:
        return date(int(m.group(2)), MONTHS[m.group(1)], 15)
    m = re.search(r'(\d{1,2})/(\d{1,2})/(20\d{2})', t)
    if m:
        try:
            return date(int(m.group(3)), int(m.group(1)), int(m.group(2)))
        except ValueError:
            return None
    m = re.search(r'(20\d{2})-(\d{2})-(\d{2})', t)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            return None
    # A bare year, a year range, or vague words ("recent", "aggregate",
    # "window", "last 12 months") cannot be placed on a calendar.
    return None


def shift(d, days):
    from datetime import timedelta
    return d - timedelta(days=days)


RATING_RE = re.compile(
    r'(\d(?:\.\d)?)\s*(?:/|out of)?\s*stars?\b|\brated\s+(\d)\s+out of\s+5\b|\b(\d)[- ]star\b',
    re.I)


def cited_low_rating(text, acceptable):
    """True if the entry cites at least one review rating in the acceptable
    set. A business-average rating with no cited low review does not count."""
    found = []
    for m in RATING_RE.finditer(text or ''):
        for g in m.groups():
            if g is not None:
                try:
                    found.append(float(g))
                except ValueError:
                    pass
    return any(int(v) == v and int(v) in acceptable for v in found), found


QUOTE_RE = re.compile(r'"([^"]{4,})"')


# --------------------------------------------------------------------------
# Deterministic identity normalization and dedup.
# --------------------------------------------------------------------------

def normalize_name(name, suffixes):
    t = name.lower()
    t = re.sub(r'[^a-z0-9 ]', ' ', t)
    toks = [w for w in t.split() if w]
    toks = [w for w in toks if w not in suffixes]
    if toks and toks[0] == 'the':
        toks = toks[1:]
    return ' '.join(toks)


def phone_key(phone):
    digits = re.sub(r'\D', '', phone or '')
    return digits[-10:] if len(digits) >= 10 else ''


def domain_key(website):
    if not website or 'no website' in website.lower():
        return ''
    m = re.search(r'([a-z0-9.-]+\.[a-z]{2,})', website.lower())
    if not m:
        return ''
    d = m.group(1)
    return d[4:] if d.startswith('www.') else d


def load_jsonl_index(path):
    """name|town keys, phone keys, domain keys from the canonical JSONL."""
    names, phones, domains = {}, {}, {}
    try:
        with open(path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    r = json.loads(line)
                except Exception:
                    continue
                nm = r.get('business_name', '')
                city = r.get('city', '') or r.get('town', '')
                if nm:
                    names.setdefault((nm.lower(), city.lower()), r)
                pk = phone_key(r.get('phone', ''))
                if pk:
                    phones[pk] = r
                dk = domain_key(r.get('website', ''))
                if dk:
                    domains[dk] = r
    except FileNotFoundError:
        pass
    return names, phones, domains


def brief_negative_keys(path, slug, suffixes):
    """Negative-signal keys, identical by construction to the names the
    context pack showed the worker as "do not return".

    Self-audit 2026-09-24 (negative-list parity invariant): this set and the
    pack builder's list are the same logical concept computed by the same
    shared module (tandem/covered_names.py) over the same sources (canonical
    JSONL + pipeline.md staged rows + prospect-archive.jsonl). The previous
    JSONL-only derivation let re-served pack negatives (e.g. Wesley Electric,
    JACG Roofing LLC, 2026-09-23/24 passes) validate as clear. `path` is kept
    for call-site compatibility; sources resolve inside the shared module.
    """
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from covered_names import merged_covered_names
    keys = set()
    for nm, town in merged_covered_names(slug):
        if nm:
            keys.add(normalize_name(nm, suffixes) + '|' + norm_town(town))
    return keys


def dedup(entry_name, entry_town, entry_phone, entry_website, suffixes,
          jsonl_names, jsonl_phones, jsonl_domains, negative_keys):
    """Return (status, detail): 'duplicate' | 'ambiguous' | 'clear'."""
    nn = normalize_name(entry_name, suffixes)
    nt = norm_town(entry_town)
    if not nn:
        return 'ambiguous', 'empty normalized name'
    key = nn + '|' + nt
    if key in negative_keys:
        return 'duplicate', 'in brief negative-signal list'
    for (jn, jt) in jsonl_names:
        if normalize_name(jn, suffixes) + '|' + norm_town(jt) == key:
            return 'duplicate', 'exact normalized match in canonical JSONL'
    pk = phone_key(entry_phone)
    if pk and pk in jsonl_phones:
        return 'duplicate', 'phone match in canonical JSONL'
    dk = domain_key(entry_website)
    if dk and dk in jsonl_domains:
        return 'duplicate', 'website domain match in canonical JSONL'
    # Near-miss: same town, very similar name. Never guess: ambiguous.
    for (jn, jt) in jsonl_names:
        if norm_town(jt) != nt or not nt:
            continue
        ratio = difflib.SequenceMatcher(None, nn, normalize_name(jn, suffixes)).ratio()
        if 0.88 <= ratio < 1.0:
            return 'ambiguous', f'near-miss on {jn} ({jt}) ratio={ratio:.2f}'
    return 'clear', ''


# --------------------------------------------------------------------------
# Per-entry contract check.
# --------------------------------------------------------------------------

def check_entry(e, ctx):
    f = e['fields']
    notes = []
    checks = {}
    text_all = ' '.join(e['raw_lines'])

    # Required fields.
    missing = [k for k in ctx['required_fields'] if not f.get(k, '').strip()]
    checks['fields_present'] = not missing
    if missing:
        notes.append('missing fields: ' + ', '.join(missing))

    # Geography: town must come from the declared GEOGRAPHY section.
    town_ok = False
    if f.get('town', '').strip():
        town_ok = norm_town(f['town']) in ctx['towns_norm']
        if not town_ok:
            notes.append(f"town {f['town']!r} not in declared geography")
    checks['town_in_geography'] = town_ok

    # Trade: must come from the declared TARGET section.
    trade_ok = False
    trade_norm = ''
    if f.get('trade', '').strip():
        trade_norm = norm_trade(f['trade'], ctx['trade_rules'])
        trade_ok = trade_norm in ctx['trades']
        if not trade_ok:
            notes.append(f"trade {f['trade']!r} -> {trade_norm!r} not in declared target")
    checks['trade_in_target'] = trade_ok

    # Problem category: must be one of the defined categories.
    cat_ok = False
    if f.get('problem_category', '').strip():
        low = f['problem_category'].lower()
        cat_ok = any(cat in low for cat in ctx['categories'])
        if not cat_ok:
            notes.append('problem category not in defined vocabulary: %r' % f['problem_category'])
    checks['category_defined'] = cat_ok

    # Rating: a cited 1/2/3-star review, not just a business average.
    rating_text = ' '.join([f.get('review_rating', ''), f.get('review_timing', ''),
                            f.get('verification_method', '')])
    low_ok, found_ratings = cited_low_rating(rating_text, ctx['acceptable_ratings'])
    checks['low_rating_cited'] = low_ok
    if not low_ok:
        notes.append('no 1/2/3-star review cited (found ratings: %s)' %
                     (found_ratings or 'none'))

    # Recency: timing must resolve to a date within the window.
    timing_date = parse_timing(f.get('review_timing', ''), ctx['run_date'])
    age = (ctx['run_date'] - timing_date).days if timing_date else None
    if age is not None and age < 0:
        timing_date, age = None, None
    checks['timing_resolved'] = timing_date is not None
    checks['timing_within_window'] = age is not None and age <= ctx['recency_days']
    if timing_date is None:
        notes.append('review timing not resolvable to a date: %r' % f.get('review_timing', ''))
    elif age > ctx['recency_days']:
        notes.append(f'review dated {timing_date} ({age} days ago) exceeds {ctx["recency_days"]}-day window')

    # Verification method must name a real source.
    ver = f.get('verification_method', '')
    ver_ok = (len(ver.strip()) >= 12 and
              any(tok in ver.lower() for tok in ctx['ver_tokens']))
    checks['verification_adequate'] = ver_ok
    if not ver_ok:
        notes.append('verification method missing or names no source')

    # Reviewer quotes: forbidden in problem/timing fields.
    quote_violation = False
    for fld in ctx['quote_forbidden_fields']:
        if QUOTE_RE.search(f.get(fld, '')):
            quote_violation = True
            notes.append(f'quoted text in {fld} field: reviewer identity/quote leak')
            break
    checks['no_reviewer_quote'] = not quote_violation

    # Contradiction: header town/trade disagree with labeled fields.
    contradicted = False
    parts = header_parts(e['header_text'])
    if len(parts) >= 3:
        if f.get('town', '').strip() and norm_town(parts[1]) != norm_town(f['town']):
            contradicted = True
            notes.append('header town disagrees with Town field')
        if f.get('trade', '').strip() and norm_trade(parts[2], ctx['trade_rules']) != trade_norm:
            contradicted = True
            notes.append('header trade disagrees with Trade field')
    checks['not_contradicted'] = not contradicted

    # Deterministic dedup.
    dup_status, dup_detail = dedup(
        f.get('business', ''), f.get('town', ''),
        text_all, f.get('website', ''),
        ctx['suffixes'], ctx['jsonl_names'], ctx['jsonl_phones'],
        ctx['jsonl_domains'], ctx['negative_keys'])
    checks['dedup'] = dup_status
    if dup_status != 'clear':
        notes.append(f'dedup {dup_status}: {dup_detail}')

    # Contact claims the engine must verify (soft signal, not a hard fail).
    contact_claims = []
    for m in re.finditer(r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b', text_all):
        contact_claims.append(m.group(0))

    # Model's own classification, when the brief requires one.
    model_cls = (f.get('classification') or '').strip().upper().replace(' ', '_')
    if model_cls and model_cls not in ctx['classifications']:
        notes.append(f'model classification {model_cls!r} not in taxonomy')
        model_cls = ''
    checks['model_classification_valid'] = (not f.get('classification', '').strip()) or bool(model_cls)

    # Validator classification by precedence.
    if contradicted:
        vcls = 'CONTRADICTED'
    elif not town_ok:
        vcls = 'OUT_OF_GEOGRAPHY'
    elif not trade_ok:
        vcls = 'WRONG_TRADE'
    elif dup_status == 'duplicate':
        vcls = 'DUPLICATE'
    elif timing_date is not None and age > ctx['recency_days']:
        vcls = 'STALE_REVIEW'
    elif not low_ok:
        vcls = 'WRONG_SIGNAL'
    elif not ver_ok:
        vcls = 'BUSINESS_NOT_VERIFIED'
    elif not (checks['fields_present'] and cat_ok and checks['timing_resolved']
              and checks['no_reviewer_quote'] and dup_status == 'clear'):
        vcls = 'INSUFFICIENT_EVIDENCE'
    else:
        vcls = 'VALID'

    discrepancies = []
    if model_cls and model_cls != vcls:
        discrepancies.append(f'model said {model_cls}, validator derives {vcls}')

    return {
        'index': e['index'],
        'business': f.get('business', ''),
        'town': f.get('town', ''),
        'trade': f.get('trade', ''),
        'model_classification': model_cls or None,
        'validator_classification': vcls,
        'checks': checks,
        'discrepancies': discrepancies,
        'notes': notes,
        'contact_claims': sorted(set(contact_claims)),
        'timing_resolved': timing_date.isoformat() if timing_date else None,
    }


# --------------------------------------------------------------------------
# Main.
# --------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('answer', help='captured answer .md file')
    ap.add_argument('--contract', required=True)
    ap.add_argument('--pack', required=True, help='versioned pack file for this run')
    ap.add_argument('--run-date', required=True, help='run timestamp YYYYMMDD-HHMMSS')
    ap.add_argument('--jsonl', default=DEFAULT_JSONL)
    ap.add_argument('--report', required=True, help='output report JSON path')
    args = ap.parse_args()

    try:
        contract = json.load(open(args.contract, encoding='utf-8'))
        pack_text = open(args.pack, encoding='utf-8').read()
        answer_text = open(args.answer, encoding='utf-8').read()
    except OSError as e:
        print(f'INFRA read_failed {e}', file=sys.stderr)
        return 2

    try:
        run_date = datetime.strptime(args.run_date[:8], '%Y%m%d').date()
    except ValueError:
        print('INFRA bad --run-date', file=sys.stderr)
        return 2

    towns = extract_towns(pack_text)
    trades = extract_trades(pack_text)
    if not towns or not trades:
        print('INFRA pack geography/target unparsable', file=sys.stderr)
        return 2

    region = answer_region(answer_text)
    entries = parse_entries(region)

    jsonl_names, jsonl_phones, jsonl_domains = load_jsonl_index(args.jsonl)
    negative_keys = brief_negative_keys(args.jsonl, contract['brief_id'],
                                        contract['name_suffixes_dropped'])

    ctx = {
        'required_fields': contract['required_fields'],
        'towns_norm': {norm_town(t) for t in towns},
        'trades': set(trades),
        'trade_rules': [tuple(r) for r in contract['trade_match_rules']],
        'categories': contract['problem_categories'],
        'acceptable_ratings': set(contract['acceptable_ratings']),
        'recency_days': contract['recency_days'],
        'ver_tokens': contract['verification_source_tokens'],
        'quote_forbidden_fields': contract['forbid_reviewer_quotes_in'],
        'classifications': contract['classifications'],
        'suffixes': set(contract['name_suffixes_dropped']),
        'run_date': run_date,
        'jsonl_names': jsonl_names, 'jsonl_phones': jsonl_phones,
        'jsonl_domains': jsonl_domains, 'negative_keys': negative_keys,
    }

    results = [check_entry(e, ctx) for e in entries]

    uncertainty_ok = bool(re.search(
        r'could NOT be verified|could not verify|remains? uncertain|what remains uncertain',
        region, re.I))
    unverified_ok = 'UNVERIFIED' in region

    by_cls = {}
    for r in results:
        by_cls[r['validator_classification']] = by_cls.get(r['validator_classification'], 0) + 1
    valid_count = by_cls.get('VALID', 0)

    hard_violations = []
    if not uncertainty_ok:
        hard_violations.append('missing uncertainty statement')
    if not unverified_ok:
        hard_violations.append('missing UNVERIFIED marking')
    if any(not r['checks']['no_reviewer_quote'] for r in results):
        hard_violations.append('reviewer quote/identity in problem or timing field')
    if valid_count < contract['min_valid']:
        hard_violations.append(
            f'only {valid_count} VALID entries, need {contract["min_valid"]}')

    verdict = 'REJECTED' if hard_violations else 'PASS'

    report = {
        'contract_version': contract['contract_version'],
        'brief_id': contract['brief_id'],
        'answer_file': args.answer,
        'pack_file': args.pack,
        'run_date': run_date.isoformat(),
        'geography_towns': towns,
        'target_trades': trades,
        'answer_region_chars': len(region),
        'entries': results,
        'uncertainty_statement_present': uncertainty_ok,
        'unverified_marking_present': unverified_ok,
        'summary': {
            'total': len(results),
            'valid': valid_count,
            'min_required': contract['min_valid'],
            'target': contract['target_valid'],
            'by_classification': by_cls,
            'hard_violations': hard_violations,
            'verdict': verdict,
        },
    }
    with open(args.report, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f'contract {contract["contract_version"]}: {len(results)} entries, '
          f'{valid_count} VALID (min {contract["min_valid"]}) -> {verdict}')
    for r in results:
        flag = '' if r['validator_classification'] == 'VALID' else \
            ' <- ' + '; '.join(r['notes'][:2])
        print(f"  {r['index']}. {r['business']} [{r['validator_classification']}]"
              f"{' (model: ' + r['model_classification'] + ')' if r['model_classification'] else ''}{flag}")
    if hard_violations:
        print('hard violations: ' + '; '.join(hard_violations))
    return 0 if verdict == 'PASS' else 3


# --------------------------------------------------------------------------
# Unit self-test: specify -> test the invariant machinery in isolation.
# --------------------------------------------------------------------------

def self_test():
    failures = []

    def check(name, cond):
        if not cond:
            failures.append(name)

    rd = date(2026, 9, 15)
    check('days-ago', parse_timing('25 days ago', rd) == date(2026, 8, 21))
    check('weeks-ago', parse_timing('3 weeks ago', rd) == date(2026, 8, 25))
    check('months-ago', parse_timing('2 months ago', rd) == date(2026, 7, 17))
    check('month-year', parse_timing('July 2023 review', rd) == date(2023, 7, 15))
    check('bare-year-unresolvable', parse_timing('recent 2025', rd) is None)
    check('range-unresolvable', parse_timing('2024-2025 window', rd) is None)
    check('claim-not-date', parse_timing('Last 90 days aggregate', rd) is None)
    check('twelve-months-unresolvable', parse_timing('last 12 months', rd) is None)
    check('vague-recent', parse_timing('recent positive split', rd) is None)

    ok, found = cited_low_rating('rated 3 out of 5 stars on Google', {1, 2, 3})
    check('rating-3', ok and found == [3.0])
    ok, _ = cited_low_rating('3.6 stars from 33 reviewers', {1, 2, 3})
    check('rating-3.6-not-low', not ok)
    ok, _ = cited_low_rating('2.0 stars from 14 reviews', {1, 2, 3})
    check('rating-2.0-low', ok)

    sfx = {'llc', 'inc', 'co'}
    check('norm-llc', normalize_name("Keenan's Plumbing & Heating LLC", sfx) == 'keenan s plumbing heating')
    check('norm-the', normalize_name('The Best Plumbing Co', sfx) == 'best plumbing')
    check('town-co', norm_town('Montrose, CO') == 'montrose')
    rules = [('heat', 'hvac'), ('plumb', 'plumbing')]
    check('trade-hvac', norm_trade('Heating & Air Conditioning', rules) == 'hvac')
    check('trade-plumb', norm_trade('Plumbing / Drain', rules) == 'plumbing')

    region = answer_region('================ OUTPUT CONTRACT ================\nToday\nShow thinking\n\n1. A - B - C\n')
    check('region-strips-chrome', region.startswith('1. A - B - C'))
    region2 = answer_region('echo line\nShow thinking\n\nReal Business - Montrose - HVAC\n\nTown: Montrose\n')
    check('region-chrome-boundary', region2.startswith('Real Business'))

    sample = ('Title Line - Not/An - Entry\n\n'
              'Acme Plumbing - Grand Junction - Plumbing\n\n'
              'Town: Grand Junction\nTrade: Plumbing\nProblem category: slow response\n'
              'Roughly when: 25 days ago\nReview rating: 2 stars\n'
              'Verification: Verified via Google Business Profile\n\n'
              'What could NOT be verified:\nnothing\n')
    ents = parse_entries(sample)
    check('parse-two-blocks-one-entry', len(ents) == 1 and ents[0]['fields']['business'] == 'Acme Plumbing')
    check('parse-title-not-entry', all(e['fields']['business'] != 'Title Line' for e in ents))

    towns = extract_towns('## Geography (strict priority)\nGrand Junction, Fruita and surrounding towns. Western Colorado first.\n\n## Target\nx')
    check('towns', towns == ['Grand Junction', 'Fruita'])
    trades = extract_trades('## Target\nBlue-collar (plumbing, HVAC, roofing).\n\n## Signals\nx')
    check('trades', trades == ['plumbing', 'hvac', 'roofing'])

    st, _ = dedup('Acme Plumbing', 'Grand Junction', '', '', sfx,
                  {('Acme Plumbing LLC', 'grand junction'): {}}, {}, {}, set())
    check('dedup-exact', st == 'duplicate')
    st, _ = dedup('Acme Pluming', 'Grand Junction', '', '', sfx,
                  {('Acme Plumbing LLC', 'grand junction'): {}}, {}, {}, set())
    check('dedup-ambiguous', st == 'ambiguous')
    st, _ = dedup('Totally Different Co', 'Delta', '', '', sfx,
                  {('Acme Plumbing LLC', 'grand junction'): {}}, {}, {}, set())
    check('dedup-clear', st == 'clear')

    # Self-audit 2026-09-24 (negative-list parity): the validator's negative
    # keys must be exactly the names the pack showed the worker as "do not
    # return" - pipeline-staged and archived names included.
    nk_a = brief_negative_keys('', 'a-weak-website-hunt', sfx)
    check('negkey-pipeline-in-a', 'wesley electric|palisade' in nk_a)
    nk_b = brief_negative_keys('', 'b-new-business-radar', sfx)
    check('negkey-archive-in-b', 'jacg roofing|grand junction' in nk_b)
    check('negkey-pack-negative-in-b', 'srs construction|grand junction' in nk_b)
    check('negkey-comma-parity',
          normalize_name('SRS Construction, LLC', sfx) == normalize_name('SRS Construction LLC', sfx))

    if failures:
        print('SELF-TEST FAILURES: ' + ', '.join(failures))
        return 1
    print('self-test: all checks passed')
    return 0


if __name__ == '__main__':
    if len(sys.argv) == 2 and sys.argv[1] == '--self-test':
        sys.exit(self_test())
    sys.exit(main())
