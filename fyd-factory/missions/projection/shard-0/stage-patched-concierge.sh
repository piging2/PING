#!/bin/bash
set -e
# Stage a patched copy of concierge.ts for fix verification (repo untouched).
mkdir -p /home/nolan/fyd-projection-harness/fyd/ask /home/nolan/fyd-projection-harness/lib/ping
cp /home/nolan/projects/ping/src/fyd/ask/concierge.ts /home/nolan/fyd-projection-harness/fyd/ask/concierge.ts
ln -sf /home/nolan/projects/ping/src/lib/ping/types.ts /home/nolan/fyd-projection-harness/lib/ping/types.ts
cd /home/nolan/fyd-projection-harness
git apply --check /tmp/concierge.patch --directory=/home/nolan/fyd-projection-harness 2>/dev/null || echo "(prefix differs, applying manually)"
# manual targeted edit mirroring the validated patch
python3 - <<'EOF'
p='/home/nolan/fyd-projection-harness/fyd/ask/concierge.ts'
t=open(p).read()
old='''function buildGraphView(target: PingObject, objects: PingObject[], relationships: PingRelationship[]): GraphView {
  const byId = new Map(objects.map((o) => [o.id, o]));'''
new='''function buildGraphView(target: PingObject, objects: PingObject[], relationships: PingRelationship[]): GraphView {
  const visible = objects.filter((o) => o.visibility === "public");
  const byId = new Map(visible.map((o) => [o.id, o]));'''
assert old in t, "anchor not found"
open(p,'w').write(t.replace(old,new))
print("patched copy written")
EOF
diff /home/nolan/projects/ping/src/fyd/ask/concierge.ts /home/nolan/fyd-projection-harness/fyd/ask/concierge.ts
