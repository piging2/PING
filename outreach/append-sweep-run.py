#!/usr/bin/env python3
"""Append one structured sweep-lifecycle line to the shared runs.jsonl (GAP 4).

The outreach engine appends exactly ONE line per sweep to the SAME ledger
the meta-ai-intel pass uses:
  ~/workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl
No second ledger, no second truth store. Append-only: the file is opened in
append mode and never rewritten.

Contract (verified against every consumer 2026-09-13; extended 2026-09-23):
  - origin is "outreach-engine" for execution sweeps, "discovery-research"
    for discovery-job runs (distinct from each other and from meta-ai-intel
    lines; pass --origin explicitly).
  - Sweep lines NEVER set brief_id, so emit-observation.py's
    _newest_ok_run(brief_id) can never resolve them, and the rotation jq
    (outcome=="ok" AND brief_id in the four cycle slugs) stays inert.
  - LEARN lines (GAP 5) are the only engine lines that set brief_id, always
    with the "learn-" prefix, which is not a cycle slug: inert to rotation,
    resolvable by emit-observation.py for the verification gate.
  - counts carries every stage of the target loop
    SIGNAL->RESEARCH->CANDIDATE->VALIDATE->VERIFY->PROSPECT->OUTREACH->
    RESPONSE->FOLLOW-UP->CONVERSION->EVIDENCE->PING, each defaulted to 0,
    so every stage transition is derivable from the record without parsing
    prose. Per-row transitions live in the JSONL prospect fields.

Usage:
  append-sweep-run.py --sweep-id 20260913-round43 \\
    --started-at 2026-09-13T20:00:00Z --ended-at 2026-09-13T22:30:00Z \\
    --outcome ok --counts '{"signal":12,"prospect":8,...}' \\
    --evidence-refs '{"sweep_summary":"hidden_files/sweep-2026-09-13-round43.md"}' \\
    [--extra '{"note":"..."}' | --learn-brief learn-20260913-round43 --sidecar learn-20260913-round43.provenance.json]
"""
import argparse, json, os, sys

HOME = os.path.expanduser('~')
LEDGER = os.path.join(HOME,
    'workspace/goals/ping-social-outreach-campaign/hidden_files/meta-ai-intel/runs.jsonl')

# Every stage of the target lifecycle. Always present (default 0) so stage
# transitions are derivable without prose parsing.
STAGE_KEYS = (
    'signal', 'research', 'candidate', 'validated', 'verified', 'prospect',
    'outreach_sent', 'outreach_submitted', 'outreach_dm',
    'responses', 'declines', 'bounces', 'followups',
    'conversions', 'evidence_observations', 'ping_emitted',
)
OUTCOMES = ('ok', 'partial', 'failed')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sweep-id', required=True)
    ap.add_argument('--started-at', required=True)
    ap.add_argument('--ended-at', required=True)
    ap.add_argument('--outcome', required=True, choices=OUTCOMES)
    ap.add_argument('--counts', default='{}',
                    help='JSON dict of stage counts; missing stages default to 0')
    ap.add_argument('--evidence-refs', default='{}', help='JSON dict')
    ap.add_argument('--extra', default='{}', help='JSON dict of extra fields')
    ap.add_argument('--learn-brief', default='',
                    help='GAP 5: brief_id for a LEARN line (must start with learn-)')
    ap.add_argument('--sidecar', default='',
                    help='GAP 5: sidecar filename referenced by artifact_refs')
    ap.add_argument('--if-absent', action='store_true',
                    help='idempotent re-runs: skip the append when a line '
                         'with the same run_id is already in the ledger')
    ap.add_argument('--origin', default='outreach-engine',
                    choices=('outreach-engine', 'discovery-research'),
                    help='ledger origin: the execution engine, or the '
                         'discovery/research job (2026-09-23 split)')
    ap.add_argument('--ledger', default=LEDGER)
    a = ap.parse_args()

    try:
        counts = json.loads(a.counts)
        refs = json.loads(a.evidence_refs)
        extra = json.loads(a.extra)
    except json.JSONDecodeError as e:
        print('invalid JSON argument: %s' % e, file=sys.stderr)
        return 2
    for name, d in (('counts', counts), ('evidence-refs', refs), ('extra', extra)):
        if not isinstance(d, dict):
            print('%s must be a JSON object' % name, file=sys.stderr)
            return 2
    if 'brief_id' in extra:
        print('refusing: set brief_id via --learn-brief, not --extra', file=sys.stderr)
        return 2

    full_counts = {k: 0 for k in STAGE_KEYS}
    for k, v in counts.items():
        if k not in STAGE_KEYS:
            print('refusing: unknown stage %r (known: %s)' % (k, ','.join(STAGE_KEYS)),
                  file=sys.stderr)
            return 2
        if not isinstance(v, int) or v < 0:
            print('refusing: count %r must be a non-negative int' % k, file=sys.stderr)
            return 2
        full_counts[k] = v

    rec = {
        'origin': a.origin,
        'run_id': a.sweep_id,
        'sweep_id': a.sweep_id,
        'started_at': a.started_at,
        'ended_at': a.ended_at,
        'outcome': a.outcome,
        'classification': 'sweep_completed' if a.outcome == 'ok' else 'sweep_%s' % a.outcome,
        'counts': full_counts,
        'evidence_refs': refs,
    }
    if a.learn_brief:
        if not a.learn_brief.startswith('learn-'):
            print('refusing: learn brief_id must start with learn-', file=sys.stderr)
            return 2
        if not a.sidecar:
            print('refusing: --sidecar is required with --learn-brief', file=sys.stderr)
            return 2
        rec['brief_id'] = a.learn_brief
        rec['artifact_refs'] = {'sidecar': a.sidecar}
    rec.update(extra)

    os.makedirs(os.path.dirname(a.ledger), exist_ok=True)
    if a.if_absent:
        try:
            with open(a.ledger, encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        prior = json.loads(line)
                    except ValueError:
                        continue
                    if prior.get('run_id') == a.sweep_id:
                        print('already present (%s), not appending' % a.sweep_id)
                        return 0
        except FileNotFoundError:
            pass
    with open(a.ledger, 'a', encoding='utf-8') as f:
        f.write(json.dumps(rec, ensure_ascii=False) + '\n')
        f.flush()
        os.fsync(f.fileno())
    print('appended %s (outcome=%s) to %s' % (a.sweep_id, a.outcome, a.ledger))
    return 0


if __name__ == '__main__':
    sys.exit(main())
