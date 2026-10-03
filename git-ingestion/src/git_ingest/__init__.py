"""PING git repository ingestion pipeline.

Parse-only acquisition path: reads git object data through libgit2/pygit2,
emits typed observations as PING /ingest packets. NEVER executes repository
content, NEVER materializes untrusted trees onto disk, NEVER loads repo-local
git configuration, and NEVER follows submodule or symlink references.

Threat register (binding): ~/workspace/git-ingestion/threats/GIT-INGESTION-THREATS.md
"""

__all__ = [
    "config",
    "clone",
    "snapshot",
    "validate",
    "parse",
    "envelope",
    "packet",
    "ingest_client",
]
