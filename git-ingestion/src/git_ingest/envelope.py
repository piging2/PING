"""PING source envelope for git observations.

Ports the envelope discipline from
compiler-aggregator-foundation:integration/envelope/src/envelope.ts:
same field names, same identity rule.

Identity rule (canonical, shared with the TS kit):
    sourceIdentity = sha256hex("connectorId|streamId|externalObjectId|externalRecordVersion")

sourceIdentity answers "is this the same record version?" (dedupe);
rawPayloadHash answers "did the bytes change?" (drift detection).
The envelope carries no secret material and never carries the raw
payload itself (only its hash; raw bytes stay in the evidence plane).
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from . import config


def source_identity(
    connector_id: str, stream_id: str, object_id: str, version: str
) -> str:
    """Canonical dedupe identity over the pipe-joined identity tuple."""
    joined = "|".join((connector_id, stream_id, object_id, version))
    return hashlib.sha256(joined.encode("utf-8")).hexdigest()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _require_non_empty(name: str, value: str | None) -> str:
    if value is None or str(value).strip() == "":
        raise ValueError(f"envelope: {name} is required and must be non-empty")
    return value


def build_envelope(
    *,
    stream_id: str,
    source_account: str,
    source_object_type: str,
    source_object_id: str,
    raw_payload: bytes,
    source_version: str | None = None,
    connector_id: str = config.CONNECTOR_ID,
    source_system: str = "git",
    principal: str = config.PRINCIPAL,
    namespace: str = config.NAMESPACE,
    observed_at: str | None = None,
    ingested_at: str | None = None,
    cursor: dict | None = None,
) -> dict:
    """Build a source envelope. Pure except for defaulting timestamps to now.

    source_object_type is "commit", "ref", or "tag". source_version is the
    provider record version: the commit sha for commits, the ref target
    sha at snapshot time for refs. When absent it falls back to
    "payload-sha256:<hex>" (deterministic, explicit, never invented).
    raw_payload is hashed, never stored on the envelope.
    """
    connector_id = _require_non_empty("connectorId", connector_id)
    stream_id = _require_non_empty("streamId", stream_id)
    source_system = _require_non_empty("sourceSystem", source_system)
    source_account = _require_non_empty("sourceAccount", source_account)
    source_object_type = _require_non_empty("sourceObjectType", source_object_type)
    source_object_id = _require_non_empty("sourceObjectId", source_object_id)
    principal = _require_non_empty("principal", principal)
    namespace = _require_non_empty("namespace", namespace)
    if not raw_payload:
        raise ValueError("envelope: rawPayload is required and must be non-empty")

    now = _now_iso()
    raw_payload_hash = hashlib.sha256(raw_payload).hexdigest()
    version = (
        source_version
        if source_version is not None and source_version.strip() != ""
        else f"payload-sha256:{raw_payload_hash}"
    )
    envelope = {
        "sourceSystem": source_system,
        "sourceAccount": source_account,
        "sourceObjectType": source_object_type,
        "sourceObjectId": source_object_id,
        "sourceVersion": version,
        "observedAt": observed_at or now,
        "ingestedAt": ingested_at or now,
        "principal": principal,
        "namespace": namespace,
        "rawPayloadHash": raw_payload_hash,
        "sourceIdentity": source_identity(
            connector_id, stream_id, source_object_id, version
        ),
    }
    if cursor is not None:
        envelope["cursor"] = dict(cursor)
    return envelope


def envelope_leaks_secret_material(envelope: dict, secret_markers: list[str]) -> list[str]:
    """Structural self-check: the envelope must carry no secret material."""
    import json

    haystack = json.dumps(envelope).lower()
    return [m for m in secret_markers if m.lower() in haystack]


__all__ = ["source_identity", "build_envelope", "envelope_leaks_secret_material"]
