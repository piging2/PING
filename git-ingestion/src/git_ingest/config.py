"""Global ingestion boundaries.

Single owner for every resource and behavior cap in the git ingestion
pipeline. Every other module MUST import caps from here; numeric literal
duplicates of these values anywhere else in src/git_ingest/ are a G-16
lint failure.

Caps mirror the Global Boundaries table of the binding threat register
(GIT-INGESTION-THREATS.md, section 2).
"""

# Max decompressed bytes of a single blob accepted for content reads.
# Larger blobs are recorded as blob-truncated metadata only (T-03).
MAX_BLOB_BYTES = 64 * 1024 * 1024  # 64 MiB

# Pack expansion tripwire: abort an object whose
# decompressed_bytes / compressed_bytes exceeds this ratio (T-03).
# libgit2/pygit2 does not expose per-object expansion ratios or delta chain
# depth, so this is enforced indirectly: declared-size gate before any read,
# streaming bounded-chunk reads, cumulative packet accounting, and the
# packet wall-clock timeout. See design/ARCHITECTURE.md.
MAX_PACK_EXPANSION_RATIO = 100

# Cumulative decompressed bytes accepted per packet (T-03).
MAX_PACKET_DECOMPRESSED_BYTES = 1024 * 1024 * 1024  # 1 GiB

# Max tree nesting depth followed during tree walks (T-01).
MAX_TREE_DEPTH = 32

# Max entries accepted in a single tree object (entry-count bomb bound).
MAX_TREE_ENTRIES = 100000

# Max submodule (gitlink) entries recorded per packet; gitlinks are
# terminal-opaque metadata and are NEVER followed (T-02).
MAX_GITLINKS_PER_PACKET = 1000

# Max commits walked per packet; older history continues in follow-up
# packets. This is a walk bound, not a quarantine trigger.
MAX_COMMITS_PER_PACKET = 10000

# Max refs validated and recorded per packet (ref-spam bound, T-12).
MAX_REFS_PER_PACKET = 5000

# Max bytes for a single repo-controlled text field (commit/tag messages).
# Excess is truncated with a marker (T-11).
MAX_MESSAGE_BYTES = 10 * 1024  # 10 KiB

# Max bytes for a symlink target blob; targets are recorded as data and
# NEVER resolved or followed (T-08).
MAX_SYMLINK_TARGET_BYTES = 4 * 1024  # 4 KiB

# Per-packet wall-clock budget; expiry quarantines the packet instead of
# hanging the pipeline (T-07 races, T-10 dangling pointers).
PACKET_TIMEOUT_SECONDS = 120

# Max symbolic-ref hops followed before a cycle/chain is declared (T-12).
SYMREF_MAX_HOPS = 5

# Max delta chain depth accepted before a blob is rejected without full
# resolution (T-03). Enforced indirectly via the declared-size gate,
# cumulative accounting, and the packet timeout; see
# design/ARCHITECTURE.md for the honest adaptation note.
DELTA_CHAIN_MAX_DEPTH = 64

# Connector identity used in the /ingest wire format and in envelope
# sourceIdentity derivation.
CONNECTOR_ID = "git-ingest"

# Named party that granted access, carried on every envelope and payload.
PRINCIPAL = "ping-git-ingest"

# PING namespace downstream events land in.
NAMESPACE = "core::git"
