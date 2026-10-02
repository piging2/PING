#!/bin/bash
# dedupe check: exact-name, normalized substring, phone-fragment grep
NAME="$1"; PHONE="$2"
norm() { echo "$1" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9 '; }
for f in ~/workspace/outreach/leads.md ~/workspace/outreach/pipeline.md ~/workspace/outreach/facebook-dms.md ~/workspace/your_files/western-co-prospects.jsonl; do
  if grep -qiF "$NAME" "$f"; then echo "HIT(exact) in $(basename $f)"; fi
done
N=$(norm "$NAME"); W1=$(echo "$N" | awk '{print $1}'); W2=$(echo "$N" | awk '{print $2}')
if [ -n "$W1" ] && [ -n "$W2" ]; then
  for f in ~/workspace/outreach/leads.md ~/workspace/outreach/pipeline.md ~/workspace/outreach/facebook-dms.md ~/workspace/your_files/western-co-prospects.jsonl; do
    if grep -qiE "${W1}.*${W2}|${W2}.*${W1}" "$f"; then echo "HIT(norm) in $(basename $f)"; fi
  done
fi
if [ -n "$PHONE" ]; then
  FRAG=$(echo "$PHONE" | tr -cd '0-9' | tail -c 8)
  for f in ~/workspace/outreach/leads.md ~/workspace/outreach/pipeline.md ~/workspace/outreach/facebook-dms.md ~/workspace/your_files/western-co-prospects.jsonl; do
    if grep -q "$FRAG" "$f"; then echo "HIT(phone-frag $FRAG) in $(basename $f)"; fi
  done
fi
echo "dedupe done for: $NAME"
