#!/usr/bin/env python3
"""
LANE-CHAOS shared harness library.

Implements the batch-spec durability protocols (BATCH-FACTORY-SPEC.md
sections 3.1-3.2, 4.1-4.2) as a file-based coordinator, with the REAL
factory machinery on the Pig (/home/nolan/projects/ping, branch
fyd-factory) as the stage work unit, invoked read-only via wsl-run.sh
+ out-of-tree tsx (chaos/stage.ts). No repo writes anywhere.

Protocols:
  work_id       = sha256(batch_id | item_id | stage | canonical(input_digests))
  checkpoint    = content-addressed artifacts + committed index (atomic tmp+rename)
  lease         = atomic mkdir acquire, TTL, fencing token; stale-lease writes rejected
  journal       = canonical side-effect log, appends gated on fencing token
"""
import hashlib
import json
import os
import shutil
import subprocess
import threading
import time
import uuid

WSL_RUN = "/home/hatch/workspace/bin/wsl-run.sh"
PIG_STAGE = "/home/nolan/fyd-chaos-lane/stage.ts"
PIG_REPO = "/home/nolan/projects/ping"
PIG_FIXTURE = "/home/nolan/fyd-chaos-lane/fixtures/clearwater-plumbing-demo.json"

# Bounded defaults for every experiment.
PIG_TIMEOUT_S = 180
MAX_ATTEMPTS = 3


class ChaosError(Exception):
    pass


class DigestMismatch(ChaosError):
    def __init__(self, expected: str, actual: str, path: str):
        super().__init__("digest mismatch on cache read: expected %s got %s (%s)"
                         % (expected[:16], actual[:16], path))
        self.expected = expected
        self.actual = actual
        self.path = path


class CorruptCacheError(ChaosError):
    """Typed failure: a committed artifact failed digest verification on read."""


class StaleLeaseError(ChaosError):
    """Typed failure: write attempted under an expired/superseded lease."""


def canon(v):
    if isinstance(v, list):
        return [canon(x) for x in v]
    if isinstance(v, dict):
        return {k: canon(v[k]) for k in sorted(v)}
    return v


def digest_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def digest_json(v) -> str:
    return digest_bytes(json.dumps(canon(v), separators=(",", ":")).encode())


def work_id(batch_id: str, item_id: str, stage: str, input_digests: dict) -> str:
    return digest_json([batch_id, item_id, stage, canon(input_digests)])


class Pig:
    """Counts and invokes real Pig stage executions. Thread-safe."""

    def __init__(self):
        self.lock = threading.Lock()
        self.invocations = 0
        self.log_lines = []

    def stage(self, mode: str, args, timeout: int = PIG_TIMEOUT_S, tag: str = "") -> dict:
        """Run one out-of-tree tsx stage on the Pig. Returns parsed CHAOS_STAGE dict."""
        script = (
            "cd " + PIG_REPO + "\n"
            "node_modules/.bin/tsx " + PIG_STAGE + " " + mode + " "
            + " ".join('"' + str(a) + '"' for a in args) + "\n"
        )
        with self.lock:
            n = self.invocations
            self.invocations += 1
            script_path = os.path.join(
                os.environ.get("CHAOS_WORKDIR", "/tmp"), "pigcall-%d.sh" % n
            )
            with open(script_path, "w") as f:
                f.write(script)
            self.log_lines.append("pig stage call #%d mode=%s tag=%s"
                                  % (self.invocations, mode, tag))
        try:
            p = subprocess.run(
                [WSL_RUN, script_path, str(timeout)],
                capture_output=True, text=True, timeout=timeout + 60,
            )
        except subprocess.TimeoutExpired as e:
            raise ChaosError("pig stage call timed out locally: mode=%s" % mode) from e
        line = None
        for ln in (p.stdout or "").splitlines():
            if ln.startswith("CHAOS_STAGE "):
                line = ln[len("CHAOS_STAGE "):]
        if line is None:
            raise ChaosError(
                "pig stage produced no CHAOS_STAGE line (mode=%s rc=%d): stdout=%r stderr=%r"
                % (mode, p.returncode, (p.stdout or "")[-500:], (p.stderr or "")[-500:])
            )
        return json.loads(line)


