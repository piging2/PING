#!/bin/bash
cd /home/nolan/projects/ping
python3 - <<'PYEOF'
import hashlib, subprocess, os
REPO = "/home/nolan/projects/ping"
rel = "src/fyd/components/object-rail.tsx"
full = os.path.join(REPO, rel)
orig = open(full, "rb").read()
before = hashlib.md5(orig).hexdigest()
text = orig.decode("utf-8")
old = '''  const autoCss =
    "@media (max-width: " + (bp - 1) + "px){.fyd-rail-auto-rail{display:none!important}}" +
    "@media (min-width: " + bp + "px){.fyd-rail-auto-trigger{display:none!important}}";'''
new = old + ''' +
    // ISSUE-2: below the breakpoint the trigger is in-flow, never fixed. The
    // fixed 153px pill occluded section headings at 320px (48% of viewport).
    "@media (max-width: " +
    (bp - 1) +
    "px){.fyd-rail-auto-trigger .fyd-rail-auto-trigger-btn{position:static!important;margin:0.75rem auto 0}}";'''
assert text.count(old) == 1, "count=%d" % text.count(old)
open(full, "w").write(text.replace(old, new))
diff = subprocess.run(["git", "diff", "--", rel], capture_output=True, text=True, cwd=REPO).stdout
open(full, "wb").write(orig)
assert hashlib.md5(open(full,'rb').read()).hexdigest() == before, "restore mismatch"
open("/tmp/or-test.patch", "w").write(diff)
print("generated diff:")
print(diff)
PYEOF
echo "=== check git-generated patch ==="
git apply --check --verbose /tmp/or-test.patch 2>&1; echo "exit: $?"
echo "=== byte-compare with hand-written hunk ==="
git diff --no-index /dev/null /dev/null >/dev/null 2>&1
sed -n '/@@ -171,3/,/^ /p' ~/workspace/fyd-factory/patches/m-issue-2-fab-inflow-mobile.patch | head -12 | cat -A | head -14
