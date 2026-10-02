#!/usr/bin/env python3
"""Business-agent context brief from PING evidence: deterministic retrieval.

Given a business name, this script retrieves accepted PING events and on-disk
evidence mentioning that business and emits a business-agent context brief.
Retrieval is deterministic lookup ONLY:

  * PING event store: case-insensitive substring match (ILIKE) over
    ping_events.payload->>'observation', via the existing read-only pg_probe
    path. No embeddings, no semantic search, no ranking, no retrieval theater.
  * On-disk evidence: case-insensitive substring scan of the meta-ai-intel
    sidecars, raw answer artifacts, and runs.jsonl ledger.

Same query against the same store produces the same brief. The brief cites
the event IDs and evidence paths it used, so a fresh agent with no history
can re-run the lookup and challenge: was the evidence sufficient, was the
PING knowledge relevant, was the identity correct.

CONSUMED PRESENT-STATE FIELD SET
The 2026-09-14 demonstration (Captain Ron Handyman L.L.C.) showed the
business agent needs exactly these fields to answer "what is happening with
this business and what is the next justified action". Everything else in the
retrieved artifacts is cited as evidence, not consumed:

  business_name        the query key
  ping_accepted        event_id of the accepted PING event carrying knowledge
  verification_status  must be "verified" for the knowledge to count
  sos_formation_date   Colorado SOS formation date extracted from the
                       accepted observation (the reliable newness signal)
  contact_routes       published phone/email/website if evidenced, else
                       "none published"
  platform_account     UNKNOWN unless an identity relation evidences one
                       (see entity-identities.md; never inferred)
  decision_rule        the operational rule stated by the accepted knowledge

STABLE OUTPUT FORMAT (v1) for downstream routing agents:
  - Fixed section headers, one per line, in this order:
    CONTEXT BRIEF, QUERY, RETRIEVAL STATUS, PING EVENTS, DISK EVIDENCE,
    CONSUMED FIELDS, DECISION PROVENANCE, NOTES
  - Under CONSUMED FIELDS, one "FIELD: value" line per field above.
  - The provenance line has exactly this form:
    Decision D informed by Projection/Retrieval P containing Knowledge K
    accepted from Observation O supported by Evidence E.
  - No chain-of-thought is exposed. Uncertainty is stated, never hidden.

Fail-closed: if the PING probe is unreachable after bounded retries, the
brief reports RETRIEVAL STATUS: UNCHECKABLE and supports no decision.
PING evidence is append-only and is never mutated here.
"""

import argparse
import json
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pg_probe import query_events, ProbeError  # noqa: E402

META_INTEL_DIR = os.path.expanduser(
    '~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel')
IDENTITY_LOG = os.path.expanduser('~/workspace/tandem/entity-identities.md')
FORMAT_VERSION = 'v1'
PROBE_RETRIES = 3
PROBE_RETRY_SLEEP = 10


def _sql_escape_like(s):
    return s.replace('\\', '\\\\').replace('%', '\\%').replace('_', '\\_')


def _sql_escape_quote(s):
    return s.replace("'", "''")


def query_ping_events(name):
    """Deterministic ILIKE substring lookup over accepted observations.

    Returns (rows, error). Each row: (event_id, created_at, verification_status,
    brief_id, observation). Raises nothing; errors are returned as strings so
    the caller can fail closed.
    """
    pat = _sql_escape_quote(_sql_escape_like(name))
    sql = (
        "SELECT event_id, created_at, payload->>'verification_status' AS vs, "
        "payload->>'brief_id' AS b, payload->>'observation' AS o "
        "FROM ping_events "
        "WHERE payload->>'observation' ILIKE '%%%" + pat + "%%' ESCAPE '\\' "
        "ORDER BY created_at;"
    )
    last_err = None
    for _ in range(PROBE_RETRIES):
        try:
            return query_events(sql), None
        except ProbeError as e:
            last_err = str(e)
            time.sleep(PROBE_RETRY_SLEEP)
    return None, last_err


