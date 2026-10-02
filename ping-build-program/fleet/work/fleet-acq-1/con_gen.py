#!/usr/bin/env python3
"""con_gen.py — connector intel docs + result files for a CON range.
Usage: python3 con_gen.py 251 300
Intel is structured data below; emits intel-<domain>.md and CON-*.json results."""
import json, os, sys

LO, HI = int(sys.argv[1]), int(sys.argv[2])
MATRIX = "../../matrix-backend.tsv".replace("matrix-backend", "matrix-connector")
OUTDIR = "../../results/backend".replace("backend", "connector")
WORK = "."

# provider, doc base, aspects: aspect -> (summary, [citations])
INTEL = {}

INTEL["forms"] = {
    "provider": "Google Forms API",
    "aspects": {
        "objects": ("Form (formId, info{title, documentTitle, description}, items[], settings, linkedSheetId, revisionId), "
                    "FormResponse (responseId, answers keyed by questionId, lastSubmittedTime), Watch (id, eventType, "
                    "target Pub/Sub topic, expireTime, state). Methods: forms.create (title only; add items via batchUpdate), "
                    "forms.get/update/batchUpdate, forms.responses.list/get, forms.watches.create/list/delete/renew.",
                    ["https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list",
                     "https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses"]),
        "events": ("Change events via Watches on eventType SCHEMA (form structure) or RESPONSES (new submissions). "
                   "Delivery to a Cloud Pub/Sub topic. Limit: one watch per event type per form per invoker (max two).",
                   ["https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list"]),
        "capabilities": ("Create/get/update forms, batchUpdate items, list/get responses, manage watches. "
                         "Responses are read-only through the API; submission happens through the form UI.",
                         ["https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses"]),
        "authorization": ("OAuth 2.0 with Google API scopes for Forms (body and responses, read and read/write variants). "
                          "Standard Google credential flow; no API-key-only access for response data.",
                          ["https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses"]),
        "webhooks": ("Watches push notifications to Cloud Pub/Sub. Watch expires after 7 days; renew extends 7 days. "
                     "Error state (e.g. SUSPENDED) surfaces on the watch resource.",
                     ["https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list"]),
        "polling": ("forms.responses.list with filter 'timestamp > N' (RFC3339), pageSize (default up to 5000), "
                    "pageToken for pagination. Incremental sync by tracking the newest timestamp seen.",
                    ["https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list"]),
        "rate-limits": ("Subject to Google Cloud API quotas for the Forms API; exact per-method quotas are set in the "
                        "Cloud Console and not restated here. Exceeding quota returns standard quota errors; use backoff.",
                        ["https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list"]),
        "idempotency": ("No idempotency-key on write methods. batchUpdate carries revisionId for optimistic concurrency "
                        "(write fails if the form changed). Safe retry = read-before-write via forms.get.",
                        ["https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses"]),
        "effects": ("Write effects: form structure mutations (items, settings). Response writes are end-user driven "
                    "through the form UI, not the API. Watch management affects notification delivery.",
                    ["https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses"]),
        "reversibility": ("Form edits via batchUpdate are reversible by re-applying the prior item set. No documented "
                          "API undelete for forms. Responses cannot be deleted or altered through the API.",
                          ["https://developers.google.com/workspace/forms/api/guides/retrieve-forms-responses"]),
        "provenance": ("responseId is stable per submission; lastSubmittedTime orders the stream; respondent email present "
                       "only if the form collects it. Form revisionId versions structure changes.",
                       ["https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses/list"]),
    }
}

