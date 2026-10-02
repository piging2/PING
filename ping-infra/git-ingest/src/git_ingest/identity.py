"""Deterministic identity for ingested git occurrences.

Invariant: same repository + same commit SHA + same observation kind
always yields the same occurrence id. Re-ingestion of an unchanged repo
therefore produces zero new evidence rows: the dedupe ledger keys on the
same hash and refuses the duplicate.

Occurrence id:  sha256("git-ingest:v1|<owner>/<repo>|<sha>|<kind>") hex.
Observation hash: sha256 of the canonical observation text bytes.
"""
from __future__ import annotations

import hashlib
from typing import Dict

SCHEMA = "git-ingest:v1"
AGGREGATE_TYPE = "git_ingest"
EVENT_TYPE = "OBSERVATION_CREATED"
RESEARCH_AGENT = "git-ingest"


def repo_key(owner: str, repo: str) -> str:
    return f"{owner}/{repo}".lower()


def aggregate_id(owner: str, repo: str) -> str:
    return f"git-repo:{repo_key(owner, repo)}"


def occurrence_id(owner: str, repo: str, sha: str, kind: str) -> str:
    raw = f"{SCHEMA}|{repo_key(owner, repo)}|{sha}|{kind}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def commit_observation_text(owner: str, repo: str, commit: Dict) -> str:
    """Canonical, deterministic observation text for one commit.

    `commit` is a GitHub commit object (from /repos/{o}/{r}/commits/{sha}
    or the list form). Fields that are absent become the literal string
    "unknown"; we never invent values.
    """
    sha = commit.get("sha", "unknown")
    c = commit.get("commit", {}) or {}
    msg = (c.get("message") or "unknown").split("\n", 1)[0].strip() or "unknown"
    author = ((c.get("author") or {}).get("name")) or "unknown"
    date = ((c.get("author") or {}).get("date")) or "unknown"
    url = commit.get("html_url") or f"https://github.com/{owner}/{repo}/commit/{sha}"
    stats = commit.get("stats") or {}
    files = commit.get("files") or []
    changed_files = "unknown"
    if files:
        changed_files = str(len(files))
    elif "total" in stats:
        changed_files = str(stats.get("total", "unknown"))
    additions = stats.get("additions", "unknown")
    deletions = stats.get("deletions", "unknown")
    return (
        f"GitHub commit {sha} in {owner}/{repo}.\n"
        f"message: {msg}\n"
        f"author: {author}\n"
        f"authored_at: {date}\n"
        f"url: {url}\n"
        f"files_changed: {changed_files}\n"
        f"additions: {additions}\n"
        f"deletions: {deletions}\n"
    )


def observation_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()
