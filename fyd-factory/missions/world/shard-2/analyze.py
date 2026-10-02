import json, collections, statistics

rows = [json.loads(l) for l in open('/home/hatch/workspace/fyd-factory/missions/world/shard-2/results.jsonl')]
assert len(rows) == 500, len(rows)

print("=== OUTCOME DISTRIBUTION ===")
for o, c in collections.Counter(r['outcome'] for r in rows).most_common():
    print(f"{o}: {c}")

print("\n=== BY HOSTILE x OUTCOME ===")
t = collections.Counter((r['world']['hostile'], r['outcome']) for r in rows)
for k in sorted(t): print(k, t[k])

print("\n=== FAILURE TAXONOMY (outcome, stage, note-signature) ===")
tax = collections.Counter()
for r in rows:
    if r['outcome'] not in ('GENERATED', 'GENERATED_WITH_WARNINGS'):
        sig = (r['failure_note'] or '')[:60]
        tax[(r['outcome'], r['failure_stage'], sig)] += 1
for k, c in tax.most_common(): print(c, k)

print("\n=== TOTAL LATENCY ms ===")
tots = sorted(r['total_ms'] for r in rows)
def pct(p): return tots[int(p/100*len(tots))]
print(f"p50={pct(50):.2f} p95={pct(95):.2f} max={max(tots):.2f}")

print("\n=== STAGE LATENCY p50/p95 ms ===")
stages = ['source','observation','evidence','objects','relationships','owner_intent','sitespec','projection','render','verify']
for s in stages:
    vals = sorted(r['stage_latencies_ms'].get(s, 0) for r in rows if s in r['stage_latencies_ms'])
    if vals:
        print(f"{s}: n={len(vals)} p50={vals[int(.5*len(vals))]:.3f} p95={vals[int(.95*len(vals))]:.3f} max={max(vals):.2f}")

print("\n=== WARNING FREQUENCY (top) ===")
wc = collections.Counter()
for r in rows:
    for w in r['warnings']:
        key = w.split(':')[0]
        wc[key] += 1
for k, c in wc.most_common(12): print(c, k)

print("\n=== UNBOUND CLAIM SECTIONS (top section ids) ===")
sc = collections.Counter()
for r in rows:
    for w in r['warnings']:
        if w.startswith('unbound-claim: section '):
            sid = w.split(' ')[2]
            sc[sid] += 1
for k, c in sc.most_common(10): print(c, k)

print("\n=== COUNTS (generated only) ===")
gen = [r for r in rows if r['outcome'] in ('GENERATED','GENERATED_WITH_WARNINGS')]
print("sections p50:", statistics.median(r['section_count'] for r in gen),
      "objects p50:", statistics.median(r['object_count'] for r in gen),
      "pages:", collections.Counter(r['page_count'] for r in gen))
print("unsafe_url_count total:", sum(r['unsafe_url_count'] for r in rows))
print("unbound_claim_count total:", sum(r['unbound_claim_count'] for r in rows))
print("GENERATED (clean):", sum(1 for r in gen if r['outcome']=='GENERATED'))
