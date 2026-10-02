cd /home/nolan/fyd-missions/shard-0 && SHARD_DUMP_HTML=/home/nolan/fyd-missions/shard-0/m38.html node harness.cjs /home/nolan/fyd-missions/shard-0/fixtures /home/nolan/fyd-missions/shard-0/dbg5.jsonl 38 39 /home/nolan/fyd-missions/shard-0/dbg5.log 2>/dev/null; python3 -c "
import json, re
h = open('/home/nolan/fyd-missions/shard-0/m38.html').read()
i = h.find('UNVERIFIED CLAIM')
print('context:', h[max(0,i-600):i+200].replace(chr(10),' '))
"
