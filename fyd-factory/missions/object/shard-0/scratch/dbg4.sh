cd /home/nolan/fyd-missions/shard-0 && SHARD_DUMP_HTML=/home/nolan/fyd-missions/shard-0/m30b.html SHARD_DEBUG=1 node harness.cjs /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/dbg4.jsonl 30 31 /home/nolan/fyd-missions/shard-0/dbg4.log 2>/dev/null; python3 -c "
import json
r = json.loads(open('/home/nolan/fyd-missions/shard-0/dbg4.jsonl').read())
print(r['mission'], r['mutation'], r['fixture'], r['outcome'])
print('sentinel_rendered:', r['sentinel_rendered'], 'unbound:', r['unbound_claim_count'])
h = open('/home/nolan/fyd-missions/shard-0/m30b.html').read()
print('TAMPERED in html:', 'TAMPERED CLAIM' in h)
print('labels:', [l for l in ['Website statement','Site record','Mixed sources','Demo addition','Feed item'] if l in h])
"
