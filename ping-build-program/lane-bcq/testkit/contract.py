"""Connector contract: types, error taxonomy, and the Connector interface.

This is the testable contract surface the BCQ lane defines for every PING
connector. It deliberately mirrors the mandatory declaration in
~/workspace/business-connectors/hidden_files/connector-contract.md
(lifecycle, failure contract, provenance envelope) but stays small enough to
freeze without waiting for the 2-3 implementation convergence round.

Error taxonomy: aligned to lane K's standard list. Lane K owns the canonical
taxonomy; the mapping below is BCQ's proposed alignment. If lane K revises a
name, only ErrorClass values change, no harness logic changes.
"""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Optional


# ---------------------------------------------------------------------------
# Error taxonomy (lane K alignment; lane K is the canonical owner)
# ---------------------------------------------------------------------------
class ErrorClass(str, Enum):
    AUTH_REQUIRED = "AUTH_REQUIRED"
    AUTH_EXPIRED = "AUTH_EXPIRED"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    RATE_LIMITED = "RATE_LIMITED"
    SOURCE_UNAVAILABLE = "SOURCE_UNAVAILABLE"
    SOURCE_CHANGED = "SOURCE_CHANGED"
    SCHEMA_CHANGED = "SCHEMA_CHANGED"
    INVALID_PAYLOAD = "INVALID_PAYLOAD"
    CONFLICT = "CONFLICT"
    TIMEOUT = "TIMEOUT"          # OUTCOME_UNKNOWN family: sent, no definitive response
    TRANSIENT = "TRANSIENT"
    PERMANENT = "PERMANENT"
    UNSUPPORTED = "UNSUPPORTED"   # added 2026-09-24: lane-K v1 taxonomy class 2.9 (405/501)


class Lifecycle(str, Enum):
    DISABLED = "DISABLED"
    AUTHORIZED = "AUTHORIZED"
    DEGRADED = "DEGRADED"
    SUSPENDED = "SUSPENDED"
    REVOKED = "REVOKED"
    RETIRED = "RETIRED"


class Confidence(str, Enum):
    DIRECT = "DIRECT"
    DERIVED = "DERIVED"
    INFERRED = "INFERRED"
    OWNER_ASSERTED = "OWNER_ASSERTED"
    CONFLICTING = "CONFLICTING"
    UNKNOWN = "UNKNOWN"


class FetchOutcome(str, Enum):
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    OUTCOME_UNKNOWN = "OUTCOME_UNKNOWN"
    NOT_STARTED = "NOT_STARTED"


# ---------------------------------------------------------------------------
# Declaration surface (what a connector must expose)
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class ConnectorIdentity:
    source_id: str            # stable provider id, e.g. "github"
    name: str                 # human name
    version: str              # connector semver, e.g. "0.1.0"


@dataclass(frozen=True)
class AuthRequirement:
    credential_type: str      # oauth2 | api-key | session-cookie | none
    granted_by: str           # business-owner | platform-operator | public-no-auth
    scopes: tuple             # exact scopes requested; empty tuple = none
    consent_record: str       # where the grant is stored / re-verified


@dataclass(frozen=True)
class Capability:
    capability: str           # verb.object, e.g. "read.issues"
    provider_objects: tuple   # provider-side object names
    max_window: str           # e.g. "90d"
    realtime: bool


@dataclass(frozen=True)
class RateBudget:
    calls_per_window: int
    window_seconds: int
    burst_per_minute: int
    max_attempts: int = 3     # retry budget: max attempts per fetch, all states


@dataclass(frozen=True)
class Freshness:
    poll_cadence: str
    staleness_tolerance: str
    revalidation_triggers: tuple


@dataclass(frozen=True)
class Declaration:
    identity: ConnectorIdentity
    auth: AuthRequirement
    capabilities: tuple
    rate_budget: RateBudget
    freshness: Freshness
    failure_modes: tuple      # names of handled modes, e.g. ("provider-down", ...)
    cost_per_call_usd: float
    monthly_budget_cap_usd: float

    def missing_fields(self) -> list:
        missing = []
        if not self.identity.source_id:
            missing.append("identity.source_id")
        if not self.identity.version:
            missing.append("identity.version")
        if not self.capabilities:
            missing.append("capabilities")
        if self.rate_budget.calls_per_window <= 0:
            missing.append("rate_budget.calls_per_window")
        if not self.failure_modes:
            missing.append("failure_modes")
        return missing


# ---------------------------------------------------------------------------
# Runtime surface (observations, provenance, errors, checkpoints)
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class Provenance:
    provider: str             # == identity.source_id
    source_record_id: str     # provider's id for this record
    fetched_at: str           # ISO-8601
    fetch_attempt_id: str     # uuid of the fetch attempt
    connector_version: str    # semver


