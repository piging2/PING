"""Emitter tests: envelope shape matches the PING gateway convention,
dedupe ledger refuses re-emission, GatewaySink refuses to half-fire."""
import sys
import os
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from git_ingest import emitter
from git_ingest.emitter import (build_envelope, emit_if_new, DedupeLedger,
                                FileSink, GatewaySink)


class TestEmitter(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tmp.cleanup()

    def test_envelope_shape_matches_ping_convention(self):
        env = build_envelope("o", "r", "abc", "commit", "some observation")
        self.assertEqual(env["event_type"], "OBSERVATION_CREATED")
        self.assertEqual(env["aggregate_type"], "git_ingest")
        self.assertEqual(env["aggregate_id"], "git-repo:o/r")
        ed = env["event_data"]
        self.assertEqual(ed["research_agent"], "git-ingest")
        self.assertEqual(ed["commit_sha"], "abc")
        self.assertEqual(ed["observation"], "some observation")
        self.assertIn("occurrence_id", ed)

    def test_dedupe_refuses_second_emit(self):
        ledger = DedupeLedger(os.path.join(self.tmp.name, "ledger.jsonl"))
        sink = FileSink(os.path.join(self.tmp.name, "ev.jsonl"))
        env = build_envelope("o", "r", "abc", "commit", "obs")
        first = emit_if_new(ledger, sink, env)
        second = emit_if_new(ledger, sink, env)
        self.assertTrue(first[0])
        self.assertFalse(second[0])
        self.assertEqual(first[1], second[1])

    def test_gateway_sink_refuses_to_half_fire(self):
        sink = GatewaySink()
        with self.assertRaises(NotImplementedError):
            sink.emit(build_envelope("o", "r", "abc", "commit", "obs"))


if __name__ == "__main__":
    unittest.main()