def scan_disk_evidence(name, brief_events=None):
    """Substring scan of sidecars, raw artifacts, and the ledger.

    Returns a list of dicts: {path, kind, note}. Read-only; nothing is
    modified. Missing directory yields an empty list (reported in NOTES).
    """
    needle = name.lower()
    hits = []
    accepted_ids = {e['event_id'] for e in (brief_events or [])}
    if not os.path.isdir(META_INTEL_DIR):
        return hits, 'meta-ai-intel directory not found'
    for fname in sorted(os.listdir(META_INTEL_DIR)):
        fpath = os.path.join(META_INTEL_DIR, fname)
        if not os.path.isfile(fpath):
            continue
        kind = None
        if fname.endswith('.provenance.json'):
            kind = 'sidecar'
        elif fname.endswith('.md'):
            kind = 'raw-artifact'
        elif fname == 'runs.jsonl':
            kind = 'ledger'
        else:
            continue
        try:
            with open(fpath, encoding='utf-8', errors='replace') as f:
                text = f.read()
        except OSError:
            continue
        note = None
        if kind == 'sidecar':
            try:
                d = json.loads(text)
                tr = d.get('transitions') or []
                acc = [t for t in tr
                       if isinstance(t, dict)
                       and t.get('state') == 'accepted_by_ping']
                if acc and acc[-1].get('event_id') in accepted_ids:
                    note = ('accepted_by_ping event_id=%s at %s '
                            '(linked via retrieved PING event)'
                            % (acc[-1].get('event_id'), acc[-1].get('at')))
            except Exception:
                pass
        if note is None and needle in text.lower():
            note = 'mentions business'
        if note is None:
            continue
        hits.append({'path': fpath, 'kind': kind, 'note': note})
    return hits, None




def extract_formation_date(observation, name):
    """Extract 'Business Name YYYY-MM-DD' from observation text.

    Deterministic regex over the cited bytes; returns the date string or
    'not stated'. The observation is cited as the source span.
    """
    if not observation:
        return 'not stated'
    base = re.sub(r'\s+(LLC|L\.L\.C\.|Inc\.?|LLP)$', '', name.strip(),
                  flags=re.IGNORECASE)
    base_re = re.escape(base).replace(r'\ ', r'\s+')
    m = re.search(base_re + r'(?:\s+L\.?L\.?C\.?)?\s+(\d{4}-\d{2}-\d{2})',
                  observation, re.IGNORECASE)
    return m.group(1) if m else 'not stated'


def extract_contact_routes(observation):
    """Report evidenced contact routes, or 'none published'.

    Only the accepted observation's own statement is used; nothing is
    inferred from outside sources.
    """
    if not observation:
        return 'not stated'
    low = observation.lower()
    if re.search(r'no(?:ne)?\b[^.]{0,80}published (phone|email|website)',
                 low) or 'none had a published phone' in low:
        return 'none published'
    found = []
    for label, pat in (('phone', r'phone[:\s]+([\d\-\(\) ]{7,})'),
                       ('email', r'[\w.+-]+@[\w-]+\.[\w.]+'),
                       ('website', r'https?://[^\s)]+')):
        if re.search(pat, observation):
            found.append(label + ' evidenced (see observation)')
    return '; '.join(found) if found else 'not stated in observation'


def platform_account_for(name):
    """Look up the identity relation log for an evidenced platform account.

    Returns the account string, or 'UNKNOWN'. The log holds relationships
    and provenance only, never independent business facts.
    """
    if not os.path.isfile(IDENTITY_LOG):
        return 'UNKNOWN (identity log absent)'
    try:
        with open(IDENTITY_LOG, encoding='utf-8', errors='replace') as f:
            text = f.read()
    except OSError:
        return 'UNKNOWN (identity log unreadable)'
    needle = name.lower().split(' llc')[0].split(' l.l.c')[0].strip()
    matched = []
    for line in text.splitlines():
        if not line.startswith('|'):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        if len(cells) < 6 or cells[0].lower().startswith('entity'):
            continue
        if needle and needle in cells[0].lower():
            matched.append((cells[1], cells[2].lower()))
    for account, rel_type in matched:
        if rel_type == 'platform-account-of':
            return account
    for account, rel_type in matched:
        if rel_type == 'no-account-evidenced':
            return 'UNKNOWN (no-account-evidenced)'
    if matched:
        return 'UNKNOWN (%s)' % matched[0][1]
    return 'UNKNOWN (no identity entry)'


def decision_rule_from(observation):
    """Quote the operational rule stated by the accepted knowledge."""
    if not observation:
        return 'none stated'
    m = re.search(r'[Oo]perational rule:[^.]*\.', observation)
    return m.group(0) if m else 'none stated'


def build_brief(name):
    rows, err = query_ping_events(name)

    events = []
    if err is None:
        for r in rows:
            events.append({
                'event_id': r[0] if len(r) > 0 else '',
                'accepted_at': r[1] if len(r) > 1 else '',
                'verification_status': r[2] if len(r) > 2 else '',
                'brief_id': r[3] if len(r) > 3 else '',
                'observation': r[4] if len(r) > 4 else '',
            })
    disk_hits, disk_err = scan_disk_evidence(name, events)

    if err is not None:
        return {
            'name': name,
            'retrieval_status': 'UNCHECKABLE',
            'retrieval_error': err,
            'events': [],
            'disk': disk_hits,
            'disk_error': disk_err,
        }
    return {
        'name': name,
        'retrieval_status': 'OK',
        'retrieval_error': None,
        'events': events,
        'disk': disk_hits,
        'disk_error': disk_err,
    }