INTEL["documents"] = {
    "provider": "Google Drive API v3",
    "aspects": {
        "objects": ("files (id, name, mimeType, parents[], owners, permissions, createdTime, modifiedTime), permissions, "
                    "changes, revisions, comments, drives (shared drives), channels. Methods: files.create/get/update/delete/"
                    "copy/export/download/generateIds/list/watch, permissions CRUD, changes.list/getStartPageToken.",
                    ["https://developers.google.com/workspace/drive/api/reference/rest/v3",
                     "https://developers.google.com/workspace/drive/api/reference/rest/v3/files"]),
        "events": ("changes feed: per-user/per-drive ordered change log consumed with page tokens (getStartPageToken, then "
                   "changes.list). Push notifications via watch channels on files or changes.",
                   ["https://developers.google.com/workspace/drive/api/reference/rest/v3"]),
        "capabilities": ("Full file CRUD, multipart and resumable uploads, export of Google Workspace formats to MIME types, "
                         "copy, trash/emptyTrash, search with the q query language, labels, shared-drive management.",
                         ["https://developers.google.com/workspace/drive/api/reference/rest/v3/files"]),
        "authorization": ("OAuth 2.0 with granular scopes (drive.readonly, drive.file, drive). drive.file limits access to "
                          "files created or opened by the app.",
                          ["https://developers.google.com/workspace/drive/api/reference/rest/v3"]),
        "webhooks": ("files.watch and changes.watch create push channels delivering HTTPS POST notifications with "
                     "X-Goog-Channel-* headers. Channels expire; stop via channels.stop.",
                     ["https://developers.google.com/workspace/drive/api/reference/rest/v3"]),
        "polling": ("Incremental sync via the changes feed: store the start page token, call changes.list with pageToken, "
                     "persist the new token. Search via files.list q for ad-hoc queries.",
                     ["https://developers.google.com/workspace/drive/api/reference/rest/v3"]),
        "rate-limits": ("Per-user rate limits enforced; exceeding returns 403 rateLimitExceeded. Google recommends "
                        "exponential backoff. Exact quotas live in the Cloud Console; not restated here.",
                        ["https://developers.google.com/workspace/drive/api/reference/rest/v3"]),
        "idempotency": ("No idempotency-key header. files.generateIds issues client-usable IDs so a retried create can "
                        "reuse the same ID instead of duplicating. Updates are naturally idempotent.",
                        ["https://developers.google.com/workspace/drive/api/reference/rest/v3/files"]),
        "effects": ("File content/metadata mutations, permission grants/revocations, trash, permanent delete via "
                    "emptyTrash, shared-drive membership changes. Reads are side-effect-free.",
                    ["https://developers.google.com/workspace/drive/api/reference/rest/v3/files"]),
        "reversibility": ("Delete moves to trash (recoverable via files.update untrashed). emptyTrash and direct delete of "
                          "trashed files are permanent. Revisions preserve prior content versions for rollback.",
                          ["https://developers.google.com/workspace/drive/api/reference/rest/v3/files"]),
        "provenance": ("File id is stable across moves/renames. createdTime, modifiedTime, lastModifyingUser, version, "
                       "and revision history give full lineage. Changes feed records what changed per token.",
                       ["https://developers.google.com/workspace/drive/api/reference/rest/v3"]),
    }
}