@dataclass(frozen=True)
class NormalizedObservation:
    canonical_id: str         # stable id derived from provider + source_record_id
    source_record_id: str
    object_type: str
    fields: dict              # normalized, sanitized, canonical JSON-able
    provenance: Provenance
    confidence: Confidence
    deleted: bool = False
    version: int = 1          # increments when the source record changes

    def canonical_bytes(self) -> bytes:
        """Deterministic byte representation used for determinism/idempotency."""
        payload = {
            "canonical_id": self.canonical_id,
            "source_record_id": self.source_record_id,
            "object_type": self.object_type,
            "fields": self.fields,
            "provider": self.provenance.provider,
            "connector_version": self.provenance.connector_version,
            "confidence": self.confidence.value,
            "deleted": self.deleted,
            "version": self.version,
        }
        return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()


@dataclass(frozen=True)
class CredentialRef:
    """Opaque reference, never a raw secret. The connector boundary holds secrets."""
    ref: str
    credential_type: str


@dataclass(frozen=True)
class ConnectResult:
    ok: bool
    lifecycle: Lifecycle
    error_class: Optional[ErrorClass] = None
    detail: str = ""


@dataclass(frozen=True)
class HealthState:
    lifecycle: Lifecycle
    error_class: Optional[ErrorClass] = None
    detail: str = ""


@dataclass(frozen=True)
class DiscoveryResult:
    objects: tuple            # object refs the connector knows about
    checkpoint: str           # opaque resume cursor after this discovery
    error_class: Optional[ErrorClass] = None
    detail: str = ""


@dataclass(frozen=True)
class FetchResult:
    outcome: FetchOutcome
    observations: tuple       # NormalizedObservation
    checkpoint: Optional[str] # new checkpoint; None when unchanged
    error_class: Optional[ErrorClass] = None
    detail: str = ""
    attempt_id: str = ""
    attempts_made: int = 1
    partial: bool = False
    missing_fields: tuple = ()


@dataclass(frozen=True)
class RateLimitState:
    calls_remaining: int
    window_reset_at: str      # ISO-8601
    exhausted: bool


class ConnectorError(Exception):
    """Typed connector failure. Carries the lane-K error class."""
    def __init__(self, error_class: ErrorClass, detail: str = ""):
        super().__init__(f"{error_class.value}: {detail}")
        self.error_class = error_class
        self.detail = detail


# ---------------------------------------------------------------------------
# The interface under test
# ---------------------------------------------------------------------------
class Connector:
    """Base interface every PING connector implements.

    A connector NEVER handles raw secrets in this harness: connect() takes an
    opaque CredentialRef. In production the secret lives behind the connector
    boundary (lane L secret broker); the harness asserts nothing secret-shaped
    leaks into observations, checkpoints, or logs.
    """

    def declaration(self) -> Declaration:
        raise NotImplementedError

    def connect(self, credential: CredentialRef) -> ConnectResult:
        raise NotImplementedError

    def disconnect(self) -> None:
        raise NotImplementedError

    def health(self) -> HealthState:
        raise NotImplementedError

    def discover(self, cursor: Optional[str] = None) -> DiscoveryResult:
        raise NotImplementedError

    def read(self, object_ref: str, checkpoint: Optional[str] = None) -> FetchResult:
        raise NotImplementedError

    def checkpoint(self) -> Optional[str]:
        """Return the connector's current resume checkpoint (opaque)."""
        raise NotImplementedError

    def rate_limit_state(self) -> RateLimitState:
        raise NotImplementedError

    def normalize(self, raw: Any, object_type: str, attempt_id: str) -> list:
        """Normalize one raw provider payload into observations.

        Must be deterministic: same input bytes -> same normalized bytes.
        """
        raise NotImplementedError


def canonical_observation_id(provider: str, source_record_id: str) -> str:
    digest = hashlib.sha256(f"{provider}:{source_record_id}".encode()).hexdigest()[:32]
    return f"obs_{provider}_{digest}"


# Secret-shaped patterns: real secret formats that must NEVER appear in
# observations, checkpoints, or logs. Used by normalization (redact) and the
# harness (assert). Keep in contract.py so fixtures and harness share one list.
SECRET_PATTERNS = [
    re.compile(r"sk_(live|test)_[A-Za-z0-9]{8,}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"gho_[A-Za-z0-9]{20,}"),
    re.compile(r"xox[bap]-"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"AIza[0-9A-Za-z_-]{20,}"),
    re.compile(r"[Bb]earer\s+[A-Za-z0-9._~+/-]{16,}"),
    re.compile(r"(?i)(api[_-]?key|client[_-]?secret|access[_-]?token)\s*[:=]\s*['\"]?[A-Za-z0-9._-]{12,}"),
]


def redact_secrets(text: str) -> tuple:
    """Replace secret-shaped substrings with [REDACTED]. Returns (text, redacted_bool)."""
    redacted = False
    for pat in SECRET_PATTERNS:
        if pat.search(text):
            text = pat.sub("[REDACTED]", text)
            redacted = True
    return text, redacted


def to_public_dict(obj: Any) -> dict:
    """JSON-safe dict of any dataclass, for log/secret scanning."""
    if hasattr(obj, "__dataclass_fields__"):
        return json.loads(json.dumps(asdict(obj), default=str))
    return json.loads(json.dumps(obj, default=str))
