"""Packet assembly: snapshots, observations, quarantines, STALE protocol.

A packet is the v1 unit of ingestion: one atomic ref snapshot, a bounded
history walk by OID, one typed observation per commit and per ref, an end
snapshot, and a STALE check. Every boundary breach becomes a typed
quarantine entry; silent drops are forbidden.

Confidence discipline (T-05): structural facts (shas, parents, trees,
diffs) carry confidence 0.95. Claimed identity fields (author/committer
name/email) are nested with confidence 0.2 and verified=False; they are
unverified claims, never identity.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from time import monotonic

import pygit2

from . import config
from .envelope import build_envelope
from .parse import (
    ObjectNotFound,
    PacketTimeout,
    TreeQuarantined,
    diff_commit,
    parse_commit,
    walk_commits,
)
from .snapshot import (
    RefSnapshot,
    find_case_collisions,
    head_target_name,
    snapshots_moved,
    take_ref_snapshot,
)
from .validate import resolve_symref, sanitize_text, validate_ref_name

# ---------------------------------------------------------------------------
# Event types
# ---------------------------------------------------------------------------

GIT_COMMIT_OBSERVED = "GIT_COMMIT_OBSERVED"
GIT_REF_OBSERVED = "GIT_REF_OBSERVED"
GIT_REPO_QUARANTINED = "GIT_REPO_QUARANTINED"
GIT_PACKET_STALE = "GIT_PACKET_STALE"

# Confidence values.
CONF_STRUCTURAL = 0.95
CONF_CLAIMED_IDENTITY = 0.2

_LIFECYCLE_STAGE = "observation"
_PROVENANCE = "untrusted-repo-content"

# Basenames that declare repo-local config drivers/filters (T-09). Their
# CONTENT is ingested as inert text only; the flag marks the observation
# so downstream renderers never treat them as live config.
_CONFIG_SMUGGLING_BASENAMES = frozenset({".gitattributes", ".gitmodules"})


def _config_smuggling_flags(path: str) -> list[str]:
    """Flags for repo-local config-shaped paths (T-09, G-11 criterion)."""
    basename = path.rsplit("/", 1)[-1]
    if basename in _CONFIG_SMUGGLING_BASENAMES:
        return ["config-smuggling-pattern"]
    return []


def _flagged_paths(summary) -> list[dict]:
    """Collect config-smuggling-flagged paths from a diff summary."""
    seen: dict[str, list[str]] = {}
    paths: list[str] = []
    paths.extend(summary.added)
    paths.extend(summary.deleted)
    paths.extend(summary.modified)
    for old, new in summary.exact_renames:
        paths.append(old)
        paths.append(new)
    for r in summary.inexact_renames:
        paths.append(r.get("old", ""))
        paths.append(r.get("new", ""))
    for p in paths:
        if not p:
            continue
        flags = _config_smuggling_flags(p)
        if flags and p not in seen:
            seen[p] = flags
    return [{"path": p, "flags": seen[p]} for p in sorted(seen)]


def _display_paths(summary) -> dict[str, str]:
    """Bidi/ANSI-isolated display form for every diff path (T-11).

    `path` stays the validated raw name (identity); `pathDisplay` is the
    safe-to-render form. Isolation preserves the characters while
    neutralizing visual reordering (U+202E etc.).
    """
    paths: set[str] = set()
    paths.update(summary.added)
    paths.update(summary.deleted)
    paths.update(summary.modified)
    for old, new in summary.exact_renames:
        paths.add(old)
        paths.add(new)
    for r in summary.inexact_renames:
        if r.get("old"):
            paths.add(r["old"])
        if r.get("new"):
            paths.add(r["new"])
    out: dict[str, str] = {}
    for p in sorted(paths):
        display, _truncated = sanitize_text(p, config.MAX_SYMLINK_TARGET_BYTES)
        out[p] = display
    return out
# (no literals): bounds the delete/add candidate matrix before the
# silent renameLimit ceiling degrades inexact detection (findings #4).
_RENAME_LIMIT = config.MAX_COMMITS_PER_PACKET // config.SYMREF_MAX_HOPS

# Stream id for envelope identity: one stream per ingested repo.
_STREAM_PREFIX = "repo:"


class _PacketQuarantine(Exception):
    """Whole-packet quarantine trigger. Carries the typed reason."""

    def __init__(self, reason: str, detail: str = ""):
        super().__init__(f"packet quarantined ({reason}): {detail}")
        self.reason = reason
        self.detail = detail


@dataclass
class Quarantine:
    code: str
    detail: str = ""
    at: str = ""


@dataclass
class Packet:
    repo_id: str
    status: str  # "OK" | "QUARANTINED:<reason>" | "STALE"
    ref_snapshot: RefSnapshot
    ref_snapshot_end: RefSnapshot | None
    observations: list[dict] = field(default_factory=list)
    quarantines: list[Quarantine] = field(default_factory=list)
    # Typed informational events (not breaches): e.g. ref-case-collision.
    # Quarantines are fail-closed breaches; notices are recorded facts.
    notices: list[dict] = field(default_factory=list)
    stats: dict = field(default_factory=dict)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _check_deadline(deadline: float, where: str) -> None:
    if monotonic() > deadline:
        raise PacketTimeout(where)


def _claimed_identity(name: str, email: str) -> dict:
    """Wrap a claimed identity field with its (lack of) trust (T-05)."""
    return {
        "name": name,
        "email": email,
        "confidence": CONF_CLAIMED_IDENTITY,
        "verified": False,
        "marker": "unverified-claim",
    }


def _raw_commit_bytes(repo: pygit2.Repository, sha: str) -> bytes:
    """Verbatim commit object bytes for rawPayloadHash (evidence plane)."""
    _type, data = repo.odb.read(pygit2.Oid(hex=sha))
    return bytes(data)


def _commit_envelope(repo, repo_id: str, sha: str, observed_at: str) -> dict:
    raw = _raw_commit_bytes(repo, sha)
    return build_envelope(
        stream_id=_STREAM_PREFIX + repo_id,
        source_account=repo_id,
        source_object_type="commit",
        source_object_id=sha,
        source_version=sha,  # content-addressed: sha is both id and version
        raw_payload=raw,
        observed_at=observed_at,
    )


def _commit_observation(
    repo: pygit2.Repository,
    repo_id: str,
    sha: str,
    observed_at: str,
    deadline: float,
    accountant: "_ByteAccountant",
) -> dict:
    obs = parse_commit(repo, sha)
    summary = diff_commit(repo, sha, rename_limit=_RENAME_LIMIT, deadline=deadline)
    accountant.account_gitlinks(summary.gitlink_deltas)
    envelope = _commit_envelope(repo, repo_id, sha, observed_at)
    payload = {
        "repoId": repo_id,
        "sha": obs.sha,
        "treeSha": obs.tree_sha,
        "parents": obs.parents,
        "claimedAuthor": _claimed_identity(
            obs.claimed_author, obs.claimed_author_email
        ),
        "claimedCommitter": _claimed_identity(
            obs.claimed_committer, obs.claimed_committer_email
        ),
        "message": obs.message,
        "messageTruncated": obs.message_truncated,
        "committedAt": obs.committed_at,
        "signature": {
            "present": obs.signature_present,
            "keyId": obs.signature_key_id,
            "valid": obs.signature_valid,  # None: deferred, never shell to gpg
            "trusted": obs.signature_trusted,  # always False at ingestion
        },
        "diff": {
            "filesChanged": summary.files_changed,
            "exactRenames": [
                {"old": old, "new": new} for old, new in summary.exact_renames
            ],
            "inexactRenames": summary.inexact_renames,
            "added": summary.added,
            "deleted": summary.deleted,
            "modified": summary.modified,
            "truncated": summary.truncated,
            "merge": summary.merge,
            "renameThreshold": summary.rename_threshold,
            "renameLimit": summary.rename_limit,
            "renameCeilingHit": summary.rename_ceiling_hit,
            # T-09: repo-local config-shaped paths flagged, never live config.
            "flaggedPaths": _flagged_paths(summary),
            # T-11: safe-to-render display form; `added/deleted/...` stay raw.
            "pathDisplay": _display_paths(summary),
        },
        "provenance": _PROVENANCE,
    }
    return {
        "envelope": envelope,
        "eventType": GIT_COMMIT_OBSERVED,
        "payload": payload,
        "logicalId": envelope["sourceIdentity"],
        "confidence": CONF_STRUCTURAL,
        "lifecycleStage": _LIFECYCLE_STAGE,
    }


def _ref_envelope(repo_id: str, ref_name: str, target_sha: str, observed_at: str) -> dict:
    raw = f"{ref_name}\x00{target_sha}".encode("utf-8")
    return build_envelope(
        stream_id=_STREAM_PREFIX + repo_id,
        source_account=repo_id,
        source_object_type="ref",
        source_object_id=ref_name,
        # A ref has no intrinsic version; the target sha AT SNAPSHOT TIME
        # is the version (see design/ENVELOPE_MAPPING.md).
        source_version=target_sha,
        raw_payload=raw,
        observed_at=observed_at,
    )


def _ref_observation(
    repo_id: str, ref_name: str, target_sha: str, observed_at: str
) -> dict:
    envelope = _ref_envelope(repo_id, ref_name, target_sha, observed_at)
    payload = {
        "repoId": repo_id,
        "refName": ref_name,
        "targetSha": target_sha,
        "headTarget": None,
        "provenance": _PROVENANCE,
    }
    return {
        "envelope": envelope,
        "eventType": GIT_REF_OBSERVED,
        "payload": payload,
        "logicalId": envelope["sourceIdentity"],
        "confidence": CONF_STRUCTURAL,
        "lifecycleStage": _LIFECYCLE_STAGE,
    }


def _quarantine_observation(
    repo_id: str, quarantines: list[Quarantine], observed_at: str
) -> dict:
    raw = json.dumps(
        [{"code": q.code, "detail": q.detail} for q in quarantines],
        sort_keys=True,
    ).encode("utf-8")
    envelope = build_envelope(
        stream_id=_STREAM_PREFIX + repo_id,
        source_account=repo_id,
        source_object_type="repo",
        source_object_id=repo_id,
        source_version=f"quarantined:{quarantines[0].code}" if quarantines else "quarantined",
        raw_payload=raw,
        observed_at=observed_at,
    )
    payload = {
        "repoId": repo_id,
        "reason": quarantines[0].code if quarantines else "unknown",
        "quarantines": [
            {"code": q.code, "detail": q.detail, "at": q.at} for q in quarantines
        ],
        "provenance": _PROVENANCE,
    }
    return {
        "envelope": envelope,
        "eventType": GIT_REPO_QUARANTINED,
        "payload": payload,
        "logicalId": envelope["sourceIdentity"],
        "confidence": CONF_STRUCTURAL,
        "lifecycleStage": _LIFECYCLE_STAGE,
    }


def _stale_observation(repo_id: str, moved: list[str], observed_at: str) -> dict:
    raw = json.dumps(sorted(moved)).encode("utf-8")
    envelope = build_envelope(
        stream_id=_STREAM_PREFIX + repo_id,
        source_account=repo_id,
        source_object_type="repo",
        source_object_id=repo_id,
        source_version="stale",
        raw_payload=raw,
        observed_at=observed_at,
    )
    payload = {
        "repoId": repo_id,
        "movedRefs": moved,
        "provenance": _PROVENANCE,
    }
    return {
        "envelope": envelope,
        "eventType": GIT_PACKET_STALE,
        "payload": payload,
        "logicalId": envelope["sourceIdentity"],
        "confidence": CONF_STRUCTURAL,
        "lifecycleStage": _LIFECYCLE_STAGE,
    }


class _ByteAccountant:
    """Cumulative per-packet decompressed-byte accounting (T-03)."""

    def __init__(self):
        self.bytes_read = 0
        self.gitlinks_seen = 0

    def account(self, n: int) -> None:
        self.bytes_read += n
        if self.bytes_read > config.MAX_PACKET_DECOMPRESSED_BYTES:
            raise _PacketQuarantine(
                "packet-byte-budget",
                f"cumulative {self.bytes_read} bytes exceeds cap",
            )

    def account_gitlinks(self, n: int) -> None:
        self.gitlinks_seen += n
        if self.gitlinks_seen > config.MAX_GITLINKS_PER_PACKET:
            raise _PacketQuarantine(
                "gitlink-spam",
                f"{self.gitlinks_seen} gitlinks exceeds per-packet cap",
            )


def _take_validated_snapshot(
    repo: pygit2.Repository,
    ref_allowlist: set[str] | None,
    quarantines: list[Quarantine],
) -> tuple[RefSnapshot, list[str]]:
    """One atomic pass: validate + resolve refs, build the start snapshot.

    Invalid names and unresolvable symrefs become typed quarantine
    entries and the ref is dropped (T-12: dropped, not silently kept).
    More than MAX_REFS_PER_PACKET quarantines the whole packet
    (fail closed; a silent subset would be a skip).
    """
    refs: dict[str, str] = {}
    head_target: str | None = None
    count = 0
    # Iterating repo.references yields ref NAMES (str).
    for name in repo.references:
        if name == "HEAD":
            continue
        count += 1
        if count > config.MAX_REFS_PER_PACKET:
            raise _PacketQuarantine(
                "ref-spam", f"more than {config.MAX_REFS_PER_PACKET} refs"
            )
        if not validate_ref_name(name):
            quarantines.append(
                Quarantine(code="invalid-ref-name", detail=name, at=_now_iso())
            )
            continue
        target, reason = resolve_symref(repo, name)
        if target is None:
            quarantines.append(
                Quarantine(
                    code="ref-unresolvable",
                    detail=f"{name}: {reason}",
                    at=_now_iso(),
                )
            )
            continue
        if ref_allowlist is not None and name not in ref_allowlist:
            continue
        refs[name] = target
    # HEAD is recorded as its symbolic target name, never resolved
    # into branch identity (T-12).
    head_target = head_target_name(repo)
    snap = RefSnapshot(refs=refs, head_target=head_target, taken_at=_now_iso())
    snap.case_collisions = find_case_collisions(list(refs))
    return snap, sorted(refs.values())


def build_packet(
    repo_id: str,
    repo: pygit2.Repository,
    ref_allowlist: list[str] | None = None,
    max_commits: int | None = None,
) -> Packet:
    """Build one ingestion packet for a repository.

    snapshot -> validate+resolve refs (cap) -> walk commits by OID ->
    per-commit observations -> ref observations -> end snapshot ->
    STALE check. Any whole-packet breach raises the packet to
    QUARANTINED:<reason> with typed quarantine entries and discards
    partial observations (fail closed); per-ref defects only drop the
    ref with a typed entry.
    """
    started = monotonic()
    deadline = started + config.PACKET_TIMEOUT_SECONDS
    observed_at = _now_iso()
    packet = Packet(
        repo_id=repo_id,
        status="OK",
        ref_snapshot=RefSnapshot(),
        ref_snapshot_end=None,
        stats={},
    )
    accountant = _ByteAccountant()
    quarantines: list[Quarantine] = packet.quarantines
    allowset = set(ref_allowlist) if ref_allowlist is not None else None
    cap = max_commits if max_commits is not None else config.MAX_COMMITS_PER_PACKET

    try:
        _check_deadline(deadline, "snapshot")
        snap, start_shas = _take_validated_snapshot(repo, allowset, quarantines)
        packet.ref_snapshot = snap

        # T-12: case-fold collisions are recorded explicitly (info-level
        # notice, not a breach): both refs are real on case-sensitive
        # filesystems, but the collision must never be silent.
        for group in snap.case_collisions:
            packet.notices.append(
                {
                    "code": "ref-case-collision",
                    "detail": f"case-fold collision: {', '.join(group)}",
                    "refs": group,
                    "at": _now_iso(),
                }
            )

        # Ref observations for every surviving ref (1:1 ref -> SHA, T-12).
        for ref_name in sorted(snap.refs):
            _check_deadline(deadline, "ref-observations")
            packet.observations.append(
                _ref_observation(repo_id, ref_name, snap.refs[ref_name], observed_at)
            )

        # History walk by OID from the snapshot; never re-resolve names.
        _check_deadline(deadline, "revwalk")
        shas, capped = walk_commits(repo, start_shas, max_commits=cap, deadline=deadline)
        commits_walked = 0
        for sha in shas:
            _check_deadline(deadline, "commit-observations")
            packet.observations.append(
                _commit_observation(repo, repo_id, sha, observed_at, deadline, accountant)
            )
            commits_walked += 1

        # End snapshot + STALE check (T-07): any moved ref invalidates
        # the packet; mixed packets are never emitted. The end snapshot
        # is filtered by the same allowlist as the start snapshot so
        # out-of-scope refs cannot cause false STALE.
        _check_deadline(deadline, "end-snapshot")
        snap_end = take_ref_snapshot(repo)
        if allowset is not None:
            snap_end.refs = {
                k: v for k, v in snap_end.refs.items() if k in allowset
            }
        packet.ref_snapshot_end = snap_end
        moved = snapshots_moved(snap, snap_end)
        if moved:
            packet.status = "STALE"
            packet.stats["discardedObservations"] = len(packet.observations)
            packet.observations = [
                _stale_observation(repo_id, moved, _now_iso())
            ]
        packet.stats.update(
            {
                "refsProcessed": len(snap.refs),
                "refsDropped": len(quarantines),
                "commitsWalked": commits_walked,
                "commitsCapped": capped,
                "bytesRead": accountant.bytes_read,
                "gitlinksSeen": accountant.gitlinks_seen,
                "durationSeconds": round(monotonic() - started, 3),
            }
        )
    except _PacketQuarantine as q:
        packet.status = f"QUARANTINED:{q.reason}"
        quarantines.append(Quarantine(code=q.reason, detail=q.detail, at=_now_iso()))
        packet.stats["discardedObservations"] = len(packet.observations)
        packet.observations = [_quarantine_observation(repo_id, quarantines, _now_iso())]
        packet.stats.update(
            {
                "commitsWalked": 0,
                "commitsCapped": False,
                "bytesRead": accountant.bytes_read,
                "gitlinksSeen": accountant.gitlinks_seen,
                "durationSeconds": round(monotonic() - started, 3),
            }
        )
    except PacketTimeout as t:
        packet.status = "QUARANTINED:packet-timeout"
        quarantines.append(
            Quarantine(code="packet-timeout", detail=t.where, at=_now_iso())
        )
        packet.stats["discardedObservations"] = len(packet.observations)
        packet.observations = [_quarantine_observation(repo_id, quarantines, _now_iso())]
        packet.stats["durationSeconds"] = round(monotonic() - started, 3)
    except TreeQuarantined as tq:
        packet.status = f"QUARANTINED:{tq.reason}"
        quarantines.append(
            Quarantine(code=tq.reason, detail=tq.detail, at=_now_iso())
        )
        packet.stats["discardedObservations"] = len(packet.observations)
        packet.observations = [_quarantine_observation(repo_id, quarantines, _now_iso())]
        packet.stats["durationSeconds"] = round(monotonic() - started, 3)
    except ObjectNotFound as nf:
        # An object reachable at snapshot time vanished mid-walk: the
        # repo mutated under us. Treat as STALE, not as corruption.
        packet.status = "STALE"
        packet.stats["discardedObservations"] = len(packet.observations)
        packet.observations = [
            _stale_observation(repo_id, [f"object-vanished:{nf.sha}"], _now_iso())
        ]
        packet.stats["durationSeconds"] = round(monotonic() - started, 3)
    return packet


__all__ = [
    "GIT_COMMIT_OBSERVED",
    "GIT_REF_OBSERVED",
    "GIT_REPO_QUARANTINED",
    "GIT_PACKET_STALE",
    "CONF_STRUCTURAL",
    "CONF_CLAIMED_IDENTITY",
    "Quarantine",
    "Packet",
    "build_packet",
]
