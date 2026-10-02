"""Apply Worker A (ask graph read reroute) patches to the PING repo on the Pig.

Each patch is an exact-string replacement; the script asserts exactly one
match per patch and aborts otherwise. Idempotent-ish: re-running after a
successful apply fails loudly on already-patched text instead of
double-applying.
"""
import sys

REPO = "/home/nolan/projects/ping"

PATCHES = [
    # ------------------------------------------------------------------
    # 1. src/lib/ping/ping-object-reader.ts: interface method + overlay type
    # ------------------------------------------------------------------
    (
        "src/lib/ping/ping-object-reader.ts",
        """  ask(question: string, viewerId: string | null, targetObjectId?: string | null): Promise<AskAnswer>;
  submitProposal(viewerId: string, proposal: AskProposal): Promise<{ eventId: string }>;
}
""",
        """  ask(question: string, viewerId: string | null, targetObjectId?: string | null): Promise<AskAnswer>;
  submitProposal(viewerId: string, proposal: AskProposal): Promise<{ eventId: string }>;
  /**
   * FYD tenant overlay events (FYD_SITE_OVERLAY) for one site, journal
   * order, sanitized to { eventId, timestamp, ops }. The siteId filter is
   * enforced inside the reader: a call can never observe another tenant's
   * overlays. No event envelopes, signatures, cursors, or raw journal
   * material cross the reader boundary.
   */
  queryFydSiteOverlays(siteId: string): Promise<FydJournalOverlay[]>;
}

/**
 * One sanitized FYD site overlay journal record. Only the tenant-scoped op
 * payloads cross the PingObjectReader boundary; op semantics are validated
 * in the FYD layer (src/fyd/data/fyd-tenant-graph.ts).
 */
export interface FydJournalOverlay {
  eventId: string;
  timestamp: string;
  ops: unknown[];
}
""",
    ),
    # ------------------------------------------------------------------
    # 2. src/lib/ping/ping-object-reader.ts: reader implementation
    # ------------------------------------------------------------------
    (
        "src/lib/ping/ping-object-reader.ts",
        """  /** Temporary read source: the existing gateway event query route. */
  private async queryEvents(type: string): Promise<JsonRecord[]> {
""",
        """  /**
   * FYD journal gateway base. Server-side only, like PING_GATEWAY_BASE_URL.
   * The FYD overlay events live in the FYD demo journal, a separate
   * deployment from the main PING gateway, so they get their own base URL.
   */
  private fydJournalBase(): string {
    const raw = process.env.FYD_JOURNAL_GATEWAY_URL;
    return (raw && raw.trim() ? raw.trim() : "http://127.0.0.1:18199").replace(/\\/+$/, "");
  }

  private async gwFyd(path: string): Promise<Response> {
    const url = `${this.fydJournalBase()}${path}`;
    try {
      return await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    } catch (err) {
      throw new GatewayUnreachableError(err instanceof Error ? err.message : String(err));
    }
  }

  async queryFydSiteOverlays(siteId: string): Promise<FydJournalOverlay[]> {
    if (!siteId || !siteId.trim()) throw new BadRequestError("siteId is required");
    const res = await this.gwFyd(`/events/${encodeURIComponent("FYD_SITE_OVERLAY")}`);
    if (res.status === 404) {
      throw new GatewayNotReadyError("event query route /events/FYD_SITE_OVERLAY is not exposed");
    }
    if (!res.ok) {
      throw new GatewayUnreachableError(`event query returned HTTP ${res.status}`);
    }
    const data: unknown = await res.json().catch(() => null);
    const rec = asRecord(data);
    const list = Array.isArray(data) ? data : rec?.events ?? rec?.items ?? rec?.data;
    if (!Array.isArray(list)) {
      throw new GatewayNotReadyError("unexpected shape from /events/FYD_SITE_OVERLAY");
    }
    const out: FydJournalOverlay[] = [];
    for (const raw of list) {
      const ev = asRecord(raw);
      if (!ev) continue;
      const p = eventPayload(ev);
      // Tenant scoping at the authority: only this site's overlays cross.
      if (str(p.siteId) !== siteId) continue;
      const ops = Array.isArray(p.ops) ? p.ops : null;
      if (!ops) {
        throw new PingReaderError(
          "FYD_OVERLAY_MALFORMED",
          `overlay ${eventId(ev) || "?"}: ops is not a list`,
        );
      }
      const eid = eventId(ev);
      if (!eid) continue;
      out.push({ eventId: eid, timestamp: eventTime(ev), ops });
    }
    out.sort((a, b) =>
      a.timestamp === b.timestamp
        ? (a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0)
        : a.timestamp < b.timestamp
          ? -1
          : 1,
    );
    return out;
  }

  /** Temporary read source: the existing gateway event query route. */
  private async queryEvents(type: string): Promise<JsonRecord[]> {
""",
    ),
]

def main() -> None:
    for rel, old, new in PATCHES:
        path = f"{REPO}/{rel}"
        with open(path, "r", encoding="utf-8") as f:
            text = f.read()
        count = text.count(old)
        if count != 1:
            print(f"ABORT: {rel}: expected 1 match, found {count}")
            sys.exit(1)
        text = text.replace(old, new)
        with open(path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"patched {rel}")

if __name__ == "__main__":
    main()