class CheckpointStore:
    """Content-addressed artifact store + committed index (atomic tmp+rename)."""

    def __init__(self, root: str):
        self.root = root
        self.art_dir = os.path.join(root, "artifacts")
        self.quarantine_dir = os.path.join(root, "quarantine")
        os.makedirs(self.art_dir, exist_ok=True)
        os.makedirs(self.quarantine_dir, exist_ok=True)
        self.index_path = os.path.join(root, "index.json")
        self.lock = threading.Lock()
        if not os.path.exists(self.index_path):
            self._write_index({})

    def _write_index(self, index: dict):
        tmp = self.index_path + ".tmp"
        with open(tmp, "w") as f:
            json.dump(index, f, indent=1, sort_keys=True)
        os.rename(tmp, self.index_path)

    def _read_index(self) -> dict:
        with open(self.index_path) as f:
            return json.load(f)

    def put_artifact(self, data: bytes) -> str:
        d = digest_bytes(data)
        p = os.path.join(self.art_dir, d)
        if not os.path.exists(p):
            tmp = p + ".tmp." + uuid.uuid4().hex[:8]
            with open(tmp, "wb") as f:
                f.write(data)
            os.rename(tmp, p)
        return d

    def read_artifact(self, digest: str) -> bytes:
        """Read with digest verification. Raises CorruptCacheError on mismatch."""
        p = os.path.join(self.art_dir, digest)
        if not os.path.exists(p):
            raise CorruptCacheError("artifact missing for digest %s" % digest[:16])
        with open(p, "rb") as f:
            data = f.read()
        if digest_bytes(data) != digest:
            raise CorruptCacheError(
                "digest mismatch on artifact %s...: stored bytes do not match committed digest"
                % digest[:16]
            )
        return data

    def commit(self, wid: str, record: dict):
        with self.lock:
            index = self._read_index()
            index[wid] = record
            self._write_index(index)

    def lookup(self, wid: str):
        with self.lock:
            return self._read_index().get(wid)

    def quarantine_artifact(self, digest: str, reason: str):
        src = os.path.join(self.art_dir, digest)
        dst = os.path.join(self.quarantine_dir, digest + ".corrupt")
        if os.path.exists(src):
            shutil.move(src, dst)
        with open(dst + ".reason.txt", "w") as f:
            f.write(reason + "\n")

    def invalidate(self, wid: str, reason: str):
        """Drop a torn index entry after its artifact was quarantined."""
        with self.lock:
            index = self._read_index()
            if wid in index:
                del index[wid]
                self._write_index(index)
        with open(os.path.join(self.root, "invalidations.log"), "a") as f:
            f.write(json.dumps({"wid": wid, "reason": reason,
                                "at": time.time()}) + "\n")


class LeaseCoordinator:
    """File-lease coordinator: atomic mkdir acquire, TTL, fencing tokens."""

    def __init__(self, root: str, ttl_s: float = 30.0):
        self.root = os.path.join(root, "leases")
        os.makedirs(self.root, exist_ok=True)
        self.ttl_s = ttl_s
        self.lock = threading.Lock()

    def _dir(self, wid: str) -> str:
        return os.path.join(self.root, wid)

    def _lease_path(self, wid: str) -> str:
        return os.path.join(self._dir(wid), "lease.json")

    def _read_lease(self, wid: str):
        try:
            with open(self._lease_path(wid)) as f:
                return json.load(f)
        except (FileNotFoundError, NotADirectoryError, json.JSONDecodeError):
            return None

    def _write_lease(self, wid: str, lease: dict):
        p = self._lease_path(wid)
        tmp = p + ".tmp"
        with open(tmp, "w") as f:
            json.dump(lease, f)
        os.rename(tmp, p)  # atomic: readers never see a torn lease

    def acquire(self, wid: str, worker_id: str, item_id: str, stage: str):
        """Returns (lease, is_owner). Steals after TTL with fencing+1."""
        d = self._dir(wid)
        now = time.time()
        try:
            os.mkdir(d)
            lease = {
                "lease_id": uuid.uuid4().hex[:12],
                "owner": worker_id,
                "item_id": item_id,
                "stage": stage,
                "acquired_at": now,
                "expires_at": now + self.ttl_s,
                "fencing": 1,
            }
            self._write_lease(wid, lease)
            return lease, True
        except FileExistsError:
            lease = self._read_lease(wid)
            if lease and now > lease["expires_at"]:
                new = dict(lease)
                new.update(
                    {
                        "lease_id": uuid.uuid4().hex[:12],
                        "owner": worker_id,
                        "acquired_at": now,
                        "expires_at": now + self.ttl_s,
                        "fencing": lease["fencing"] + 1,
                        "stolen_from": lease["owner"],
                    }
                )
                self._write_lease(wid, new)
                return new, True
            return lease, False

    def heartbeat(self, wid: str, lease_id: str) -> bool:
        """Renew the lease. Returns False if this holder no longer owns it."""
        with self.lock:
            lease = self._read_lease(wid)
            if lease is None or lease["lease_id"] != lease_id:
                return False
            lease["expires_at"] = time.time() + self.ttl_s
            self._write_lease(wid, lease)
            return True

    def current_fencing(self, wid: str):
        lease = self._read_lease(wid)
        return lease["fencing"] if lease else None

    def check_write(self, wid: str, fencing: int):
        """Lease-checked write gate. Raises StaleLeaseError on mismatch."""
        cur = self.current_fencing(wid)
        if cur is None or fencing != cur:
            raise StaleLeaseError(
                "stale lease write rejected: fencing=%s current=%s" % (fencing, cur)
            )


