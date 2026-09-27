#!/usr/bin/env python3
"""Audit metadata vs erasable payload (Batch 6 adjudication: AUDIT APPEND-ONLY
with privacy correction).

Canonical event history is APPEND ONLY. Corrections are SUPERSEDING EVENTS.
But secrets and legally erasable personal information must NOT be embedded
permanently in the immutable event payload.

Separation:
  AUDIT METADATA (immutable): action, actor, capability, object_ref,
      evidence_digest, result, timestamp. Hashed into metadata_digest.
  ERASABLE PAYLOAD: lives behind a revocable payload_ref in the
      PayloadStore, with a retention lifecycle:
      ACTIVE -> STALE -> SUPERSEDED -> SUPPRESSED -> ERASURE_REQUESTED -> ERASED.

Rules:
  - Never put secrets or unnecessary PII into immutable history.
  - SENSITIVE payloads may only live behind a payload_ref. NON_SENSITIVE
    small payloads may be inline.
  - Lifecycle transitions only move forward (or to ERASED via the erasure flow).
  - Retention durations are chosen by policy (RetentionPolicy), never
    hardcoded constants. See RETENTION-POLICY.md.
  - Erasure emits DATA_ERASURE_COMPLETED with subject_digest, never the raw
    subject. Redaction replaces the payload behind the reference; the audit
    metadata still proves the event existed.
  - The journal write path is the existing one: mission-control/emit.py's
    dedupe-append machinery (_append / existing_event_ids). No new event
    store for the journal; the PayloadStore holds erasable payloads only.

Test fixtures must use synthetic markers only, never real secrets or PII.
"""

import hashlib
import json
import os
import re
import sys
import time

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)
import emit as _emit  # noqa: E402  (existing journal write path)

# --------------------------------------------------------------------------
# Lifecycle
# --------------------------------------------------------------------------

LIFECYCLE = (
    "ACTIVE",
    "STALE",
    "SUPERSEDED",
    "SUPPRESSED",
    "ERASURE_REQUESTED",
    "ERASED",
)

_FORWARD_INDEX = {s: i for i, s in enumerate(LIFECYCLE)}

PAYLOAD_CLASS_SENSITIVE = "SENSITIVE"
PAYLOAD_CLASS_NON_SENSITIVE = "NON_SENSITIVE"

# --------------------------------------------------------------------------
# Errors
# --------------------------------------------------------------------------


class PayloadLifecycleError(Exception):
    """Base error for the payload lifecycle."""


class IllegalTransitionError(PayloadLifecycleError):
    """A lifecycle transition moved backward or skipped the erasure flow."""


class UnknownPayloadRefError(PayloadLifecycleError):
    """The payload reference is not in the store manifest."""


class PayloadGoneError(PayloadLifecycleError):
    """The payload was erased or redacted; content is unavailable."""


class SecretShapedMaterialError(PayloadLifecycleError):
    """Secret-shaped material was found where it must not be (metadata)."""


class InlineSensitivePayloadError(PayloadLifecycleError):
    """A SENSITIVE payload was offered inline instead of behind a reference."""


# --------------------------------------------------------------------------
# Secret-shape scanner (regression guard)
# --------------------------------------------------------------------------
# Patterns match SHAPES, not values. The guard reports the pattern name and
# position, never the matched text, so a failing scan cannot leak the secret
# it caught.

