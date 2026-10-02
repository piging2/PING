// B9 repro stub. The production PingObjectReader is gateway-backed and is
// NEVER invoked in these repros: every getFydTenantGraph call injects the
// documented test seam { reader }, exactly as mc-context-pack.ts allows.
// The interface shape mirrors the real one (queryFydSiteOverlays method).
export interface FydJournalOverlay {
  eventId: string;
  timestamp: string;
  ops: unknown[];
}
export interface PingObjectReader {
  queryFydSiteOverlays(siteId: string): Promise<FydJournalOverlay[]>;
}
export function getPingObjectReader(): PingObjectReader {
  throw new Error(
    "b9-repro-stub: production PingObjectReader is unavailable in the repro harness"
  );
}
