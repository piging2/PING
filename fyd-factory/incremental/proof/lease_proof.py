#!/usr/bin/env python3
"""
LANE-INCREMENTAL proof harness (part 2): deterministic work identity.
Ten workers request the same acquisition -> exactly one does the work,
the other nine join the result. No duplicate canonical side effects.

Mechanism (file-lease coordinator, the design in INCREMENTAL-SPEC.md):
  workId      = sha256(canonical(acquisitionRequest))  (deterministic)
  lease       = atomic mkdir(leases/<workId>); owner token + TTL + fencing token
  winner      = performs work once, atomic-publishes result.json, appends ONE
                journal line (the canonical side effect)
  joiners     = poll for result.json, verify digest, return it
  crash path  = expired lease is stolen with a higher fencing token; stale
                holder appends carrying an old fencing token are rejected
"""
import json, hashlib, os, shutil, threading, time, uuid

SCRATCH = os.path.expanduser("~/workspace/fyd-factory/incremental/proof/.lease-scratch")
LEASE_TTL = 2.0

def canon(v):
    if isinstance(v, list): return [canon(x) for x in v]
    if isinstance(v, dict):
        return {k: canon(v[k]) for k in sorted(v)}
    return v

def work_id(request):
    return hashlib.sha256(json.dumps(canon(request), separators=(",", ":")).encode()).hexdigest()

class LeaseCoordinator:
    def __init__(self, root):
        self.root = root
        os.makedirs(root, exist_ok=True)
        self.work_executions = 0
        self.lock = threading.Lock()

    def _lease_dir(self, wid): return os.path.join(self.root, wid)
    def _result(self, wid): return os.path.join(self._lease_dir(wid), "result.json")
    def _journal(self, wid): return os.path.join(self._lease_dir(wid), "side-effect-journal.txt")

    def _read_lease(self, wid):
        try:
            with open(os.path.join(self._lease_dir(wid), "lease.json")) as f:
                return json.load(f)
        except (FileNotFoundError, NotADirectoryError):
            return None

    def _write_lease_atomic(self, wid, lease):
        p = os.path.join(self._lease_dir(wid), "lease.json")
        tmp = p + ".tmp"
        with open(tmp, "w") as f: json.dump(lease, f)
        os.rename(tmp, p)  # atomic: readers never see a torn lease

    def _try_acquire(self, wid, token):
        d = self._lease_dir(wid)
        try:
            os.mkdir(d)
            lease = {"owner": token, "acquiredAt": time.time(),
                     "expiresAt": time.time() + LEASE_TTL, "fencing": 1}
            self._write_lease_atomic(wid, lease)
            return lease, True
        except FileExistsError:
            lease = self._read_lease(wid)
            if lease and time.time() > lease["expiresAt"]:
                new = {"owner": token, "acquiredAt": time.time(),
                       "expiresAt": time.time() + LEASE_TTL, "fencing": lease["fencing"] + 1}
                self._write_lease_atomic(wid, new)
                return new, True   # steal after TTL: crash recovery
            return lease, False

    def _append_side_effect(self, wid, fencing, line):
        """The canonical side effect. Rejects stale fencing tokens."""
        lease = self._read_lease(wid)
        if lease is None or fencing != lease["fencing"]:
            return False  # stale holder: rejected, no duplicate side effect
        with self.lock:
            with open(self._journal(wid), "a") as f: f.write(line + "\n")
        return True

    def do_work(self, wid, fencing, payload):
        with self.lock:
            self.work_executions += 1
        time.sleep(0.3)  # the actual acquisition work
        result = {"workId": wid, "fencing": fencing, "payloadDigest": payload,
                  "completedAt": time.time()}
        tmp = self._result(wid) + ".tmp"
        with open(tmp, "w") as f: json.dump(result, f)
        os.rename(tmp, self._result(wid))  # atomic publish
        ok = self._append_side_effect(wid, fencing, f"EFFECT fencing={fencing} digest={payload}")
        assert ok, "winner's own append must be accepted"
        return result

    def request(self, wid, payload, timeout=15):
        token = uuid.uuid4().hex
        deadline = time.time() + timeout
        while time.time() < deadline:
            lease, won = self._try_acquire(wid, token)
            if won:
                return self.do_work(wid, lease["fencing"], payload), "worker"
            rp = self._result(wid)
            if os.path.exists(rp):
                with open(rp) as f: return json.load(f), "joiner"
            time.sleep(0.05)
        raise TimeoutError("join timed out")