def render(brief):
    L = []
    name = brief['name']
    L.append('CONTEXT BRIEF (format %s, deterministic retrieval, no embeddings)'
             % FORMAT_VERSION)
    L.append('QUERY: %s' % name)
    L.append('RETRIEVAL STATUS: %s' % brief['retrieval_status'])
    L.append('')
    L.append('PING EVENTS')
    if brief['retrieval_error']:
        L.append('probe error (fail-closed, nothing invented): %s'
                 % brief['retrieval_error'])
    if not brief['events']:
        L.append('(no ping_events rows mention this business)')
    for e in brief['events']:
        L.append('- event_id: %s' % e['event_id'])
        L.append('  accepted_at: %s' % e['accepted_at'])
        L.append('  verification_status: %s'
                 % (e['verification_status'] or 'not set'))
        L.append('  brief_id: %s' % (e['brief_id'] or 'not set'))
        obs = e['observation'] or ''
        L.append('  observation_excerpt: %s'
                 % (obs[:280] + ('...' if len(obs) > 280 else '')))
    L.append('')
    L.append('DISK EVIDENCE')
    if brief['disk_error']:
        L.append('note: %s' % brief['disk_error'])
    if not brief['disk']:
        L.append('(no sidecar/artifact/ledger file mentions this business)')
    for h in brief['disk']:
        L.append('- [%s] %s :: %s' % (h['kind'], h['path'], h['note']))
    L.append('')

    accepted = [e for e in brief['events']
                if (e['verification_status'] or '').lower() == 'verified']

    L.append('CONSUMED FIELDS')
    if brief['retrieval_status'] != 'OK' or not accepted:
        for f in ('business_name', 'ping_accepted', 'verification_status',
                  'sos_formation_date', 'contact_routes', 'platform_account',
                  'decision_rule'):
            L.append('%s: UNCHECKABLE (no accepted PING event retrieved)' % f)
    else:
        e = accepted[-1]
        obs = e['observation'] or ''
        fields = [
            ('business_name', name),
            ('ping_accepted', e['event_id']),
            ('verification_status', e['verification_status']),
            ('sos_formation_date', extract_formation_date(obs, name)),
            ('contact_routes', extract_contact_routes(obs)),
            ('platform_account', platform_account_for(name)),
            ('decision_rule', decision_rule_from(obs)),
        ]
        for f, v in fields:
            L.append('%s: %s' % (f, v))
    L.append('')
    L.append('DECISION PROVENANCE')
    if brief['retrieval_status'] != 'OK' or not accepted:
        L.append('Decision NONE (fail-closed): retrieval is UNCHECKABLE, so no '
                 'decision is supportable from PING evidence.')
    else:
        e = accepted[-1]
        ev_paths = '; '.join(h['path'] for h in brief['disk']) or '(disk scan empty)'
        L.append('Decision D informed by Projection/Retrieval P containing '
                 'Knowledge K accepted from Observation %s supported by '
                 'Evidence %s.' % (e['event_id'], ev_paths))
        L.append('Knowledge K: the accepted observation for brief_id=%s '
                 '(verification_status=verified, accepted_at=%s).'
                 % (e['brief_id'], e['accepted_at']))
    L.append('')
    L.append('NOTES')
    L.append('- Retrieval: ILIKE substring match on '
             "ping_events.payload->>'observation' plus substring scan of "
             'meta-ai-intel sidecars/artifacts/ledger. Deterministic: same '
             'query, same store, same brief.')
    L.append('- Identity: BUSINESS ENTITY vs PLATFORM ACCOUNT vs INTERACTION '
             'are distinct layers (see entity-identities.md). platform_account '
             'is UNKNOWN unless an evidence-backed identity relation says '
             'otherwise; never inferred.')
    L.append('- PING evidence is append-only and was not mutated by this run.')
    return '\n'.join(L)


def main(argv=None):
    global IDENTITY_LOG
    ap = argparse.ArgumentParser(
        description='Deterministic business-agent context brief from PING '
                    'evidence. No embeddings, no semantic search.')
    ap.add_argument('business_name', nargs='?',
                    help='Business name; used as a case-insensitive '
                         'substring match key.')
    ap.add_argument('--identity-log', default=IDENTITY_LOG,
                    help='Path to the append-only identity relation log.')
    args = ap.parse_args(argv)
    if not args.business_name:
        ap.print_help()
        return 2
    IDENTITY_LOG = args.identity_log
    brief = build_brief(args.business_name)
    sys.stdout.write(render(brief) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
