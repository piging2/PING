"""Git object parsing: blobs, trees, commits, diffs, history walks.

Parse-only. Every function reads through libgit2; nothing here writes to
the repository, materializes trees onto disk, resolves symlinks, follows
gitlinks, or shells out to gpg (signature verification is DEFERRED by
design; see design/ARCHITECTURE.md).

Adaptation notes (honest):
- pygit2 exposes no streaming blob read and no delta-chain depth or
  pack-expansion-ratio introspection. read_blob_meta therefore checks the
  DECLARED size first and never materializes beyond MAX_BLOB_BYTES; the
  expansion-ratio and delta-depth tripwires are enforced indirectly via
  the declared-size gate, cumulative per-packet byte accounting, and the
  packet wall-clock timeout. Details in design/ARCHITECTURE.md.
- v1 blob handling is metadata-only: {sha, size, magic, is_text} plus
  LFS-pointer and polyglot flags. No blob bytes enter observations.
"""

from __future__ import annotations

import base64
import binascii
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from time import monotonic

import pygit2

from . import config
from .validate import sanitize_text, validate_tree_entry_name

# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class TreeQuarantined(Exception):
    """A tree failed validation; the packet must quarantine the repo."""

    def __init__(self, reason: str, detail: str = ""):
        super().__init__(f"tree quarantined ({reason}): {detail}")
        self.reason = reason
        self.detail = detail


class PacketTimeout(Exception):
    """The packet wall-clock budget expired mid-walk."""

    def __init__(self, where: str):
        super().__init__(f"packet timeout during {where}")
        self.where = where


class ObjectNotFound(Exception):
    """A referenced object id is absent from the object database."""

    def __init__(self, sha: str):
        super().__init__(f"object not found: {sha}")
        self.sha = sha


# ---------------------------------------------------------------------------
# Blobs (metadata only)
# ---------------------------------------------------------------------------

_SNIFF_BYTES = 8192  # prefix examined for magic-byte identification

# Max chars of a repr kept in quarantine detail strings. Display-only,
# not a threat-table cap.
_DETAIL_SNIP_LEN = 80

# (magic label, prefix bytes). Checked in order; first match wins.
_MAGIC_PREFIXES: tuple[tuple[str, bytes], ...] = (
    ("elf", b"\x7fELF"),
    ("png", b"\x89PNG\r\n\x1a\n"),
    ("gif", b"GIF8"),
    ("jpeg", b"\xff\xd8\xff"),
    ("zip", b"PK\x03\x04"),
    ("gzip", b"\x1f\x8b"),
    ("pdf", b"%PDF-"),
    ("sqlite", b"SQLite format 3\x00"),
    ("shebang", b"#!"),
    ("lfs-pointer", b"version https://git-lfs.github.com/spec/v1"),
)

# Magics that make a blob "dangerous" for polyglot scoring: a blob
# matching two or more of these distinct families is polyglot-suspect.
_DANGEROUS_MAGICS = frozenset({"elf", "zip", "shebang"})


@dataclass
class BlobMeta:
    sha: str
    size: int  # declared (decompressed) size
    truncated: bool  # True when size exceeded MAX_BLOB_BYTES; content unread
    magic: str  # sniffed type label, or "text"/"unknown"
    is_text: bool
    lfs_pointer: bool = False
    lfs_declared_size: int | None = None
    lfs_pointer_suspect: bool = False
    polyglot_suspect: bool = False
    provenance: str = "untrusted-repo-content"


def _sniff_magic(prefix: bytes) -> str:
    for label, sig in _MAGIC_PREFIXES:
        if prefix.startswith(sig):
            return label
    return ""


def _looks_text(data: bytes) -> bool:
    """Content sniffing, not extension: no NULs and mostly decodable."""
    if not data:
        return True
    if b"\x00" in data:
        return False
    try:
        data.decode("utf-8")
        return True
    except UnicodeDecodeError:
        # Tolerate a small fraction of undecodable bytes (e.g. latin-1
        # text); binaries with NULs were already rejected above.
        bad = sum(1 for b in data if b > 0x7F)
        return bad / len(data) < 0.05


