/**
 * LANE A git-ingestion spike: global ingestion boundaries.
 *
 * Single config module for every cap (threat register section 2).
 * Every breach emits a typed quarantine reason, never a silent skip.
 * Values mirror ~/workspace/git-ingestion/threats/GIT-INGESTION-THREATS.md.
 */
export const CAPS = Object.freeze({
  /** Max blob content bytes ingested per blob; larger -> blob-truncated metadata only. */
  maxBlobBytes: 64 * 1024 * 1024,
  /** Cumulative decompressed/content bytes read per packet. */
  maxPacketBytes: 1024 * 1024 * 1024,
  /** Max commits walked per packet; older history via follow-up packets. */
  maxCommitsPerPacket: 10000,
  /** Max refs processed per packet. */
  maxRefsPerPacket: 5000,
  /** Max file changes recorded per commit; beyond -> diff_truncated coverage flag. */
  maxFileChangesPerCommit: 1000,
  /** Max tree path components depth validated. */
  maxTreeDepth: 32,
  /** Max bytes per tree entry name component. */
  maxNameBytes: 255,
  /** Max bytes for a full validated path. */
  maxPathBytes: 4096,
  /** Max metadata field bytes (commit messages); excess truncated with marker. */
  maxMessageBytes: 10 * 1024,
  /** Max bytes for symlink targets / author fields. */
  maxSmallFieldBytes: 4 * 1024,
  /** Max gitlinks recorded per packet (opaque metadata only). */
  maxGitlinksPerPacket: 1000,
  /** Per git subprocess wall-clock ms. */
  gitCommandTimeoutMs: 30000,
  /** Whole-packet wall-clock ms. */
  packetTimeoutMs: 120000,
  /** Symref resolution hop cap. */
  maxSymrefHops: 5,
  maxPackedRefsBytes: 8 * 1024 * 1024,
});

export const QUARANTINE = Object.freeze({
  MALFORMED_TREE: "malformed-tree",
  PACKET_TIMEOUT: "packet-timeout",
  COMMAND_TIMEOUT: "command-timeout",
  BLOB_CAP: "blob-cap-exceeded",
  REF_CYCLE: "ref-cycle-detected",
  INVALID_REF: "invalid-refname",
  REF_COLLISION: "ref-case-collision",
  STALE: "ref-moved-during-ingest",
  CAP_EXCEEDED: "cap-exceeded",
});
