"""PING gateway client for git ingestion packets.

This is the ONLY module in the pipeline allowed network imports, and it
may only contact the configured PING gateway URL: POST {gateway}/ingest
with body {source, eventType, payload, namespace?, logicalId?} and
Bearer auth (wire format per
compiler-aggregator-foundation:integration/event-sink/src/event-sink.ts).

It NEVER contacts repo-derived URLs: submodule URLs, LFS endpoints, and
remote URLs from ingested content are never fetch targets (T-02, T-10).

The bearer key comes from the explicit argument or the
PING_INGEST_BEARER_KEY environment variable only. It is never logged,
never embedded in source, and never placed anywhere except the
Authorization header of the gateway request.
"""

from __future__ import annotations

import json
import os

_BEARER_ENV_VAR = "PING_INGEST_BEARER_KEY"
_SOURCE = "git-ingest"


def _resolve_bearer_key(bearer_key: str | None) -> str:
    key = bearer_key if bearer_key else os.environ.get(_BEARER_ENV_VAR)
    if not key or not key.strip():
        raise ValueError(
            "ingest_client: bearer key required "
            f"(argument or {_BEARER_ENV_VAR} environment variable)"
        )
    return key


def _check_gateway_url(gateway_url: str) -> str:
    if not gateway_url or not gateway_url.strip():
        raise ValueError("ingest_client: gateway_url is required")
    url = gateway_url.strip()
    lowered = url.lower()
    if not (lowered.startswith("http://") or lowered.startswith("https://")):
        raise ValueError("ingest_client: gateway_url must be an http(s) URL")
    return url.rstrip("/")


def build_ingest_request(
    gateway_url: str, observation: dict, bearer_key: str | None = None
) -> dict:
    """Build the exact wire request for POST /ingest. Pure: no I/O.

    Returns {"url", "headers", "body"}. The observation is a packet-level
    observation dict carrying envelope, eventType, payload, and
    logicalId; the wire body nests it as
    {source, eventType, payload:{envelope, observation, principal},
     namespace, logicalId}. The bearer key appears ONLY in the
    Authorization header; it is never logged and never in the body.
    """
    url = _check_gateway_url(gateway_url) + "/ingest"
    key = _resolve_bearer_key(bearer_key)
    event_type = observation.get("eventType")
    envelope = observation.get("envelope") or {}
    payload_data = observation.get("payload")
    logical_id = observation.get("logicalId")
    if not event_type:
        raise ValueError("ingest_client: observation is missing eventType")
    if not isinstance(envelope, dict) or not envelope.get("principal"):
        raise ValueError("ingest_client: observation envelope is missing principal")
    body = {
        "source": _SOURCE,
        "eventType": event_type,
        "payload": {
            "envelope": envelope,
            "observation": payload_data,
            "principal": envelope["principal"],
        },
        "namespace": envelope.get("namespace"),
        "logicalId": logical_id,
    }
    # Drop None optionals to keep the wire body clean.
    body = {k: v for k, v in body.items() if v is not None}
    return {
        "url": url,
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + key,
        },
        "body": json.dumps(body),
    }


def post_packet(
    packet,
    gateway_url: str,
    bearer_key: str | None = None,
    dry_run: bool = True,
) -> dict:
    """Post every observation in a packet to the PING gateway.

    dry_run=True (default): validate and build every would-be request
    with ZERO network traffic; returns {"dry_run": True, "requests":
    [...], "count": n}. dry_run=False performs the POSTs via requests
    and returns per-request {status, ok} results.
    """
    requests_built = [
        build_ingest_request(gateway_url, obs, bearer_key)
        for obs in packet.observations
    ]
    if dry_run:
        return {"dry_run": True, "requests": requests_built, "count": len(requests_built)}
    import requests

    results = []
    for req in requests_built:
        resp = requests.post(req["url"], headers=req["headers"], data=req["body"], timeout=30)
        results.append({"status": resp.status_code, "ok": resp.ok})
    return {"dry_run": False, "results": results, "count": len(results)}


__all__ = ["build_ingest_request", "post_packet"]