class Journal:
    """Canonical side-effect log. Appends gated on fencing token."""

    def __init__(self, path: str, leases: LeaseCoordinator):
        self.path = path
        self.leases = leases
        self.lock = threading.Lock()
        self.rejected = 0
        if not os.path.exists(path):
            open(path, "w").close()

    def append(self, wid: str, fencing: int, entry: dict) -> bool:
        """Returns True if appended, False if rejected as stale."""
        try:
            self.leases.check_write(wid, fencing)
        except StaleLeaseError:
            with self.lock:
                self.rejected += 1
            return False
        line = json.dumps({"wid": wid, "fencing": fencing, **entry}, sort_keys=True)
        with self.lock:
            with open(self.path, "a") as f:
                f.write(line + "\n")
        return True

    def lines(self):
        with open(self.path) as f:
            return [json.loads(ln) for ln in f if ln.strip()]


def run_stage(store: CheckpointStore, leases: LeaseCoordinator, journal: Journal,
              pig: Pig, batch_id: str, item_id: str, stage: str,
              input_digests: dict, pig_mode: str, pig_args,
              worker_id: str, attempt: int = 1, timeout: int = PIG_TIMEOUT_S) -> dict:
    """
    One idempotent, resumable, lease-guarded stage execution.
    Returns {"wid", "cache_hit", "record"}.
    """
    wid = work_id(batch_id, item_id, stage, input_digests)
    hit = store.lookup(wid)
    if hit is not None:
        # Verify the committed artifact still reads clean before serving it.
        store.read_artifact(hit["output_digest"])
        return {"wid": wid, "cache_hit": True, "record": hit}
    lease, owner = leases.acquire(wid, worker_id, item_id, stage)
    if not owner:
        # Another worker holds the lease: wait for the committed result
        # (join). If the lease expires with no commit, reclaim it by steal
        # (batch spec 4.2/4.3): the item returns to the ready queue and this
        # worker resumes it. A join loop that never reclaims is a liveness
        # bug (found by C2 chaos: the killed holder never commits).
        deadline = time.time() + timeout
        while time.time() < deadline:
            hit = store.lookup(wid)
            if hit is not None:
                store.read_artifact(hit["output_digest"])
                return {"wid": wid, "cache_hit": True, "record": hit, "joined": True}
            cur = leases._read_lease(wid)
            if cur is not None and time.time() > cur["expires_at"]:
                lease2, owner2 = leases.acquire(wid, worker_id, item_id, stage)
                if owner2:
                    lease = lease2
                    owner = True
                    break
            time.sleep(1.0)
        if not owner:
            hit = store.lookup(wid)
            if hit is not None:
                store.read_artifact(hit["output_digest"])
                return {"wid": wid, "cache_hit": True, "record": hit, "joined": True}
            raise ChaosError("join timed out waiting for lease holder on %s" % wid[:12])
    # We own the lease: execute the real Pig stage, then commit atomically.
    res = pig.stage(pig_mode, pig_args, timeout=timeout, tag="%s/%s" % (item_id, stage))
    payload = json.dumps(res, sort_keys=True).encode()
    out_digest = store.put_artifact(payload)
    record = {
        "batch_id": batch_id, "item_id": item_id, "stage": stage,
        "attempt": attempt, "lease_id": lease["lease_id"], "fencing": lease["fencing"],
        "input_digests": canon(input_digests),
        "output_digest": out_digest, "status": "ok",
    }
    leases.check_write(wid, lease["fencing"])
    store.commit(wid, record)
    journal.append(wid, lease["fencing"], {
        "stage": stage, "item_id": item_id, "worker_id": worker_id,
        "output_digest": out_digest, "attempt": attempt,
    })
    return {"wid": wid, "cache_hit": False, "record": record}
