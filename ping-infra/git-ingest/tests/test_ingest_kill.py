"""Kill tests for the ingestion orchestrator.

These exercise the REAL GitIngester against a ScriptedTransport (a
pre-written script of responses and failures, no network, no mocks of
success). Assertions are about recovery behavior, not happy paths:

1. test_kill_mid_fetch_and_resume: transport dies after page 2 of 3.
   Run 1 ends PARTIAL_UNKNOWN with a saved checkpoint. Run 2 (fresh
   transport, same checkpoint/ledger) completes. Assert: no duplicate
   evidence across both runs; every commit emitted exactly once.
2. test_rate_limit_stops_not_retries: 429 on page 2. Assert: state is
   RATE_LIMITED, the failed page was attempted exactly once (no blind
   retry), checkpoint saved, and the run ends cleanly.
3. test_stale_checkpoint_reanchors: checkpoint names a SHA the repo no
   longer has, and one commit 404s on detail fetch. Assert: no crash,
   404'd commit recorded as UNKNOWN, all other commits emitted once,
   state PARTIAL_UNKNOWN with the unknown listed.
4. test_concurrent_same_repo_one_writer: two processes ingest the same
   repo simultaneously. Assert: exactly one OK result, the other
   CONFLICT_LOCKED, and total emissions equal one full run (no
   interleaved duplicates).
"""
import sys
import os
import json
import multiprocessing
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from git_ingest import (
    GitIngester, CheckpointStore, DedupeLedger, FileSink, ScriptedTransport,
)
from git_ingest.transport import TransportError


def _commit(sha, msg="msg"):
    return {
        "sha": sha,
        "commit": {"message": msg,
                   "author": {"name": "A", "date": "2026-01-01T00:00:00Z"}},
        "stats": {"additions": 1, "deletions": 0, "total": 1},
        "files": [{"filename": "f"}],
        "html_url": f"https://github.com/o/r/commit/{sha}",
    }


def _page(commits):
    return ("response", (200, {}, commits))


def _detail(sha, msg="msg"):
    return ("response", (200, {}, _commit(sha, msg)))


def _empty_page():
    return ("response", (200, {}, []))


def _script_for(shas, fail_at_page=None):
    """Build a full script: for each page a commit-list step, then a
    detail step per commit, then a final empty page. Pages hold 2 commits."""
    steps = []
    pages = [shas[i:i + 2] for i in range(0, len(shas), 2)] or [[]]
    for n, page in enumerate(pages, start=1):
        if fail_at_page == n:
            steps.append(("raise", TransportError("simulated kill")))
            break
        steps.append(_page([_commit(s) for s in page]))
        for s in page:
            steps.append(_detail(s))
    if fail_at_page is None:
        steps.append(_empty_page())
    return steps


def _setup(tmp):
    store = CheckpointStore(os.path.join(tmp, "cp"))
    ledger = DedupeLedger(os.path.join(tmp, "ledger.jsonl"))
    sink = FileSink(os.path.join(tmp, "evidence.jsonl"))
    return store, ledger, sink


def _envelopes(tmp):
    path = os.path.join(tmp, "evidence.jsonl")
    out = []
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                out.append(json.loads(line))
    return out


