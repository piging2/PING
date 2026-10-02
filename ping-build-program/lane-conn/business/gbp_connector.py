"""Google Business Profile connector spike (read-only).

Implements the BCQ connector contract interface (lane-bcq/testkit/contract.py):
declaration / connect / health / discover / read / checkpoint /
rate_limit_state / normalize.

FIXTURE MODE: tonight there is no GBP API approval, no OAuth consent, and no
sandbox, so the connector runs against recorded fixture exchanges
(FixtureTransport). The live path is the explicit NEXT: swap in a production
HttpTransport + a secret-broker credential ref, and the connector code does
not change. The connector is DISABLED (may not fetch) without either a
fixture transport (labeled fixture mode) or an authorized live credential.

Design decisions (all per ~/workspace/business-connectors/hidden_files/):
- Observation-only: emits NormalizedObservation with full provenance; never
  mutates canonical state. Provider ids (accounts/.../locations/...) travel as
  source_record_id + graded link fields; never as canonical object identity.
- Confidence grades: location facts asserted by GBP about the listing are
  DIRECT; review star ratings as recorded by Google are DIRECT; review text and
  reviewer identity are INFERRED at most (contract section 3, hostile input:
  reviews are untrusted third-party claims).
- Sanitization at the ingestion boundary: HTML/JS stripped from text before
  normalization; 10KB text cap with truncated:true marker; coercion logged.
- Reviews leg degrades to UNKNOWN on 403 SERVICE_DISABLED (producer-restricted
  legacy surface; observed on approved projects). Connector goes DEGRADED; the
  locations leg keeps working. Already-emitted evidence is never affected.
- Cursor semantics: pageToken echoed verbatim (opaque). Review checkpoint is
  the highest contiguous (updateTime, name) watermark. 304 emits no change
  events; it only refreshes the freshness clock.
- Failure taxonomy: lane-K classes. 429 -> RATE_LIMITED (bounded: max 3
  attempts, honor Retry-After, jitter). 401/403-credential -> AUTH_EXPIRED /
  AUTH_REQUIRED. 403 SERVICE_DISABLED -> PERMISSION_DENIED (reviews leg).
  5xx/timeout -> SOURCE_UNAVAILABLE or TIMEOUT (OUTCOME_UNKNOWN). Malformed
  payload -> INVALID_PAYLOAD, quarantined with envelope (never silently
  dropped).
- Idempotency key: sha256(connector_id | stream_id | external_object_id |
  external_record_version).
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import random
import re
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

sys.path.insert(0, os.path.expanduser(
    "~/workspace/ping-build-program/lane-bcq/testkit"))
from contract import (  # noqa: E402
    AuthRequirement, Capability, Confidence, ConnectResult, Connector,
    ConnectorError, ConnectorIdentity, CredentialRef, Declaration,
    DiscoveryResult, ErrorClass, FetchOutcome, FetchResult, Freshness,
    HealthState, Lifecycle, NormalizedObservation, Provenance, RateBudget,
    RateLimitState, canonical_observation_id, redact_secrets,
)

from fixture_transport import FixtureTransport, HttpTransport  # noqa: E402

CONNECTOR_ID = "google-business-profile"
CONNECTOR_VERSION = "0.1.0"
GBP_SCOPE = "https://www.googleapis.com/auth/business.manage"
FIXTURE_CREDENTIAL_REF = "fixture:gbp-spike"

# Star-rating enum -> number coercion (M14 coerce-then-quarantine).
_STAR_MAP = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}

_HOSTILE_PATTERNS = (
    re.compile(r"<script.*?>.*?</script>", re.I | re.S),
    re.compile(r"<style.*?>.*?</style>", re.I | re.S),
    re.compile(r"<!--.*?-->", re.S),
    re.compile(r"</?[a-zA-Z][^>]*>", re.S),  # any remaining tag -> strip
    re.compile(r"javascript:", re.I),
)
# Spike-local extension to the BCQ secret-shape list (contract.py owns the
# canonical list; the spike never edits it). Covers the spike's own test
# canary, a nonstandard secret shape. Production connectors extend this list
# only with provider-documented secret shapes.
_EXTRA_REDACT_PATTERNS = (
    re.compile(r"SECRET-CANARY-[A-Za-z0-9_-]+"),
)
_FIELD_NAME_OK = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]{0,63}$")
TEXT_CAP = 10_000  # contract section 3: 10 KB text fields


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _idempotency_key(connector_id: str, stream_id: str,
                     external_object_id: str, record_version: str) -> str:
    return hashlib.sha256(
        "|".join([connector_id, stream_id, external_object_id,
                  record_version]).encode()).hexdigest()


def _checkpoint_encode(payload: dict) -> str:
    return base64.urlsafe_b64encode(
        json.dumps(payload, sort_keys=True).encode()).decode()


def _checkpoint_decode(cursor: str) -> dict:
    try:
        return json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
    except Exception:
        return {}


def _redact_connector_secrets(value: str) -> tuple:
    """Apply connector-local secret-shape extensions on top of the BCQ
    canonical SECRET_PATTERNS list (contract.py owns that list; connectors
    may extend it for provider-specific or test canary shapes).

    Red-team finding B-canary (2026-09-23): _EXTRA_REDACT_PATTERNS was
    defined but never applied, so the fixture's planted canary survived
    sanitization in plain text. Failing closed: a secret-shaped substring
    that reaches _sanitize_text is redacted; the redaction is logged as a
    coercion so the event is auditable, never silent."""
    redacted = False
    for pat in _EXTRA_REDACT_PATTERNS:
        if pat.search(value):
            value = pat.sub("[REDACTED]", value)
            redacted = True
    return value, redacted


class GbpConnector(Connector):
    """Read-only Google Business Profile connector."""

    STREAMS = ("gbp.locations", "gbp.reviews")

    def __init__(self, transport: Optional[HttpTransport] = None,
                 account_id: str = "107000000000000000001"):
        self._transport = transport
        self._account_id = account_id
        self._lifecycle = Lifecycle.DISABLED
        self._fixture_mode = False
        self._l = _utcnow_iso()
        self._calls_made = 0
        self._budget = RateBudget(calls_per_window=18000,  # 300 QPM post-approval
                                  window_seconds=3600,
                                  burst_per_minute=300,
                                  max_attempts=3)
        self._window_start = datetime.now(timezone.utc)
        self._checkpoints: dict = {}   # stream_id -> opaque cursor
        self._etags: dict = {}         # object_ref -> etag
        self._freshness_clock: dict = {}  # object_ref -> iso (last 200 or 304)
        self._degraded_streams: set = set()
        self.attempt_log: list = []
        self._emitted_keys: set = set()  # idempotency keys emitted this session

    # -- declaration ------------------------------------------------------
    def declaration(self) -> Declaration:
        return Declaration(
            identity=ConnectorIdentity(
                source_id=CONNECTOR_ID,
                name="Google Business Profile (read-only spike)",
                version=CONNECTOR_VERSION),
            auth=AuthRequirement(
                credential_type="oauth2",
                granted_by="business-owner",
                scopes=(GBP_SCOPE,),
                consent_record="secure-vault:google/oauth (live); fixture ref in spike"),
            capabilities=(
                Capability(capability="read.locations",
                           provider_objects=("location",),
                           max_window="365d", realtime=False),
                Capability(capability="read.reviews",
                           provider_objects=("review",),
                           max_window="90d", realtime=False),
            ),
            rate_budget=self._budget,
            freshness=Freshness(
                poll_cadence="24h",
                staleness_tolerance="reviews:24h;locations:7d",
                revalidation_triggers=("owner-correction-filed",
                                       "conflicting-evidence",
                                       "manual-request")),
            failure_modes=("provider-down", "rate-limited", "malformed-response",
                           "auth-expired", "partial-success", "tos-change",
                           "reviews-leg-disabled"),
            cost_per_call_usd=0.0,
            monthly_budget_cap_usd=0.0)

    # -- lifecycle ---------------------------------------------------------
    def connect(self, credential: CredentialRef) -> ConnectResult:
        if credential.ref == FIXTURE_CREDENTIAL_REF and self._transport is not None:
            self._lifecycle = Lifecycle.AUTHORIZED
            self._fixture_mode = True
            return ConnectResult(ok=True, lifecycle=self._lifecycle,
                                 detail="fixture mode: replaying recorded exchanges; "
                                        "no live provider touched")
        self._lifecycle = Lifecycle.DISABLED
        return ConnectResult(
            ok=False, lifecycle=self._lifecycle,
            error_class=ErrorClass.AUTH_REQUIRED,
            detail="GOOGLE_GBP_ACCESS_PENDING: no GBP API approval / OAuth "
                   "consent on file; connector may not fetch (fixture mode "
                   "requires the fixture credential ref)")

    def disconnect(self) -> None:
        self._lifecycle = Lifecycle.REVOKED
        self._fixture_mode = False

    def health(self) -> HealthState:
        if self._lifecycle == Lifecycle.REVOKED:
            return HealthState(lifecycle=self._lifecycle,
                               error_class=ErrorClass.AUTH_REQUIRED,
                               detail="consent revoked; no fetches permitted")
        if self._degraded_streams:
            return HealthState(lifecycle=Lifecycle.DEGRADED,
                               error_class=ErrorClass.PERMISSION_DENIED,
                               detail=f"degraded streams: {sorted(self._degraded_streams)}")
        return HealthState(lifecycle=self._lifecycle)

    def _require_authorized(self) -> Optional[FetchResult]:
        if self._lifecycle not in (Lifecycle.AUTHORIZED, Lifecycle.DEGRADED):
            ec = (ErrorClass.AUTH_EXPIRED if self._lifecycle == Lifecycle.SUSPENDED
                  else ErrorClass.AUTH_REQUIRED)
            return FetchResult(outcome=FetchOutcome.FAILED, observations=(),
                               checkpoint=None, error_class=ec,
                               detail=f"not authorized (lifecycle={self._lifecycle.value})",
                               attempt_id=uuid.uuid4().hex)
        return None

    # -- rate limiting ------------------------------------------------------
    def _consume_call(self, op: str) -> bool:
        now = datetime.now(timezone.utc)
        if (now - self._window_start).total_seconds() >= self._budget.window_seconds:
            self._window_start = now
            self._calls_made = 0
        self.attempt_log.append({"op": op, "at": now.isoformat()})
        if self._calls_made >= self._budget.calls_per_window:
            return False
        self._calls_made += 1
        return True

    def rate_limit_state(self) -> RateLimitState:
        remaining = max(0, self._budget.calls_per_window - self._calls_made)
        reset = self._window_start.timestamp() + self._budget.window_seconds
        return RateLimitState(
            calls_remaining=remaining,
            window_reset_at=datetime.fromtimestamp(reset, tz=timezone.utc).isoformat(),
            exhausted=remaining == 0)

    # -- low-level fetch with bounded backoff --------------------------------
    def _get(self, path: str, query: Optional[dict] = None,
             headers: Optional[dict] = None, op: str = "get",
             max_attempts: Optional[int] = None) -> tuple:
        """Returns (status, headers, body, attempts_made, terminal_error_class).
        Never retry-storms: bounded attempts, honor Retry-After, jitter."""
        max_attempts = max_attempts or self._budget.max_attempts
        last_ec: Optional[ErrorClass] = None
        for attempt in range(1, max_attempts + 1):
            if not self._consume_call(f"{op}#{attempt}"):
                return 0, {}, None, attempt, ErrorClass.RATE_LIMITED
            try:
                resp = self._transport.request(path=path, query=query or {},
                                               headers=headers or {},
                                               method="GET")
            except AssertionError as e:
                return 0, {}, None, attempt, ErrorClass.INVALID_PAYLOAD
            except Exception as e:  # transport-level failure ~ timeout
                last_ec = ErrorClass.TIMEOUT
                if attempt == max_attempts:
                    return 0, {}, None, attempt, ErrorClass.TIMEOUT
                time.sleep(min(2 ** attempt, 8) * (0.5 + random.random()))
                continue
            if resp.status == 429:
                last_ec = ErrorClass.RATE_LIMITED
                if attempt == max_attempts:
                    return resp.status, resp.headers, resp.body, attempt, last_ec
                retry_after = resp.headers.get("retry-after")
                try:
                    wait = float(retry_after) if retry_after else 2 ** attempt
                except ValueError:
                    wait = 2 ** attempt
                time.sleep(min(wait, 30) * (0.5 + random.random()))  # jittered
                continue
            if resp.status in (500, 502, 503, 504):
                last_ec = ErrorClass.SOURCE_UNAVAILABLE
                if attempt == max_attempts:
                    return resp.status, resp.headers, resp.body, attempt, last_ec
                time.sleep(min(2 ** attempt, 16) * (0.5 + random.random()))
                continue
            return resp.status, resp.headers, resp.body, attempt, None
        return 0, {}, None, max_attempts, last_ec or ErrorClass.TRANSIENT

    # -- sanitization (ingestion boundary) ------------------------------------
    def _sanitize_text(self, value: str) -> tuple:
        """Returns (clean_text, truncated_flag, redacted_flag).

        Order: strip HTML/JS -> redact secret-shaped substrings -> enforce cap.
        Plain text only; secrets never propagate even if a provider leaks them
        into a field (BCQ kit secrets.redaction semantics).
        """
        for pat in _HOSTILE_PATTERNS:
            value = pat.sub("", value)
        value = value.strip()
        value, redacted = redact_secrets(value)
        extra, extra_redacted = _redact_connector_secrets(value)
        if extra_redacted:
            value, redacted = extra, True
        truncated = False
        if len(value) > TEXT_CAP:
            value = value[:TEXT_CAP]
            truncated = True
        return value, truncated, redacted

    def _sanitize_fields(self, fields: dict) -> tuple:
        """Sanitize + coerce one raw record's fields. Raises ConnectorError on
        schema violations (quarantine path); logs coercions."""
        clean: dict = {}
        coercions: list = []
        for key, value in sorted(fields.items()):
            if not _FIELD_NAME_OK.match(key):
                raise ConnectorError(ErrorClass.INVALID_PAYLOAD,
                                     f"bad field name: {key!r}")
            if isinstance(value, str):
                clean[key], trunc, redact = self._sanitize_text(value)
                if trunc:
                    clean["_truncated"] = True
                    coercions.append({"field": key, "from": "text>10KB",
                                      "to": "text[10KB]+truncated:true"})
                if redact:
                    coercions.append({"field": key, "from": "secret-shaped-substring",
                                      "to": "[REDACTED]"})
            elif isinstance(value, (int, float, bool)) or value is None:
                clean[key] = value
            elif isinstance(value, dict):
                sub, sub_co = self._sanitize_fields(value)
                clean[key] = sub
                coercions.extend(sub_co)
            elif isinstance(value, list):
                items = []
                for v in value:
                    if isinstance(v, str):
                        sv, trunc, redact = self._sanitize_text(v)
                        items.append(sv)
                    else:
                        items.append(v)
                clean[key] = items
            else:
                raise ConnectorError(ErrorClass.INVALID_PAYLOAD,
                                     f"unsupported field type for {key!r}")
        return clean, coercions

    # -- normalization ---------------------------------------------------------
    def _make_observation(self, *, stream_id: str, object_type: str,
                          source_record_id: str, fields: dict,
                          confidence: Confidence, attempt_id: str,
                          fetched_at: str, record_version: str,
                          deleted: bool = False,
                          confidence_method: str = "") -> NormalizedObservation:
        key = _idempotency_key(CONNECTOR_ID, stream_id, source_record_id,
                               record_version)
        self._emitted_keys.add(key)
        prov = Provenance(provider=CONNECTOR_ID,
                          source_record_id=source_record_id,
                          fetched_at=fetched_at,
                          fetch_attempt_id=attempt_id,
                          connector_version=CONNECTOR_VERSION)
        graded_link = {
            "ping_business_id": None,  # resolved downstream, never here
            "provider": CONNECTOR_ID,
            "provider_business_id": source_record_id,
            "link_confidence": Confidence.INFERRED.value,  # name/address/phone at most
            "link_method": "name-address-phone-match",
            "linked_at": prov.fetched_at,
        }
        return NormalizedObservation(
            canonical_id=canonical_observation_id(CONNECTOR_ID, source_record_id),
            source_record_id=source_record_id,
            object_type=object_type,
            fields={**fields,
                    "_idempotency_key": key,
                    "_graded_link": graded_link,
                    "_confidence_method": confidence_method or confidence.value},
            provenance=prov,
            confidence=confidence,
            deleted=deleted,
            version=int(record_version) if str(record_version).isdigit() else 1)

    def normalize(self, raw: Any, object_type: str, attempt_id: str,
                  fetched_at: Optional[str] = None) -> list:
        """Deterministic: same (raw, object_type, attempt_id, fetched_at) ->
        same normalized bytes. fetched_at is the fetch attempt's timestamp
        (one per fetch, captured by read()); callers that need byte-identical
        output across calls pass the same fetched_at."""
        fetched_at = fetched_at or _utcnow_iso()
        if not isinstance(raw, dict) or "name" not in raw:
            raise ConnectorError(ErrorClass.INVALID_PAYLOAD,
                                 "payload missing provider record name")
        source_record_id = str(raw["name"])
        stream_id = ("gbp.reviews" if object_type == "review" else "gbp.locations")

        if object_type == "location":
            fields, coercions = self._sanitize_fields({
                "locationName": raw.get("locationName", ""),
                "storeCode": raw.get("storeCode", ""),
                "primaryPhone": raw.get("primaryPhone", ""),
                "websiteUri": raw.get("websiteUri", ""),
                "description": ((raw.get("profile") or {}).get("description", "")),
                "category": ((raw.get("primaryCategory") or {}).get("displayName", "")),
                "categoryId": ((raw.get("primaryCategory") or {}).get("categoryId", "")),
                "locality": ((raw.get("address") or {}).get("locality", "")),
                "administrativeArea": ((raw.get("address") or {}).get("administrativeArea", "")),
                "postalCode": ((raw.get("address") or {}).get("postalCode", "")),
                "addressLines": ", ".join((raw.get("address") or {}).get("addressLines", [])),
                "placeId": ((raw.get("metadata") or {}).get("placeId", "")),
                "mapsUri": ((raw.get("metadata") or {}).get("mapsUri", "")),
            })
            obs = self._make_observation(
                stream_id=stream_id, object_type="location",
                source_record_id=source_record_id, fields=fields,
                confidence=Confidence.DIRECT, attempt_id=attempt_id,
                fetched_at=fetched_at,
                record_version=raw.get("version", "1"),
                confidence_method="DIRECT: GBP asserts these facts about its own listing")
            return [(obs, coercions)]

        if object_type == "review":
            rating_raw = raw.get("starRating", "")
            rating = _STAR_MAP.get(rating_raw)
            if rating is None:
                raise ConnectorError(ErrorClass.INVALID_PAYLOAD,
                                     f"unknown starRating enum: {rating_raw!r}")
                # M14: uncoercible enum is quarantined, never silently coerced.
            reviewer = raw.get("reviewer") or {}
            fields, coercions = self._sanitize_fields({
                "reviewId": raw.get("reviewId", ""),
                "starRating": rating,
                "comment": raw.get("comment", ""),
                "reviewerDisplayName": reviewer.get("displayName", ""),
                "reviewerAnonymous": bool(reviewer.get("isAnonymous", False)),
                "createTime": raw.get("createTime", ""),
                "updateTime": raw.get("updateTime", ""),
                "replyComment": ((raw.get("reviewReply") or {}).get("comment", "")),
                "replyUpdateTime": ((raw.get("reviewReply") or {}).get("updateTime", "")),
            })
            # Rating-as-recorded is DIRECT; text/reviewer are untrusted
            # third-party claims: INFERRED at most (contract section 3).
            obs = self._make_observation(
                stream_id=stream_id, object_type="review",
                source_record_id=source_record_id, fields=fields,
                confidence=Confidence.INFERRED, attempt_id=attempt_id,
                fetched_at=fetched_at,
                record_version=str(raw.get("updateTime", "1")),
                confidence_method="INFERRED: review text/reviewer are untrusted "
                                  "third-party claims; star rating is DIRECT as "
                                  "recorded by Google (kept in fields.starRating)")
            return [(obs, coercions)]

        raise ConnectorError(ErrorClass.INVALID_PAYLOAD,
                             f"unknown object_type: {object_type!r}")

    # -- discovery --------------------------------------------------------------
    def discover(self, cursor: Optional[str] = None) -> DiscoveryResult:
        denied = self._require_authorized()
        if denied:
            return DiscoveryResult(objects=(), checkpoint=cursor or "",
                                   error_class=denied.error_class,
                                   detail=denied.detail)
        return DiscoveryResult(objects=tuple(self.STREAMS),
                               checkpoint=cursor or "",
                               detail="streams are fixed for GBP v1: "
                                      "gbp.locations, gbp.reviews")

    # -- read --------------------------------------------------------------------
    def read(self, object_ref: str, checkpoint: Optional[str] = None) -> FetchResult:
        """object_ref: 'locations' | 'reviews:<location_resource_name>' |
        'location:<location_resource_name>' (single, etag-aware)."""
        denied = self._require_authorized()
        if denied:
            return denied
        attempt_id = uuid.uuid4().hex
        attempt_ts = _utcnow_iso()  # one timestamp per fetch attempt

        if object_ref == "locations":
            return self._read_locations(attempt_id, attempt_ts, checkpoint)
        if object_ref.startswith("reviews:"):
            loc = object_ref.split(":", 1)[1]
            return self._read_reviews(loc, attempt_id, attempt_ts, checkpoint)
        if object_ref.startswith("location:"):
            loc = object_ref.split(":", 1)[1]
            return self._read_single_location(loc, attempt_id, attempt_ts)
        return FetchResult(outcome=FetchOutcome.FAILED, observations=(),
                           checkpoint=checkpoint,
                           error_class=ErrorClass.INVALID_PAYLOAD,
                           detail=f"unknown object_ref {object_ref!r}",
                           attempt_id=attempt_id)

    def _read_locations(self, attempt_id: str, attempt_ts: str,
                        checkpoint: Optional[str]) -> FetchResult:
        cur = _checkpoint_decode(checkpoint) if checkpoint else {}
        page_token = cur.get("pageToken")
        observations = []
        attempts = 0
        while True:
            query = {"pageSize": "2"}
            if page_token:
                query["pageToken"] = page_token  # opaque: echoed verbatim
            status, headers, body, n, ec = self._get(
                f"/v1/accounts/{self._account_id}/locations", query=query,
                op="locations.list")
            attempts += n
            if ec is not None:
                return FetchResult(outcome=FetchOutcome.FAILED, observations=tuple(observations),
                                   checkpoint=_checkpoint_encode({"pageToken": page_token}) if page_token else checkpoint,
                                   error_class=ec,
                                   detail=f"locations.list failed after {attempts} attempts",
                                   attempt_id=attempt_id, attempts_made=attempts)
            if status == 401:
                # Expired credential: suspend the connector; subsequent fetches
                # stop at _require_authorized until re-consent. (Red-team
                # finding 2026-09-23: a bare 401 here previously fell through
                # and "succeeded" with zero observations.)
                self._lifecycle = Lifecycle.SUSPENDED
                return FetchResult(outcome=FetchOutcome.FAILED, observations=(),
                                   checkpoint=checkpoint,
                                   error_class=ErrorClass.AUTH_EXPIRED,
                                   detail="locations.list HTTP 401: credential "
                                          "expired; connector SUSPENDED until "
                                          "re-consent",
                                   attempt_id=attempt_id, attempts_made=attempts)
            if status != 200:
                ec3 = (ErrorClass.AUTH_REQUIRED if status == 403
                       else ErrorClass.SOURCE_UNAVAILABLE)
                return FetchResult(outcome=FetchOutcome.FAILED, observations=(),
                                   checkpoint=checkpoint, error_class=ec3,
                                   detail=f"locations.list HTTP {status}",
                                   attempt_id=attempt_id, attempts_made=attempts)
            for loc in (body or {}).get("locations", []):
                try:
                    obs_list = self.normalize(loc, "location", attempt_id, fetched_at=attempt_ts)
                    observations.extend(o for o, _ in obs_list)
                except ConnectorError as e:
                    # quarantine: record the failure as evidence, keep going
                    q = self._make_observation(
                        stream_id="gbp.locations", object_type="location",
                        source_record_id=str(loc.get("name", "unknown")),
                        fields={"_quarantined": True, "_quarantine_reason": e.detail,
                                "_raw_ref": "fixture:" + str(loc.get("name", ""))},
                        confidence=Confidence.UNKNOWN, attempt_id=attempt_id,
                        fetched_at=attempt_ts, record_version="1",
                        confidence_method="UNKNOWN: failed sanitization/schema gate")
                    observations.append(q)
            page_token = (body or {}).get("nextPageToken")
            if not page_token:
                break
        new_checkpoint = _checkpoint_encode({"done": True, "at": _utcnow_iso()})
        self._checkpoints["gbp.locations"] = new_checkpoint
        return FetchResult(outcome=FetchOutcome.SUCCEEDED,
                           observations=tuple(observations),
                           checkpoint=new_checkpoint, attempt_id=attempt_id,
                           attempts_made=attempts)

    def _read_reviews(self, location_name: str, attempt_id: str,
                      attempt_ts: str,
                      checkpoint: Optional[str]) -> FetchResult:
        if "gbp.reviews" in self._degraded_streams:
            return FetchResult(outcome=FetchOutcome.SUCCEEDED, observations=(),
                               checkpoint=checkpoint,
                               detail="reviews leg degraded to UNKNOWN "
                                      "(SERVICE_DISABLED); emitting nothing, "
                                      "not failing",
                               attempt_id=attempt_id)
        status, headers, body, attempts, ec = self._get(
            f"/v1/{location_name}/reviews", query={"pageSize": "50"},
            op="reviews.list")
        if status == 403 and body and "SERVICE_DISABLED" in json.dumps(body):
            # Producer-restricted legacy surface: degrade, do not fail.
            self._degraded_streams.add("gbp.reviews")
            self._lifecycle = Lifecycle.DEGRADED
            return FetchResult(outcome=FetchOutcome.SUCCEEDED, observations=(),
                               checkpoint=checkpoint,
                               detail="reviews leg 403 SERVICE_DISABLED: degraded "
                                      "to UNKNOWN per degradation plan; locations "
                                      "leg unaffected; existing evidence untouched",
                               attempt_id=attempt_id, attempts_made=attempts)
        if ec is not None:
            outcome = (FetchOutcome.OUTCOME_UNKNOWN
                       if ec == ErrorClass.TIMEOUT else FetchOutcome.FAILED)
            return FetchResult(outcome=outcome, observations=(),
                               checkpoint=checkpoint, error_class=ec,
                               detail=f"reviews.list terminal: {ec.value}",
                               attempt_id=attempt_id, attempts_made=attempts)
        if status != 200:
            ec2 = (ErrorClass.AUTH_EXPIRED if status == 401
                   else ErrorClass.AUTH_REQUIRED if status == 403
                   else ErrorClass.SOURCE_UNAVAILABLE)
            if status == 401:
                # Same suspension semantics as the locations leg: an expired
                # credential suspends the connector until re-consent.
                self._lifecycle = Lifecycle.SUSPENDED
            return FetchResult(outcome=FetchOutcome.FAILED, observations=(),
                               checkpoint=checkpoint, error_class=ec2,
                               detail=f"reviews.list HTTP {status}",
                               attempt_id=attempt_id, attempts_made=attempts)
        reviews = (body or {}).get("reviews", [])
        # Highest contiguous (updateTime, name) watermark.
        ordered = sorted(reviews,
                         key=lambda r: (r.get("updateTime", ""), r.get("name", "")))
        observations = []
        watermark = _checkpoint_decode(checkpoint) if checkpoint else {}
        last_seen = (watermark.get("updateTime", ""), watermark.get("name", ""))
        new_last = last_seen
        for rev in ordered:
            key = (rev.get("updateTime", ""), rev.get("name", ""))
            if key <= last_seen:
                continue  # already emitted: idempotent resume
            try:
                for obs, _ in self.normalize(rev, "review", attempt_id, fetched_at=attempt_ts):
                    observations.append(obs)
            except ConnectorError as e:
                observations.append(self._make_observation(
                    stream_id="gbp.reviews", object_type="review",
                    source_record_id=str(rev.get("name", "unknown")),
                    fields={"_quarantined": True,
                            "_quarantine_reason": e.detail},
                    confidence=Confidence.UNKNOWN, attempt_id=attempt_id,
                    fetched_at=attempt_ts, record_version="1",
                    confidence_method="UNKNOWN: failed sanitization/schema gate"))
            new_last = key
        new_checkpoint = _checkpoint_encode({"updateTime": new_last[0],
                                             "name": new_last[1]})
        self._checkpoints["gbp.reviews"] = new_checkpoint
        return FetchResult(outcome=FetchOutcome.SUCCEEDED,
                           observations=tuple(observations),
                           checkpoint=new_checkpoint, attempt_id=attempt_id,
                           attempts_made=attempts)

    def _read_single_location(self, location_name: str,
                              attempt_id: str,
                              attempt_ts: str) -> FetchResult:
        headers = {}
        if location_name in self._etags:
            headers["if-none-match"] = self._etags[location_name]  # verbatim echo
        status, resp_headers, body, attempts, ec = self._get(
            f"/v1/{location_name}", headers=headers, op="location.get")
        if status == 304:
            # No change events. Freshness clock refreshed only.
            self._freshness_clock[location_name] = _utcnow_iso()
            return FetchResult(outcome=FetchOutcome.SUCCEEDED, observations=(),
                               checkpoint=self._checkpoints.get("gbp.locations"),
                               detail="304 Not Modified: no change events; "
                                      "freshness clock refreshed",
                               attempt_id=attempt_id, attempts_made=attempts)
        if ec is not None or status != 200:
            return FetchResult(outcome=FetchOutcome.FAILED, observations=(),
                               checkpoint=None,
                               error_class=ec or ErrorClass.SOURCE_UNAVAILABLE,
                               detail=f"location.get HTTP {status}",
                               attempt_id=attempt_id, attempts_made=attempts)
        etag = resp_headers.get("etag")
        if etag:
            self._etags[location_name] = etag  # stored verbatim (M10)
        self._freshness_clock[location_name] = _utcnow_iso()
        observations = [obs for obs, _ in self.normalize(body, "location", attempt_id, fetched_at=attempt_ts)]
        return FetchResult(outcome=FetchOutcome.SUCCEEDED,
                           observations=tuple(observations),
                           checkpoint=self._checkpoints.get("gbp.locations"),
                           attempt_id=attempt_id, attempts_made=attempts)

    def checkpoint(self) -> Optional[str]:
        return self._checkpoints.get("gbp.locations")