def scenario_race():
    shutil.rmtree(SCRATCH, ignore_errors=True)
    coord = LeaseCoordinator(SCRATCH)
    req = {"url": "https://clearwater-plumbing.example.com/", "allowedDomains": [],
           "purpose": "fyd-factory:incremental-proof", "allowDiscovery": False,
           "pageBudget": 1, "maxDepth": 0}
    wid = work_id(req)
    payload = hashlib.sha256(b"acquired-bytes-fixture").hexdigest()
    barrier = threading.Barrier(10)
    outcomes = {}
    def worker(i):
        barrier.wait()
        res, role = coord.request(wid, payload)
        outcomes[i] = (role, res["payloadDigest"], res["fencing"])
    ts = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
    t0 = time.time()
    [t.start() for t in ts]; [t.join() for t in ts]
    dt = time.time() - t0
    roles = [r for r, _, _ in outcomes.values()]
    digests = {d for _, d, _ in outcomes.values()}
    fencings = {f for _, _, f in outcomes.values()}
    journal = open(coord._journal(wid)).read().strip().split("\n")
    print(f"RACE: 10 workers, {dt:.2f}s wall")
    print(f"  roles: {roles.count('worker')} worker, {roles.count('joiner')} joiners")
    print(f"  work_executions={coord.work_executions} journal_lines={len(journal)}")
    print(f"  distinct result digests={len(digests)} distinct fencing tokens={len(fencings)}")
    assert len(outcomes) == 10, f"all 10 workers must report, got {len(outcomes)}"
    assert coord.work_executions == 1, "work must execute exactly once"
    assert len(journal) == 1, "canonical side effect must be appended exactly once"
    assert len(digests) == 1 and len(fencings) == 1, "all workers must join the same result"
    print("  PASS: one did the work, nine joined, no duplicate canonical side effects")

def scenario_crash_recovery():
    shutil.rmtree(SCRATCH, ignore_errors=True)
    coord = LeaseCoordinator(SCRATCH)
    req = {"url": "https://clearwater-plumbing.example.com/team", "allowedDomains": [],
           "purpose": "fyd-factory:crash-proof", "allowDiscovery": False,
           "pageBudget": 1, "maxDepth": 0}
    wid = work_id(req)
    payload = hashlib.sha256(b"acquired-bytes-crash").hexdigest()
    # Worker A acquires the lease then "crashes" (never does work, never releases).
    token_a = uuid.uuid4().hex
    lease_a, won_a = coord._try_acquire(wid, token_a)
    assert won_a and lease_a["fencing"] == 1
    print(f"CRASH: holder A acquired (fencing=1), then died without publishing")
    time.sleep(LEASE_TTL + 0.5)  # let the lease expire
    # Worker B steals the expired lease and completes the work.
    res_b, role_b = coord.request(wid, payload, timeout=10)
    assert role_b == "worker" and res_b["fencing"] == 2
    # A's ghost tries to append its stale side effect: must be rejected.
    ghost = coord._append_side_effect(wid, fencing=1, line="EFFECT fencing=1 GHOST")
    journal = open(coord._journal(wid)).read().strip().split("\n")
    print(f"  B stole lease (fencing=2), completed work; ghost append accepted={ghost}")
    print(f"  work_executions={coord.work_executions} journal_lines={len(journal)}")
    assert ghost is False, "stale fencing token must be rejected"
    assert coord.work_executions == 1 and len(journal) == 1
    assert journal[0].startswith("EFFECT fencing=2")
    print("  PASS: crash recovered by lease steal, stale side effect rejected")

def scenario_distinct_work():
    """Different requests -> different workIds -> independent leases (no false join)."""
    shutil.rmtree(SCRATCH, ignore_errors=True)
    coord = LeaseCoordinator(SCRATCH)
    base = {"allowedDomains": [], "purpose": "p", "allowDiscovery": False, "pageBudget": 1, "maxDepth": 0}
    r1 = dict(base, url="https://a.example/")
    r2 = dict(base, url="https://b.example/")
    assert work_id(r1) != work_id(r2)
    res1, _ = coord.request(work_id(r1), "p1")
    res2, _ = coord.request(work_id(r2), "p2")
    assert res1["payloadDigest"] == "p1" and res2["payloadDigest"] == "p2"
    assert coord.work_executions == 2
    print("DISTINCT: different requests got different workIds and independent executions (no false join)")

if __name__ == "__main__":
    scenario_race()
    scenario_crash_recovery()
    scenario_distinct_work()
    print("LEASE/JOIN: all scenarios pass")
