import io
src = io.open("/home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs", encoding="utf-8").read()
old = """ *     Write-boundary P0: when request_id (string, <=128 chars) is present
 *     and was seen before, the gateway returns the ORIGINAL event_id with
 *     deduped:true and appends NOTHING. This is the backstop that makes
 *     lost-response retries and crash recovery converge: any retry that
 *     reaches the gateway with the same request_id gets the original
 *     event instead of a duplicate. The in-memory index is rebuilt from
 *     the store at startup (first record wins), so dedupe survives
 *     restarts. The check -> append -> index-update sequence is
 *     synchronous (no awaits between), so concurrent same-request_id
 *     POSTs cannot both append."""
new = """ *     Write-boundary P0: when request_id (string, <=128 chars) is present
 *     and was seen before UNDER THE SAME TENANT, the gateway returns the
 *     ORIGINAL event_id with deduped:true and appends NOTHING. This is the
 *     backstop that makes lost-response retries and crash recovery
 *     converge: any retry that reaches the gateway with the same
 *     request_id gets the original event instead of a duplicate. A
 *     DIFFERENT tenant reusing the request_id gets a 400
 *     request_id_tenant_conflict WITHOUT learning the original event_id
 *     (zero disclosure). The in-memory index is rebuilt from the store at
 *     startup (first record wins), so dedupe survives restarts. The
 *     check -> append -> index-update sequence is synchronous (no awaits
 *     between), so concurrent same-request_id POSTs cannot both append."""
assert src.count(old) == 1
io.open("/home/nolan/projects/ping/tools/fyd-journal-gateway/server.mjs", "w", encoding="utf-8").write(src.replace(old, new, 1))
print("header updated")