_SECRET_PATTERNS = (
    ("api_key_assignment", re.compile(
        r"(?i)\b(api[_-]?key|apikey)\b\s*[:=]\s*\S+")),
    ("client_secret_assignment", re.compile(
        r"(?i)\b(client[_-]?secret)\b\s*[:=]\s*\S+")),
    ("secret_assignment", re.compile(
        r"(?i)\b(secret|token|bearer|passwd|password|pwd)\b\s*[:=]\s*\S+")),
    ("bearer_token", re.compile(r"(?i)\bbearer\s+[A-Za-z0-9\-._~+/=]{8,}")),
    ("pem_private_key", re.compile(
        r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    ("openai_key", re.compile(r"\bsk-[A-Za-z0-9]{16,}\b")),
    ("generic_provider_token", re.compile(
        r"\b(?:ghp|gho|gsk|AIza|xox[bap]|ya29)[-_A-Za-z0-9]{16,}\b")),
    ("otp_code", re.compile(r"(?i)\b(otp|one[-_ ]?time[_ ]?code|mfa[_ ]?code)"
                            r"\b\s*[:=]\s*\d{4,10}\b")),
)


def scan_for_secret_shapes(obj, context="metadata"):
    """Raise SecretShapedMaterialError if obj contains secret-shaped text.

    obj may be a string, dict, or list. The error names patterns and string
    positions only; it never echoes matched text.
    """
    if isinstance(obj, str):
        for name, rx in _SECRET_PATTERNS:
            m = rx.search(obj)
            if m:
                raise SecretShapedMaterialError(
                    "%s contains secret-shaped material: pattern=%s at "
                    "offset=%d (value withheld)" % (context, name, m.start()))
    elif isinstance(obj, dict):
        for k, v in obj.items():
            scan_for_secret_shapes(k, context)
            scan_for_secret_shapes(v, context)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            scan_for_secret_shapes(v, context)
    return True


# --------------------------------------------------------------------------
# Digests
# --------------------------------------------------------------------------


def sha256_hex(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def subject_digest(subject):
    """One-way digest of a data subject identifier. The raw subject is never
    stored in the manifest or the journal."""
    return sha256_hex("subject:" + subject)


def canonical_json(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))


def metadata_digest(metadata):
    return sha256_hex(canonical_json(metadata))


# --------------------------------------------------------------------------
# Audit metadata (immutable)
# --------------------------------------------------------------------------

METADATA_FIELDS = (
    "action", "actor", "capability", "object_ref", "evidence_digest",
    "result", "timestamp",
)


def audit_metadata(action, actor, capability, object_ref, evidence_digest,
                   result, timestamp=None):
    """Build the immutable audit metadata block. Guarded: any secret-shaped
    material raises before the event can be emitted."""
    md = {
        "action": action,
        "actor": actor,
        "capability": capability,
        "object_ref": object_ref,
        "evidence_digest": evidence_digest,
        "result": result,
        "timestamp": timestamp or time.strftime("%Y-%m-%dT%H:%M:%SZ",
                                                time.gmtime()),
    }
    scan_for_secret_shapes(md, context="audit_metadata")
    return md


# --------------------------------------------------------------------------
# Retention policy (durations are chosen by policy, never hardcoded)
# --------------------------------------------------------------------------

DEFAULT_POLICY_PATH = os.path.join(_HERE, "retention-policy.json")


class RetentionPolicy:
    """Dwell durations per lifecycle state, in seconds. None means the state
    has no automatic transition; a later state is reached only by an
    explicit transition call.

    No durations are baked in. Policy chooses them via:
      - a JSON file: {"dwell_seconds": {"ACTIVE": 86400, ...}}
      - environment: MC_RETENTION_ACTIVE_S, MC_RETENTION_STALE_S, ...
    See RETENTION-POLICY.md. A policy with no configured dwells performs no
    automatic transitions; the sweep is then a no-op and every transition is
    explicit.
    """

    def __init__(self, dwell_seconds=None, name="default"):
        self.name = name
        self.dwell_seconds = dict(dwell_seconds or {})

    @classmethod
    def from_json_file(cls, path):
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
        return cls(doc.get("dwell_seconds", {}),
                   name=doc.get("name", os.path.basename(path)))

    @classmethod
    def from_env(cls, prefix="MC_RETENTION_", name="env"):
        dwell = {}
        for state in LIFECYCLE:
            raw = os.environ.get("%s%s_S" % (prefix, state))
            if raw is not None:
                dwell[state] = int(raw)
        return cls(dwell, name=name)

    def dwell(self, state):
        """Configured dwell seconds for a state, or None if unconfigured."""
        return self.dwell_seconds.get(state)

    def to_dict(self):
        return {"name": self.name, "dwell_seconds": dict(self.dwell_seconds)}


# --------------------------------------------------------------------------
# Payload store (erasable payloads live here, never in the journal)
# --------------------------------------------------------------------------


class PayloadStore:
    """File-backed store for erasable payloads.

    Layout:
      <root>/payloads/<ref>.json   the payload content (deleted on
                                   erasure/redaction)
      <root>/manifest.json         ref -> {subject_digest, payload_class,
                                   state, state_history, tombstone}

    The manifest records digests and states only; it never holds raw
    subjects or secret content. The journal holds audit metadata only; it
    never holds payload content except inline NON_SENSITIVE payloads.
    """

    def __init__(self, root):
        self.root = os.path.abspath(root)
        self.payloads_dir = os.path.join(self.root, "payloads")
        self.manifest_path = os.path.join(self.root, "manifest.json")
        os.makedirs(self.payloads_dir, exist_ok=True)
        self._manifest = self._load_manifest()

    # -- manifest ------------------------------------------------------
    def _load_manifest(self):
        if not os.path.exists(self.manifest_path):
            return {}
        with open(self.manifest_path, encoding="utf-8") as f:
            return json.load(f)

    def _save_manifest(self):
        tmp = self.manifest_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(self._manifest, f, sort_keys=True, indent=1)
        os.replace(tmp, self.manifest_path)

    # -- put / get ------------------------------------------------------
    def put(self, content, subject, payload_class=PAYLOAD_CLASS_SENSITIVE,
            ref=None, at=None):
        """Store a payload. Returns the payload_ref. content must be
        JSON-serializable."""
        if payload_class not in (PAYLOAD_CLASS_SENSITIVE,
                                 PAYLOAD_CLASS_NON_SENSITIVE):
            raise PayloadLifecycleError("unknown payload_class %r"
                                        % (payload_class,))
        at = at or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        ref = ref or ("pl_" + sha256_hex(
            canonical_json(content) + subject + at)[:16])
        if ref in self._manifest:
            raise PayloadLifecycleError("payload_ref already exists: %s" % ref)
        path = os.path.join(self.payloads_dir, ref + ".json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(content, f, sort_keys=True)
        self._manifest[ref] = {
            "subject_digest": subject_digest(subject),
            "payload_class": payload_class,
            "state": "ACTIVE",
            "state_history": [{"state": "ACTIVE", "at": at,
                               "reason": "put"}],
            "tombstone": None,
        }
        self._save_manifest()
        return ref

    def get(self, ref):
        """Return payload content. Raises PayloadGoneError if erased or
        redacted; raises UnknownPayloadRefError if the ref is unknown."""
        entry = self._manifest.get(ref)
        if entry is None:
            raise UnknownPayloadRefError("unknown payload_ref: %s" % ref)
        if entry["state"] in ("ERASED", "SUPPRESSED"):
            raise PayloadGoneError(
                "payload %s is %s; content unavailable" % (ref,
                                                           entry["state"]))
        path = os.path.join(self.payloads_dir, ref + ".json")
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def entry(self, ref):
        entry = self._manifest.get(ref)
        if entry is None:
            raise UnknownPayloadRefError("unknown payload_ref: %s" % ref)
        return dict(entry)

    def refs_for_subject_digest(self, sdigest):
        return [r for r, e in self._manifest.items()
                if e["subject_digest"] == sdigest
                and e["state"] != "ERASED"]

    # -- transitions ----------------------------------------------------
    def transition(self, ref, to_state, reason="", at=None):
        """Move a payload forward in the lifecycle. Backward moves raise.
        ERASED is reachable from any state but only through this path
        (the erasure flow); normal forward order otherwise applies."""
        entry = self._manifest.get(ref)
        if entry is None:
            raise UnknownPayloadRefError("unknown payload_ref: %s" % ref)
        if to_state not in _FORWARD_INDEX:
            raise PayloadLifecycleError("unknown lifecycle state %r"
                                        % (to_state,))
        from_state = entry["state"]
        if from_state == "ERASED":
            raise IllegalTransitionError(
                "payload %s is ERASED; no further transitions" % ref)
        if to_state != "ERASED" and _FORWARD_INDEX[to_state] <= \
                _FORWARD_INDEX[from_state]:
            raise IllegalTransitionError(
                "illegal transition %s -> %s for %s (forward only)"
                % (from_state, to_state, ref))
        at = at or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        entry["state"] = to_state
        entry["state_history"].append({"state": to_state, "at": at,
                                      "reason": reason})
        self._save_manifest()
        return dict(entry)

    def sweep(self, policy, now=None):
        """Apply retention-policy dwell transitions. States with no
        configured dwell never transition automatically. Returns the list of
        (ref, from_state, to_state) applied."""
        now = now if now is not None else time.time()
        applied = []
        order = list(LIFECYCLE)
        for ref, entry in list(self._manifest.items()):
            state = entry["state"]
            if state in ("ERASED", "ERASURE_REQUESTED"):
                continue
            dwell = policy.dwell(state)
            if dwell is None:
                continue
            entered_at = entry["state_history"][-1]["at"]
            try:
                entered = time.mktime(time.strptime(entered_at,
                                                    "%Y-%m-%dT%H:%M:%SZ"))
            except (ValueError, TypeError):
                continue
            if now - entered >= dwell:
                nxt = order[order.index(state) + 1]
                if nxt == "ERASURE_REQUESTED":
                    continue  # erasure is explicit, never automatic
                self.transition(ref, nxt,
                                reason="retention policy %s dwell %ss elapsed"
                                % (policy.name, dwell))
                applied.append((ref, state, nxt))
        return applied

    # -- redaction ------------------------------------------------------
    def _drop_content(self, ref):
        path = os.path.join(self.payloads_dir, ref + ".json")
        if os.path.exists(path):
            os.remove(path)

    def redact(self, ref, reason, journal_file=None, actor="system",
               capability="payload.redact", at=None):
        """Redaction replaces the payload behind the reference. The audit
        metadata proves the event existed; the secret is gone. Emits
        PAYLOAD_REDACTED."""
        entry = self.entry(ref)
        at = at or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        self._drop_content(ref)
        if entry["state"] != "SUPPRESSED":
            self.transition(ref, "SUPPRESSED", reason="redact: " + reason,
                            at=at)
        entry = self.entry(ref)
        entry["tombstone"] = {"kind": "redaction", "at": at, "reason": reason}
        self._manifest[ref] = entry
        self._save_manifest()
        md = audit_metadata(
            action="payload_redacted", actor=actor, capability=capability,
            object_ref=ref,
            evidence_digest=sha256_hex(canonical_json(
                {"ref": ref, "reason": reason, "at": at})),
            result="redacted", timestamp=at)
        event_id = "mc-redact-" + sha256_hex(ref + at)[:12]
        event = build_audit_event(
            "PAYLOAD_REDACTED", md, payload_ref=ref,
            payload_class=PAYLOAD_CLASS_NON_SENSITIVE,
            inline_payload={"redaction_reason": reason, "redacted_at": at},
            event_id=event_id, timestamp=at,
            aggregate_id="mc:payload:" + ref)
        return _emit._append(event, journal_file or _emit.JOURNAL_FILE)

    # -- erasure --------------------------------------------------------
    def request_erasure(self, subject, policy_name, journal_file=None,
                        actor="system", capability="payload.erasure",
                        at=None):
        """Erasure flow. Deletes every sensitive payload for the subject,
        then emits DATA_ERASURE_COMPLETED with subject_digest (never the raw
        subject). Returns (event, how, erased_refs)."""
        at = at or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        sdigest = subject_digest(subject)
        erased_refs = []
        for ref in self.refs_for_subject_digest(sdigest):
            self._drop_content(ref)
            entry = self.entry(ref)
            if entry["state"] != "ERASURE_REQUESTED":
                self.transition(ref, "ERASURE_REQUESTED",
                                reason="erasure requested, policy "
                                + policy_name, at=at)
            self.transition(ref, "ERASED",
                            reason="erasure completed, policy " + policy_name,
                            at=at)
            entry = self.entry(ref)
            entry["tombstone"] = {"kind": "erasure", "at": at,
                                  "policy": policy_name}
            self._manifest[ref] = entry
            erased_refs.append(ref)
        self._save_manifest()
        md = audit_metadata(
            action="data_erasure_completed", actor=actor,
            capability=capability, object_ref="mc:subject:" + sdigest[:12],
            evidence_digest=sha256_hex(canonical_json(
                {"erased_refs": sorted(erased_refs), "policy": policy_name,
                 "at": at})),
            result="erased", timestamp=at)
        event_id = "mc-erasure-" + sha256_hex(sdigest + policy_name
                                              + at)[:12]
        event = build_audit_event(
            "DATA_ERASURE_COMPLETED", md,
            payload_class=PAYLOAD_CLASS_NON_SENSITIVE,
            inline_payload={"subject_digest": sdigest,
                            "policy": policy_name,
                            "erased_refs": sorted(erased_refs),
                            "erased_at": at},
            event_id=event_id, timestamp=at,
            aggregate_id="mc:subject:" + sdigest[:12])
        event, how = _emit._append(event, journal_file or _emit.JOURNAL_FILE)
        return event, how, erased_refs


# --------------------------------------------------------------------------
# Envelope builder (split: immutable metadata + revocable payload reference)
# --------------------------------------------------------------------------


def build_audit_event(event_type, metadata, payload_ref=None,
                      inline_payload=None,
                      payload_class=PAYLOAD_CLASS_NON_SENSITIVE,
                      supersedes=None, event_id=None, timestamp=None,
                      aggregate_id=None, aggregate_type="mc_payload"):
    """Build the journal envelope. metadata is the immutable block;
    payload_ref points at the erasable PayloadStore entry. inline_payload
    is allowed ONLY for NON_SENSITIVE payloads; a SENSITIVE class with an
    inline payload raises. metadata is scanned for secret shapes.

    The journal envelope contract is unchanged:
      {event_id, timestamp, event_type, aggregate_id, aggregate_type,
       event_data}
    event_data carries {metadata, metadata_digest, payload_ref,
    inline_payload, payload_class, supersedes}.
    """
    if event_type not in _emit.MC_EVENT_TYPES:
        raise ValueError("unknown MC event type: %r" % event_type)
    if set(metadata.keys()) != set(METADATA_FIELDS):
        raise PayloadLifecycleError(
            "metadata must carry exactly %s" % (METADATA_FIELDS,))
    scan_for_secret_shapes(metadata, context="audit_metadata")
    if payload_class == PAYLOAD_CLASS_SENSITIVE and inline_payload is not None:
        raise InlineSensitivePayloadError(
            "SENSITIVE payloads must live behind a payload_ref, never inline")
    if inline_payload is not None:
        scan_for_secret_shapes(inline_payload, context="inline_payload")
    event_data = {
        "metadata": metadata,
        "metadata_digest": metadata_digest(metadata),
        "payload_ref": payload_ref,
        "inline_payload": inline_payload,
        "payload_class": payload_class,
        "supersedes": supersedes,
    }
    event = {
        "event_id": event_id or ("mc-audit-" + sha256_hex(
            canonical_json(event_data))[:12]),
        "timestamp": timestamp or metadata["timestamp"],
        "event_type": event_type,
        "aggregate_id": aggregate_id or "mc:payload:unbound",
        "aggregate_type": aggregate_type,
        "event_data": event_data,
    }
    return event


def emit_audit_event(event_type, metadata, payload_ref=None,
                     inline_payload=None,
                     payload_class=PAYLOAD_CLASS_NON_SENSITIVE,
                     supersedes=None, event_id=None, journal_file=None,
                     dry_run=False):
    """Build and append one audit-split event through the existing journal
    write path. Returns (event, "appended" | "duplicate-skipped")."""
    event = build_audit_event(event_type, metadata, payload_ref=payload_ref,
                              inline_payload=inline_payload,
                              payload_class=payload_class,
                              supersedes=supersedes, event_id=event_id)
    return _emit._append(event, journal_file or _emit.JOURNAL_FILE,
                         dry_run=dry_run)
