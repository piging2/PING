cd /home/nolan/fyd-missions/shard-0 && SHARD_DUMP_HTML=/home/nolan/fyd-missions/shard-0/m30.html SHARD_DEBUG=1 node harness.cjs /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/dbg3.jsonl 30 31 /home/nolan/fyd-missions/shard-0/dbg3.log 2>/dev/null; python3 -c "
import json, re
r = json.loads(open('/home/nolan/fyd-missions/shard-0/dbg3.jsonl').read())
print(r['mission'], r['mutation'], r['fixture'])
h = open('/home/nolan/fyd-missions/shard-0/m30.html').read()
print('html bytes:', len(h))
print('sentinel in html:', 'TAMPERED CLAIM' in h)
print('claim labels present:', [l for l in ['Website statement','Site record','Mixed sources','Demo addition','Feed item'] if l in h])
# what IS in the html from the biz object?
m = re.findall(r'[A-Za-z ]{20,80}', h)
print('sample text chunks:', m[:8])
"