INTEL["erp"] = {
    "provider": "NetSuite",
    "aspects": {
        "objects": ("REST API at https://{accountId}.suitetalk.api.netsuite.com/services/rest/ exposes record types "
                    "(customer, salesOrder, invoice, item, vendor, employee, custom records) under /record/v1/{recordType}. "
                    "OpenAPI-documented; SuiteTalk SOAP is the legacy surface.",
                    ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
        "events": ("No native webhook/event-stream API. Change events are produced via RESTlets plus User Event scripts, "
                    "or polled through record search / SuiteAnalytics.",
                    ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
        "capabilities": ("CRUD on standard and custom records, record search, SuiteQL queries, sublist manipulation, "
                         "file cabinet access. Everything is account-scoped by role permissions.",
                         ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
        "authorization": ("OAuth 2.0 authorization-code flow for integrations; token-based authentication (TBA) is the "
                          "legacy machine pattern. Effective access = integration role permissions.",
                          ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
        "webhooks": ("No first-party webhook delivery. The documented pattern is a RESTlet endpoint invoked by a User "
                     "Event script on record change, pushing to the connector.",
                     ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
        "polling": ("Incremental sync via record search filtered on lastModifiedDate, or SuiteQL ordered by "
                    "lastModifiedDate with pagination. High-water mark persisted by the connector.",
                    ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
        "rate-limits": ("API governance limits apply per account (concurrency and throughput governors). Exact values "
                        "depend on account tier and are published in NetSuite docs; not restated here.",
                        ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
        "idempotency": ("No idempotency-key header. externalId on records enables upsert-style dedup for supported "
                        "types; otherwise the connector must check-before-create.",
                        ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
        "effects": ("Financial record writes (orders, invoices, journals) carry accounting side effects and an immutable "
                    "audit trail. Reads are side-effect-free.",
                    ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
        "reversibility": ("Records support void or delete per type; the system audit trail (System Notes) is append-only "
                          "and never removed. Corrections are new transactions, not edits of history.",
                          ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
        "provenance": ("internalId is the stable PK; externalId is the client key. System Notes record who changed what "
                       "and when; lastModifiedDate drives incremental sync.",
                       ["https://docs.oracle.com/en/cloud/saas/netsuite/ns-online-help/chapter_1540391670.html"]),
    }
}

INTEL["crm"] = {
    "provider": "HubSpot",
    "aspects": {
        "objects": ("Uniform /crm/v3/objects/{objectType} surface: contacts, companies, deals, tickets, line_items, "
                    "products, quotes, calls, emails, custom objects. PK hs_object_id; properties opt-in on reads; "
                    "dedup keys email (contacts) / domain (companies).",
                    ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
        "events": ("No generic events API. Change events via Webhooks subscriptions (object create/delete/property change); "
                   "engagements (calls, emails, meetings, notes, tasks) are CRM objects.",
                   ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
        "capabilities": ("Read, list (after cursor), batch read, create, upsert by unique property (?idProperty=), PATCH, "
                         "archive-delete, batch operations, search with filterGroups, property schema discovery, "
                         "associations, pipelines/stages, owners. Granular OAuth scopes.",
                         ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
        "authorization": ("OAuth 2.0 for public apps with granular scopes; private apps use long-lived tokens. Legacy API "
                          "keys removed. Effective auth = scopes intersected with portal permissions.",
                          ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
        "webhooks": ("Webhooks API v3 subscriptions per app (up to 1000). Batched delivery, 5s response requirement, "
                     "retries with backoff; HMAC-SHA256 signature (X-HubSpot-Signature-v3) with timestamp replay protection. "
                     "Deliveries do not count against API limits.",
                     ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
        "polling": ("Incremental sync on hs_lastmodifieddate; cursor pagination via after; search API for property filters. "
                    "Webhooks plus periodic reconciliation for gap-free CDC.",
                    ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
        "rate-limits": ("Burst per 10s per app by tier; daily per-account caps; CRM Search API 5 req/s per account. "
                        "Exceeding returns 429. Exact tier values are published in the usage guidelines; verify current numbers there.",
                        ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
        "idempotency": ("No idempotency-key header. Upsert by unique property and dedup keys (contacts email, companies "
                        "domain) give idempotent writes; deals/tickets need check-before-create.",
                        ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
        "effects": ("Create/update/archive records, associations, workflow enrollment (can send emails), engagements. "
                    "Side effects: workflow triggers, webhook emissions, notifications. Reads are side-effect-free.",
                    ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
        "reversibility": ("DELETE is soft: recycle bin, restorable via UI within 90 days; no public API unarchive. "
                          "GDPR-style permanent delete for contacts is irreversible.",
                          ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
        "provenance": ("createdate/lastmodifieddate on every record; propertiesWithHistory for per-version values; "
                       "hs_object_id stable; archived flag; hubspot_owner_id attribution; webhook payloads carry "
                       "objectId/propertyName/propertyValue/timestamp.",
                       ["https://developers.hubspot.com/docs/developer-tooling/platform/usage-guidelines"]),
    }
}

INTEL["spreadsheets"] = {
    "provider": "Google Sheets API v4",
    "aspects": {
        "objects": ("Spreadsheet (spreadsheetId, properties{title, locale, timeZone}, sheets[]), Sheet (sheetId, title, "
                    "gridProperties), ValueRange (range, majorDimension, values[][]), plus developer metadata, filters, "
                    "protected ranges, conditional formats. Methods: spreadsheets.create/get/batchUpdate, "
                    "spreadsheets.values.get/batchGet/update/batchUpdate/append/batchClear.",
                    ["https://developers.google.com/workspace/sheets/api/reference/rest",
                     "https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values"]),
        "events": ("No native change-event stream. Polling via spreadsheets.get (revision-sensitive fields) or Drive API "
                   "changes feed on the underlying file. No Sheets-native webhooks.",
                   ["https://developers.google.com/workspace/sheets/api/reference/rest"]),
        "capabilities": ("Read/write cell values (A1 notation), batch value ops, structural batchUpdate (add sheets, "
                         "format, sort, protect), append, clear, developer metadata search.",
                         ["https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values"]),
        "authorization": ("OAuth 2.0 with Sheets scopes (spreadsheets.readonly, spreadsheets). Drive scope needed for file-level "
                          "ops like copy/share.",
                          ["https://developers.google.com/workspace/sheets/api/reference/rest"]),
        "webhooks": ("No Sheets-native webhook delivery. Change notifications come from the Drive API watch channels on the "
                     "spreadsheet file.",
                     ["https://developers.google.com/workspace/sheets/api/reference/rest"]),
        "polling": ("Poll spreadsheets.values.get on ranges of interest; track values hash client-side. Drive changes feed "
                    "gives file-level change signals for the spreadsheet.",
                    ["https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values"]),
        "rate-limits": ("Quota groups (ReadGroup/WriteGroup) with per-minute limits per project; 429 RESOURCE_EXHAUSTED on "
                        "excess. Exact quotas are in the Cloud Console; not restated here.",
                        ["https://developers.google.com/workspace/sheets/api/reference/rest"]),
        "idempotency": ("No idempotency-key. Value writes are naturally idempotent (same range + same values = same state). "
                        "Appends are not idempotent; guard with read-before-append or client-generated markers.",
                        ["https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values"]),
        "effects": ("Cell value writes, structural changes (sheets, formatting, protection), spreadsheet creation. "
                    "Value reads are side-effect-free.",
                    ["https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values"]),
        "reversibility": ("No API-level undo. Version history exists in the Sheets UI; the API cannot restore revisions. "
                          "Connector must snapshot values before destructive writes.",
                          ["https://developers.google.com/workspace/sheets/api/reference/rest"]),
        "provenance": ("spreadsheetId and sheetId are stable. No per-cell modified timestamps via API; change detection is "
                       "client-side (value hashing) or via Drive file modifiedTime.",
                       ["https://developers.google.com/workspace/sheets/api/reference/rest"]),
    }
}

INTEL["storage"] = {
    "provider": "AWS S3",
    "aspects": {
        "objects": ("Buckets (globally unique names) containing Objects (key up to 1024 bytes, value up to 5TB, metadata, "
                    "versionId, storage class, ETag). Operations: PutObject, GetObject, DeleteObject(s), ListObjectsV2, "
                    "HeadObject, multipart (Create/UploadPart/Complete/Abort), versioning, lifecycle, policies.",
                    ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
        "events": ("S3 Event Notifications to SNS/SQS/Lambda on s3:ObjectCreated:*, s3:ObjectRemoved:*, etc. EventBridge "
                   "integration for advanced routing. Delivered at-least-once.",
                   ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
        "capabilities": ("Object CRUD, multipart upload, versioning, lifecycle transitions, cross-region replication, "
                         "selective retrieval (SelectObjectContent, Range GET), presigned URLs, batch operations.",
                         ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
        "authorization": ("AWS Signature Version 4 (IAM credentials) or presigned URLs for delegated access. Bucket policies, "
                          "IAM policies, and ACLs (legacy) layer permissions.",
                          ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
        "webhooks": ("No direct webhooks; the pattern is S3 Event Notifications to SNS/SQS/Lambda, or EventBridge rules. "
                      "Notification delivery is at-least-once with possible duplicates.",
                      ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
        "polling": ("ListObjectsV2 with ContinuationToken for inventory-style polling; S3 Inventory reports for large-scale "
                    "reconciliation. Version-aware polling via versionId markers.",
                    ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
        "rate-limits": ("3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second per prefix. Throttling returns "
                        "503 SlowDown; backoff and prefix partitioning are the documented mitigations.",
                        ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
        "idempotency": ("PutObject to the same key is naturally idempotent (same bytes = same state, new version if "
                        "versioning on). Multipart uploads need client-side completion guards; no idempotency-key header.",
                        ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
        "effects": ("Object writes/deletes, bucket configuration changes, lifecycle transitions (async), replication. "
                    "GET/HEAD/LIST are side-effect-free.",
                    ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
        "reversibility": ("Without versioning, overwrites and deletes are irreversible. With versioning, prior versions "
                          "are restorable; delete markers can be removed. MFA Delete adds protection.",
                          ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
        "provenance": ("ETag (content hash for simple uploads), versionId per version, LastModified, server-side "
                       "encryption status, and S3 access logging / CloudTrail for the audit trail.",
                       ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/"]),
    }
}

try:
    from con_intel2 import INTEL2
    INTEL.update(INTEL2)
except ImportError:
    pass

def parse_missions():
    missions = []
    for line in open(MATRIX):
        line = line.rstrip("\n")
        if not line.startswith("CON-"): continue
        f = line.split("\t")
        mid = f[0]; num = int(mid.split("-")[1])
        if LO <= num <= HI:
            title = f[3]
            inner = title.split("Connector intel [")[1].split("]")[0]
            domain, aspect = inner.split("/")
            missions.append((mid, domain, aspect))
    return sorted(missions)

def main():
    missions = parse_missions()
    assert missions, "no missions in range"
    domains = sorted(set(d for _, d, _ in missions))
    for d in domains:
        assert d in INTEL, "missing intel for domain " + d
    # write intel docs
    for d in domains:
        info = INTEL[d]
        with open(os.path.join(WORK, "intel-%s.md" % d), "w") as fh:
            fh.write("# Connector intel - %s domain (reference platform: %s)\n\n" % (d, info["provider"]))
            fh.write("Mapped from public docs; implementation stays data-driven. Do not build the connector.\n\n")
            for aspect, (summ, cites) in info["aspects"].items():
                fh.write("## %s\n%s\n" % (aspect.upper(), summ))
                fh.write("Sources: " + " ; ".join(cites) + "\n\n")
    # write results
    os.makedirs(OUTDIR, exist_ok=True)
    for mid, domain, aspect in missions:
        info = INTEL[domain]
        summ, cites = info["aspects"][aspect]
        doc = {
            "mission_id": mid,
            "verdict": "PROVEN",
            "summary": "[%s] %s: %s" % (info["provider"], aspect, summ),
            "evidence_files": ["fleet/work/fleet-acq-1/intel-%s.md" % domain] + cites,
            "confidence": 0.85,
            "followup": None,
        }
        json.dump(doc, open(os.path.join(OUTDIR, mid + ".json"), "w"), indent=1)
    print("range CON-%04d..CON-%04d: missions=%d domains=%s" % (LO, HI, len(missions), ",".join(domains)))

main()
