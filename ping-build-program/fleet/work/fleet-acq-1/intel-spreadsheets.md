# Connector intel - spreadsheets domain (reference platform: Google Sheets API v4)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Spreadsheet (spreadsheetId, properties{title, locale, timeZone}, sheets[]), Sheet (sheetId, title, gridProperties), ValueRange (range, majorDimension, values[][]), plus developer metadata, filters, protected ranges, conditional formats. Methods: spreadsheets.create/get/batchUpdate, spreadsheets.values.get/batchGet/update/batchUpdate/append/batchClear.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest ; https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values

## EVENTS
No native change-event stream. Polling via spreadsheets.get (revision-sensitive fields) or Drive API changes feed on the underlying file. No Sheets-native webhooks.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest

## CAPABILITIES
Read/write cell values (A1 notation), batch value ops, structural batchUpdate (add sheets, format, sort, protect), append, clear, developer metadata search.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values

## AUTHORIZATION
OAuth 2.0 with Sheets scopes (spreadsheets.readonly, spreadsheets). Drive scope needed for file-level ops like copy/share.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest

## WEBHOOKS
No Sheets-native webhook delivery. Change notifications come from the Drive API watch channels on the spreadsheet file.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest

## POLLING
Poll spreadsheets.values.get on ranges of interest; track values hash client-side. Drive changes feed gives file-level change signals for the spreadsheet.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values

## RATE-LIMITS
Quota groups (ReadGroup/WriteGroup) with per-minute limits per project; 429 RESOURCE_EXHAUSTED on excess. Exact quotas are in the Cloud Console; not restated here.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest

## IDEMPOTENCY
No idempotency-key. Value writes are naturally idempotent (same range + same values = same state). Appends are not idempotent; guard with read-before-append or client-generated markers.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values

## EFFECTS
Cell value writes, structural changes (sheets, formatting, protection), spreadsheet creation. Value reads are side-effect-free.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values

## REVERSIBILITY
No API-level undo. Version history exists in the Sheets UI; the API cannot restore revisions. Connector must snapshot values before destructive writes.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest

## PROVENANCE
spreadsheetId and sheetId are stable. No per-cell modified timestamps via API; change detection is client-side (value hashing) or via Drive file modifiedTime.
Sources: https://developers.google.com/workspace/sheets/api/reference/rest

