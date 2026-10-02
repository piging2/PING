#!/usr/bin/env python3
"""Wiring wave: generate /ingest envelopes from lane-CONN's real adapters.

GitHub: real spike.normalize_payload over recorded API fixtures.
GBP: real GbpConnector.read() over FixtureTransport recordings.
Lane A: the 2,487 dry-run envelopes (already envelope-shaped) are copied verbatim.

Output: ~/workspace/ping-build-program/lane-wire/milestone-envelopes.jsonl
Each line: a POST /ingest body envelope.
"""
from __future__ import annotations

import glob
import hashlib
import json
import os
import sys

WIRE = os.path.expanduser("~/workspace/ping-build-program/lane-wire")
GH = os.path.expanduser("~/workspace/ping-build-program/lane-conn/github")
GBP = os.path.expanduser("~/workspace/ping-build-program/lane-conn/business")
TESTKIT = os.path.expanduser("~/workspace/ping-build-program/lane-bcq/testkit")

sys.path.insert(0, GH)
sys.path.insert(0, GBP)
sys.path.insert(0, TESTKIT)

CONF_MAP = {"DIRECT": 1.0, "DERIVED": 0.75, "INFERRED": 0.5,
            "OWNER_ASSERTED": 0.9, "CONFLICTING": 0.3, "UNKNOWN": 0.0}


def _conf(o) -> float:
    name = getattr(o.confidence, "name", str(o.confidence))
    return CONF_MAP.get(name, 0.5)

envelopes = []

# --- GitHub: real adapter normalize over recorded fixtures ---
import spike  # noqa: E402

gh_n = 0
for path in sorted(glob.glob(os.path.join(GH, "evidence", "repo-*.json"))):
    raw = json.load(open(path, encoding="utf-8"))
    for o in spike.normalize_payload(raw, "github_repository", "wiring-wave"):
        envelopes.append({
            "source": "connector:github-connector:lane-conn",
            "eventType": "OBJECT_CREATED",
            "logicalId": o.canonical_id,
            "confidence": _conf(o),
            "lifecycleStage": "observation",
            "evidence": [hashlib.sha256(o.canonical_bytes()).hexdigest()],
            "payload": {
                "kind": "github_repository",
                "object_type": o.object_type,
                "canonical_id": o.canonical_id,
                "source_record_id": o.source_record_id,
                "fields": o.fields,
                "provider": o.provenance.provider,
                "connector_version": o.provenance.connector_version,
                "confidence_grade": str(o.confidence),
            },
        })
        gh_n += 1
for path in sorted(glob.glob(os.path.join(GH, "evidence", "issue-*.json"))):
    raw = json.load(open(path, encoding="utf-8"))
    for o in spike.normalize_payload(raw, "github_issue", "wiring-wave"):
        envelopes.append({
            "source": "connector:github-connector:lane-conn",
            "eventType": "OBJECT_CREATED",
            "logicalId": o.canonical_id,
            "confidence": _conf(o),
            "lifecycleStage": "observation",
            "evidence": [hashlib.sha256(o.canonical_bytes()).hexdigest()],
            "payload": {
                "kind": "github_issue",
                "object_type": o.object_type,
                "canonical_id": o.canonical_id,
                "source_record_id": o.source_record_id,
                "fields": o.fields,
                "provider": o.provenance.provider,
                "connector_version": o.provenance.connector_version,
                "confidence_grade": str(o.confidence),
            },
        })
        gh_n += 1

# --- GBP: real connector against recorded fixtures ---
from contract import CredentialRef, FetchOutcome, to_public_dict  # noqa: E402
from fixture_transport import FixtureTransport  # noqa: E402
from gbp_connector import FIXTURE_CREDENTIAL_REF, GbpConnector  # noqa: E402

gbp_n = 0


def stable_bytes(obs) -> bytes:
    d = to_public_dict(obs)

    def scrub(node, path=()):
        if isinstance(node, dict):
            for k in list(node.keys()):
                if k in ("fetched_at", "fetch_attempt_id", "linked_at", "atVirtualMs"):
                    node[k] = "VOLATILE"
                else:
                    scrub(node[k], path + (k,))
        elif isinstance(node, list):
            for i in node:
                scrub(i, path)
    scrub(d)
    return json.dumps(d, sort_keys=True, separators=(",", ":")).encode()


def gbp_run(recording, object_ref):
    global gbp_n
    t = FixtureTransport(os.path.join(GBP, "fixtures", recording))
    c = GbpConnector(transport=t)
    r = c.connect(CredentialRef(ref=FIXTURE_CREDENTIAL_REF, credential_type="none"))
    assert r.ok, f"connect failed for {recording}: {r}"
    res = c.read(object_ref)
    assert res.outcome == FetchOutcome.SUCCEEDED, f"read {object_ref} failed: {res}"
    for o in res.observations:
        envelopes.append({
            "source": "connector:google-business-profile:lane-conn",
            "eventType": "OBJECT_CREATED",
            "logicalId": o.canonical_id,
            "confidence": _conf(o),
            "lifecycleStage": "observation",
            "evidence": [hashlib.sha256(stable_bytes(o)).hexdigest()],
            "payload": {
                "kind": "gbp_location" if o.object_type == "location" else "gbp_review",
                "object_type": o.object_type,
                "canonical_id": o.canonical_id,
                "source_record_id": o.source_record_id,
                "fields": o.fields,
                "provider": o.provenance.provider,
                "connector_version": o.provenance.connector_version,
                "confidence_grade": str(o.confidence),
            },
        })
        gbp_n += 1


gbp_run("rec-a-locations.jsonl", "locations")
gbp_run("rec-b-reviews.jsonl", "reviews:accounts/107000000000000000001/locations/900001")

out = os.path.join(WIRE, "milestone-envelopes.jsonl")
with open(out, "w", encoding="utf-8") as f:
    for e in envelopes:
        f.write(json.dumps(e) + "\n")
print(f"github={gh_n} gbp={gbp_n} total={len(envelopes)} -> {out}")