def _parse_lfs_pointer(text: str) -> tuple[int | None, bool]:
    """Extract (declared_size, suspect) from an LFS pointer body.

    The size field is attacker-controlled (T-10): absurd claims are
    flagged, never used for allocation. Suspect threshold: larger than
    any plausible single file (1 TiB) or unparsable.
    """
    declared: int | None = None
    for line in text.splitlines():
        if line.startswith("size "):
            try:
                declared = int(line[len("size "):].strip())
            except ValueError:
                declared = None
            break
    if declared is None:
        return None, True
    if declared < 0:
        return declared, True
    # 1 TiB: absurd for a single LFS object; flagged, never allocated.
    suspect = declared > (1024 * 1024 * 1024 * 1024)
    return declared, suspect


def read_blob_meta(repo: pygit2.Repository, sha: str) -> BlobMeta:
    """Read blob metadata without ever materializing beyond the cap.

    Declared size is checked FIRST; a blob declaring more than
    MAX_BLOB_BYTES returns truncated metadata with zero content bytes
    read. Under-cap blobs are processed in bounded chunks for sniffing.
    """
    try:
        obj = repo.get(sha)
    except (KeyError, ValueError, pygit2.GitError):
        raise ObjectNotFound(sha)
    if obj is None or not isinstance(obj, pygit2.Blob):
        raise ObjectNotFound(sha)
    size = obj.size
    if size > config.MAX_BLOB_BYTES:
        return BlobMeta(
            sha=sha, size=size, truncated=True, magic="unknown", is_text=False
        )
    data = obj.data  # within cap: safe to hold
    prefix = data[:_SNIFF_BYTES]
    magic = _sniff_magic(prefix)
    # Polyglot check: dangerous magics in disjoint families.
    families = {magic} if magic in _DANGEROUS_MAGICS else set()
    if b"<script" in prefix.lower() or b"javascript:" in prefix.lower():
        families.add("script-tag")
    polyglot = len(families) >= 2
    if magic == "shebang":
        text_flag = True
    elif magic:
        text_flag = False
    else:
        text_flag = _looks_text(prefix)
    label = magic if magic else ("text" if text_flag else "unknown")
    meta = BlobMeta(
        sha=sha,
        size=size,
        truncated=False,
        magic=label,
        is_text=text_flag,
        polyglot_suspect=polyglot,
    )
    if magic == "lfs-pointer":
        text = data.decode("utf-8", errors="replace")
        declared, suspect = _parse_lfs_pointer(text)
        meta.lfs_pointer = True
        meta.lfs_declared_size = declared
        meta.lfs_pointer_suspect = suspect
    return meta


# ---------------------------------------------------------------------------
# Trees (in-memory walks; gitlinks/symlinks terminal-opaque)
# ---------------------------------------------------------------------------


@dataclass
class TreeEntry:
    """One validated tree entry.

    name is the path relative to the walk root, composed ONLY of
    validated components (no "/", "..", or ".git" can appear). kind is
    one of blob|tree|gitlink|symlink. gitlink and symlink entries are
    opaque metadata: never followed, never resolved (T-02, T-08).
    """

    name: str
    mode: int
    sha: str
    kind: str
    target: str | None = None  # symlink target text (capped), data only


_GITLINK_MODE = 0o160000
_SYMLINK_MODE = 0o120000


def _read_symlink_target(repo: pygit2.Repository, sha: str) -> str:
    """Read a symlink target blob as data. Never resolved as a path."""
    obj = repo.get(sha)
    if obj is None or not isinstance(obj, pygit2.Blob):
        raise TreeQuarantined("symlink-not-a-blob", sha)
    if obj.size > config.MAX_SYMLINK_TARGET_BYTES:
        raise TreeQuarantined("symlink-target-too-large", sha)
    clean, _truncated = sanitize_text(obj.data, config.MAX_SYMLINK_TARGET_BYTES)
    return clean


