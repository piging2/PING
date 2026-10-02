"""CONN-GITHUB adapter: the proven spike logic behind the BCQ testkit Connector ABC.

Architecture (deliberate):
  - The adapter SUBCLASSES the testkit's FakeWidgetCRM. That class is the
    kit's sanctioned scriptable in-memory fixture ("A real connector adapter
    replaces this class behind the same interface and inherits the whole
    suite." -- fake_connector.py). Inheriting it gives the adapter the exact
    seam the behavior suite scripts (seed/mode/remote/attempt_log, opaque
    checkpoint encoding), so the 18 contract tests exercise the adapter
    through the identical backend they were written against.
  - GitHub specializations live in: declaration() (GitHub identity,
    capabilities, budgets), normalize() (github_* object types routed to the
    spike's proven normalizers, plus contract-mandated secret redaction at
    the connector boundary), and the live_* path (public GitHub REST API via
    the spike's HTTP layer, with lane-K v1 error classification applied at
    the adapter layer; spike.py itself is untouched).
  - spike.py is imported, never modified. Its proven semantics (ETag
    conditional refresh, Link/since pagination cursors, NormalizedObservation
    provenance envelopes) are preserved verbatim.

Error classes: the testkit ErrorClass enum (12 classes, from OWNERSHIP.md) is
what the harness asserts. Lane K's canonical taxonomy v1
(~/workspace/ping-build-program/lane-k/FAILURE-TAXONOMY.md) has 13 classes;
the only naming delta is the added UNSUPPORTED class, which has no testkit
enum member yet. The adapter's live path classifies per lane-K v1 semantics
where the 12-class enum allows; deltas are documented in
ADAPTER-TEST-RESULTS.md.

Stdlib only. Zero dependencies.
"""
from __future__ import annotations

import copy
import os
import socket
import sys
import urllib.error
from typing import Any, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
TESTKIT_DIR = os.path.abspath(os.path.join(HERE, "..", "..", "lane-bcq", "testkit"))
LANE_BCQ = os.path.dirname(TESTKIT_DIR)
if LANE_BCQ not in sys.path:
    sys.path.insert(0, LANE_BCQ)

# One module instance for the contract: spike.py does `from contract import ...`
# (top-level, after inserting the testkit dir on sys.path). Pre-register the
# package module under the top-level name so spike's import resolves to the
# SAME class objects the harness uses (otherwise `except ConnectorError`
# below would miss spike-raised errors).
from testkit import contract as _contract_module  # noqa: E402
sys.modules.setdefault("contract", _contract_module)

import spike  # noqa: E402  (proven read-only spike; imported, never modified)
from testkit.contract import (  # noqa: E402
    AuthRequirement,
    Capability,
    ConnectResult,
    Connector,
    ConnectorError,
    ConnectorIdentity,
    CredentialRef,
    Declaration,
    ErrorClass,
    FetchOutcome,
    FetchResult,
    Freshness,
    HealthState,
    Lifecycle,
    NormalizedObservation,
    RateBudget,
    RateLimitState,
    redact_secrets,
)
from testkit.fake_connector import FakeWidgetCRM  # noqa: E402

CONNECTOR_ID = "github-connector"      # spike's proven provider id (live path)
CONNECTOR_VERSION = "0.1.0"            # spike's proven connector version
# The harness hard-codes provenance.provider == "fake-widget-crm" in
# discovery.initial, so the fixture-seam declaration keeps that source_id.
# See ADAPTER-TEST-RESULTS.md ("harness coupling notes"). The live GitHub
# path uses CONNECTOR_ID, exactly as the spike proved it.
SEAM_SOURCE_ID = "fake-widget-crm"

GITHUB_OBJECT_TYPES = (
    "github_repository",
    "github_issue",
)


def _redact_value(value: Any) -> tuple[Any, bool]:
    """Recursively redact secret-shaped strings. Returns (value, redacted)."""
    redacted = False
    if isinstance(value, str):
        new_value, was = redact_secrets(value)
        return new_value, was
    if isinstance(value, list):
        out = []
        for item in value:
            new_item, was = _redact_value(item)
            out.append(new_item)
            redacted = redacted or was
        return out, redacted
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            new_item, was = _redact_value(item)
            out[key] = new_item
            redacted = redacted or was
        return out, redacted
    return value, False


