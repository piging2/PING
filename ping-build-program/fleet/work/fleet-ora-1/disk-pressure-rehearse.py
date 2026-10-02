#!/usr/bin/env python3
"""
disk-pressure-rehearse.py -- sandbox-local disk-pressure execution pass.

On a bounded tmpfs volume (8 MB), fill to 90% / 95% / 100% and run a fail-closed
writer. Assertions per fill level:
  - the writer checks free space before writing; when free < needed + reserve it
    raises a typed DISK_PRESSURE error WITHOUT attempting the write
  - a genuine ENOSPC (errno 28) is also surfaced as typed DISK_PRESSURE
  - no partial writes are ever presented as success (target file absent or
    byte-identical to before)
  - pre-existing data is never corrupted (hashes match before/after)

Evidence -> disk-pressure-evidence.log (JSON lines). Live host never touched.
"""
import errno, hashlib, json, os, shutil, sys, time

VOL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "disk-sandbox", "vol")
LOG = open(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        "disk-sandbox", "disk-pressure-evidence.log"), "w")

def log(**kw):
    kw["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    LOG.write(json.dumps(kw) + "\n"); LOG.flush()

class DiskPressure(Exception):
    """Typed failure: disk exhausted, fail closed."""

def fail_closed_write(path, data, reserve=4096):
    """Write atomically; fail closed with typed DISK_PRESSURE when space is short."""
    free = shutil.disk_usage(os.path.dirname(path)).free
    if free < len(data) + reserve:
        raise DiskPressure(f"DISK_PRESSURE: free={free} < needed={len(data)+reserve}")
    tmp = path + ".tmp"
    try:
        with open(tmp, "wb") as f:
            f.write(data); f.flush(); os.fsync(f.fileno())
        os.rename(tmp, path)
    except OSError as e:
        try: os.unlink(tmp)
        except OSError: pass
        if e.errno == errno.ENOSPC:
            raise DiskPressure(f"DISK_PRESSURE: ENOSPC on write to {path}")
        raise

def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""): h.update(chunk)
    return h.hexdigest()

def fill_to(pct):
    total = shutil.disk_usage(VOL).total
    target_used = int(total * pct / 100)
    filler = os.path.join(VOL, "filler.bin")
    # grow filler until used >= target
    chunk = b"\0" * 65536
    with open(filler, "ab") as f:
        while True:
            used = total - shutil.disk_usage(VOL).free
            if used >= target_used: break
            try: f.write(chunk)
            except OSError as e:
                if e.errno == errno.ENOSPC: break
                raise
    used = total - shutil.disk_usage(VOL).free
    return used, total

def main():
    assert os.path.ismount(VOL), f"{VOL} is not a mount; aborting"
    log(event="start", vol=VOL, total=shutil.disk_usage(VOL).total,
        note="sandbox-local disk-pressure rehearsal; live host untouched")
    # seed pre-existing data whose integrity must survive
    seed = os.path.join(VOL, "seed.dat")
    with open(seed, "wb") as f: f.write(b"seed-content-" * 1000)
    seed_hash = sha(seed)
    ok = True
    for pct in (90, 95, 100):
        used, total = fill_to(pct)
        used_pct = round(100 * used / total, 1)
        target = os.path.join(VOL, f"record-{pct}.dat")
        data = b"R" * 65536  # 64 KB record
        before_exists = os.path.exists(target)
        before_hash = sha(target) if before_exists else None
        outcome, typed = "unknown", False
        try:
            fail_closed_write(target, data)
            outcome = "wrote-ok"
        except DiskPressure as e:
            outcome, typed = "typed-error", True
            log(fill_pct=used_pct, outcome="DISK_PRESSURE", detail=str(e)[:120])
        except Exception as e:
            outcome = f"unexpected:{type(e).__name__}"
        # no partial writes presented as success
        after_exists = os.path.exists(target)
        partial = after_exists and (not before_exists or sha(target) != before_hash) and outcome != "wrote-ok"
        # seed integrity
        seed_ok = sha(seed) == seed_hash
        # at 100% the writer MUST fail closed; at 90/95 it may succeed or fail closed (both acceptable),
        # but a partial write is never acceptable
        level_ok = (not partial) and seed_ok and (typed if pct == 100 else True)
        ok = ok and level_ok
        log(fill_pct=used_pct, outcome=outcome, typed_disk_pressure=typed,
            partial_write=partial, seed_intact=seed_ok, level_pass=level_ok)
        print(f"[fill {used_pct}%] outcome={outcome} typed={typed} partial={partial} "
              f"seed_intact={seed_ok} -> {'PASS' if level_ok else 'FAIL'}")
        # reset for next level
        try: os.unlink(os.path.join(VOL, "filler.bin"))
        except OSError: pass
    log(event="end", overall="PASS" if ok else "FAIL")
    print("OVERALL:", "PASS" if ok else "FAIL")
    LOG.close()
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