def walk_tree_entries(
    repo: pygit2.Repository, tree_sha: str
) -> Iterator[TreeEntry]:
    """Yield validated TreeEntry objects for a tree, recursively, in memory.

    Raises TreeQuarantined on: depth beyond MAX_TREE_DEPTH, a tree with
    more than MAX_TREE_ENTRIES entries, any entry name failing
    validate_tree_entry_name, a non-decodable entry name, an oversized
    symlink target, or a tree object libgit2 cannot parse (hostile bytes
    that fail even the read path are malformed trees, not missing
    objects).
    """
    try:
        root = repo.get(tree_sha)
    except (KeyError, ValueError, pygit2.GitError):
        root = None
    if root is None:
        # Distinguish "absent" from "present but unparseable": a corrupt
        # tree object that libgit2 refuses to read is a malformed tree.
        try:
            present = repo.odb.exists(pygit2.Oid(hex=tree_sha))
        except (ValueError, pygit2.GitError):
            present = False
        if present:
            raise TreeQuarantined("tree-unreadable", tree_sha)
        raise ObjectNotFound(tree_sha)
    if not isinstance(root, pygit2.Tree):
        raise ObjectNotFound(tree_sha)

    def _walk(tree: pygit2.Tree, prefix: str, depth: int) -> Iterator[TreeEntry]:
        if depth > config.MAX_TREE_DEPTH:
            raise TreeQuarantined("tree-too-deep", prefix or "/")
        if len(tree) > config.MAX_TREE_ENTRIES:
            raise TreeQuarantined("tree-too-many-entries", prefix or "/")
        for entry in tree:
            raw = entry.name
            try:
                raw_name = (
                    raw.encode("utf-8", errors="strict")
                    if isinstance(raw, str)
                    else bytes(raw)
                )
            except (UnicodeEncodeError, TypeError, ValueError):
                raise TreeQuarantined("name-not-decodable", repr(raw)[:_DETAIL_SNIP_LEN])
            reason = validate_tree_entry_name(raw_name)
            if reason is not None:
                raise TreeQuarantined(
                    f"malformed-tree:{reason}", raw_name.decode("utf-8", "replace")
                )
            name = raw_name.decode("utf-8")
            full = f"{prefix}/{name}" if prefix else name
            mode = entry.filemode
            sha = str(entry.id)
            if mode == _GITLINK_MODE:
                yield TreeEntry(name=full, mode=mode, sha=sha, kind="gitlink")
            elif mode == _SYMLINK_MODE:
                target = _read_symlink_target(repo, sha)
                yield TreeEntry(
                    name=full, mode=mode, sha=sha, kind="symlink", target=target
                )
            elif entry.type == pygit2.GIT_OBJECT_TREE:
                yield TreeEntry(name=full, mode=mode, sha=sha, kind="tree")
                sub = repo.get(sha)
                if sub is not None and isinstance(sub, pygit2.Tree):
                    yield from _walk(sub, full, depth + 1)
            else:
                yield TreeEntry(name=full, mode=mode, sha=sha, kind="blob")

    return _walk(root, "", 0)


# ---------------------------------------------------------------------------
# Commits
# ---------------------------------------------------------------------------


@dataclass
class CommitObs:
    sha: str
    claimed_author: str
    claimed_author_email: str
    claimed_committer: str
    claimed_committer_email: str
    message: str  # sanitized, capped
    message_truncated: bool
    parents: list[str]
    tree_sha: str
    committed_at: str  # ISO-8601 with the commit's own offset
    signature_present: bool
    signature_key_id: str | None  # parsed from armor, UNVERIFIED
    signature_valid: None = None  # DEFERRED: never shell to gpg here
    signature_trusted: bool = False


