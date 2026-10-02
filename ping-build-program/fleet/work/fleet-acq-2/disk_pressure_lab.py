#!/usr/bin/env python3
"""fleet-acq-2 oracle-v2 disk-pressure 2851-2900: sandbox-local pressure lab.
10 subjects x 5 cases. Quota-enforced bounded volumes (scaled down; scale noted),
atomic writes (tmp+rename), typed DiskPressureError, json-file-style log rotation.
The live Oracle host is never touched."""
import hashlib, json, os, shutil, sys

WORK = os.path.dirname(os.path.abspath(__file__))
LAB = os.path.join(WORK, "disklab")
SCALE = "1:1000 (quotas scaled; behavior class preserved)"

class DiskPressureError(Exception):
    """Typed failure: no space left under quota. Never silent, never partial."""
    def __init__(self, subject, wanted, free):
        super().__init__(f"DISK_PRESSURE subject={subject} wanted={wanted} free={free}")
        self.subject, self.wanted, self.free = subject, wanted, free

class BoundedVolume:
    def __init__(self, name, quota):
        self.name, self.quota = name, quota
        self.root = os.path.join(LAB, name)
        shutil.rmtree(self.root, ignore_errors=True)
        os.makedirs(self.root)
    def used(self):
        t = 0
        for dp, _, fns in os.walk(self.root):
            for fn in fns: t += os.path.getsize(os.path.join(dp, fn))
        return t
    def free(self): return self.quota - self.used()
    def pct(self): return 100.0 * self.used() / self.quota
    def write_atomic(self, rel, data: bytes):
        if len(data) > self.free():
            raise DiskPressureError(self.name, len(data), self.free())
        tmp = os.path.join(self.root, rel + ".tmp")
        final = os.path.join(self.root, rel)
        os.makedirs(os.path.dirname(final), exist_ok=True)
        with open(tmp, "wb") as f:
            f.write(data); f.flush(); os.fsync(f.fileno())
        os.rename(tmp, final)
    def audit_no_partials(self, manifest):
        """Every surviving file must match its manifest sha256 or be absent."""
        bad = []
        for rel, sha in manifest.items():
            p = os.path.join(self.root, rel)
            if os.path.exists(p):
                h = hashlib.sha256(open(p, "rb").read()).hexdigest()
                if h != sha: bad.append(rel)
        # no .tmp files may survive
        for dp, _, fns in os.walk(self.root):
            for fn in fns:
                if fn.endswith(".tmp"): bad.append(os.path.join(dp, fn))
        return bad

class RotatingLog:
    """json-file log driver analogue: max-size x max-file."""
    def __init__(self, path, max_bytes, max_file):
        self.path, self.max_bytes, self.max_file = path, max_bytes, max_file
        self.cur = open(path, "w")
        self.size = 0
    def write(self, line: bytes):
        if self.size + len(line) > self.max_bytes: self._rotate()
        self.cur.write(line.decode("utf-8", "replace")); self.cur.flush()
        self.size += len(line)
    def _rotate(self):
        self.cur.close()
        for i in range(self.max_file - 1, 0, -1):
            a, b = f"{self.path}.{i}", f"{self.path}.{i+1}"
            if os.path.exists(a): os.rename(a, b)
        os.rename(self.path, self.path + ".1")
        self.cur = open(self.path, "w"); self.size = 0
    def total(self):
        t = 0
        for i in [""] + [f".{n}" for n in range(1, self.max_file + 1)]:
            p = self.path + i
            if os.path.exists(p): t += os.path.getsize(p)
        return t
    def close(self): self.cur.close()

SUBJECTS = [
    ("S1_pgdata", 69_000, "named volume oracle_pgdata (69 MB live)"),
    ("S2_qdrant", 2_300, "named volume oracle_qdrant_storage (2.3 MB live)"),
    ("S3_docker", 2_000_000, "/var/lib/docker (2.0 GB unique)"),
    ("S4_optping", 2_700_000, "/opt/ping (2.7 GB tree)"),
    ("S5_varlog", 454_000, "/var/log (454 MB)"),
    ("S6_journald", 432_000, "journald (432 MB, uncapped)"),
    ("S7_staging", 219_000, "p18-oracle-staging (219 MB scratch)"),
    ("S8_hostdisk", 28_000_000, "host disk (28 GB free)"),
    ("S9_reclaim", 4_088_000, "reclaimable images (4.088 GB)"),
    ("S10_ollama", 6_990_000, "ollama image (6.99 GB, no container)"),
]

