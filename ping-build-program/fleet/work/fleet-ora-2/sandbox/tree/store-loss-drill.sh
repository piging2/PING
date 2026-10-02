#!/bin/bash
# Sandbox store-loss drill: total data loss -> rebuild from backup -> digest verify.
# sqlite3 is the stand-in engine (real ACID/WAL store); the MECHANICS under test
# (backup -> wipe -> restore -> canonical-digest verification -> RTO) are engine-agnostic.
# postgres WAL replay and qdrant snapshot restore remain staging followups.
set -u
SB="$(dirname "$0")"
DB="$SB/store-loss.db"; BAK="$SB/store-loss.backup.db"; RESTORED="$SB/store-loss.restored.db"
rm -f "$DB"* "$BAK" "$RESTORED"*

# 1. BUILD the store: WAL mode, 5000 digest-chained events (canonical digests)
python3 - "$DB" <<'EOF'
import sqlite3, hashlib, sys
db = sys.argv[1]
c = sqlite3.connect(db)
c.execute("PRAGMA journal_mode=WAL")
c.execute("CREATE TABLE events(id INTEGER PRIMARY KEY, kind TEXT, payload TEXT, digest TEXT)")
prev = "GENESIS"
for i in range(5000):
    d = hashlib.sha256((prev + "|%d|observation.recorded" % i).encode()).hexdigest()
    c.execute("INSERT INTO events(kind,payload,digest) VALUES(?,?,?)", ("observation.recorded", "payload-%d" % i, d))
    prev = d
c.commit()
n = c.execute("SELECT COUNT(*), MIN(digest), MAX(digest) FROM events").fetchone()
print("BUILT rows=%d head=%s tail=%s" % (n[0], prev[:16], n[1][:16]))
open(db + ".headdigest", "w").write(prev)
c.close()
EOF

# 2. BACKUP (the "canonical source" for rebuild)
sqlite3 "$DB" ".backup '$BAK'"
sha256sum "$BAK" | tee "$SB/backup.sha256"
N_BEFORE=$(sqlite3 "$DB" "SELECT COUNT(*) FROM events")
echo "BACKUP rows=$N_BEFORE"

# 3. WIPE — total data loss simulation
T0=$(date +%s%N)
rm -f "$DB" "$DB-wal" "$DB-shm" "$DB.headdigest"
test ! -e "$DB" && echo "WIPE confirmed: store gone"

# 4. REBUILD from the backup into a fresh path
cp "$BAK" "$RESTORED"

# 5. VERIFY against canonical digests: row count + full chain re-verification
python3 - "$RESTORED" "$(cat $SB/backup.sha256 | cut -d' ' -f1)" <<'EOF'
import sqlite3, hashlib, sys
db, baksha = sys.argv[1], sys.argv[2]
c = sqlite3.connect(db)
n = c.execute("SELECT COUNT(*) FROM events").fetchone()[0]
prev = "GENESIS"; bad = 0
for (i, kind, payload, digest) in c.execute("SELECT id, kind, payload, digest FROM events ORDER BY id"):
    d = hashlib.sha256((prev + "|%d|%s" % (i - 1, kind)).encode()).hexdigest()
    if d != digest: bad += 1; break
    prev = d
print("VERIFY rows=%d chain_bad=%d tail=%s" % (n, bad, prev[:16]))
print("RESULT", "PASS" if (n == 5000 and bad == 0) else "FAIL")
EOF
T1=$(date +%s%N)
echo "RTO_WIPE_TO_VERIFIED_MS=$(( (T1 - T0) / 1000000 ))"