def _openpgp_issuer_key_id(armor: bytes) -> str | None:
    """Extract the issuer key id from an ASCII-armored OpenPGP signature.

    Minimal packet walk: armor -> base64 -> new-format packet tag 2 ->
    hashed/unhashed subpacket areas -> issuer (type 16) or issuer
    fingerprint (type 33) subpacket. Anything unexpected returns None;
    the result is UNVERIFIED key-id metadata, never trust.
    """
    try:
        lines = armor.decode("ascii", errors="strict").splitlines()
        body: list[str] = []
        in_body = False
        for line in lines:
            if line.startswith("-----BEGIN"):
                in_body = True
                continue
            if line.startswith("-----END"):
                break
            if in_body:
                if line.startswith(("Version:", "Comment:", "MessageID:", "Hash:")):
                    continue
                if line.strip() == "" or line.startswith("="):
                    continue  # blank line, or the =CRC24 armor trailer
                body.append(line.strip())
        raw = base64.b64decode("".join(body), validate=True)
        if len(raw) < 2:
            return None
        # Packet framing: gpg emits OLD-format headers for signatures
        # (ctb 0x89: tag 2, two-octet length). Accept both framings.
        ctb = raw[0]
        pos = 1
        if ctb & 0xC0 == 0xC0:  # new format
            if ctb & 0x3F != 2:  # not a signature packet
                return None
            first_len = raw[pos]
            pos += 1
            if first_len < 192:
                pkt_len = first_len
            elif first_len < 224:
                pkt_len = ((first_len - 192) << 8) + raw[pos] + 192
                pos += 1
            elif first_len == 255:
                pkt_len = int.from_bytes(raw[pos : pos + 4], "big")
                pos += 4
            else:
                return None  # partial body lengths: not a single packet
        elif ctb & 0xC0 == 0x80:  # old format
            if ((ctb >> 2) & 0x0F) != 2:  # not a signature packet
                return None
            len_type = ctb & 0x03
            if len_type == 0:
                pkt_len = raw[pos]
                pos += 1
            elif len_type == 1:
                pkt_len = int.from_bytes(raw[pos : pos + 2], "big")
                pos += 2
            elif len_type == 2:
                pkt_len = int.from_bytes(raw[pos : pos + 4], "big")
                pos += 4
            else:
                pkt_len = len(raw) - pos  # indeterminate: runs to end
        else:
            return None
        end = pos + pkt_len
        if end > len(raw) or raw[pos] != 4:  # version 4 signature
            return None
        pos += 4  # version, sig type, pubkey algo, hash algo
        hashed_len = (raw[pos] << 8) | raw[pos + 1]
        pos += 2
        hashed_end = pos + hashed_len
        # Scan the hashed subpacket area, then the unhashed area, for
        # issuer subpackets.
        found = _scan_subpackets(raw, pos, hashed_end)
        if found:
            return found
        # Unhashed area follows the 2-byte trailer + 2-byte unhashed length.
        uh_len_pos = hashed_end + 2
        if uh_len_pos + 2 <= len(raw):
            uh_len = (raw[uh_len_pos] << 8) | raw[uh_len_pos + 1]
            found = _scan_subpackets(raw, uh_len_pos + 2, uh_len_pos + 2 + uh_len)
            if found:
                return found
        return None
    except (ValueError, IndexError, binascii.Error, UnicodeDecodeError):
        return None


def _scan_subpackets(raw: bytes, start: int, end: int) -> str | None:
    pos = start
    while pos < end:
        if pos >= len(raw):
            return None
        first = raw[pos]
        pos += 1
        if first < 192:
            sub_len = first
        elif first < 255:
            if pos >= len(raw):
                return None
            sub_len = ((first - 192) << 8) + raw[pos] + 192
            pos += 1
        else:
            if pos + 4 > len(raw):
                return None
            sub_len = int.from_bytes(raw[pos : pos + 4], "big")
            pos += 4
        if pos >= len(raw) or pos + sub_len > len(raw) + 1:
            return None
        sub_type = raw[pos] & 0x7F
        sub_data = raw[pos + 1 : pos + sub_len]
        if sub_type == 16 and len(sub_data) >= 8:  # issuer key id
            return sub_data[:8].hex()
        if sub_type == 33 and len(sub_data) >= 20:  # issuer fingerprint
            return sub_data[-8:].hex()
        pos += sub_len
    return None