class TestIngestKill(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    # 1. Kill mid-fetch, resume, no duplicate evidence ----------------------
    def test_kill_mid_fetch_and_resume_no_duplicates(self):
        shas = ["s1", "s2", "s3", "s4", "s5"]
        store, ledger, sink = _setup(self.tmp.name)

        # Run 1: dies fetching page 2 (after page 1 fully committed).
        t1 = ScriptedTransport(_script_for(shas, fail_at_page=2))
        g1 = GitIngester(t1, store, ledger, sink, per_page=2)
        r1 = g1.ingest_repo("o", "r")
        self.assertEqual(r1.state, "PARTIAL_UNKNOWN")
        self.assertEqual(r1.emitted, 2)
        cp = store.load("o/r")
        self.assertEqual(cp["pages_done"], 1)

        # Run 2: fresh transport replays only the remaining pages (what the
        # resumed run actually requests: pages 2..4).
        t2 = ScriptedTransport(_script_for(shas[2:]))
        g2 = GitIngester(t2, store, ledger, sink, per_page=2)
        r2 = g2.ingest_repo("o", "r")
        self.assertEqual(r2.state, "OK")
        self.assertEqual(r2.emitted, 5)
        self.assertEqual(r2.skipped_duplicates, 0)

        envs = _envelopes(self.tmp.name)
        occ = [e["event_data"]["occurrence_id"] for e in envs]
        self.assertEqual(len(occ), 5, "exactly 5 evidence rows total")
        self.assertEqual(len(set(occ)), 5, "no duplicate occurrence emitted")

        # Run 3: full re-ingest from scratch against the same ledger.
        # Same SHAs must produce zero new evidence (idempotent).
        os.remove(os.path.join(self.tmp.name, "cp", "o_r.json"))
        t3 = ScriptedTransport(_script_for(shas))
        g3 = GitIngester(t3, store, ledger, sink, per_page=2)
        r3 = g3.ingest_repo("o", "r")
        self.assertEqual(r3.state, "OK")
        self.assertEqual(r3.emitted, 5)  # cumulative: no new emissions
        self.assertEqual(r3.skipped_duplicates, 5)
        envs = _envelopes(self.tmp.name)
        self.assertEqual(len(envs), 5, "re-ingest emitted nothing new")
        for e in envs:
            self.assertEqual(e["event_type"], "OBSERVATION_CREATED")
            self.assertEqual(e["aggregate_type"], "git_ingest")
            self.assertEqual(e["aggregate_id"], "git-repo:o/r")

    # 2. 429 stops, never retries blindly -----------------------------------
    def test_rate_limit_429_stops_no_blind_retry(self):
        shas = ["s1", "s2", "s3"]
        store, ledger, sink = _setup(self.tmp.name)
        steps = [_page([_commit("s1"), _commit("s2")]),
                 _detail("s1"), _detail("s2"),
                 ("response", (429, {"Retry-After": "60",
                                     "X-RateLimit-Remaining": "0",
                                     "X-RateLimit-Reset": "9999999999"},
                               {"message": "rate limited"}))]
        t = ScriptedTransport(steps)
        g = GitIngester(t, store, ledger, sink, per_page=2)
        r = g.ingest_repo("o", "r")
        self.assertEqual(r.state, "RATE_LIMITED")
        # The rate-limited page was attempted exactly once: one GET per
        # commits page in the call log, no repeated fetch of page 2.
        page_calls = [c for c in t.calls if c[0].endswith("/commits")]
        self.assertEqual(len(page_calls), 2, f"calls: {t.calls}")
        cp = store.load("o/r")
        self.assertEqual(cp["state"], "rate_limited")
        self.assertEqual(cp["pages_done"], 1)
        envs = _envelopes(self.tmp.name)
        self.assertEqual(len(envs), 2)

    # 3. Stale checkpoint re-anchors; 404'd commit is UNKNOWN ---------------
    def test_stale_checkpoint_and_missing_commit(self):
        store, ledger, sink = _setup(self.tmp.name)
        stale = store.fresh("o/r")
        stale["last_sha"] = "deadbeef-gone"
        stale["pages_done"] = 9  # points past the real end
        store.save("o/r", stale)

        steps = [_page([_commit("s1"), _commit("s2")]),
                 _detail("s1"),
                 ("response", (404, {}, {"message": "Not Found"})),
                 _empty_page()]
        t = ScriptedTransport(steps)
        g = GitIngester(t, store, ledger, sink, per_page=2)
        r = g.ingest_repo("o", "r")
        self.assertEqual(r.state, "PARTIAL_UNKNOWN")
        self.assertIn("s2", r.unknowns)
        self.assertEqual(r.emitted, 1)
        envs = _envelopes(self.tmp.name)
        self.assertEqual(len(envs), 1)
        self.assertEqual(envs[0]["event_data"]["commit_sha"], "s1")

    # 4. Concurrent ingestion of the same repo: one writer -------------------
    def test_concurrent_same_repo_one_writer(self):
        tmpdir = self.tmp.name
        shas = ["c1", "c2", "c3", "c4"]
        script = _script_for(shas)

        import time as _time

        def worker(q, started_evt, is_first):
            sys.path.insert(0, os.path.join(
                os.path.dirname(__file__), "..", "src"))
            from git_ingest import (GitIngester, CheckpointStore,
                                    DedupeLedger, FileSink, ScriptedTransport)

            class _Slow(ScriptedTransport):
                def get(self, path, params=None):
                    started_evt.set()  # lock is held by now
                    _time.sleep(0.15)
                    return super().get(path, params)

            store = CheckpointStore(os.path.join(tmpdir, "cp"))
            ledger = DedupeLedger(os.path.join(tmpdir, "ledger.jsonl"))
            sink = FileSink(os.path.join(tmpdir, "evidence.jsonl"))
            t = _Slow(list(script), None) if is_first else ScriptedTransport(
                list(script))
            if not is_first:
                started_evt.wait(30)  # ensure overlap while p1 holds lock
            g = GitIngester(t, store, ledger, sink, per_page=2)
            r = g.ingest_repo("o", "r")
            q.put((r.state, r.emitted))

        q = multiprocessing.Queue()
        started = multiprocessing.Event()
        p1 = multiprocessing.Process(target=worker, args=(q, started, True))
        p2 = multiprocessing.Process(target=worker, args=(q, started, False))
        p1.start()
        p2.start()
        p1.join(60)
        p2.join(60)
        states = sorted(q.get()[0] for _ in range(2))
        self.assertEqual(states, ["CONFLICT_LOCKED", "OK"])
        envs = _envelopes(tmpdir)
        occ = [e["event_data"]["occurrence_id"] for e in envs]
        self.assertEqual(len(occ), 4)
        self.assertEqual(len(set(occ)), 4, "no interleaved duplicates")


if __name__ == "__main__":
    unittest.main()
