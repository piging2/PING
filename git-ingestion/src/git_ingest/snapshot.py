"""Ref snapshot protocol (T-07 force-push TOCTOU defense).

A packet walks objects BY OID from a snapshot taken at packet start and
re-reads refs at packet end. Any ref that moved between the two reads
marks the packet STALE; a mixed packet is never emitted.

Atomicity note: the snapshot is a single iteration over the ref
database (packed-refs + loose refs read in one pass by libgit2). A
concurrent writer can still land between our start read and end read;
that is exactly what the end-of-packet comparison detects. The snapshot
is the detection mechanism, not a lock.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

import pygit2

from .validate import resolve_symref


@dataclass
class RefSnapshot:
    """One atomic read of the ref namespace.

    refs maps validated ref name -> resolved target sha (hex). Symbolic
    refs are resolved at snapshot time with the hop cap; HEAD is NOT
    merged into branch identity and is recorded separately as
    head_target (T-12).
    """

    refs: dict[str, str] = field(default_factory=dict)
    head_target: str | None = None
    taken_at: str = ""
    # Groups of ref names that collide under case folding (T-12). On
    # case-sensitive filesystems both refs are real and distinct; the
    # collision is recorded explicitly, never silently resolved.
    case_collisions: list[list[str]] = field(default_factory=list)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def head_target_name(repo: pygit2.Repository) -> str | None:
    """HEAD's symbolic target name WITHOUT resolving it (T-12).

    repo.head RESOLVES symbolic refs (target becomes a commit sha),
    which merges HEAD into branch identity. repo.references.get("HEAD")
    preserves the symbolic name: .target is a str for symbolic refs
    (e.g. "refs/heads/main") and an Oid for detached HEAD.
    """
    try:
        if repo.head_is_unborn:
            return None
        head_ref = repo.references.get("HEAD")
        if head_ref is None:
            return None
        t = head_ref.target
        return t if isinstance(t, str) else str(t)
    except pygit2.GitError:
        return None


def find_case_collisions(names: list[str]) -> list[list[str]]:
    """Group ref names that collide under case folding (T-12)."""
    groups: dict[str, list[str]] = {}
    for n in names:
        groups.setdefault(n.casefold(), []).append(n)
    return [sorted(g) for g in groups.values() if len(g) > 1]


def take_ref_snapshot(repo: pygit2.Repository) -> RefSnapshot:
    """Record every resolvable ref in one pass.

    Refs that fail validation or symref resolution are omitted here;
    packet.py performs its own validation pass over the same ref set to
    emit typed quarantine entries for them (nothing is dropped silently
    at the packet level).
    """
    snap = RefSnapshot(taken_at=_now_iso())
    # Iterating repo.references yields ref NAMES (str); resolve each.
    for name in repo.references:
        if name == "HEAD":
            continue
        target, _reason = resolve_symref(repo, name)
        if target is not None:
            snap.refs[name] = target
    try:
        snap.head_target = head_target_name(repo)
    except pygit2.GitError:
        snap.head_target = None
    snap.case_collisions = find_case_collisions(list(snap.refs))
    return snap


def snapshots_moved(old: RefSnapshot, new: RefSnapshot) -> list[str]:
    """Compare two snapshots; return moved/added/removed ref names."""
    moved: list[str] = []
    for name, sha in old.refs.items():
        if name not in new.refs:
            moved.append(name + " (removed)")
        elif new.refs[name] != sha:
            moved.append(name + f" ({sha[:12]} -> {new.refs[name][:12]})")
    for name in new.refs:
        if name not in old.refs:
            moved.append(name + " (added)")
    if old.head_target != new.head_target:
        moved.append(f"HEAD ({old.head_target} -> {new.head_target})")
    return sorted(moved)


def refs_moved(repo: pygit2.Repository, snap: RefSnapshot) -> list[str]:
    """Compare a fresh snapshot against `snap`; return moved/added/removed names."""
    return snapshots_moved(snap, take_ref_snapshot(repo))


__all__ = ["RefSnapshot", "take_ref_snapshot", "refs_moved"]