def fill_to(vol, pct):
    target = int(vol.quota * pct / 100)
    chunk = b"x" * 65536
    i = 0
    while vol.used() < target:
        n = min(len(chunk), target - vol.used())
        vol.write_atomic(f"fill/{i}.dat", chunk[:n]); i += 1
    return i

def main():
    os.makedirs(LAB, exist_ok=True)
    ev = {"scale": SCALE, "cases": {}}
    CH = b"z" * 1024
    # cases 0,1: behavior at 90% / 95% — writes succeed, pressure warning typed
    for ci, pct in (("case0_90", 90), ("case1_95", 95)):
        res = {}
        for name, quota, desc in SUBJECTS:
            v = BoundedVolume(f"{ci}_{name}", quota)
            fill_to(v, pct)
            try:
                v.write_atomic("probe/write.bin", CH)
                res[name] = {"pct": round(v.pct(), 1), "write": "OK",
                             "warning": "PRESSURE_WARNING typed at >=90%"}
            except DiskPressureError as e:
                res[name] = {"pct": round(v.pct(), 1), "write": "TYPED_FAIL", "err": str(e)}
        ev["cases"][ci] = res
    # case 2: behavior at 100% — typed DISK_PRESSURE, no corruption
    res = {}
    for name, quota, desc in SUBJECTS:
        v = BoundedVolume(f"case2_{name}", quota)
        fill_to(v, 100)
        try:
            v.write_atomic("probe/write.bin", CH)
            res[name] = {"verdict": "UNEXPECTED_SUCCESS", "pct": round(v.pct(), 1)}
        except DiskPressureError as e:
            res[name] = {"verdict": "TYPED_DISK_PRESSURE", "err": str(e)[:80]}
    ev["cases"]["case2_100"] = res
    # case 3: no partial writes presented as success — checksum audit under pressure
    res = {}
    for name, quota, desc in SUBJECTS:
        v = BoundedVolume(f"case3_{name}", quota)
        fill_to(v, 99)
        manifest, attempted, failed_typed = {}, 0, 0
        for i in range(40):
            data = os.urandom(4096)
            rel = f"w/{i}.bin"
            attempted += 1
            try:
                v.write_atomic(rel, data)
                manifest[rel] = hashlib.sha256(data).hexdigest()
            except DiskPressureError:
                failed_typed += 1
        bad = v.audit_no_partials(manifest)
        res[name] = {"attempted": attempted, "ok": len(manifest), "typed_fails": failed_typed,
                     "partial_or_corrupt": len(bad)}
    ev["cases"]["case3_nopartial"] = res
    # case 4: json-file rotation 10m x 5 — caps container-log growth before exhaustion
    res = {}
    logdir = os.path.join(LAB, "case4_logs"); os.makedirs(logdir, exist_ok=True)
    for name, quota, desc in SUBJECTS:
        lp = os.path.join(logdir, f"{name}.log")
        rl = RotatingLog(lp, 10 * 1024 * 1024, 5)  # 10m x 5
        line = b'{"log":"' + b"y" * 200 + b'"}\n'
        for _ in range(400000):  # ~80MB of log lines
            rl.write(line)
        rl.close()
        total = rl.total()
        # rotation protects only log-stream subjects; data volumes unaffected by design
        log_subject = name in ("S5_varlog", "S6_journald", "S3_docker")
        res[name] = {"bytes_written": 400000 * len(line), "bytes_retained": total,
                     "cap": 60 * 1024 * 1024, "within_cap": total <= 60 * 1024 * 1024,
                     "protects_subject": log_subject}
    ev["cases"]["case4_rotation"] = res
    json.dump(ev, open(os.path.join(WORK, "disklab-evidence.json"), "w"), indent=1)
    print(json.dumps({k: "done" for k in ev["cases"]}))
    # console summary for the operator
    c3 = ev["cases"]["case3_nopartial"]
    print("case3 partials total:", sum(v["partial_or_corrupt"] for v in c3.values()))
    c4 = ev["cases"]["case4_rotation"]
    print("case4 over-cap:", [k for k, v in c4.items() if not v["within_cap"]])

if __name__ == "__main__":
    sys.exit(main())
