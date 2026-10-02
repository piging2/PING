"""git-ingest: bounded read-only GitHub repository ingestion.

repo -> observation -> evidence, feeding PING's existing
OBSERVATION_CREATED pipeline. No new event bus, no new authority.
"""
from .ingest import GitIngester, IngestResult
from .transport import UrlLibTransport, ScriptedTransport
from .auth import select_auth, Unauthenticated, SurrogateAuth
from .checkpoint import CheckpointStore
from .emitter import DedupeLedger, FileSink, GatewaySink, build_envelope, emit_if_new

__version__ = "1.0.0"
__all__ = [
    "GitIngester", "IngestResult", "UrlLibTransport", "ScriptedTransport",
    "select_auth", "Unauthenticated", "SurrogateAuth", "CheckpointStore",
    "DedupeLedger", "FileSink", "GatewaySink", "build_envelope", "emit_if_new",
]
