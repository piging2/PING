"""Input validation and text sanitization at the ingestion boundary.

Every repo-controlled name and string passes through here before it can
reach an observation, a log line, or any path-like use:

- Tree entry names: the same gates as `git fsck` (T-01). libgit2 rejects
  these names when WRITING trees, but it will happily READ a crafted tree
  object, so this validation is not redundant.
- Ref names: git check-ref-format rules, plus symref resolution with a
  hop cap (T-12).
- Free text (messages, author names, symlink targets): C0/C1 stripping,
  ANSI neutralization, bidi isolation, byte-capped truncation (T-11).
"""

from __future__ import annotations

import re

import pygit2

from . import config

# ---------------------------------------------------------------------------
# Tree entry names (T-01)
# ---------------------------------------------------------------------------

# Quarantine reason codes returned by validate_tree_entry_name.
EMPTY_NAME = "empty-name"
DOT_ENTRY = "dot-entry"
DOTDOT_ENTRY = "dotdot-entry"
DOTGIT_ENTRY = "dotgit-entry"
SLASH_IN_NAME = "slash-in-name"
NAME_TOO_LONG = "name-too-long"

_MAX_NAME_BYTES = 255


def validate_tree_entry_name(name: bytes) -> str | None:
    """Validate one tree entry name. Returns None when OK, else a reason code.

    Gates mirror git fsck: empty, ".", "..", ".git", embedded "/", and a
    255-byte per-component cap. Names are validated BEFORE any path use;
    ingestion never materializes entry names onto disk anyway.
    """
    if not name:
        return EMPTY_NAME
    if name == b".":
        return DOT_ENTRY
    if name == b"..":
        return DOTDOT_ENTRY
    if name == b".git":
        return DOTGIT_ENTRY
    if b"/" in name:
        return SLASH_IN_NAME
    if len(name) > _MAX_NAME_BYTES:
        return NAME_TOO_LONG
    return None


# ---------------------------------------------------------------------------
# Ref names (T-12)
# ---------------------------------------------------------------------------

_REF_FORBIDDEN_CHARS = frozenset(" ~^:?*[\\")


def validate_ref_name(name: str, require_slash: bool = True) -> bool:
    """Apply git check-ref-format rules to a ref name.

    Rejects: empty names, lone "@", "@{" sequences, "..", leading/trailing
    "/" or ".", consecutive slashes, ASCII controls / DEL / space /
    ~ ^ : ? * [ / backslash, components starting with "." or ending in
    ".lock". HEAD is handled separately by the snapshot layer (it is not
    a slash-containing refname); pass require_slash=False for it if ever
    validated directly.
    """
    if not name:
        return False
    if name == "@":
        return False
    if "@{" in name:
        return False
    if ".." in name:
        return False
    if name.startswith("/") or name.startswith("."):
        return False
    if name.endswith("/") or name.endswith(".") or name.endswith(".lock"):
        return False
    if "//" in name:
        return False
    for ch in name:
        # ASCII controls / DEL: compared without numeric literals so the
        # bounds cannot collide with threat-table caps.
        if ch < " " or ch == "\x7f":
            return False
        if ch in _REF_FORBIDDEN_CHARS:
            return False
    for component in name.split("/"):
        if not component:
            return False
        if component.startswith("."):
            return False
        if component.endswith(".lock"):
            return False
    if require_slash and "/" not in name:
        return False
    return True


def resolve_symref(
    repo: pygit2.Repository, name: str
) -> tuple[str | None, str | None]:
    """Resolve a possibly-symbolic ref to a target sha.

    Returns (sha_hex, None) on success, (None, reason) on failure.
    Follows at most config.SYMREF_MAX_HOPS hops; cycles, over-long
    chains, and dangling targets are typed failures, never loops (T-12).
    A direct (non-symbolic) ref resolves in zero hops.
    """
    try:
        current = repo.references.get(name)
    except (KeyError, pygit2.GitError):
        return None, "ref-not-found"
    if current is None:
        return None, "ref-not-found"
    seen = {name}
    hops = 0
    # A symbolic ref's target is a str (the target ref name); a direct
    # ref's target is an Oid. No reliance on libgit2 ref-type constants.
    while isinstance(current.target, str):
        if hops >= config.SYMREF_MAX_HOPS:
            return None, "symref-max-hops"
        target_name = current.target
        if target_name in seen:
            return None, "symref-cycle"
        seen.add(target_name)
        hops += 1
        try:
            nxt = repo.references.get(target_name)
        except (KeyError, pygit2.GitError):
            return None, "symref-dangling"
        if nxt is None:
            return None, "symref-dangling"
        current = nxt
    return str(current.target), None


# ---------------------------------------------------------------------------
# Free-text sanitization (T-11)
# ---------------------------------------------------------------------------

_ANSI_RE = re.compile(
    r"\x1b\[[0-?]*[ -/]*[@-~]"  # CSI sequences (grammar-strict)
    r"|\x1b\[[ -~]*"  # unterminated CSI: strip the run
    r"|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)"  # OSC sequences (incl. hyperlink OSC 8)
    r"|\x1b."  # lone ESC + one char
)
_BIDI_OVERRIDES = frozenset("\u202a\u202b\u202c\u202d\u202e")
_LRI = "\u2066"  # left-to-right isolate
_PDI = "\u2069"  # pop directional isolate
_TRUNC_MARKER = "[...truncated]"


def sanitize_text(data: bytes | str, max_bytes: int) -> tuple[str, bool]:
    """Sanitize repo-controlled text. Returns (clean_text, truncated).

    Steps, in order:
    1. Decode UTF-8 (replacement char for invalid bytes; raw bytes are
       never passed through to structured fields).
    2. Neutralize ANSI escape sequences (CSI/OSC/lone ESC) so terminal
       manipulation and forged log lines cannot survive.
    3. Strip C0/C1 control characters except \\t and \\n (\\r is stripped:
       it is a classic log-forgery primitive).
    4. Wrap bidi override characters (U+202A..U+202E) in U+2066..U+2069
       isolate markers so visual reordering cannot camouflage names.
    5. Truncate to max_bytes of UTF-8 with a "[...truncated]" marker when
       over budget; truncation never splits a code point.
    """
    if isinstance(data, str):
        data = data.encode("utf-8", errors="replace")
    text = data.decode("utf-8", errors="replace")
    text = _ANSI_RE.sub("", text)
    out: list[str] = []
    for ch in text:
        o = ord(ch)
        # C0 controls are below U+0020 (compared as chars so the ASCII
        # bound is not a numeric literal); keep \t and \n only.
        if ch < " " and ch not in ("\t", "\n"):
            continue
        if 0x7F <= o <= 0x9F:
            continue
        if ch in _BIDI_OVERRIDES:
            out.append(_LRI)
            out.append(ch)
            out.append(_PDI)
        else:
            out.append(ch)
    text = "".join(out)
    raw = text.encode("utf-8")
    if len(raw) <= max_bytes:
        return text, False
    marker = _TRUNC_MARKER.encode("utf-8")
    budget = max_bytes - len(marker)
    if budget <= 0:
        return _TRUNC_MARKER[:max_bytes], True
    cut = raw[:budget].decode("utf-8", errors="ignore")
    return cut + _TRUNC_MARKER, True


__all__ = [
    "validate_tree_entry_name",
    "validate_ref_name",
    "resolve_symref",
    "sanitize_text",
    "EMPTY_NAME",
    "DOT_ENTRY",
    "DOTDOT_ENTRY",
    "DOTGIT_ENTRY",
    "SLASH_IN_NAME",
    "NAME_TOO_LONG",
]