def parse_commit(repo: pygit2.Repository, sha: str) -> CommitObs:
    """Parse a commit object into a CommitObs.

    Author/committer are recorded ONLY as claimed_* (T-05): free text,
    unverified. Signature fields record presence and armor-parsed key id;
    validity is deferred (None) and trust is always False at ingestion
    time (T-06); a future sandboxed verifier with a pinned keyring owns
    verification.
    """
    try:
        commit = repo.get(sha)
    except (KeyError, ValueError, pygit2.GitError):
        raise ObjectNotFound(sha)
    if commit is None or not isinstance(commit, pygit2.Commit):
        raise ObjectNotFound(sha)
    author = commit.author
    committer = commit.committer
    raw_message = (commit.message or "").encode("utf-8", errors="replace")
    message, truncated = sanitize_text(raw_message, config.MAX_MESSAGE_BYTES)
    claimed_author, _ = sanitize_text(author.name or "", config.MAX_MESSAGE_BYTES)
    claimed_committer, _ = sanitize_text(
        committer.name or "", config.MAX_MESSAGE_BYTES
    )
    claimed_author_email, _ = sanitize_text(
        author.email or "", config.MAX_MESSAGE_BYTES
    )
    claimed_committer_email, _ = sanitize_text(
        committer.email or "", config.MAX_MESSAGE_BYTES
    )
    committed_at = datetime.fromtimestamp(
        commit.commit_time,
        tz=timezone(timedelta(minutes=commit.commit_time_offset)),
    ).isoformat()
    # pygit2 1.20.1 returns (bytes, bytes) for gpg_signature, not str.
    # Handle both shapes defensively; a missing signature is (None, None).
    signature, _signed_data = commit.gpg_signature
    signature_present = signature is not None
    if signature_present and signature:
        if isinstance(signature, (bytes, bytearray)):
            sig_bytes = bytes(signature)
        else:
            sig_bytes = str(signature).encode("ascii", errors="ignore")
        key_id = _openpgp_issuer_key_id(sig_bytes)
    else:
        key_id = None
    return CommitObs(
        sha=str(commit.id),
        claimed_author=claimed_author,
        claimed_author_email=claimed_author_email,
        claimed_committer=claimed_committer,
        claimed_committer_email=claimed_committer_email,
        message=message,
        message_truncated=truncated,
        parents=[str(p.id) for p in commit.parents],
        tree_sha=str(commit.tree_id),
        committed_at=committed_at,
        signature_present=signature_present,
        signature_key_id=key_id,
        signature_valid=None,
        signature_trusted=False,
    )


# ---------------------------------------------------------------------------
# Diffs
# ---------------------------------------------------------------------------


@dataclass
class DiffSummary:
    files_changed: int
    exact_renames: list[tuple[str, str]] = field(default_factory=list)
    # Inexact renames are scored HYPOTHESES: {old, new, score, threshold}.
    inexact_renames: list[dict] = field(default_factory=list)
    added: list[str] = field(default_factory=list)
    deleted: list[str] = field(default_factory=list)
    modified: list[str] = field(default_factory=list)
    truncated: bool = False  # path lists were capped
    merge: bool = False
    rename_threshold: int = 50
    rename_limit: int = 0
    # True when the delete/add candidate pool exceeded rename_limit: libgit2
    # silently degrades to delete+add pairs past the ceiling (findings #4).
    rename_ceiling_hit: bool = False
    # Count of diff entries touching a gitlink (mode 160000) on either
    # side; feeds the per-packet gitlink cap in packet.py (T-02).
    gitlink_deltas: int = 0


# Path lists in a diff summary are capped so one giant commit cannot
# bloat an observation. Not a threat-table cap: local constant.
_DIFF_PATH_LIST_CAP = 512


def _append_capped(bucket: list[str], path: str) -> bool:
    if len(bucket) >= _DIFF_PATH_LIST_CAP:
        return True
    bucket.append(path)
    return False