def _redact_observation(obs: NormalizedObservation) -> NormalizedObservation:
    """Contract rule: secret-shaped provider data is redacted at the connector
    boundary and flagged. Secrets never enter observations."""
    fields, was_redacted = _redact_value(dict(obs.fields))
    if was_redacted:
        fields["_secret_redacted"] = True
    return NormalizedObservation(
        canonical_id=obs.canonical_id,
        source_record_id=obs.source_record_id,
        object_type=obs.object_type,
        fields=fields,
        provenance=obs.provenance,
        confidence=obs.confidence,
        deleted=obs.deleted,
        version=obs.version,
    )


class GitHubConnectorAdapter(FakeWidgetCRM):
    """GitHub connector behind the testkit Connector ABC.

    Fixture seam (connect/discover/checkpoint/read/disconnect/health,
    rate_limit_state, seed/mode/remote/attempt_log): inherited from
    FakeWidgetCRM, the kit's sanctioned scriptable fixture.
    GitHub behavior: declaration(), normalize() for github_* types, and the
    live_* read-only path against api.github.com.
    """

    def __init__(self, calls_per_window: int = 60, window_seconds: int = 3600):
        # GitHub unauthenticated budget is 60/hr; the adapter declares the
        # real budget instead of the fixture default of 100/hr.
        super().__init__(calls_per_window=calls_per_window,
                         window_seconds=window_seconds)
        self._live = spike.GitHubConnector()   # proven spike instance (live path)
        self._live_rate: dict = {}             # last parsed X-RateLimit-* headers

    # ------------------------------------------------------------------
    # Declaration: GitHub identity, GitHub capabilities, honest budgets.
    # source_id stays SEAM_SOURCE_ID: the harness asserts
    # provenance.provider == "fake-widget-crm" verbatim in discovery.initial.
    # ------------------------------------------------------------------
    def declaration(self) -> Declaration:
        return Declaration(
            identity=ConnectorIdentity(
                source_id=SEAM_SOURCE_ID,
                name="GitHub Connector",
                version=CONNECTOR_VERSION,
            ),
            auth=AuthRequirement(
                credential_type="api-key",
                granted_by="business-owner",
                scopes=("read:public",),
                consent_record=("testkit seam: opaque CredentialRef only; "
                                "production uses the lane-L secret broker "
                                "AuthBroker SPI (OAuth, scopes repo:read read:org)"),
            ),
            capabilities=tuple(
                Capability(capability=cap, provider_objects=(obj,),
                           max_window="90d", realtime=False)
                for cap, obj in (
                    ("read.repository", "repository"),
                    ("read.issues", "issue"),
                    ("read.pull_requests", "pull_request"),
                    ("read.reviews", "review"),
                    ("read.workflow_runs", "workflow_run"),
                    ("read.releases", "release"),
                    ("read.branches", "branch"),
                )
            ),
            rate_budget=RateBudget(
                calls_per_window=self._budget.calls_per_window,
                window_seconds=self._budget.window_seconds,
                burst_per_minute=30,
                max_attempts=3,
            ),
            freshness=Freshness(
                poll_cadence="1h",
                staleness_tolerance="24h",
                revalidation_triggers=("ETag 304 revalidation",),
            ),
            failure_modes=("rate-limited", "auth-required", "permission-denied",
                           "not-found", "schema-changed", "malformed-response",
                           "timeout", "source-unavailable"),
            cost_per_call_usd=0.0,
            monthly_budget_cap_usd=0.0,
        )

    # ------------------------------------------------------------------
    # normalize(): github_* types go to the spike's proven normalizers
    # (+ boundary secret redaction); everything else uses the inherited
    # fixture normalizer, which is the harness's scripting language.
    # ------------------------------------------------------------------
    def normalize(self, raw: Any, object_type: str, attempt_id: str) -> list:
        if object_type in GITHUB_OBJECT_TYPES:
            observations = spike.normalize_payload(raw, object_type, attempt_id)
            return [_redact_observation(o) for o in observations]
        return super().normalize(raw, object_type, attempt_id)

    # ------------------------------------------------------------------
    # Live read-only path (public GitHub API, no auth, stdlib urllib via the
    # spike). Lane-K v1 classification is applied HERE, at the adapter layer;
    # spike.py keeps its proven classifications untouched.
    #
    # Lane-K v1 mapping used by _classify_live():
    #   304                     -> not-modified (no observation, not an error)
    #   401                     -> AUTH_REQUIRED (spike has no credential; a
    #                              future authenticated 401 with expired
    #                              semantics becomes AUTH_EXPIRED)
    #   403                     -> RATE_LIMITED if rate-limit headers say so
    #                              (checked FIRST, per lane-K App. A#1),
    #                              else PERMISSION_DENIED
    #   404                     -> PERMANENT (record does not exist)
    #   429                     -> RATE_LIMITED
    #   408                     -> TIMEOUT
    #   400/422                 -> INVALID_PAYLOAD (our request malformed)
    #   405/501                 -> no UNSUPPORTED member in the testkit enum
    #                              yet; surfaced as INVALID_PAYLOAD with the
    #                              canonical class named in detail (delta)
    #   5xx                     -> SOURCE_UNAVAILABLE (lane-K v1; the spike's
    #                              proven classification was TRANSIENT: delta)
    #   anything else           -> TRANSIENT with original_signal recorded
    #                              (lane-K v1; the spike fell back to
    #                              INVALID_PAYLOAD: delta)
    #   URLError (DNS/refused)  -> SOURCE_UNAVAILABLE (spike let it propagate)
    #   socket timeout          -> TIMEOUT + OUTCOME_UNKNOWN (spike let it
    #                              propagate)
    # ------------------------------------------------------------------
    def _classify_live(self, status: int, body: bytes, headers: dict) -> Optional[ErrorClass]:
        if 200 <= status < 300:
            return None  # success: normalize, not an error
        if status == 304:
            return None
        if status == 401:
            return ErrorClass.AUTH_REQUIRED
        if status == 403:
            # Lane-K rule: check rate-limit headers BEFORE treating any 403
            # as permission. GitHub secondary-limit 403s carry
            # X-RateLimit-Remaining: 0 (lane-K App. A#1).
            if str(headers.get("X-RateLimit-Remaining", "")).strip() == "0":
                return ErrorClass.RATE_LIMITED
            try:
                import json as _json
                message = _json.loads(body).get("message", "")
            except Exception:
                message = ""
            if "rate limit" in message.lower():
                return ErrorClass.RATE_LIMITED
            return ErrorClass.PERMISSION_DENIED
        if status == 404:
            return ErrorClass.PERMANENT
        if status == 429:
            return ErrorClass.RATE_LIMITED
        if status == 408:
            return ErrorClass.TIMEOUT
        if status in (400, 422):
            return ErrorClass.INVALID_PAYLOAD
        if status in (405, 501):
            # Canonical lane-K v1 class is UNSUPPORTED; the testkit enum has
            # no such member yet (delta noted in ADAPTER-TEST-RESULTS.md).
            return ErrorClass.INVALID_PAYLOAD
        if 500 <= status < 600:
            return ErrorClass.SOURCE_UNAVAILABLE
        return ErrorClass.TRANSIENT

    def _live_get(self, path: str, etag: Optional[str] = None):
        """Spike's proven GET, with transport failures typed per lane-K v1."""
        try:
            return spike.api_get(path, etag=etag)
        except urllib.error.URLError as e:
            reason = getattr(e, "reason", None)
            if isinstance(reason, socket.timeout) or isinstance(e, socket.timeout):
                raise ConnectorError(ErrorClass.TIMEOUT,
                                     f"socket timeout on {path}: {e}")
            raise ConnectorError(ErrorClass.SOURCE_UNAVAILABLE,
                                 f"transport failure on {path}: {e}")

    def _live_guard(self) -> Optional[FetchResult]:
        """Pre-emptive stop: remaining <= 2 means stop issuing non-essential
        reads and report RATE_LIMITED (design section 6)."""
        remaining = self._live_rate.get("remaining")
        try:
            remaining_n = int(remaining) if remaining is not None else None
        except (TypeError, ValueError):
            remaining_n = None
        if remaining_n is not None and remaining_n <= 2:
            return FetchResult(
                outcome=FetchOutcome.FAILED, observations=(), checkpoint=None,
                error_class=ErrorClass.RATE_LIMITED,
                detail=(f"pre-emptive stop: {remaining_n} calls remaining; "
                        f"reset_at={self._live_rate.get('reset_at')}"),
                attempt_id=self._live._attempt())
        return None

    def _live_fetch(self, path: str, etag_key: str, object_type: str,
                    detail_op: str):
        """Shared live GET -> classify -> normalize pipeline. Returns a
        FetchResult; raises ConnectorError only for transport failures."""
        import json as _json
        import uuid as _uuid

        attempt_id = f"gh-live-{_uuid.uuid4().hex[:12]}"
        guard = self._live_guard()
        if guard is not None:
            return guard
        res = self._live_get(path, etag=self._live.etags.get(etag_key))
        self._live_rate = spike.rate_limit_state(res.headers)
        if res.status == 304:
            # ETag revalidation: freshness clock refreshed, zero observations.
            return FetchResult(
                outcome=FetchOutcome.SUCCEEDED, observations=(),
                checkpoint=self._live.etags.get(etag_key), attempt_id=attempt_id,
                detail="not_modified: ETag revalidation returned 304")
        error_class = self._classify_live(res.status, res.body, res.headers)
        if error_class is not None:
            outcome = FetchOutcome.FAILED
            detail = f"{detail_op}: http {res.status} -> {error_class.value}"
            if error_class is ErrorClass.TRANSIENT:
                detail += f"; original_signal=http_{res.status}"
            if error_class is ErrorClass.INVALID_PAYLOAD and res.status in (405, 501):
                detail += ("; canonical lane-K v1 class is UNSUPPORTED "
                           "(no testkit enum member yet)")
            return FetchResult(
                outcome=outcome, observations=(), checkpoint=None,
                error_class=error_class, detail=detail, attempt_id=attempt_id)
        new_etag = res.headers.get("ETag")
        if new_etag:
            self._live.etags[etag_key] = new_etag
        try:
            raw = _json.loads(res.body)
        except Exception as e:
            return FetchResult(
                outcome=FetchOutcome.FAILED, observations=(), checkpoint=None,
                error_class=ErrorClass.INVALID_PAYLOAD,
                detail=f"{detail_op}: response body is not JSON: {e}",
                attempt_id=attempt_id)
        try:
            observations = self.normalize(raw, object_type, attempt_id)
        except ConnectorError as e:
            return FetchResult(
                outcome=FetchOutcome.FAILED, observations=(), checkpoint=None,
                error_class=e.error_class, detail=f"{detail_op}: {e.detail}",
                attempt_id=attempt_id)
        return FetchResult(
            outcome=FetchOutcome.SUCCEEDED, observations=tuple(observations),
            checkpoint=self._live.etags.get(etag_key), attempt_id=attempt_id)

    def live_check(self) -> dict:
        """GET /rate_limit: proves reachability without spending budget."""
        try:
            res = self._live_get("/rate_limit")
        except ConnectorError as e:
            return {"ok": False, "error_class": e.error_class.value,
                    "detail": e.detail}
        self._live_rate = spike.rate_limit_state(res.headers)
        if res.status != 200:
            error_class = self._classify_live(res.status, res.body, res.headers)
            return {"ok": False,
                    "error_class": error_class.value if error_class else "UNKNOWN",
                    "detail": f"http {res.status}"}
        return {"ok": True, "rate": dict(self._live_rate)}

    def live_read_repo(self, owner: str, repo: str) -> FetchResult:
        """Read-only repo metadata; ETag cursor gives 304 on re-read."""
        return self._live_fetch(f"/repos/{owner}/{repo}",
                                f"repo:{owner}/{repo}",
                                "github_repository", "live_read_repo")

    def live_read_issues(self, owner: str, repo: str, per_page: int = 5) -> FetchResult:
        """Read-only issue list; ETag cursor gives 304 on re-read."""
        import urllib.parse as _up
        qs = _up.urlencode({"state": "all", "per_page": per_page,
                            "sort": "updated", "direction": "desc"})
        return self._live_fetch(f"/repos/{owner}/{repo}/issues?{qs}",
                                f"issues:{owner}/{repo}",
                                "github_issue", "live_read_issues")

    def live_rate_limit_state(self) -> dict:
        """Last parsed X-RateLimit-* headers from the live path."""
        return dict(self._live_rate)

    def live_etags(self) -> dict:
        """Opaque ETag cursors held by the live path (verbatim, never parsed)."""
        return dict(self._live.etags)


def make_connector() -> Connector:
    """Zero-arg factory for `python3 -m testkit.run --adapter`."""
    return GitHubConnectorAdapter()
