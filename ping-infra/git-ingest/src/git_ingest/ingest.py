"""Orchestrator: repo -> observation -> evidence, bounded and resumable.

Scope (v1): public repositories, commit-level observations, read-only.

Terminal states for one ingest_repo() call:
- OK: all pages walked; every commit either emitted or skipped as a
  known duplicate.
- PARTIAL_UNKNOWN: some fetch failed mid-way (or a commit 404'd on a
  force-pushed repo). The failed unit is recorded as an UNKNOWN, the
  checkpoint is saved, and the run ends honestly. Nothing is invented
  to fill the gap.
- RATE_LIMITED: GitHub signalled exhaustion. Checkpoint saved, run ends
  immediately, no retries. A later run resumes.
- CONFLICT_LOCKED: another ingester holds the per-repo lock. No work
  done, no partial state.

Guarantees:
- Checkpoint written after every page: a kill mid-fetch resumes at the
  next page.
- Dedupe ledger (not the checkpoint) is the source of truth for
  duplicate suppression, so a stale or missing checkpoint cannot
  re-emit evidence.
- One writer per repo enforced by the checkpoint store's lock.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from . import checkpoint as cp_module
from . import emitter as emitter_module
from . import identity
from .transport import NotFound, RateLimited, Transport, TransportError


@dataclass
class IngestResult:
    state: str  # OK | PARTIAL_UNKNOWN | RATE_LIMITED | CONFLICT_LOCKED
    owner: str
    repo: str
    emitted: int = 0
    skipped_duplicates: int = 0
    unknowns: List[str] = field(default_factory=list)
    authenticated: bool = False
    detail: str = ""


class GitIngester:
    def __init__(self, transport: Transport,
                 store: "cp_module.CheckpointStore",
                 ledger: "emitter_module.DedupeLedger",
                 sink: "emitter_module.Sink",
                 per_page: int = 100,
                 authenticated: bool = False):
        self.transport = transport
        self.store = store
        self.ledger = ledger
        self.sink = sink
        self.per_page = per_page
        self.authenticated = authenticated

    def ingest_repo(self, owner: str, repo: str) -> IngestResult:
        key = identity.repo_key(owner, repo)
        try:
            with self.store.claim(key):
                return self._ingest_claimed(owner, repo, key)
        except cp_module.LockConflict:
            return IngestResult(
                state="CONFLICT_LOCKED", owner=owner, repo=repo,
                detail=f"repo {key} is already being ingested; aborting",
            )

    def _ingest_claimed(self, owner: str, repo: str, key: str) -> IngestResult:
        result = IngestResult(state="OK", owner=owner, repo=repo,
                              authenticated=self.authenticated)
        cp = self.store.load(key)
        if cp is None:
            cp = self.store.fresh(key)
        page = int(cp.get("pages_done", 0) or 0) + 1
        emitted = int(cp.get("emitted", 0) or 0)
        skipped = int(cp.get("skipped_duplicates", 0) or 0)
        unknowns = list(cp.get("unknowns", []) or [])

        while True:
            try:
                resp = self.transport.get(
                    f"/repos/{owner}/{repo}/commits",
                    {"per_page": self.per_page, "page": page})
            except RateLimited as e:
                cp.update({"state": "rate_limited", "pages_done": page - 1,
                           "emitted": emitted, "skipped_duplicates": skipped,
                           "unknowns": unknowns,
                           "rate_limit_reset": e.reset_epoch})
                self.store.save(key, cp)
                result.state = "RATE_LIMITED"
                result.detail = f"stopped before page {page}: {e}"
                break
            except TransportError as e:
                cp.update({"state": "partial_unknown", "pages_done": page - 1,
                           "emitted": emitted, "skipped_duplicates": skipped,
                           "unknowns": unknowns})
                self.store.save(key, cp)
                result.state = "PARTIAL_UNKNOWN"
                result.detail = f"page {page} fetch failed: {e}"
                break

            commits = resp.body if isinstance(resp.body, list) else []
            if not commits:
                cp.update({"state": "complete", "pages_done": page - 1,
                           "emitted": emitted, "skipped_duplicates": skipped,
                           "unknowns": unknowns})
                self.store.save(key, cp)
                break

            for commit in commits:
                sha = commit.get("sha", "unknown")
                detail = self._fetch_commit_detail(owner, repo, sha)
                if detail is None:
                    unknowns.append(sha)
                    continue
                text = identity.commit_observation_text(owner, repo, detail)
                env = emitter_module.build_envelope(
                    owner, repo, sha, "commit", text,
                    verification_status="verified")
                new, _sink_id = emitter_module.emit_if_new(
                    self.ledger, self.sink, env)
                if new:
                    emitted += 1
                else:
                    skipped += 1

            cp.update({"state": "in_progress", "pages_done": page,
                       "emitted": emitted, "skipped_duplicates": skipped,
                       "unknowns": unknowns})
            self.store.save(key, cp)
            page += 1

        result.emitted = emitted
        result.skipped_duplicates = skipped
        result.unknowns = unknowns
        if result.state == "OK" and unknowns:
            result.state = "PARTIAL_UNKNOWN"
            result.detail = f"{len(unknowns)} commit(s) unresolvable (UNKNOWN)"
        return result

    def _fetch_commit_detail(self, owner: str, repo: str, sha: str) -> Optional[Dict]:
        """Full commit record for stats/file counts. 404 => None (UNKNOWN),
        not a crash: force-pushed repos lose commits."""
        try:
            resp = self.transport.get(f"/repos/{owner}/{repo}/commits/{sha}")
        except NotFound:
            return None
        except TransportError:
            return None
        return resp.body if isinstance(resp.body, dict) else None
