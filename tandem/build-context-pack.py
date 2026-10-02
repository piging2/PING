#!/usr/bin/env python3
"""Build a minimal, versioned research context pack for Meta AI delegation.

Retrieves authoritative context from existing files (never recreates from memory):
  mission/positioning <- ~/workspace/outreach/pitch.md
  geography           <- ~/AGENTS.md (targeting line)
  coverage (negatives)<- ~/workspace/your_files/western-co-prospects.jsonl (brief-aware)
                         + ~/workspace/outreach/pipeline.md staged rows (any status)
                           carrying the brief's source/intel markers (brief-aware)
Packs it into the compact structure Nolan specified, versions it by content hash,
and caches. Prints the pack file path. Usage: build-context-pack.py <brief-slug>
"""
import hashlib, json, os, re, sys

HOME = os.path.expanduser('~')
WS = os.path.join(HOME, 'workspace')
TANDEM = os.path.join(WS, 'tandem')
CACHE = os.path.join(TANDEM, '.pack-cache')
os.makedirs(CACHE, exist_ok=True)

BRIEF_TITLES = {
    'a-weak-website-hunt': 'Weak-website hunt',
    'b-new-business-radar': 'New-business radar',
    'c-review-complaint-signals': 'Review/complaint signals',
    'd-segment-deep-dive': 'Trade-segment deep dive',
    'h-marketing-intelligence': 'Marketing intelligence sweep',
}

def read(p):
    try:
        with open(p, encoding='utf-8', errors='replace') as f:
            return f.read()
    except FileNotFoundError:
        return ''

def mission():
    txt = read(os.path.join(WS, 'outreach/pitch.md'))
    m = re.search(r'## Positioning.*?\n(.*?)## ', txt, re.S)
    lines = []
    if m:
        for ln in m.group(1).splitlines():
            ln = ln.strip()
            if ln.startswith('-'):
                ln = re.sub(r'\*\*', '', ln[1:].strip())
                if 'em dash' not in ln.lower() and 'Copy posture' not in ln:
                    lines.append(ln)
    return '\n'.join('- ' + l for l in lines[:8])

def geography():
    txt = read(os.path.join(HOME, 'AGENTS.md'))
    m = re.search(r'Targeting \(2026-09-09.*?\((.*?)\)', txt)
    if m:
        return m.group(1)
    return 'Grand Junction, Fruita, Palisade, Montrose, Delta, Durango and surrounding Western Colorado towns'

# Negative-signal derivation lives in covered_names.py (shared with the
# contract validator). Self-audit 2026-09-24 invariant: the names shown
# here as "do not return" must be exactly the names the validator
# rejects as duplicates.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from covered_names import merged_covered_names, format_for_pack

CONTRACT = """## Verification rules
- Every business you name must be real and verifiable right now (own website, Google Business Profile, or Facebook page).
- Never invent a business, address, phone number, review, ranking, or software claim.
- Distinguish what you directly observed from what you inferred. If you did not verify something, say so.

## Output schema
Numbered list. Each item: business name, town, trade, website URL (or "no website found"), one concrete observable weakness or signal, and one short phrase saying how you verified it exists. End with 2-3 sentences on what remains uncertain.

## PING boundary
Your output is UNVERIFIED EXTERNAL RESEARCH, not fact. It goes through independent verification before anything enters PING's canonical records. Do not state inferences as facts."""

def main():
    slug = sys.argv[1] if len(sys.argv) > 1 else 'a-weak-website-hunt'
    title = BRIEF_TITLES.get(slug, slug)
    mis, geo = mission(), geography()
    covered = format_for_pack(merged_covered_names(slug))
    digest = read(os.path.join(WS, 'your_files/prospect-digest.md')).splitlines()
    counts = next((l for l in digest if 'businesses tracked' in l), '').strip('# ').strip()

    neg = (f"Already in our pipeline, DO NOT return these ({len(covered)} shown): "
           + '; '.join(covered)) if covered else 'No prior coverage for this brief yet.'

    pack = f"""# Research context pack for Meta AI ({title})

## Mission
{mis}

## Geography (strict priority)
{geo}. Western Colorado first; expand outward only when the pool is exhausted.

## Target
Blue-collar home-service trade businesses (plumbing, HVAC, electrical, roofing, landscaping, garage door, pest control, concrete, fence, snow removal, carpet cleaning, well/pump, septic, chimney, appliance repair). Ideal: owner-operator or small crew (1-15 people) where missed calls, slow follow-up, scheduling friction, or admin overload cost real jobs. Very non-technical owners with weak websites are prime website-revamp candidates.

## Signals (strong opportunity)
Weak or no website; no online booking or quote form; unclaimed/thin Google Business Profile; few or stale reviews; unanswered bad reviews; phone-only contact; business opened in the last 60-90 days; recent 1-2 star reviews mentioning phone/response/wait/scheduling.

## Negative signals
{neg}
Pipeline state: {counts}. Do not return duplicates of the above.

{CONTRACT}
"""
    version = hashlib.sha1(pack.encode()).hexdigest()[:10]
    path = os.path.join(CACHE, f'{slug}-{version}.md')
    if not os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            f.write(pack)
    # print path and version for the caller
    print(path)
    print(f'PACK_VERSION={version}', file=sys.stderr)

if __name__ == '__main__':
    main()
