"""Emission adapter: ingested occurrences -> PING observation envelopes.

This module does NOT invent a new event bus or authority. It builds the
exact OBSERVATION_CREATED envelope shape the PING gateway already accepts
(aggregate_id, aggregate_type, event_type, event_data), following the
convention established by ~/workspace/tandem/emit-observation.py.

Deduplication: emit_if_new() keys on sha256 of the canonical observation
text, recorded in an append-only ledger file. Same SHA re-ingested =
same hash = refused as duplicate, even across process restarts.

Sinks:
- FileSink: appends envelopes to a JSONL file. Used for evidence capture
  and tests. This is a staging surface, not a canonical store.
- GatewaySink: documents the Pig-gateway POST convention but refuses to
  fire from this sandbox (the gateway lives on the Pig; this package is
  integration-ready, not deployment-ready). The wave coordinator wires
  the live sink at integration time.
"""
from __future__ import annotations

import json
import os
import time
from typing import Dict, List, Optional, Tuple

from . import identity


class Sink:
    def emit(self, envelope: Dict) -> str:
        """Deliver one envelope; return a sink-local id. Must be idempotent-safe."""
        raise NotImplementedError


class FileSink(Sink):
    """Append-only JSONL evidence file. Readable, diffable, replayable."""

    def __init__(self, path: str):
        self.path = path
        d = os.path.dirname(os.path.abspath(path))
        os.makedirs(d, exist_ok=True)

    def emit(self, envelope: Dict) -> str:
        line = json.dumps(envelope, sort_keys=True)
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(line + "\n")
        return identity.observation_hash(line)


class GatewaySink(Sink):
    """Pig-gateway sink. Integration-time only.

    The live path mirrors tandem/emit-observation.py: resolve the Bearer <redacted>
    from the ping-gateway container env on the Pig (never stored, never
    passed as an argument) and POST the envelope to
    http://127.0.0.1:8080/events. Calling emit() here raises
    NotImplementedError so nothing half-wired fires silently.
    """

    GATEWAY_URL = "http://127.0.0.1:8080/events"

    def emit(self, envelope: Dict) -> str:
        raise NotImplementedError(
            "GatewaySink is integration-time only: wire the Pig gateway POST "
            "(Bearer <redacted> from container env, per tandem/emit-observation.py) "
            "at integration time. Refusing to half-fire."
        )


class DedupeLedger:
    """Append-only ledger of emitted observation hashes -> sink ids."""

    def __init__(self, path: str):
        self.path = path
        d = os.path.dirname(os.path.abspath(path))
        os.makedirs(d, exist_ok=True)

    def known(self) -> Dict[str, str]:
        out: Dict[str, str] = {}
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        rec = json.loads(line)
                    except ValueError:
                        continue
                    if "observation_hash" in rec and "sink_id" in rec:
                        out[rec["observation_hash"]] = rec["sink_id"]
        except OSError:
            pass
        return out

    def record(self, observation_hash: str, sink_id: str) -> None:
        rec = {
            "observation_hash": observation_hash,
            "sink_id": sink_id,
            "emitted_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        with open(self.path, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, sort_keys=True) + "\n")


def build_envelope(owner: str, repo: str, sha: str, kind: str,
                   observation_text: str,
                   verification_status: str = "verified") -> Dict:
    """Build the OBSERVATION_CREATED envelope the PING gateway accepts."""
    return {
        "event_type": identity.EVENT_TYPE,
        "aggregate_id": identity.aggregate_id(owner, repo),
        "aggregate_type": identity.AGGREGATE_TYPE,
        "event_data": {
            "research_agent": identity.RESEARCH_AGENT,
            "repo": identity.repo_key(owner, repo),
            "commit_sha": sha,
            "kind": kind,
            "occurrence_id": identity.occurrence_id(owner, repo, sha, kind),
            "verification_status": verification_status,
            "observation": observation_text,
        },
    }


def emit_if_new(ledger: DedupeLedger, sink: Sink,
                envelope: Dict) -> Tuple[bool, str]:
    """Emit once per unique observation hash. Returns (emitted, sink_id).
    Duplicate => (False, existing_sink_id)."""
    text = envelope["event_data"]["observation"]
    ohash = identity.observation_hash(text)
    known = ledger.known()
    if ohash in known:
        return False, known[ohash]
    sink_id = sink.emit(envelope)
    ledger.record(ohash, sink_id)
    return True, sink_id
