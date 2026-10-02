"""Worker A follow-up: parse the real journal row shape (event_data).

The live gateway's GET /events/:stream returns raw ping_events rows shaped
{ event_id, timestamp, event_data: {...} } (see
/home/nolan/ping/gateway/routes/events.js and
tools/fyd-site-projection/dump.py line 110). The reader's eventPayload did
not check event_data, so the tenant filter would silently drop every overlay
against the real gateway. This patch adds the event_data fallback and
switches the stub journal to the faithful row shape.
"""
import sys

PATCHES = [
    (
        "/home/nolan/projects/ping/src/lib/ping/ping-object-reader.ts",
        """function eventPayload(ev: JsonRecord): JsonRecord {
  return asRecord(ev.payload) ?? asRecord(ev.data) ?? asRecord(ev.body) ?? {};
}""",
        """function eventPayload(ev: JsonRecord): JsonRecord {
  // The live gateway returns raw ping_events rows: { event_id, timestamp,
  // event_data }. event_data is the journal payload shape (see
  // tools/fyd-site-projection/dump.py); the other keys cover normalized
  // envelope shapes.
  return (
    asRecord(ev.payload) ??
    asRecord(ev.data) ??
    asRecord(ev.event_data) ??
    asRecord(ev.body) ??
    {}
  );
}""",
    ),
    (
        "/home/nolan/projects/ping/src/app/api/fyd/ask/__tests__/stub-journal.ts",
        """        const body = JSON.stringify({
          events: events.map((e) => ({
            id: e.id,
            event_id: e.id,
            ts: e.ts,
            timestamp: e.ts,
            payload: { siteId: e.siteId, ops: e.ops },
          })),
        });""",
        """        // Faithful to the live gateway's GET /events/:stream: raw
        // ping_events rows ({ event_id, timestamp, event_data }).
        const body = JSON.stringify({
          events: events.map((e) => ({
            event_id: e.id,
            timestamp: e.ts,
            event_type: "FYD_SITE_OVERLAY",
            event_data: { siteId: e.siteId, ops: e.ops },
          })),
        });""",
    ),
]

for path, old, new in PATCHES:
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    count = text.count(old)
    if count != 1:
        print(f"ABORT {path}: found {count}")
        sys.exit(1)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text.replace(old, new))
    print("patched", path)
