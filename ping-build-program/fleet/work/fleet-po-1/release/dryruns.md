# fleet-po-1 release dry-runs — 2026-09-24T02:38:00Z
## dryrun-versioning
last_tag: v0.0.0
ranges_drained_by_worker: 17
computed_next: v0.1.17
rule: SemVer; MAJOR=breaking canonical change, MINOR=new capability via cert law, PATCH=ranges drained; computed from ledger, never hand-typed
verdict: PASS
## dryrun-changelog
changelog_lines: 18, missions_covered: 850
verdict: PASS
## dryrun-artifact-signing
sha256_sidecars: 3
key_signing: QUEUED-FOR-MORNING (no live keys tonight per standing decision; sidecar format is cosign-compatible 'sha256  filename')
PER-0001.json: OK
PER-0050.json: OK
PER-0850.json: OK
verify: PASS
## dryrun-dist-channels
channel_present: results/perfops (canonical results channel)
channel_present: results/release (canonical results channel)
channel_present: ledger.jsonl (telemetry channel)
external_push: NONE (night shift; promotion only through certification law)
verdict: PASS
## dryrun-rollback-plan
rollback_ms: 1834
post_rollback_integrity: ok
verdict: PASS
## dryrun-canary
canary_file: REL-0001.json promoted alone first
canary_check: valid-json
batch_promotion: only after canary check passes (generator does this by construction: atomic per-file writes)
verdict: PASS
## dryrun-migrations
fields_preserved: True
rule: additive-only; readers ignore unknown fields; never rename/remove
verdict: PASS
## dryrun-compat-matrix
matrix_rows: 5
verdict: PASS
## dryrun-sbom
sbom_components: 8
verdict: PASS
## dryrun-provenance-attestation
generator_sha256: 95abc6fd55384b7a...
verdict: PASS
done
