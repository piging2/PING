#!/usr/bin/env python3
# enrich-cohort2.py: add cohort-2 requested metrics to each acquisition JSON,
# derived deterministically from the JSON's own pipeline output + fetch signals.
# Preserves the wave-1 schema; only adds fields.
import json, glob, copy

PLATFORMS = {
    'tt-hvac': 'wix', 'mountain-air-roasters': 'wix', 'bistro-317': 'wix', 'pantuso': 'wix',
    'carrie-johnson-photo': 'squarespace', 'fanclubbrands': 'squarespace',
    'klik-boutique': 'shopify', 'inspired-expressions': 'square-online',
    'geodav-tech': 'gridsome-vue-ssg', 'stellas': 'spothopper',
    'mj-thomas-photo': 'wordpress', 'legacy-coffee': 'wordpress-custom-cms', 'hog-and-hen': 'wordpress',
    'snooks-bbq': 'unknown-bot-walled', 'copeka-coffee': 'squarespace-robots-blocked',
}

def loss_rate(m):
    un = m.get('unsupported_count', 0) or 0
    mapped = (m.get('facts_by_source') or {}).get('json-ld', 0) or 0
    denom = mapped + un
    return round(un / denom, 4) if denom else 0.0

for f in sorted(glob.glob('acquisitions/*.json')):
    d = json.load(open(f))
    sid = d['site_id']
    m = d['metrics']
    g = d.get('graph') or {}
    facts = g.get('facts') or []
    body = sum(1 for x in facts if x.get('provenance') == 'dom-body-text')
    total = m.get('facts_discovered', 0) or 0
    m['platform_identified'] = PLATFORMS.get(sid, 'unknown')
    m['platform_evidence'] = {
        'platform_guess': d.get('platform_guess'),
        'generator_meta': (d.get('provenance') or {}).get('generator_meta'),
        'platform_signals': (d.get('provenance') or {}).get('platform_signals'),
    }
    m['body_text_facts'] = body
    m['body_text_fact_yield'] = round(body / total, 4) if total else 0.0
    m['jsonld_fact_count'] = (m.get('facts_by_source') or {}).get('json-ld', 0) or 0
    m['schema_mapping_loss_rate'] = loss_rate(m)
    m['schema_mapping_loss_note'] = (
        'event-level approximation: unmapped-property events / '
        '(mapped JSON-LD facts + unmapped-property events); the runner keeps '
        'only per-kind counts, not the full literal-property denominator'
    )
    json.dump(d, open(f, 'w'), indent=1)
    print(f"enriched {sid}: body={body} loss={m['schema_mapping_loss_rate']} plat={m['platform_identified']}")
print('ENRICH-DONE')
