#!/bin/bash
# ig-nearmiss-followup.sh -- experiment: run the documented near-miss follow-up
# (instagram-cli user-profile + posts) on the 49 09-24 near-miss handles.
# Evidence of the DOM firstPost false negative.
set -u
ACCT=17841400771094478
OUT="$HOME/workspace/goals/ping-social-outreach-campaign/hidden_files/ig-nearmiss-raw-2026-09-24"
mkdir -p "$OUT/profiles" "$OUT/posts"
HANDLES="$1"
n=0
while IFS= read -r h; do
  h="$(echo "$h" | tr -d ' \r')"
  [ -z "$h" ] && continue
  n=$((n+1))
  echo "[$n] $h"
  if [ ! -f "$OUT/profiles/$h.json" ]; then
    instagram-cli user-profile --account-id "$ACCT" --username "$h" > "$OUT/profiles/$h.json" 2>"$OUT/profiles/$h.err" || echo "PROFILE_FAIL $h" >> "$OUT/failures.log"
    sleep 3
  fi
  if [ ! -f "$OUT/posts/$h.json" ]; then
    instagram-cli posts --account-id "$ACCT" --username "$h" --limit 1 > "$OUT/posts/$h.json" 2>"$OUT/posts/$h.err" || echo "POSTS_FAIL $h" >> "$OUT/failures.log"
    sleep 3
  fi
done < "$HANDLES"
echo "DONE n=$n"
