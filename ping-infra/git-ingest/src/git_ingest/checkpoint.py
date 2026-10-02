"""Checkpointing: resumable, crash-safe per-repo ingestion state.

One file per repo under the checkpoint dir. Rules:
- Atomic writes: write to temp file, fsync, os.replace. A crash can never
  leave a half-written checkpoint.
- Corrupt checkpoint = UNKNOWN resume cursor, never a crash: the loader
  returns None and the ingester re-anchors from page 1, relying on the
  dedupe ledger (not the checkpoint) for duplicate suppression.
- One writer per repo: claim() takes an exclusive non-blocking flock on
  a per-repo lock file. A second concurrent ingester gets LockConflict
  and must abort, not interleave.
"""
from __future__ import annotations

import fcntl
import json
import os
import time
from contextlib import contextmanager
from typing import Any, Dict, Iterator, Optional


SCHEMA = "git-ingest-checkpoint:v1"


class LockConflict(Exception):
    """Another ingester holds the per-repo lock. Abort; do not interleave."""


def _safe_name(repo_key: str) -> str:
    return "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in repo_key)


class CheckpointStore:
    def __init__(self, directory: str):
        self.directory = directory
        os.makedirs(directory, exist_ok=True)

    def _paths(self, repo_key: str):
        name = _safe_name(repo_key)
        return (os.path.join(self.directory, f"{name}.json"),
                os.path.join(self.directory, f"{name}.json.tmp"),
                os.path.join(self.directory, f"{name}.lock"))

    def load(self, repo_key: str) -> Optional[Dict[str, Any]]:
        """Return the checkpoint or None (missing, corrupt, wrong schema).
        Corruption is reported via the returned marker, never an exception."""
        path, _, _ = self._paths(repo_key)
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, ValueError):
            return None
        if not isinstance(data, dict) or data.get("schema") != SCHEMA:
            return None
        return data

    def save(self, repo_key: str, checkpoint: Dict[str, Any]) -> None:
        path, tmp, _ = self._paths(repo_key)
        checkpoint = dict(checkpoint)
        checkpoint["schema"] = SCHEMA
        checkpoint["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(checkpoint, f, sort_keys=True)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)

    @contextmanager
    def claim(self, repo_key: str) -> Iterator[None]:
        """Exclusive, non-blocking per-repo write claim. Raises LockConflict."""
        _, _, lock_path = self._paths(repo_key)
        fh = open(lock_path, "a+")
        try:
            try:
                fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError:
                raise LockConflict(f"repo {repo_key} is already being ingested")
            yield
        finally:
            try:
                fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
            finally:
                fh.close()

    def fresh(self, repo_key: str, **extra: Any) -> Dict[str, Any]:
        cp: Dict[str, Any] = {
            "repo_key": repo_key,
            "state": "in_progress",
            "pages_done": 0,
            "last_sha": None,
            "emitted": 0,
            "skipped_duplicates": 0,
            "unknowns": [],
            "authenticated": None,
        }
        cp.update(extra)
        return cp
