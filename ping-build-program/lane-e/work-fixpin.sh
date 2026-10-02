#!/bin/bash
set -u
cd /home/nolan/projects/ping || exit 1
python3 - <<'PYEOF'
p = "src/fyd/sitespec/__tests__/schemas.test.ts"
s = open(p).read()
old = '''    expect(eligibleComponents("ping.social.business@1")).toEqual([
      "Hero",
      "IdentityCard",
      "BusinessSummary",
      "ObjectGrid",
      "ObjectFeed",
      "RecentObjects",'''
new = '''    // Note: ObjectFeed is deliberately absent for business (converged
    // 2026-09-23): the registry's ObjectFeed accepts post/article/service/
    // website only. The deleted hand table's business->ObjectFeed entry was
    // the same class of stale drift as the four omissions fixed here.
    expect(eligibleComponents("ping.social.business@1")).toEqual([
      "Hero",
      "IdentityCard",
      "BusinessSummary",
      "ObjectGrid",
      "RecentObjects",'''
assert old in s, "business pin anchor missing"
s = s.replace(old, new, 1)
open(p, "w").write(s)
print("test pin fixed")
PYEOF
echo "=== rerun full verification ==="
npx tsx /tmp/lane-e-verify.ts 2>&1 | tail -12