def diff_commit(
    repo: pygit2.Repository, sha: str, rename_limit: int, deadline: float | None = None
) -> DiffSummary:
    """Summarize one commit's changes via libgit2 diff + rename detection.

    Merge commits diff against their FIRST parent and are flagged
    merge=True. Root commits diff against the empty tree (added files
    enumerated by an in-memory tree walk; no empty-tree object is
    written). Exact renames (similarity 100) are recorded as facts;
    inexact renames as scored hypotheses with the threshold recorded.
    """
    commit = repo.get(sha)
    if commit is None or not isinstance(commit, pygit2.Commit):
        raise ObjectNotFound(sha)
    summary = DiffSummary(files_changed=0, rename_limit=rename_limit)
    parents = list(commit.parents)
    summary.merge = len(parents) > 1
    new_tree = commit.tree

    if not parents:
        # Root commit: everything is an addition.
        for entry in walk_tree_entries(repo, str(commit.tree_id)):
            if entry.kind == "gitlink":
                summary.gitlink_deltas += 1
                continue
            if entry.kind != "blob":
                continue
            if _append_capped(summary.added, entry.name):
                summary.truncated = True
        summary.files_changed = len(summary.added)
        return summary

    old_tree = parents[0].tree
    diff = repo.diff(old_tree, new_tree)
    # Pre-count delete/add candidates BEFORE rename detection so the
    # silent renameLimit ceiling is observable, not silent (findings #4).
    pre_deletes = sum(1 for p in diff if p.delta.status == pygit2.GIT_DELTA_DELETED)
    pre_adds = sum(1 for p in diff if p.delta.status == pygit2.GIT_DELTA_ADDED)
    if pre_deletes + pre_adds > rename_limit:
        summary.rename_ceiling_hit = True
    diff.find_similar(pygit2.GIT_DIFF_FIND_RENAMES, rename_limit=rename_limit)
    for patch in diff:
        if deadline is not None and monotonic() > deadline:
            raise PacketTimeout("diff")
        delta = patch.delta
        status = delta.status
        old_path = delta.old_file.path
        new_path = delta.new_file.path
        if delta.old_file.mode == _GITLINK_MODE or delta.new_file.mode == _GITLINK_MODE:
            # Gitlink touched: opaque metadata only, never followed (T-02).
            summary.gitlink_deltas += 1
        if status == pygit2.GIT_DELTA_RENAMED:
            # Exact phase = identical blob OID on both sides (content
            # addressing makes this deterministic); anything else libgit2
            # scored by similarity is a hypothesis, not a fact.
            if delta.old_file.id == delta.new_file.id:
                summary.exact_renames.append((old_path, new_path))
            else:
                similarity = delta.similarity
                summary.inexact_renames.append(
                    {
                        "old": old_path,
                        "new": new_path,
                        "score": similarity,
                        "threshold": summary.rename_threshold,
                    }
                )
        elif status == pygit2.GIT_DELTA_ADDED:
            if _append_capped(summary.added, new_path):
                summary.truncated = True
        elif status == pygit2.GIT_DELTA_DELETED:
            if _append_capped(summary.deleted, old_path):
                summary.truncated = True
        elif status in (
            pygit2.GIT_DELTA_MODIFIED,
            pygit2.GIT_DELTA_TYPECHANGE,
        ):
            if _append_capped(summary.modified, new_path):
                summary.truncated = True
        # Other statuses (ignored, untracked, conflicted) cannot occur in
        # a tree-to-tree diff and are not recorded.
    summary.files_changed = (
        len(summary.added)
        + len(summary.deleted)
        + len(summary.modified)
        + len(summary.exact_renames)
        + len(summary.inexact_renames)
    )
    return summary


# ---------------------------------------------------------------------------
# History walks
# ---------------------------------------------------------------------------


def walk_commits(
    repo: pygit2.Repository,
    start_shas: list[str],
    max_commits: int | None = None,
    deadline: float | None = None,
) -> tuple[list[str], bool]:
    """Topological revwalk from start_shas. Returns (shas, capped).

    capped=True when the walk stopped at max_commits (older history
    continues in follow-up packets; a walk bound, not a quarantine).
    Raises PacketTimeout when the deadline passes mid-walk.
    """
    cap = max_commits if max_commits is not None else config.MAX_COMMITS_PER_PACKET
    walker = repo.walk(None, pygit2.GIT_SORT_TOPOLOGICAL)
    for start in start_shas:
        try:
            walker.push(start)
        except (KeyError, ValueError, pygit2.GitError):
            raise ObjectNotFound(start)
    shas: list[str] = []
    capped = False
    for commit in walker:
        if deadline is not None and monotonic() > deadline:
            raise PacketTimeout("revwalk")
        shas.append(str(commit.id))
        if len(shas) >= cap:
            capped = True
            break
    return shas, capped


__all__ = [
    "TreeQuarantined",
    "PacketTimeout",
    "ObjectNotFound",
    "BlobMeta",
    "TreeEntry",
    "CommitObs",
    "DiffSummary",
    "read_blob_meta",
    "walk_tree_entries",
    "parse_commit",
    "diff_commit",
    "walk_commits",
]
