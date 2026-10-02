"""Fake connector fixture: a scriptable in-memory connector implementing the contract.

FakeWidgetCRM models a small provider (widgets) with:
  - a mutable remote object store (the fake provider side)
  - scriptable failure modes (auth denial, expiry, rate limit, timeout, malformed)
  - token-bucket rate limiting honoring its declared RateBudget
  - opaque checkpoints encoding the last-seen (updated_at, id)
  - deterministic normalization with full provenance

The harness drives this fixture through every test. A real connector adapter
replaces this class behind the same interface and inherits the whole suite.
"""
from __future__ import annotations

import base64
import json
import re
import uuid
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from .contract import (
    AuthRequirement,
    Capability,
    Confidence,
    ConnectResult,
    Connector,
    ConnectorError,
    ConnectorIdentity,
    CredentialRef,
    Declaration,
    DiscoveryResult,
    ErrorClass,
    FetchOutcome,
    FetchResult,
    Freshness,
    HealthState,
    Lifecycle,
    NormalizedObservation,
    Provenance,
    RateBudget,
    RateLimitState,
    canonical_observation_id,
    redact_secrets,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


class FakeWidgetCRM(Connector):
    """Scriptable fake. Provider-side store lives in `remote`; the harness
    mutates it between reads to simulate changed input, deletions, etc."""

    VALID_REF = "credref_valid_1"
    EXPIRED_REF = "credref_expired_1"

    def __init__(self, calls_per_window: int = 100, window_seconds: int = 3600):
        self.remote: dict = {}            # id -> {"fields": {...}, "updated_at": iso, "deleted": bool}
        self.mode: str = "ok"             # ok | malformed
        self._lifecycle = Lifecycle.DISABLED
        self._calls_made = 0
        self._budget = RateBudget(
            calls_per_window=calls_per_window,
            window_seconds=window_seconds,
            burst_per_minute=60,
            max_attempts=3,
        )
        self._window_start = _utcnow()
        self._last_checkpoint: Optional[str] = None
        self.attempt_log: list = []       # every provider call, for retry-storm audits

    # -- declaration ------------------------------------------------------
    def declaration(self) -> Declaration:
        return Declaration(
            identity=ConnectorIdentity(
                source_id="fake-widget-crm",
                name="Fake Widget CRM",
                version="0.1.0",
            ),
            auth=AuthRequirement(
                credential_type="api-key",
                granted_by="business-owner",
                scopes=("read:widgets",),
                consent_record="owner consent record, re-verified on 401",
            ),
            capabilities=(
                Capability(capability="read.widgets", provider_objects=("widget",),
                           max_window="365d", realtime=False),
            ),
            rate_budget=self._budget,
            freshness=Freshness(
                poll_cadence="6h",
                staleness_tolerance="24h",
                revalidation_triggers=("owner correction filed",),
            ),
            failure_modes=("provider-down", "rate-limited", "malformed-response",
                           "auth-expired", "partial-success", "tos-change"),
            cost_per_call_usd=0.0,
            monthly_budget_cap_usd=0.0,
        )

    # -- lifecycle ---------------------------------------------------------
    def connect(self, credential: CredentialRef) -> ConnectResult:
        if credential.ref == self.VALID_REF:
            self._lifecycle = Lifecycle.AUTHORIZED
            return ConnectResult(ok=True, lifecycle=self._lifecycle)
        if credential.ref == self.EXPIRED_REF:
            self._lifecycle = Lifecycle.SUSPENDED
            return ConnectResult(ok=False, lifecycle=self._lifecycle,
                                 error_class=ErrorClass.AUTH_EXPIRED,
                                 detail="credential expired; re-consent required")
        self._lifecycle = Lifecycle.DISABLED
        return ConnectResult(ok=False, lifecycle=self._lifecycle,
                             error_class=ErrorClass.AUTH_REQUIRED,
                             detail="credential rejected by provider")

    def disconnect(self) -> None:
        self._lifecycle = Lifecycle.REVOKED

    def health(self) -> HealthState:
        if self._lifecycle == Lifecycle.REVOKED:
            return HealthState(lifecycle=self._lifecycle,
                               error_class=ErrorClass.AUTH_REQUIRED,
                               detail="consent revoked; no fetches permitted")
        if self._lifecycle == Lifecycle.SUSPENDED:
            return HealthState(lifecycle=self._lifecycle,
                               error_class=ErrorClass.AUTH_EXPIRED,
                               detail="auth expired")
        return HealthState(lifecycle=self._lifecycle)

    # -- rate limiting ------------------------------------------------------
    def _consume_call(self, op: str) -> bool:
        now = _utcnow()
        if (now - self._window_start).total_seconds() >= self._budget.window_seconds:
            self._window_start = now
            self._calls_made = 0
        self.attempt_log.append({"op": op, "at": _iso(now)})
        if self._calls_made >= self._budget.calls_per_window:
            return False
        self._calls_made += 1
        return True

    def rate_limit_state(self) -> RateLimitState:
        remaining = max(0, self._budget.calls_per_window - self._calls_made)
        reset = self._window_start + timedelta(seconds=self._budget.window_seconds)
        return RateLimitState(calls_remaining=remaining, window_reset_at=_iso(reset),
                             exhausted=remaining == 0)

    def _require_authorized(self) -> Optional[FetchResult]:
        if self._lifecycle != Lifecycle.AUTHORIZED:
            ec = ErrorClass.AUTH_REQUIRED
            detail = f"not authorized (lifecycle={self._lifecycle.value})"
            if self._lifecycle == Lifecycle.SUSPENDED:
                ec = ErrorClass.AUTH_EXPIRED
                detail = "auth expired"
            return FetchResult(outcome=FetchOutcome.FAILED, observations=(),
                               checkpoint=None, error_class=ec, detail=detail,
                               attempt_id=uuid.uuid4().hex)
        return None

    # -- discovery / read ----------------------------------------------------
    @staticmethod
    def _encode_checkpoint(updated_at: str, obj_id: str) -> str:
        return base64.urlsafe_b64encode(
            json.dumps({"updated_at": updated_at, "id": obj_id}).encode()).decode()

    @staticmethod
    def _decode_checkpoint(cursor: str) -> dict:
        try:
            return json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
        except Exception:
            return {"updated_at": "", "id": ""}

    def _changed_since(self, cursor: Optional[str]) -> list:
        cur = self._decode_checkpoint(cursor) if cursor else {"updated_at": "", "id": ""}
        items = sorted(self.remote.items(), key=lambda kv: (kv[1]["updated_at"], kv[0]))
        out = []
        for obj_id, rec in items:
            if (rec["updated_at"], obj_id) > (cur["updated_at"], cur["id"]):
                out.append((obj_id, rec))
        return out

    def discover(self, cursor: Optional[str] = None) -> DiscoveryResult:
        denied = self._require_authorized()
        if denied:
            return DiscoveryResult(objects=(), checkpoint=cursor or "",
                                   error_class=denied.error_class, detail=denied.detail)
        if not self._consume_call("discover"):
            return DiscoveryResult(objects=(), checkpoint=cursor or "",
                                   error_class=ErrorClass.RATE_LIMITED,
                                   detail="rate budget exhausted")
        changed = self._changed_since(cursor)
        refs = tuple(obj_id for obj_id, _ in changed)
        checkpoint = cursor or ""
        if changed:
            last_id, last_rec = changed[-1]
            checkpoint = self._encode_checkpoint(last_rec["updated_at"], last_id)
        self._last_checkpoint = checkpoint
        return DiscoveryResult(objects=refs, checkpoint=checkpoint)

    def read(self, object_ref: str, checkpoint: Optional[str] = None) -> FetchResult:
        denied = self._require_authorized()
        if denied:
            return denied
        attempt_id = uuid.uuid4().hex
        if not self._consume_call(f"read:{object_ref}"):
            return FetchResult(outcome=FetchOutcome.FAILED, observations=(),
                               checkpoint=checkpoint, error_class=ErrorClass.RATE_LIMITED,
                               detail="rate budget exhausted", attempt_id=attempt_id)
        if object_ref == "widget_timeout":
            # OUTCOME_UNKNOWN: request sent, no definitive response. The connector
            # records the ambiguity; it does NOT retry-storm (attempts_made stays 1
            # unless a bounded reconciliation pass runs).
            return FetchResult(outcome=FetchOutcome.OUTCOME_UNKNOWN, observations=(),
                               checkpoint=checkpoint, error_class=ErrorClass.TIMEOUT,
                               detail="no response before deadline; reconciliation required, not retry",
                               attempt_id=attempt_id, attempts_made=1)
        rec = self.remote.get(object_ref)
        if rec is None:
            return FetchResult(outcome=FetchOutcome.FAILED, observations=(),
                               checkpoint=checkpoint, error_class=ErrorClass.INVALID_PAYLOAD,
                               detail=f"unknown object ref {object_ref}", attempt_id=attempt_id)
        if self.mode == "malformed":
            return FetchResult(outcome=FetchOutcome.FAILED, observations=(),
                               checkpoint=checkpoint, error_class=ErrorClass.SCHEMA_CHANGED,
                               detail="provider schema changed; payload failed sanitization gate",
                               attempt_id=attempt_id)
        obs = self.normalize(deepcopy(rec), "widget", attempt_id)
        obs = [o for o in obs]  # list
        if obs and rec["deleted"]:
            obs[0] = NormalizedObservation(
                canonical_id=obs[0].canonical_id, source_record_id=obs[0].source_record_id,
                object_type=obs[0].object_type, fields={},
                provenance=obs[0].provenance, confidence=obs[0].confidence,
                deleted=True, version=obs[0].version)
        return FetchResult(outcome=FetchOutcome.SUCCEEDED, observations=tuple(obs),
                           checkpoint=checkpoint, attempt_id=attempt_id)

    def checkpoint(self) -> Optional[str]:
        return self._last_checkpoint

    # -- normalization --------------------------------------------------------
    _HOSTILE_PATTERNS = (
        re.compile(r"<script.*?>.*?</script>", re.I | re.S),
        re.compile(r"javascript:", re.I),
        re.compile(r"\son\w+\s*=", re.I),
    )

    def normalize(self, raw: Any, object_type: str, attempt_id: str) -> list:
        """Deterministic normalization. Raises ConnectorError on hostile input."""
        if not isinstance(raw, dict) or "id" not in raw or "fields" not in raw:
            raise ConnectorError(ErrorClass.INVALID_PAYLOAD,
                                 "payload missing id/fields envelope")
        fields = raw["fields"]
        if not isinstance(fields, dict):
            raise ConnectorError(ErrorClass.INVALID_PAYLOAD, "fields must be a mapping")
        clean = {}
        for key, value in sorted(fields.items()):
            if not re.match(r"^[a-zA-Z_][a-zA-Z0-9_]{0,63}$", key):
                raise ConnectorError(ErrorClass.INVALID_PAYLOAD, f"bad field name: {key!r}")
            if isinstance(value, str):
                if len(value) > 10_000:
                    value = value[:10_000]
                    clean["_truncated"] = True
                for pat in self._HOSTILE_PATTERNS:
                    value = pat.sub("", value)
                # Secret-shaped values in provider data are redacted at the
                # connector boundary: secrets never enter observations, ever.
                value, was_redacted = redact_secrets(value)
                if was_redacted:
                    clean["_secret_redacted"] = True
                clean[key] = value.strip()
            elif isinstance(value, (int, float, bool)) or value is None:
                clean[key] = value
            else:
                raise ConnectorError(ErrorClass.INVALID_PAYLOAD,
                                     f"unsupported field type for {key!r}")
        version = int(raw.get("version", 1))
        prov = Provenance(
            provider=self.declaration().identity.source_id,
            source_record_id=str(raw["id"]),
            fetched_at=_iso(_utcnow()),
            fetch_attempt_id=attempt_id,
            connector_version=self.declaration().identity.version,
        )
        return [NormalizedObservation(
            canonical_id=canonical_observation_id(prov.provider, prov.source_record_id),
            source_record_id=prov.source_record_id,
            object_type=object_type,
            fields=clean,
            provenance=prov,
            confidence=Confidence.DIRECT,
            deleted=bool(raw.get("deleted", False)),
            version=version,
        )]

    # -- fixture helpers --------------------------------------------------------
    def seed(self, obj_id: str, fields: dict, updated_at: str, deleted: bool = False):
        """Put an object into the fake provider store."""
        self.remote[obj_id] = {"id": obj_id, "fields": dict(fields),
                               "updated_at": updated_at, "deleted": deleted,
                               "version": self.remote.get(obj_id, {}).get("version", 0) + 1}
