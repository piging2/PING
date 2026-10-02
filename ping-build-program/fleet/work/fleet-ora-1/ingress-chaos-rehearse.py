#!/usr/bin/env python3
"""
ingress-chaos-rehearse.py -- sandbox-local event-ingress chaos execution pass.

Reference ingress classifier implementing the failure taxonomy, plus an injector
that fires adversarial event streams at it. For each class:
  duplicate : same event id sent 2x/3x          -> DUPLICATE (single application)
  malformed : truncated JSON, wrong types, missing required fields -> MALFORMED
  oversized : payload 10x the documented max    -> OVERSIZED (typed rejection)
  collision : same event id, different payload  -> CONFLICT (original preserved)
  reordered : events out of causal order        -> REORDERED (ordered by seq, no loss)
  valid     : well-formed unique events         -> ACCEPTED

Pass criterion (per mission): 100% classified, zero crashes, zero poisoned
canonical state. Evidence -> ingress-chaos-evidence.log (JSON lines).

Scope: pattern-level execution of the ingress-chaos harness mechanics in the
sandbox. The live Oracle host and its gateway are never touched. A docker-capable
staging host can point this same injector at the real candidate image.
"""
import json, hashlib, random, sys, time, traceback

LOG = open("ingress-chaos-evidence.log", "w")
def log(**kw):
    kw["ts"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    LOG.write(json.dumps(kw) + "\n"); LOG.flush()

MAX_PAYLOAD = 1024  # documented max payload bytes

class IngressClassifier:
    """Reference failure-taxonomy classifier (stand-in for the gateway candidate)."""
    def __init__(self):
        self.seen_ids = {}      # event_id -> payload hash (applied)
        self.store = {}         # canonical state: event_id -> payload
        self.seq_watermark = -1
        self.counts = {}

    def _bump(self, cls):
        self.counts[cls] = self.counts.get(cls, 0) + 1

    def ingest(self, raw):
        """Classify one raw ingress item. Returns taxonomy class. Never raises."""
        try:
            return self._classify(raw)
        except Exception as e:  # a crash here would be the forbidden outcome
            self._bump("CRASH")
            log(event="classifier_exception", error=repr(e)[:200])
            return "CRASH"

    def _classify(self, raw):
        # malformed: not a dict / bad JSON shape
        if not isinstance(raw, dict):
            self._bump("MALFORMED"); return "MALFORMED"
        eid = raw.get("event_id"); seq = raw.get("seq"); payload = raw.get("payload")
        if not isinstance(eid, str) or not eid:
            self._bump("MALFORMED"); return "MALFORMED"
        if not isinstance(seq, int) or seq < 0:
            self._bump("MALFORMED"); return "MALFORMED"
        if not isinstance(payload, (str, bytes)):
            self._bump("MALFORMED"); return "MALFORMED"
        pbytes = payload.encode() if isinstance(payload, str) else payload
        # oversized
        if len(pbytes) > MAX_PAYLOAD:
            self._bump("OVERSIZED"); return "OVERSIZED"
        ph = hashlib.sha256(pbytes).hexdigest()
        # duplicate: same id, same payload
        if eid in self.seen_ids and self.seen_ids[eid] == ph:
            self._bump("DUPLICATE"); return "DUPLICATE"
        # collision: same id, different payload -> keep original
        if eid in self.seen_ids and self.seen_ids[eid] != ph:
            self._bump("CONFLICT"); return "CONFLICT"
        # reordered: seq below watermark but unseen id -> accept, order by seq
        if seq <= self.seq_watermark:
            self.seen_ids[eid] = ph; self.store[eid] = payload
            self._bump("REORDERED"); return "REORDERED"
        # valid
        self.seen_ids[eid] = ph; self.store[eid] = payload
        self.seq_watermark = max(self.seq_watermark, seq)
        self._bump("ACCEPTED"); return "ACCEPTED"

def make_event(i, cls, rng):
    base = {"event_id": f"evt-{i:05d}", "seq": i, "payload": f"payload-{i}"}
    if cls == "duplicate":
        return dict(base)  # injector will send twice
    if cls == "malformed":
        return rng.choice([
            "truncated-{", {"event_id": "", "seq": 1, "payload": "x"},
            {"event_id": "m1", "seq": "not-an-int", "payload": "x"},
            {"event_id": "m2", "payload": "x"},                       # missing seq
            {"event_id": "m3", "seq": 3, "payload": None},
        ])
    if cls == "oversized":
        return {"event_id": f"big-{i}", "seq": 90000 + i, "payload": "X" * (MAX_PAYLOAD * 10)}
    if cls == "collision":
        # same id as an already-accepted event, different payload
        return {"event_id": f"evt-{i % 200:05d}", "seq": 95000 + i, "payload": f"POISON-{i}"}
    if cls == "reordered":
        return {"event_id": f"late-{i:05d}", "seq": 0, "payload": f"late-payload-{i}"}
    return base

def run_class(cls, n, rng):
    c = IngressClassifier()
    # prime with 200 valid events so duplicates/collisions/reorders have context
    for i in range(200):
        assert c.ingest(make_event(i, "valid", rng)) == "ACCEPTED", f"prime failed at {i}"
    prime_store_digest = hashlib.sha256(
        json.dumps(c.store, sort_keys=True).encode()).hexdigest()
    results = {}
    for i in range(n):
        ev = make_event(i, cls, rng)
        got = c.ingest(ev)
        results[got] = results.get(got, 0) + 1
        if cls == "duplicate":
            got2 = c.ingest(ev)  # second send must be DUPLICATE
            results[got2] = results.get(got2, 0) + 1
            got3 = c.ingest(ev)  # third send must be DUPLICATE
            results[got3] = results.get(got3, 0) + 1
    total = sum(results.values())
    crashes = results.get("CRASH", 0)
    # zero poisoned state: canonical store must contain no malformed/poison payloads
    poison = [k for k, v in c.store.items()
              if not isinstance(v, str) or v.startswith("POISON") or len(v.encode()) > MAX_PAYLOAD]
    store_digest = hashlib.sha256(json.dumps(c.store, sort_keys=True).encode()).hexdigest()
    # expected classification per class
    expected = {"duplicate": "DUPLICATE", "malformed": "MALFORMED",
                "oversized": "OVERSIZED", "collision": "CONFLICT",
                "reordered": "REORDERED"}[cls]
    classified_ok = results.get(expected, 0) >= n  # every injected item classified as expected
    passed = classified_ok and crashes == 0 and not poison
    log(cls=cls, injected=n, results=results, total=total,
        classified_100pct=classified_ok, crashes=crashes,
        poisoned_entries=len(poison), store_digest=store_digest,
        prime_digest=prime_store_digest, verdict="PASS" if passed else "FAIL")
    print(f"[{cls}] injected={n} results={results} classified_ok={classified_ok} "
          f"crashes={crashes} poison={len(poison)} -> {'PASS' if passed else 'FAIL'}")
    return passed

def main():
    rng = random.Random(20260924)  # deterministic
    log(event="start", note="sandbox-local ingress-chaos execution; live host untouched")
    ok = True
    for cls in ["duplicate", "malformed", "oversized", "collision", "reordered"]:
        try:
            ok = run_class(cls, 200, rng) and ok
        except Exception:
            traceback.print_exc(); log(cls=cls, verdict="FAIL", error="harness exception"); ok = False
    log(event="end", overall="PASS" if ok else "FAIL")
    print("OVERALL:", "PASS" if ok else "FAIL")
    LOG.close()
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
