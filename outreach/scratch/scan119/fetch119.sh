#!/bin/bash
# scan119 fetch: paginate NEW_POSTS until oldest post on page < watermark or no cursor
WM=1790118882
GROUPS="5456977881034408 108728816001912 1504277980997243 486356801008208 3741333852807065 1082777608577867"
for G in $GROUPS; do
  OUTF=~/workspace/outreach/scratch/scan119/scan119-$G.json
  ERRF=~/workspace/outreach/scratch/scan119/scan119-$G.err
  : > "$OUTF"; : > "$ERRF"
  AFTER=""
  PAGE=1
  while true; do
    TMP=$(mktemp)
    if [ -z "$AFTER" ]; then
      facebook-cli groups posts --group-id "$G" --sort-by NEW_POSTS --limit 20 --min-timestamp "$WM" > "$TMP" 2>> "$ERRF"
    else
      facebook-cli groups posts --group-id "$G" --sort-by NEW_POSTS --limit 20 --min-timestamp "$WM" --after "$AFTER" > "$TMP" 2>> "$ERRF"
    fi
    if [ "$PAGE" -eq 1 ]; then cp "$TMP" "$OUTF"; else
      python3 - "$OUTF" "$TMP" << 'PYEOF'
import json,sys
base=json.load(open(sys.argv[1])); new=json.load(open(sys.argv[2]))
base['data'].extend(new['data'])
base['paging']=new.get('paging',{})
json.dump(base,open(sys.argv[1],'w'))
PYEOF
    fi
    RES=$(python3 - "$TMP" "$WM" << 'PYEOF'
import json,sys
d=json.load(open(sys.argv[1])); wm=int(sys.argv[2])
posts=d.get('data',[])
after=((d.get('paging') or {}).get('cursors') or {}).get('after')
oldest=min([p['creation_time'] for p in posts]) if posts else 0
print("%d|%d|%s" % (len(posts), oldest, after or 'NONE'))
PYEOF
)
    echo "$G page$PAGE: $RES" >> "$ERRF"
    COUNT=$(echo "$RES"|cut -d'|' -f1); OLDEST=$(echo "$RES"|cut -d'|' -f2); AFTER=$(echo "$RES"|cut -d'|' -f3)
    rm -f "$TMP"
    if [ "$AFTER" = "NONE" ] || [ "$COUNT" -eq 0 ] || [ "$OLDEST" -lt "$WM" ]; then break; fi
    PAGE=$((PAGE+1))
    sleep 2
  done
done
echo DONE
