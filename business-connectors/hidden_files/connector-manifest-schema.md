# FYD Connector Manifest Schema

**Version:** 1.0 (draft) | **Status:** design spec, implementable | **Scope:** every
business connector in the PING/FYD wave. This is the machine-readable realization of the
[connector contract](connector-contract.md) §1 declarations, shaped by the ecosystem
harvest in [ecosystem-harvest.md](ecosystem-harvest.md).

> Mechanism lineage (harvest IDs in parentheses): the four-verb lifecycle is the
> Airbyte protocol contract shape (M1) remapped onto PING's event vocabulary; capability
> declarations use MCP-style declare-then-negotiate semantics (M2); emitted events ride a
> CloudEvents 1.0 envelope (M13); token lifecycle follows ReuseTokenSource semantics
> (M11); webhook ingestion follows Meta's raw-body HMAC pattern (M6) with Google Pub/Sub
> push as a distinct transport (M8); resilience policy is one named pipeline per provider
> (M12) with RFC 9110 conditional revalidation and RFC 5861 stale-serving (M10); review
> event taxonomy follows Google's notification types (M18); record coercion is
> coerce-then-quarantine (M14); web-presence fetching inherits Crawl4AI 0.9.3
> hostile-crawl boundaries (M16); HTML sanitization happens at the ingestion boundary
> (M15); incremental sync uses opaque delta watermarks where providers offer them (M9);
> Stripe-style timestamp-bound signatures + event-id idempotency is the reference shape
> for any callback transport (M7).

## Part A — JSON Schema (draft 2020-12)

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ping.fyd/schema/connector-manifest/1.0",
  "title": "FYD Connector Manifest",
  "description": "Machine-readable declaration for one PING/FYD business connector. A connector without a complete, valid manifest is DISABLED and may not fetch (contract §1).",
  "$defs": {
    "confidenceGrade": {
      "type": "string",
      "enum": ["DIRECT", "DERIVED", "INFERRED", "OWNER_ASSERTED", "CONFLICTING", "UNKNOWN"],
      "description": "Contract §2.1. DIRECT = provider asserts about the business itself; DERIVED = deterministic rule from direct data (record rule id); INFERRED = heuristic/model (record method); OWNER_ASSERTED = owner correction layered on top, never downgraded silently; CONFLICTING = sources disagree, both kept; UNKNOWN = no usable data, always explicit."
    },
    "fetchState": {
      "type": "string",
      "enum": ["NOT_STARTED", "STARTED", "SUCCEEDED", "FAILED", "OUTCOME_UNKNOWN"],
      "description": "Contract §5. Exactly one terminal state per fetch attempt, recorded with fetch_attempt_id. SUCCEEDED may carry partial:true + missing-field list. OUTCOME_UNKNOWN reconciles (idempotency keys, read-back), never blind-retries."
    },
    "lifecycleState": {
      "type": "string",
      "enum": ["DISABLED", "AUTHORIZED", "DEGRADED", "SUSPENDED", "REVOKED", "RETIRED"],
      "description": "Contract §4 lifecycle states. RETIRED is terminal."
    },
    "failureMode": {
      "type": "string",
      "enum": ["provider-down", "rate-limited", "malformed-response", "auth-expired", "partial-success", "tos-change", "sanitization-rejected", "oversized", "webhook-disabled", "delta-token-invalid"],
      "description": "Contract §1.6 enumerated set plus harvested modes: sanitization-rejected and oversized (contract §3), webhook-disabled (M6: 1h of delivery failure triggers auto-unsubscription), delta-token-invalid (M9: expired delta watermark forces FULL_RESYNC)."
    },
    "capabilityVerb": {
      "type": "string",
      "enum": ["read", "search", "subscribe", "webhook-receive", "write"],
      "description": "Contract §1.1 closed verb set. write is DENIED by default for all v1 connectors and requires a separate elevated grant."
    },
    "credentialType": {
      "type": "string",
      "enum": ["oauth2", "api-key", "session-cookie", "none"]
    },
    "grantedBy": {
      "type": "string",
      "enum": ["business-owner", "platform-operator", "public-no-auth"],
      "description": "Contract §1.2. Named party, never 'the system'. A business-owner grant authorizes reads about that owner's business only; never about other businesses; never confers business identity (§2.6)."
    },
    "oauth2Scope": {
      "type": "object",
      "required": ["scope", "purpose"],
      "properties": {
        "scope": { "type": "string", "description": "Exact scope string, e.g. https://www.googleapis.com/auth/business.manage" },
        "purpose": { "type": "string", "description": "Least-privilege justification. Unused scopes are a defect." }
      },
      "additionalProperties": false
    },
    "tokenLifecycle": {
      "type": "object",
      "description": "M11 ReuseTokenSource semantics, language-agnostic. Token reuse and refresh is a single concurrency-safe layer: storage, refresh, and use are separate concerns.",
      "required": ["token_ttl", "reuse_while_valid", "single_flight_refresh", "refresh_error_classes", "credential_state_on_revoke"],
      "properties": {
        "token_ttl": { "type": "string", "description": "Nominal access-token lifetime, ISO-8601 duration, e.g. PT1H (Google ~1h)." },
        "reuse_while_valid": { "type": "boolean", "description": "Cached token is returned while Valid() (non-nil, has access token, not expired). True is mandatory." },
        "single_flight_refresh": { "type": "boolean", "description": "Concurrent callers trigger exactly one refresh; others wait on the in-flight result. True is mandatory." },
        "refresh_error_classes": {
          "type": "object",
          "required": ["transient", "revoked"],
          "properties": {
            "transient": { "type": "array", "items": { "type": "string" }, "description": "Typed errors that keep retrying per backoff policy, e.g. ['token-endpoint-timeout', 'token-endpoint-5xx']." },
            "revoked": { "type": "array", "items": { "type": "string" }, "description": "Typed errors that stop all fetches and mark credential revoked, e.g. ['invalid_grant', 'consent-withdrawn']." }
          },
          "additionalProperties": false
        },
        "credential_state_on_revoke": { "$ref": "#/$defs/lifecycleState", "description": "State the connector enters when refresh returns a revoked-class error. Must be SUSPENDED or REVOKED; SUSPENDED until operator/owner re-consents." },
        "reconsent_trigger": { "type": "string", "description": "What event re-arms consent (e.g. owner completes OAuth flow again). Expired-without-refresh-token is terminal until re-consent." }
      },
      "additionalProperties": false
    },
    "backoffPolicy": {
      "type": "object",
      "description": "M12 resilience pipeline fragment: retry with jitter, bounded. Never infinite.",
      "required": ["base_delay", "max_delay", "max_attempts", "jitter", "honor_retry_after"],
      "properties": {
        "base_delay": { "type": "string", "description": "ISO-8601 duration, e.g. PT2S." },
        "max_delay": { "type": "string", "description": "ISO-8601 duration ceiling for a single backoff step." },
        "max_attempts": { "type": "integer", "minimum": 1, "maximum": 5, "description": "Bounded. Contract §5: max 3 attempts per fetch across all states; governor kills connectors that exceed declared policy." },
        "jitter": { "type": "string", "enum": ["full", "equal", "none"], "description": "Jitter strategy. 'none' is a defect except in test manifests." },
        "honor_retry_after": { "type": "boolean", "description": "Honor provider Retry-After / rate-limit headers when present. True is mandatory." },
        "circuit_breaker": {
          "type": "object",
          "required": ["failure_ratio_threshold", "sampling_window", "break_duration"],
          "properties": {
            "failure_ratio_threshold": { "type": "number", "minimum": 0, "maximum": 1 },
            "sampling_window": { "type": "string", "description": "ISO-8601 duration, e.g. PT30S." },
            "break_duration": { "type": "string", "description": "Half-open probe interval, ISO-8601 duration." },
            "minimum_throughput": { "type": "integer", "minimum": 1 }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "provenanceEnvelope": {
      "type": "object",
      "description": "Contract §2 mandatory provenance on every normalized field.",
      "required": ["provider", "source_record_id", "fetched_at", "fetch_attempt_id", "connector_version"],
      "properties": {
        "provider": { "type": "string", "description": "Provider id, e.g. 'google-business-profile'." },
        "source_record_id": { "type": "string", "description": "The provider's own id for this record (place id, review name, page id)." },
        "fetched_at": { "type": "string", "format": "date-time" },
        "fetch_attempt_id": { "type": "string", "format": "uuid", "description": "The fetch attempt's uuid; joins to the fetch-state record (contract §5)." },
        "connector_version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$", "description": "Connector semver. Non-semver versions are a defect." },
        "raw_payload_ref": { "type": "string", "format": "uri", "description": "Pointer to the verbatim raw payload (bytes + content hash, stored before normalization, contract §1.4) so adapters can re-run." }
      },
      "additionalProperties": false
    },
    "gradedLink": {
      "type": "object",
      "description": "Contract §2.5. Provider ids are link records, NEVER canonical identity. Canonical identity is the PING business object id, stable across provider churn.",
      "required": ["ping_business_id", "provider", "provider_business_id", "link_confidence", "link_method", "linked_at"],
      "properties": {
        "ping_business_id": { "type": "string", "description": "Canonical PING business object id." },
        "provider": { "type": "string" },
        "provider_business_id": { "type": "string", "description": "e.g. GBP place id, Facebook page id, Yelp biz id." },
        "link_confidence": { "$ref": "#/$defs/confidenceGrade", "description": "Name/address/phone matching yields at most INFERRED. Owner-confirmed linking yields OWNER_ASSERTED." },
        "link_method": { "type": "string", "description": "How the link was made, e.g. 'name-address-phone-match', 'owner-confirmed', 'auth-derived'." },
        "link_stale": { "type": "boolean", "description": "True when the provider id changed or the listing was deleted; the business object survives." },
        "linked_at": { "type": "string", "format": "date-time" }
      },
      "additionalProperties": false
    },
    "cloudEventEnvelope": {
      "type": "object",
      "description": "M13 CloudEvents 1.0 envelope for every connector-emitted event. Downstream trusts the envelope for provenance and dataschema for validation.",
      "required": ["id", "source", "type", "specversion", "time", "dataschema", "subject", "data", "pingextension"],
      "properties": {
        "id": { "type": "string", "description": "Unique per occurrence." },
        "source": { "type": "string", "format": "uri", "description": "Identifies the emitting context, e.g. 'ping://connectors/google-business-profile'." },
        "type": { "type": "string", "description": "Reverse-DNS event type with version, e.g. 'com.ping.connector.gbp.review.received.v1'." },
        "specversion": { "type": "string", "const": "1.0" },
        "time": { "type": "string", "format": "date-time" },
        "datacontenttype": { "type": "string", "default": "application/json" },
        "dataschema": { "type": "string", "format": "uri", "description": "URI of the JSON Schema the data conforms to. A record that fails schema validation is quarantined with envelope + raw payload intact, never silently coerced or dropped." },
        "subject": { "type": "string", "description": "The graded link or subject of the event, e.g. the ping_business_id or provider record id." },
        "data": {
          "type": "object",
          "required": ["normalized_payload_ref", "fetch_attempt_id", "provenance", "confidence"],
          "properties": {
            "normalized_payload_ref": { "type": "string", "format": "uri", "description": "Pointer to the normalized payload in the evidence plane." },
            "fetch_attempt_id": { "type": "string", "format": "uuid" },
            "provenance": { "$ref": "#/$defs/provenanceEnvelope" },
            "confidence": { "$ref": "#/$defs/confidenceGrade" },
            "confidence_method": { "type": "string", "description": "Rule id or method for DERIVED/INFERRED; omitted for DIRECT." },
            "coercions_applied": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["field", "from_type", "to_type"],
                "properties": {
                  "field": { "type": "string" },
                  "from_type": { "type": "string" },
                  "to_type": { "type": "string" }
                },
                "additionalProperties": false
              },
              "description": "M14: deterministic coerce-then-quarantine log. Coercion is logged; uncoercible records are quarantined, not dropped."
            }
          },
          "additionalProperties": false
        },
        "pingextension": {
          "type": "object",
          "description": "PING extension attributes (M13 extension-attribute mechanism): correlationid, causationid.",
          "required": ["correlationid"],
          "properties": {
            "correlationid": { "type": "string", "description": "Joins push and poll paths and retries to one logical ingestion." },
            "causationid": { "type": "string", "description": "The event that caused this emission (e.g. the webhook delivery id or poll watermark)." }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    }
  }
}
```

## Part A (continued) — the full manifest schema

```json
{
  "type": "object",
  "required": [
    "manifest_version",
    "connector",
    "lifecycle",
    "declaration",
    "streams",
    "event_envelope",
    "validation_rules"
  ],
  "properties": {
    "manifest_version": {
      "type": "string",
      "pattern": "^[0-9]+\\.[0-9]+$",
      "description": "Manifest schema version this document conforms to. Current: '1.0'."
    },
    "connector": {
      "type": "object",
      "description": "Connector identity. Capability declaration per M2: declare up front, negotiate against the declaration, never probe at runtime.",
      "required": ["connector_id", "display_name", "version", "provider", "status"],
      "properties": {
        "connector_id": { "type": "string", "pattern": "^[a-z][a-z0-9-]{2,63}$", "description": "Stable machine id, e.g. 'google-business-profile'." },
        "display_name": { "type": "string" },
        "version": { "type": "string", "pattern": "^[0-9]+\\.[0-9]+\\.[0-9]+$", "description": "Connector semver." },
        "provider": { "type": "string", "description": "Provider id referenced by provenance envelopes." },
        "provider_terms_uri": { "type": "string", "format": "uri", "description": "Provider ToS / API terms the connector operates under. Required: ToS changes are an enumerated failure mode." },
        "status": { "$ref": "#/$defs/lifecycleState" },
        "capabilities_changed_at": { "type": "string", "format": "date-time", "description": "M2: capability-set changes are signaled (notifications/tools/list_changed analog). The manifest is the versioned declaration; this timestamp marks the last change." },
        "protocol_version": { "type": "string", "description": "The manifest/protocol version the connector implements. Client and host MUST agree; disagreement means the connector does not run (M2 failure semantics)." }
      },
      "additionalProperties": false
    },
    "lifecycle": {
      "type": "object",
      "description": "M1 four-verb lifecycle: spec (declare), check (connection test), discover (schema of available streams/objects), read (fetch). Mapped onto PING's event vocabulary.",
      "required": ["spec", "check", "discover", "read"],
      "properties": {
        "spec": {
          "type": "object",
          "description": "Declare what this connector needs and produces, machine-checkable, before any fetch. Analog of Airbyte ConnectorSpecification.",
          "required": ["config_schema", "emits"],
          "properties": {
            "config_schema": {
              "type": "object",
              "description": "JSON Schema (draft 2020-12) of the connector's required configuration: credential refs (vault pointers, never raw secrets), endpoint overrides, per-stream enablement. Raw credential values MUST NOT appear here."
            },
            "oauth2_model": {
              "type": "object",
              "description": "M1 oauthFlowOutputParameters analog: which OAuth flow artifacts the connector expects the host to supply (client id ref, refresh token ref, redirect URI).",
              "properties": {
                "flows": { "type": "array", "items": { "type": "string" }, "description": "e.g. ['authorization-code']" },
                "redirect_uri": { "type": "string", "format": "uri", "description": "Exact-match redirect URI (contract §3: exact redirect URI match is verified)." },
                "flow_output_parameters": { "type": "array", "items": { "type": "string" } }
              },
              "additionalProperties": false
            },
            "emits": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Reverse-DNS event types this connector can emit, e.g. 'com.ping.connector.gbp.review.received.v1'. Declaring the type obliges the connector to conform to its dataschema."
            }
          },
          "additionalProperties": false
        },
        "check": {
          "type": "object",
          "description": "Connection test. Must prove the connector can reach everything it needs; on success all later verbs are expected to succeed (M1).",
          "required": ["request", "response", "error_classes"],
          "properties": {
            "request": {
              "type": "object",
              "required": ["config_ref"],
              "properties": {
                "config_ref": { "type": "string", "description": "Pointer to a validated spec.config_schema instance (vault refs, never raw secrets)." }
              },
              "additionalProperties": false
            },
            "response": {
              "type": "object",
              "required": ["status", "checked_at"],
              "properties": {
                "status": { "type": "string", "enum": ["SUCCEEDED", "FAILED"], "description": "M1 AirbyteConnectionStatus analog." },
                "checked_at": { "type": "string", "format": "date-time" },
                "message": { "type": "string", "description": "Human-readable detail on failure." },
                "verified_objects": {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "Which provider objects the check reached successfully (e.g. 'locations', 'reviews-leg'). Partial reachability is FAILED with an explicit list, never a soft SUCCEEDED."
                }
              },
              "additionalProperties": false
            },
            "error_classes": {
              "type": "object",
              "required": ["user_error", "connector_error"],
              "properties": {
                "user_error": { "type": "array", "items": { "type": "string" }, "description": "M1: check failing on config (bad credential) is classified user error, not connector error, e.g. ['invalid-credential', 'consent-withdrawn', 'approval-pending']." },
                "connector_error": { "type": "array", "items": { "type": "string" }, "description": "M1: check failing on connector internals emits a typed trace, e.g. ['internal-exception', 'schema-mismatch', 'host-unreachable']." }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        },
        "discover": {
          "type": "object",
          "description": "Schema of available streams/objects for a given config. Analog of AirbyteCatalog. Deterministic ordering of streams is mandatory (M2: stable listing for caching).",
          "required": ["request", "response"],
          "properties": {
            "request": {
              "type": "object",
              "required": ["config_ref"],
              "properties": {
                "config_ref": { "type": "string" }
              },
              "additionalProperties": false
            },
            "response": {
              "type": "object",
              "required": ["streams", "discovered_at"],
              "properties": {
                "discovered_at": { "type": "string", "format": "date-time" },
                "streams": {
                  "type": "array",
                  "items": { "$ref": "#/properties/streams/items" },
                  "description": "Stream descriptors in deterministic (alphabetical by stream_id) order."
                }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        },
        "read": {
          "type": "object",
          "description": "Fetch. Analog of Airbyte read(config, catalog, state): emits record messages (CloudEvents envelopes) and state-checkpoint messages.",
          "required": ["request", "response"],
          "properties": {
            "request": {
              "type": "object",
              "required": ["config_ref", "stream_selection", "priority_tier"],
              "properties": {
                "config_ref": { "type": "string" },
                "stream_selection": {
                  "type": "array",
                  "items": { "type": "string" },
                  "description": "stream_ids from the discovered catalog. Reads against undeclared streams are a protocol violation, not a runtime error to absorb (M2 failure semantics)."
                },
                "state": {
                  "type": "object",
                  "description": "Opaque per-stream sync state: delta watermarks (M9), ETag/Last-Modified validators (M10), pagination cursors. The provider owns the watermark format; the connector stores it opaquely.",
                  "additionalProperties": false
                },
                "priority_tier": {
                  "type": "string",
                  "enum": ["owner-requested", "freshness-triggered", "reconciliation", "routine-poll", "backfill"],
                  "description": "Contract §6.2 governor priority tiers. Lower tiers defer first under contention."
                },
                "idempotency_key": { "type": "string", "description": "Contract §5: idempotency keys on every mutating call; present on read-back reconciliation passes." },
                "governor_dispatch_id": { "type": "string", "description": "The governor dispatch that admitted this read. Reads without a dispatch are protocol violations." }
              },
              "additionalProperties": false
            },
            "response": {
              "type": "object",
              "description": "A read emits a stream of messages: record events (CloudEvents envelopes) interleaved with state checkpoints and one terminal fetch-state report.",
              "required": ["fetch_attempt_id", "messages", "terminal_state"],
              "properties": {
                "fetch_attempt_id": { "type": "string", "format": "uuid" },
                "messages": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": ["kind"],
                    "properties": {
                      "kind": { "type": "string", "enum": ["record", "state_checkpoint", "trace"] },
                      "record": { "$ref": "#/$defs/cloudEventEnvelope", "description": "kind=record: the normalized observation with provenance." },
                      "state_checkpoint": { "type": "object", "description": "kind=state_checkpoint: opaque per-stream watermark to resume from.", "additionalProperties": false },
                      "trace": { "type": "object", "required": ["level", "message"], "properties": { "level": { "type": "string", "enum": ["debug", "info", "warn", "error"] }, "message": { "type": "string" } }, "additionalProperties": false }
                    },
                    "additionalProperties": false
                  }
                },
                "terminal_state": { "$ref": "#/$defs/fetchState", "description": "Exactly one terminal state per attempt (contract §5). Partial payloads are SUCCEEDED with partial:true + missing-field list in the trace, never silently complete." },
                "terminal_reason": { "type": "string", "description": "Typed reason when terminal_state is FAILED or OUTCOME_UNKNOWN." }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "declaration": {
      "type": "object",
      "description": "Contract §1 mandatory declaration. A connector without a complete declaration is DISABLED.",
      "required": ["capabilities", "auth", "rate_budget", "data_shape", "freshness", "failure_modes", "cost"],
      "properties": {
        "capabilities": {
          "type": "array",
          "minItems": 1,
          "description": "Contract §1.1. Enumerate each as verb + object + scope. The connector declares; the host/governor grants.",
          "items": {
            "type": "object",
            "required": ["capability", "provider_objects"],
            "properties": {
              "capability": { "type": "string", "pattern": "^(read|search|subscribe|webhook-receive|write)\\.[a-z][a-z0-9-]*$", "description": "verb + object, e.g. 'read.reviews', 'search.businesses', 'subscribe.reviews'." },
              "provider_objects": { "type": "array", "items": { "type": "string" }, "description": "Provider objects touched, e.g. ['review'], ['location']." },
              "max_window": { "type": "string", "description": "ISO-8601 duration bound, e.g. '90d' for review history." },
              "realtime": { "type": "boolean", "description": "True when push/webhook delivery is available for this capability." }
            },
            "additionalProperties": false
          }
        },
        "auth": {
          "type": "object",
          "description": "Contract §1.2. Auth proves access to a provider account, never ownership of a business (§2.6).",
          "required": ["credential_type", "granted_by", "scopes", "consent_record"],
          "properties": {
            "credential_type": { "$ref": "#/$defs/credentialType" },
            "granted_by": { "$ref": "#/$defs/grantedBy" },
            "scopes": {
              "type": "array",
              "items": { "$ref": "#/$defs/oauth2Scope" },
              "description": "Exact OAuth scopes or permission list. Least privilege; unused scopes are a defect."
            },
            "consent_record": {
              "type": "object",
              "required": ["stored_at", "reverification_path"],
              "properties": {
                "stored_at": { "type": "string", "description": "Where the grant lives, e.g. 'secure-vault:google/oauth'. Vault pointer, never raw secret." },
                "reverification_path": { "type": "string", "description": "How the grant is re-verified: token refresh path (M11) and re-consent trigger." }
              },
              "additionalProperties": false
            },
            "token_lifecycle": { "$ref": "#/$defs/tokenLifecycle", "description": "Required when credential_type is oauth2." },
            "elevated_grant": {
              "type": "object",
              "required": ["write"],
              "properties": {
                "write": { "type": "boolean", "description": "Contract §1.1: write requires a separate elevated grant and is DENIED by default for all v1 connectors." }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false,
          "if": { "properties": { "credential_type": { "const": "oauth2" } } },
          "then": { "required": ["token_lifecycle"] }
        },
        "rate_budget": {
          "type": "object",
          "description": "Contract §1.3. The connector enforces its own budget first; the governor enforces globally (§6). Both must hold.",
          "required": ["calls_per_window", "burst", "backoff_policy", "retryable_statuses"],
          "properties": {
            "calls_per_window": { "type": "string", "description": "Hard number, e.g. '200/hour', '10000/day', '300/minute' (post-approval GBP = 300 QPM; pre-approval = 0 QPM)." },
            "burst": { "type": "integer", "minimum": 1, "description": "Max calls per minute." },
            "backoff_policy": { "$ref": "#/$defs/backoffPolicy" },
            "retryable_statuses": {
              "type": "array",
              "items": { "type": "integer" },
              "description": "Explicit list. Contract §1.3: 4xx (except 408/429) are non-retryable. M12: retry and breaker both handle 5xx, 408, 429."
            },
            "in_band_quota_signals": {
              "type": "array",
              "items": { "type": "string" },
              "description": "M5: provider quota headers the connector reads and budgets against, e.g. ['RateLimit-DailyLimit', 'RateLimit-Remaining', 'RateLimit-ResetTime'] for Yelp Fusion."
            }
          },
          "additionalProperties": false
        },
        "data_shape": {
          "type": "object",
          "description": "Contract §1.4. Typed schema of raw provider payloads, per field.",
          "required": ["fields", "lossy_fields"],
          "properties": {
            "fields": {
              "type": "array",
              "items": {
                "type": "object",
                "required": ["name", "type", "optional", "max_length", "doc_uri"],
                "properties": {
                  "name": { "type": "string" },
                  "type": { "type": "string", "description": "Provider's declared type." },
                  "optional": { "type": "boolean" },
                  "max_length": { "type": ["integer", "null"], "description": "Contract §3: text fields capped at 10 KB unless the provider documents otherwise; truncate with truncated:true, never silent." },
                  "doc_uri": { "type": "string", "format": "uri", "description": "Provider documentation link for this field." }
                },
                "additionalProperties": false
              }
            },
            "lossy_fields": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Fields the provider truncates, paginates, or redacts. Marked; never silently padded."
            },
            "raw_payload_policy": {
              "type": "object",
              "required": ["store_verbatim", "size_caps"],
              "properties": {
                "store_verbatim": { "type": "boolean", "description": "Raw payloads stored verbatim (bytes + content hash) before normalization. True is mandatory." },
                "size_caps": {
                  "type": "object",
                  "required": ["single_record_kb", "single_response_mb"],
                  "properties": {
                    "single_record_kb": { "type": "integer", "description": "Contract §3: 256 KB default. Oversized payloads are rejected with a recorded observation, not partially ingested." },
                    "single_response_mb": { "type": "integer", "description": "Contract §3: 5 MB default." }
                  },
                  "additionalProperties": false
                },
                "sanitization": {
                  "type": "object",
                  "required": ["html_policy", "unicode_policy"],
                  "properties": {
                    "html_policy": { "type": "string", "description": "M15: sanitize at the ingestion boundary (connector output), not render time. E.g. 'dompurify-html-profile, no svg/mathml'." },
                    "unicode_policy": { "type": "string", "description": "Contract §3: unicode-normalize; reject mixed-script spoofing on business names (flag for review)." },
                    "url_policy": { "type": "string", "description": "Contract §3: follow max 3 redirects, same-registrable-domain preferred; 10s fetch timeout; never file://, localhost, or private IPs (SSRF guard)." }
                  },
                  "additionalProperties": false
                }
              },
              "additionalProperties": false
            },
            "coercion_policy": {
              "type": "object",
              "required": ["coerce_to_schema", "log_coercions", "quarantine_uncoercible"],
              "properties": {
                "coerce_to_schema": { "type": "boolean", "description": "M14: coerce scalar types to the stream's declared schema (e.g. string '5' to number 5) rather than rejecting the record." },
                "log_coercions": { "type": "boolean", "description": "Coercion is deterministic and logged on the event (coercions_applied)." },
                "quarantine_uncoercible": { "type": "boolean", "description": "Anything that cannot be coerced is quarantined, never silently dropped. True is mandatory." }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        },
        "freshness": {
          "type": "object",
          "description": "Contract §1.5. Revalidation triggers are requests to the governor, not self-authorized fetches.",
          "required": ["poll_cadence", "staleness_tolerance", "revalidation_triggers"],
          "properties": {
            "poll_cadence": { "type": "string", "description": "ISO-8601 duration, e.g. 'PT6H', 'P1D'. Webhook-capable connectors state realtime:true plus fallback poll cadence." },
            "realtime": { "type": "boolean" },
            "staleness_tolerance": {
              "type": "object",
              "description": "Max acceptable age per data type. Past tolerance, the adapter marks the value STALE but keeps it.",
              "required": ["default"],
              "properties": {
                "default": { "type": "string", "description": "ISO-8601 duration, e.g. reviews 'P1D', hours 'P7D', menus 'P30D'." },
                "per_stream": { "type": "object", "description": "Overrides keyed by stream_id.", "additionalProperties": { "type": "string" } }
              },
              "additionalProperties": false
            },
            "revalidation_triggers": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Events that force a fresh fetch: 'owner-correction-filed', 'conflicting-evidence', 'webhook-signal', 'manual-request'."
            },
            "conditional_revalidation": {
              "type": "object",
              "description": "M10: store ETag/Last-Modified verbatim; revalidate with If-None-Match (takes precedence over If-Modified-Since); 304 refreshes the freshness clock without a body and emits NO change events.",
              "required": ["enabled"],
              "properties": { "enabled": { "type": "boolean" } },
              "additionalProperties": false
            },
            "stale_serving": {
              "type": "object",
              "description": "M10/RFC 5861: stale-while-revalidate and stale-if-error semantics for provider outages.",
              "required": ["stale_while_revalidate", "stale_if_error"],
              "properties": {
                "stale_while_revalidate": { "type": "boolean", "description": "Serve stale immediately, revalidate in background." },
                "stale_if_error": { "type": "boolean", "description": "Serve stale on origin 5xx/timeout." },
                "stale_label": { "type": "string", "description": "How staleness is labeled downstream. Serving stale must be labeled as stale (graceful unknown), never presented as fresh." }
              },
              "additionalProperties": false
            }
          },
          "additionalProperties": false
        },
        "failure_modes": {
          "type": "array",
          "minItems": 6,
          "description": "Contract §1.6. Must cover all six mandatory modes: provider-down, rate-limited, malformed-response, auth-expired, partial-success, tos-change.",
          "items": {
            "type": "object",
            "required": ["mode", "detection_signal", "connector_action", "emitted_state", "evidence_affected"],
            "properties": {
              "mode": { "$ref": "#/$defs/failureMode" },
              "detection_signal": { "type": "string", "description": "How the connector detects this mode, e.g. '3 consecutive 5xx', '403 SERVICE_DISABLED on reviews leg'." },
              "connector_action": { "type": "string", "description": "What the connector does, e.g. 'open circuit breaker 5m, serve labeled-stale', 'degrade reviews leg to UNKNOWN per degradation plan'." },
              "emitted_state": { "type": "string", "description": "Lifecycle/failure state emitted, e.g. 'DEGRADED', 'SUSPENDED', fetch FAILED with typed reason." },
              "evidence_affected": { "type": "boolean", "description": "Whether already-ingested evidence is affected. Contract §1.6: never. Must be false." }
            },
            "additionalProperties": false
          }
        },
        "cost": {
          "type": "object",
          "description": "Contract §1.7. The governor hard-stops the connector at monthly_budget_cap (§6).",
          "required": ["cost_per_call_usd", "quota_cost", "monthly_budget_cap_usd"],
          "properties": {
            "cost_per_call_usd": { "type": "number", "minimum": 0, "description": "Zero-cost connectors state 0 explicitly." },
            "quota_cost": { "type": "string", "description": "Which provider quota the call consumes (some providers bill endpoints differently)." },
            "monthly_budget_cap_usd": { "type": "number", "minimum": 0, "description": "Hard stop; governor halts all non-critical fetches at the cap." }
          },
          "additionalProperties": false
        }
      },
      "additionalProperties": false
    },
    "streams": {
      "type": "array",
      "minItems": 1,
      "description": "Golden-path stream descriptors. Typed per provider. Provider ids travel as gradedLink records; they NEVER populate canonical object identity fields.",
      "items": {
        "type": "object",
        "required": ["stream_id", "stream_class", "provider", "sync_modes", "json_schema", "identity_policy"],
        "properties": {
          "stream_id": { "type": "string", "description": "Deterministic id, e.g. 'gbp.locations', 'meta.page', 'yelp.business'." },
          "stream_class": {
            "type": "string",
            "enum": ["business-identity", "reviews", "web-presence", "social-presence"],
            "description": "Golden-path classes."
          },
          "provider": { "type": "string" },
          "sync_modes": {
            "type": "array",
            "items": { "type": "string", "enum": ["full_refresh", "incremental", "webhook", "poll"] },
            "description": "M1 per-stream sync modes. Incremental requires an opaque watermark (M9)."
          },
          "incremental_cursor": {
            "type": "string",
            "description": "Required when 'incremental' is in sync_modes: the watermark field, e.g. 'deltaLink (opaque)', 'updated_since'."
          },
          "json_schema": {
            "type": "object",
            "description": "JSON Schema (draft 2020-12) of the stream's normalized records. The adapter coerces to this schema (M14); records that fail it are quarantined with envelope + raw payload."
          },
          "confidence_defaults": {
            "type": "object",
            "description": "Per-field default confidence grades at emission. Reviews: factual content from reviews is at most INFERRED (contract §3); provider-asserted listing fields are DIRECT.",
            "additionalProperties": { "$ref": "#/$defs/confidenceGrade" }
          },
          "identity_policy": {
            "type": "object",
            "required": ["link_record_only", "max_link_confidence", "link_method"],
            "properties": {
              "link_record_only": { "type": "boolean", "description": "True: provider ids are emitted as gradedLink records only. Must be true." },
              "max_link_confidence": { "$ref": "#/$defs/confidenceGrade", "description": "Ceiling for automatic linking. Name/address/phone matching yields at most INFERRED." },
              "link_method": { "type": "string", "description": "e.g. 'name-address-phone-match', 'owner-confirmed'." },
              "merge_rule": { "type": "string", "description": "Contract §2.5: two provider ids never merge two PING business objects without OWNER_ASSERTED confirmation or operator review." }
            },
            "additionalProperties": false
          },
          "degradation": {
            "type": "object",
            "description": "Per-stream degradation descriptor. A stream may degrade to UNKNOWN; it never fabricates.",
            "required": ["degradable_to_unknown", "degrade_triggers", "stale_tolerance"],
            "properties": {
              "degradable_to_unknown": { "type": "boolean", "description": "Whether this stream may degrade to UNKNOWN instead of failing the connector. GBP reviews leg: true (producer-restricted surface, 403 SERVICE_DISABLED is expected)." },
              "degrade_triggers": { "type": "array", "items": { "type": "string" }, "description": "e.g. ['403 SERVICE_DISABLED on reviews leg', 'approval-pending']" },
              "stale_tolerance": { "type": "string", "description": "ISO-8601 duration; past this, the adapter marks values STALE but keeps them." }
            },
            "additionalProperties": false
          }
        },
        "additionalProperties": false,
        "if": { "properties": { "sync_modes": { "contains": { "const": "incremental" } } } },
        "then": { "required": ["incremental_cursor"] }
      }
    },
    "event_envelope": {
      "type": "object",
      "description": "M13. The fixed envelope every connector-emitted event rides in.",
      "required": ["envelope_schema", "event_types"],
      "properties": {
        "envelope_schema": { "$ref": "#/$defs/cloudEventEnvelope" },
        "event_types": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["type", "dataschema_uri", "subject_kind"],
            "properties": {
              "type": { "type": "string", "description": "Reverse-DNS type with version, e.g. 'com.ping.connector.gbp.review.received.v1'." },
              "dataschema_uri": { "type": "string", "format": "uri" },
              "subject_kind": { "type": "string", "description": "What 'subject' identifies: 'ping_business_id' | 'graded-link' | 'fetch_attempt_id'." },
              "review_taxonomy": {
                "type": "array",
                "items": { "type": "string" },
                "description": "M18: for review streams, the canonical event vocabulary shared by push and poll paths, e.g. Google's ['NEW_REVIEW', 'UPDATED_REVIEW']. Unknown notification types are carried opaque with raw payload, never rejected."
              }
            },
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    },
    "webhook_ingestion": {
      "type": "object",
      "description": "M6 + M8 + M17. Required when any capability is 'webhook-receive' or 'subscribe'.",
      "required": ["transports"],
      "properties": {
        "transports": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "object",
            "required": ["transport", "verification", "handling"],
            "properties": {
              "transport": { "type": "string", "enum": ["hmac-http", "pubsub-push"], "description": "hmac-http: Meta-style signed HTTP webhook. pubsub-push: Google Cloud Pub/Sub push delivery." },
              "verification": {
                "type": "object",
                "required": ["signature_header", "algorithm", "verify_before_parse", "compare"],
                "properties": {
                  "signature_header": { "type": "string", "description": "e.g. 'X-Hub-Signature-256' (Meta), or 'Authorization: Bearer <OIDC>' for Pub/Sub push." },
                  "algorithm": { "type": "string", "description": "e.g. 'HMAC-SHA256 over RAW request body keyed by app secret' (Meta signs an escaped-unicode form; a re-serialized JSON string will never match)." },
                  "verify_before_parse": { "type": "boolean", "description": "Verification-before-parse rule. Signature verified on raw bytes BEFORE JSON parsing. Must be true." },
                  "compare": { "type": "string", "enum": ["constant-time"], "description": "Comparison function. Must be constant-time; only 'constant-time' is valid." },
                  "on_missing_or_malformed": { "type": "string", "enum": ["fail-closed"], "description": "Signature mismatch or missing/malformed header means drop, never process. Must be 'fail-closed'." },
                  "timestamp_tolerance": { "type": "string", "description": "M7: reject payloads older than tolerance, e.g. 'PT5M'. Bound replay attacks." }
                },
                "additionalProperties": false
              },
              "handling": {
                "type": "object",
                "required": ["respond_fast", "process_async", "dedupe_key", "redelivery", "unknown_shapes"],
                "properties": {
                  "respond_fast": { "type": "boolean", "description": "M6/M17: answer 200 OK fast; heavy work happens after the response. Must be true." },
                  "process_async": { "type": "boolean", "description": "Normalize and dispatch after the response; per-event failures go to an onError sink and never escape the handler (the HTTP response is already gone). Must be true." },
                  "dedupe_key": { "type": "string", "description": "Idempotency key for deliveries, e.g. 'event.id' (M7). Retries deliver duplicates and out of order; state transitions are guarded so a late older event cannot downgrade newer state." },
                  "redelivery": {
                    "type": "object",
                    "required": ["offered", "window", "backfill_mandatory"],
                    "properties": {
                      "offered": { "type": "boolean", "description": "Whether the provider redelivers missed notifications." },
                      "window": { "type": ["string", "null"], "description": "Redelivery window when offered, e.g. Meta: 'PT36H' with decreasing frequency; then dropped." },
                      "backfill_mandatory": { "type": "boolean", "description": "M8: GBP Pub/Sub has NO redelivery — a delivery gap is permanent, so scheduled polling backfill is mandatory even with push configured. Must be true for pubsub-push." }
                    },
                    "additionalProperties": false
                  },
                  "unknown_shapes": { "type": "string", "enum": ["preserve-opaque"], "description": "M17/M18: unknown event shapes are carried as opaque with raw payload (event.raw), never crashed on, never dropped. Must be 'preserve-opaque'." },
                  "disable_after": { "type": "string", "description": "M6: one hour of continuous delivery failure triggers provider-side auto-unsubscription; declares the resubscription path (manual)." }
                },
                "additionalProperties": false
              },
              "subscribe_handshake": {
                "type": "object",
                "description": "Meta-style GET challenge-response (hub.mode / hub.verify_token). Omitted for pubsub-push.",
                "properties": {
                  "challenge_params": { "type": "array", "items": { "type": "string" } },
                  "verify_token_ref": { "type": "string", "description": "Vault pointer for the verify token. Never a raw value." }
                },
                "additionalProperties": false
              }
            },
            "additionalProperties": false
          }
        }
      },
      "additionalProperties": false
    },
    "governor_binding": {
      "type": "object",
      "description": "Contract §6. How this connector binds to the global rate/cost governor.",
      "required": ["token_bucket_key", "priority_tiers_supported", "kill_switch_ack"],
      "properties": {
        "token_bucket_key": { "type": "string", "description": "Bucket identity: '(provider, credential)'. No borrowing across providers." },
        "priority_tiers_supported": {
          "type": "array",
          "items": { "type": "string", "enum": ["owner-requested", "freshness-triggered", "reconciliation", "routine-poll", "backfill"] },
          "description": "§6.2: owner-requested > freshness-triggered > reconciliation > routine-poll > backfill."
        },
        "per_business_daily_ceiling": { "type": "integer", "minimum": 1, "description": "§6.2 fairness: no single business starves others." },
        "kill_switch_ack": { "type": "boolean", "description": "§6.2: connector exceeding its declared rate budget 3x in an hour is SUSPENDED automatically. Must be true (acknowledged)." }
      },
      "additionalProperties": false
    },
    "validation_rules": {
      "type": "array",
      "description": "Rules that REJECT a manifest. Evaluated by the host at admission; any violation keeps the connector DISABLED.",
      "items": {
        "type": "object",
        "required": ["rule_id", "severity", "check", "reject_message"],
        "properties": {
          "rule_id": { "type": "string" },
          "severity": { "type": "string", "enum": ["reject"] },
          "check": { "type": "string", "description": "Machine-evaluable predicate over the manifest." },
          "reject_message": { "type": "string" }
        },
        "additionalProperties": false
      },
      "default": [
        { "rule_id": "V-001", "severity": "reject", "check": "manifest.required fields present (manifest_version, connector, lifecycle, declaration, streams, event_envelope, validation_rules)", "reject_message": "Manifest missing mandatory top-level sections: connector is DISABLED." },
        { "rule_id": "V-002", "severity": "reject", "check": "declaration.capabilities non-empty; every capability matches verb.object pattern with verb in closed set", "reject_message": "Capabilities undeclared or use verbs outside the closed set." },
        { "rule_id": "V-003", "severity": "reject", "check": "any capability verb == 'write' IMPLIES declaration.auth.elevated_grant.write == true", "reject_message": "Write verbs require a separate elevated grant; write is DENIED by default for all v1 connectors." },
        { "rule_id": "V-004", "severity": "reject", "check": "declaration.auth.scopes non-empty when credential_type == 'oauth2'; every scope has a purpose (least privilege)", "reject_message": "OAuth2 declaration without exact scopes; unused scopes are a defect." },
        { "rule_id": "V-005", "severity": "reject", "check": "declaration.failure_modes covers all six mandatory modes: provider-down, rate-limited, malformed-response, auth-expired, partial-success, tos-change", "reject_message": "Failure-mode coverage incomplete; connector cannot declare how it fails." },
        { "rule_id": "V-006", "severity": "reject", "check": "every failure_modes[].evidence_affected == false", "reject_message": "Already-ingested evidence is immutable; no failure mode may affect it." },
        { "rule_id": "V-007", "severity": "reject", "check": "declaration.rate_budget.backoff_policy.max_attempts <= 5 AND jitter != 'none'", "reject_message": "Retry budgets must be bounded with jitter; retry storms are a defect." },
        { "rule_id": "V-008", "severity": "reject", "check": "no stream's json_schema or identity fields write provider ids into canonical object identity fields; all streams identity_policy.link_record_only == true", "reject_message": "Provider-shaped data leaking into canonical object fields: provider ids travel as graded link records only, never as canonical identity." },
        { "rule_id": "V-009", "severity": "reject", "check": "spec.config_schema and all *_ref fields contain no raw credential values (vault pointers only)", "reject_message": "Raw credential material in the manifest. Vault pointers only." },
        { "rule_id": "V-010", "severity": "reject", "check": "webhook-receive or subscribe capability declared IMPLIES webhook_ingestion present with verify_before_parse == true AND compare == 'constant-time' AND respond_fast == true", "reject_message": "Webhook ingestion without verification-before-parse, constant-time compare, and fast-200-then-async is rejected." },
        { "rule_id": "V-011", "severity": "reject", "check": "webhook_ingestion.transports[transport == 'pubsub-push'].handling.redelivery.backfill_mandatory == true", "reject_message": "GBP Pub/Sub has no redelivery: mandatory polling backfill must be declared." },
        { "rule_id": "V-012", "severity": "reject", "check": "event_envelope event types all carry dataschema_uri; specversion const '1.0'", "reject_message": "Emitted events must ride the CloudEvents 1.0 envelope with a dataschema URI for validation." },
        { "rule_id": "V-013", "severity": "reject", "check": "governor_binding.kill_switch_ack == true", "reject_message": "Connector must acknowledge the governor kill switch (3x budget in an hour => auto-SUSPEND)." }
      ]
    }
  },
  "additionalProperties": false,
  "allOf": [
    {
      "description": "V-003 as a schema-level rule: write verbs require the elevated grant.",
      "if": {
        "properties": {
          "declaration": {
            "properties": {
              "capabilities": { "contains": { "properties": { "capability": { "pattern": "^write\\." } } } }
            }
          }
        }
      },
      "then": {
        "properties": {
          "declaration": {
            "properties": {
              "auth": { "properties": { "elevated_grant": { "properties": { "write": { "const": true } } } } }
            }
          }
        }
      }
    },
    {
      "description": "Webhook capabilities require the ingestion descriptor with fail-closed verification.",
      "if": {
        "properties": {
          "declaration": {
            "properties": {
              "capabilities": { "contains": { "properties": { "capability": { "pattern": "^(webhook-receive|subscribe)\\." } } } }
            }
          }
        }
      },
      "then": { "required": ["webhook_ingestion"] }
    }
  ]
}
```

## Golden-path example manifests (illustrative, conforming to the schema above)

### Example 1: Google Business Profile

```json
{
  "manifest_version": "1.0",
  "connector": {
    "connector_id": "google-business-profile",
    "display_name": "Google Business Profile",
    "version": "1.0.0",
    "provider": "google-business-profile",
    "provider_terms_uri": "https://developers.google.com/terms",
    "status": "DISABLED",
    "protocol_version": "1.0",
    "capabilities_changed_at": "2026-09-23T00:00:00Z"
  },
  "lifecycle": {
    "spec": {
      "config_schema": { "type": "object", "required": ["oauth_credential_ref", "account_id"], "properties": { "oauth_credential_ref": { "type": "string" }, "account_id": { "type": "string" } } },
      "oauth2_model": { "flows": ["authorization-code"], "redirect_uri": "https://ping.fyd/oauth/callback/google", "flow_output_parameters": ["refresh_token"] },
      "emits": [
        "com.ping.connector.gbp.location.received.v1",
        "com.ping.connector.gbp.review.received.v1",
        "com.ping.connector.gbp.review.updated.v1",
        "com.ping.connector.gbp.hours.received.v1"
      ]
    },
    "check": {
      "request": { "config_ref": "vault://google/oauth/ping" },
      "response": { "status": "SUCCEEDED", "checked_at": "2026-09-23T00:00:00Z", "verified_objects": ["locations", "hours"] },
      "error_classes": {
        "user_error": ["invalid-credential", "consent-withdrawn", "approval-pending"],
        "connector_error": ["internal-exception", "schema-mismatch", "host-unreachable"]
      }
    },
    "discover": { "request": { "config_ref": "vault://google/oauth/ping" }, "response": { "discovered_at": "2026-09-23T00:00:00Z", "streams": [] } },
    "read": {
      "request": { "config_ref": "vault://google/oauth/ping", "stream_selection": ["gbp.locations", "gbp.reviews"], "priority_tier": "routine-poll" },
      "response": { "fetch_attempt_id": "00000000-0000-0000-0000-000000000000", "messages": [], "terminal_state": "SUCCEEDED" }
    }
  },
  "declaration": {
    "capabilities": [
      { "capability": "read.business-identity", "provider_objects": ["location"], "realtime": false },
      { "capability": "read.reviews", "provider_objects": ["review"], "max_window": "90d", "realtime": false },
      { "capability": "subscribe.reviews", "provider_objects": ["review"], "realtime": true }
    ],
    "auth": {
      "credential_type": "oauth2",
      "granted_by": "business-owner",
      "scopes": [
        { "scope": "https://www.googleapis.com/auth/business.manage", "purpose": "Read locations, posts, and reviews for the owner's verified profile" }
      ],
      "consent_record": { "stored_at": "secure-vault:google/oauth", "reverification_path": "M11 token refresh; invalid_grant triggers re-consent flow" },
      "token_lifecycle": {
        "token_ttl": "PT1H",
        "reuse_while_valid": true,
        "single_flight_refresh": true,
        "refresh_error_classes": { "transient": ["token-endpoint-timeout", "token-endpoint-5xx"], "revoked": ["invalid_grant", "consent-withdrawn"] },
        "credential_state_on_revoke": "SUSPENDED",
        "reconsent_trigger": "owner completes OAuth authorization-code flow again"
      },
      "elevated_grant": { "write": false }
    },
    "rate_budget": {
      "calls_per_window": "300/minute (post-approval); 0/minute until Google approves the API access application",
      "burst": 50,
      "backoff_policy": { "base_delay": "PT2S", "max_delay": "PT5M", "max_attempts": 3, "jitter": "full", "honor_retry_after": true },
      "retryable_statuses": [408, 429, 500, 502, 503, 504],
      "in_band_quota_signals": ["quota 0 QPM pre-approval reads as 403/429; typed GOOGLE_GBP_ACCESS_PENDING"]
    },
    "data_shape": {
      "fields": [
        { "name": "location.name", "type": "string", "optional": false, "max_length": 10240, "doc_uri": "https://developers.google.com/my-business/reference/rest/v1/accounts.locations" },
        { "name": "review.name", "type": "string", "optional": false, "max_length": 10240, "doc_uri": "https://developers.google.com/my-business/reference/rest/v1/accounts.locations.reviews" }
      ],
      "lossy_fields": ["review.comment (may be redacted by Google)"],
      "raw_payload_policy": { "store_verbatim": true, "size_caps": { "single_record_kb": 256, "single_response_mb": 5 } }
    },
    "freshness": {
      "poll_cadence": "PT6H",
      "realtime": true,
      "staleness_tolerance": { "default": "P1D", "per_stream": { "gbp.reviews": "P1D", "gbp.hours": "P7D" } },
      "revalidation_triggers": ["owner-correction-filed", "conflicting-evidence", "webhook-signal", "manual-request"],
      "conditional_revalidation": { "enabled": true },
      "stale_serving": { "stale_while_revalidate": true, "stale_if_error": true, "stale_label": "stale-labeled, never presented as fresh" }
    },
    "failure_modes": [
      { "mode": "provider-down", "detection_signal": "3 consecutive 5xx or timeouts", "connector_action": "open circuit breaker, serve labeled-stale", "emitted_state": "DEGRADED", "evidence_affected": false },
      { "mode": "rate-limited", "detection_signal": "429 / quota errors", "connector_action": "exponential backoff with jitter, honor Retry-After, yield to governor tiers", "emitted_state": "DEGRADED", "evidence_affected": false },
      { "mode": "malformed-response", "detection_signal": "schema validation fails after coercion", "connector_action": "quarantine record with envelope + raw payload; count per stream", "emitted_state": "fetch FAILED (sanitization-rejected)", "evidence_affected": false },
      { "mode": "auth-expired", "detection_signal": "401 / invalid_grant on refresh", "connector_action": "SUSPEND; no fetches until owner re-consents", "emitted_state": "SUSPENDED", "evidence_affected": false },
      { "mode": "partial-success", "detection_signal": "reviews leg 403 SERVICE_DISABLED while locations succeed", "connector_action": "degrade reviews leg to UNKNOWN per degradation plan; locations continue", "emitted_state": "DEGRADED (reviews leg UNKNOWN)", "evidence_affected": false },
      { "mode": "tos-change", "detection_signal": "provider terms change detected on scheduled re-check", "connector_action": "SUSPEND pending operator acknowledgement", "emitted_state": "SUSPENDED", "evidence_affected": false }
    ],
    "cost": { "cost_per_call_usd": 0, "quota_cost": "Business Profile API quota (300 QPM post-approval, 0 pre-approval)", "monthly_budget_cap_usd": 0 }
  },
  "streams": [
    {
      "stream_id": "gbp.locations",
      "stream_class": "business-identity",
      "provider": "google-business-profile",
      "sync_modes": ["full_refresh", "poll"],
      "json_schema": { "type": "object", "properties": { "name": { "type": "string" }, "address": { "type": "object" }, "phone": { "type": "string" } } },
      "confidence_defaults": { "name": "DIRECT", "address": "DIRECT", "hours": "DIRECT" },
      "identity_policy": { "link_record_only": true, "max_link_confidence": "INFERRED", "link_method": "name-address-phone-match", "merge_rule": "Two GBP place ids never merge two PING business objects without OWNER_ASSERTED confirmation or operator review." },
      "degradation": { "degradable_to_unknown": false, "degrade_triggers": [], "stale_tolerance": "P7D" }
    },
    {
      "stream_id": "gbp.reviews",
      "stream_class": "reviews",
      "provider": "google-business-profile",
      "sync_modes": ["incremental", "poll", "webhook"],
      "incremental_cursor": "opaque review watermark (newest fetched review name)",
      "json_schema": { "type": "object", "properties": { "reviewer": { "type": "object" }, "starRating": { "type": "string" }, "comment": { "type": "string" }, "createTime": { "type": "string" } } },
      "confidence_defaults": { "starRating": "DIRECT", "comment": "INFERRED", "reviewer_display_name": "DIRECT" },
      "identity_policy": { "link_record_only": true, "max_link_confidence": "INFERRED", "link_method": "review-name within linked location", "merge_rule": "Review names are provider-scoped ids; never canonical identity." },
      "degradation": { "degradable_to_unknown": true, "degrade_triggers": ["403 SERVICE_DISABLED on legacy v4 reviews surface", "approval-pending"], "stale_tolerance": "P1D" }
    }
  ],
  "event_envelope": {
    "envelope_schema": { "$ref": "#/$defs/cloudEventEnvelope" },
    "event_types": [
      { "type": "com.ping.connector.gbp.review.received.v1", "dataschema_uri": "https://ping.fyd/schema/events/gbp-review/v1", "subject_kind": "graded-link", "review_taxonomy": ["NEW_REVIEW", "UPDATED_REVIEW"] },
      { "type": "com.ping.connector.gbp.review.updated.v1", "dataschema_uri": "https://ping.fyd/schema/events/gbp-review/v1", "subject_kind": "graded-link", "review_taxonomy": ["NEW_REVIEW", "UPDATED_REVIEW"] }
    ]
  },
  "webhook_ingestion": {
    "transports": [
      {
        "transport": "pubsub-push",
        "verification": { "signature_header": "Authorization (OIDC service-account token)", "algorithm": "Google OIDC token verification", "verify_before_parse": true, "compare": "constant-time", "on_missing_or_malformed": "fail-closed" },
        "handling": {
          "respond_fast": true,
          "process_async": true,
          "dedupe_key": "Pub/Sub messageId",
          "redelivery": { "offered": false, "window": null, "backfill_mandatory": true },
          "unknown_shapes": "preserve-opaque",
          "disable_after": "Push subscription lapses silently lose events; poller is the source of completeness."
        }
      }
    ]
  },
  "governor_binding": {
    "token_bucket_key": "(google-business-profile, oauth-credential)",
    "priority_tiers_supported": ["owner-requested", "freshness-triggered", "reconciliation", "routine-poll", "backfill"],
    "per_business_daily_ceiling": 24,
    "kill_switch_ack": true
  },
  "validation_rules": []
}
```

### Example 2: Meta Graph API (Page identity; reviews NOT declared until live-probed)

```json
{
  "manifest_version": "1.0",
  "connector": { "connector_id": "meta-graph-pages", "display_name": "Meta Graph API (Pages)", "version": "1.0.0", "provider": "meta", "provider_terms_uri": "https://developers.facebook.com/terms", "status": "DISABLED", "protocol_version": "1.0" },
  "declaration": {
    "capabilities": [
      { "capability": "read.social-presence", "provider_objects": ["page"], "realtime": false },
      { "capability": "webhook-receive.page-updates", "provider_objects": ["page"], "realtime": true }
    ],
    "auth": {
      "credential_type": "oauth2",
      "granted_by": "business-owner",
      "scopes": [
        { "scope": "pages_read_engagement", "purpose": "Read Page identity fields (fan_count, rating_count, overall_star_rating)" },
        { "scope": "pages_show_list", "purpose": "List Pages the owner grants access to" }
      ],
      "consent_record": { "stored_at": "secure-vault:meta/oauth", "reverification_path": "Page access tokens do not expire; long-lived user token refresh on invalid_token" },
      "token_lifecycle": {
        "token_ttl": "PT2H",
        "reuse_while_valid": true,
        "single_flight_refresh": true,
        "refresh_error_classes": { "transient": ["token-endpoint-timeout"], "revoked": ["invalid_token-consent-withdrawn", "app-not-approved"] },
        "credential_state_on_revoke": "SUSPENDED",
        "reconsent_trigger": "owner re-runs Facebook Login with the same permissions"
      },
      "elevated_grant": { "write": false }
    },
    "rate_budget": {
      "calls_per_window": "per app-level rate limits (Graph API rate limiting); budget in config",
      "burst": 20,
      "backoff_policy": { "base_delay": "PT2S", "max_delay": "PT5M", "max_attempts": 3, "jitter": "full", "honor_retry_after": true },
      "retryable_statuses": [408, 429, 500, 502, 503, 504]
    },
    "failure_modes": [
      { "mode": "provider-down", "detection_signal": "Graph API 5xx", "connector_action": "breaker + labeled-stale", "emitted_state": "DEGRADED", "evidence_affected": false },
      { "mode": "rate-limited", "detection_signal": "429 with x-app-usage headers", "connector_action": "backoff, honor headers", "emitted_state": "DEGRADED", "evidence_affected": false },
      { "mode": "malformed-response", "detection_signal": "schema validation fails", "connector_action": "quarantine with envelope", "emitted_state": "fetch FAILED", "evidence_affected": false },
      { "mode": "auth-expired", "detection_signal": "OAuthException invalid_token / app-not-approved", "connector_action": "SUSPEND; app-not-approved is a user_error, not retried", "emitted_state": "SUSPENDED", "evidence_affected": false },
      { "mode": "partial-success", "detection_signal": "reviews endpoints 501 (vendor-reported since Graph v22.0, unconfirmed)", "connector_action": "reviews leg stays undeclared; identity leg continues", "emitted_state": "DEGRADED", "evidence_affected": false },
      { "mode": "tos-change", "detection_signal": "Platform Policy change", "connector_action": "SUSPEND pending operator acknowledgement", "emitted_state": "SUSPENDED", "evidence_affected": false }
    ],
    "cost": { "cost_per_call_usd": 0, "quota_cost": "Graph API app-level rate limit", "monthly_budget_cap_usd": 0 },
    "data_shape": { "fields": [{ "name": "page.overall_star_rating", "type": "number", "optional": true, "max_length": null, "doc_uri": "https://developers.facebook.com/docs/graph-api/reference/page/" }], "lossy_fields": [], "raw_payload_policy": { "store_verbatim": true, "size_caps": { "single_record_kb": 256, "single_response_mb": 5 } } },
    "freshness": { "poll_cadence": "P1D", "realtime": true, "staleness_tolerance": { "default": "P1D" }, "revalidation_triggers": ["webhook-signal", "conflicting-evidence"], "conditional_revalidation": { "enabled": true }, "stale_serving": { "stale_while_revalidate": true, "stale_if_error": true, "stale_label": "stale-labeled" } }
  },
  "streams": [
    {
      "stream_id": "meta.page",
      "stream_class": "social-presence",
      "provider": "meta",
      "sync_modes": ["full_refresh", "poll", "webhook"],
      "json_schema": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "fan_count": { "type": "integer" }, "rating_count": { "type": "integer" }, "overall_star_rating": { "type": "number" } } },
      "confidence_defaults": { "name": "DIRECT", "fan_count": "DIRECT", "overall_star_rating": "DIRECT" },
      "identity_policy": { "link_record_only": true, "max_link_confidence": "INFERRED", "link_method": "name-address-phone-match; a Page id obtained via Facebook auth proves control of a Page, not identity of the business", "merge_rule": "Never merge PING business objects on Page id alone." },
      "degradation": { "degradable_to_unknown": false, "degrade_triggers": [], "stale_tolerance": "P1D" }
    }
  ],
  "event_envelope": {
    "envelope_schema": { "$ref": "#/$defs/cloudEventEnvelope" },
    "event_types": [
      { "type": "com.ping.connector.meta.page.updated.v1", "dataschema_uri": "https://ping.fyd/schema/events/meta-page/v1", "subject_kind": "graded-link" }
    ]
  },
  "webhook_ingestion": {
    "transports": [
      {
        "transport": "hmac-http",
        "verification": {
          "signature_header": "X-Hub-Signature-256",
          "algorithm": "HMAC-SHA256 over RAW request body keyed by app secret (escaped-unicode form; re-serialized JSON never matches)",
          "verify_before_parse": true,
          "compare": "constant-time",
          "on_missing_or_malformed": "fail-closed",
          "timestamp_tolerance": "PT5M"
        },
        "handling": {
          "respond_fast": true,
          "process_async": true,
          "dedupe_key": "Meta notification entry id + time (batch up to 1000 updates per POST; batching not guaranteed)",
          "redelivery": { "offered": true, "window": "PT36H", "backfill_mandatory": true },
          "unknown_shapes": "preserve-opaque",
          "disable_after": "1h of continuous delivery failure triggers Webhooks Disabled alert and automatic unsubscription; manual resubscription required"
        },
        "subscribe_handshake": { "challenge_params": ["hub.mode", "hub.verify_token", "hub.challenge"], "verify_token_ref": "vault://meta/webhook/verify-token" }
      }
    ]
  },
  "governor_binding": { "token_bucket_key": "(meta, oauth-credential)", "priority_tiers_supported": ["owner-requested", "freshness-triggered", "reconciliation", "routine-poll", "backfill"], "per_business_daily_ceiling": 48, "kill_switch_ack": true }
}
```

### Example 3: Yelp Fusion (3-excerpt review signal; trial tier not production)

```json
{
  "manifest_version": "1.0",
  "connector": { "connector_id": "yelp-fusion", "display_name": "Yelp Fusion", "version": "1.0.0", "provider": "yelp", "provider_terms_uri": "https://docs.developer.yelp.com/docs/terms", "status": "DISABLED", "protocol_version": "1.0" },
  "declaration": {
    "capabilities": [
      { "capability": "read.business-identity", "provider_objects": ["business"], "realtime": false },
      { "capability": "read.reviews", "provider_objects": ["review"], "max_window": "30d", "realtime": false },
      { "capability": "search.businesses", "provider_objects": ["business"], "realtime": false }
    ],
    "auth": {
      "credential_type": "api-key",
      "granted_by": "platform-operator",
      "scopes": [{ "scope": "api-key:Authorization-Bearer", "purpose": "Yelp Fusion uses API-key bearer auth; no OAuth dance" }],
      "consent_record": { "stored_at": "secure-vault:yelp/api-key", "reverification_path": "401 => key revoked; rotate via Yelp developer portal" },
      "elevated_grant": { "write": false }
    },
    "rate_budget": {
      "calls_per_window": "trial: 5000/30d (evaluation only, NOT commercial); starter: 300/24h resetting midnight UTC; paid: 30000/month, 5000/day cap",
      "burst": 5,
      "backoff_policy": { "base_delay": "PT2S", "max_delay": "PT1M", "max_attempts": 3, "jitter": "full", "honor_retry_after": true },
      "retryable_statuses": [408, 429, 500, 502, 503, 504],
      "in_band_quota_signals": ["RateLimit-DailyLimit", "RateLimit-Remaining", "RateLimit-ResetTime (ISO 8601)", "RateLimit-ResourceDailyLimit", "RateLimit-ResourceRemaining", "429 TOO_MANY_REQUESTS_PER_SECOND"]
    },
    "failure_modes": [
      { "mode": "provider-down", "detection_signal": "5xx", "connector_action": "breaker + labeled-stale", "emitted_state": "DEGRADED", "evidence_affected": false },
      { "mode": "rate-limited", "detection_signal": "429 (QPS or daily-limit with reset header)", "connector_action": "daily-limit exhaustion: stop until RateLimit-ResetTime; QPS: backoff", "emitted_state": "DEGRADED", "evidence_affected": false },
      { "mode": "malformed-response", "detection_signal": "schema validation fails", "connector_action": "quarantine with envelope", "emitted_state": "fetch FAILED", "evidence_affected": false },
      { "mode": "auth-expired", "detection_signal": "401 invalid key", "connector_action": "SUSPEND pending key rotation", "emitted_state": "SUSPENDED", "evidence_affected": false },
      { "mode": "partial-success", "detection_signal": "business ok, reviews endpoint limited to 3 excerpts", "connector_action": "emit 3 excerpts; mark review list partial:true with missing-field list", "emitted_state": "SUCCEEDED (partial)", "evidence_affected": false },
      { "mode": "tos-change", "detection_signal": "Yelp ToS / plan change (scraping prohibited; Fusion is the sanctioned path)", "connector_action": "SUSPEND pending operator acknowledgement", "emitted_state": "SUSPENDED", "evidence_affected": false }
    ],
    "cost": { "cost_per_call_usd": 0, "quota_cost": "Fusion daily quota; paid tier budgeted before golden-path commitment", "monthly_budget_cap_usd": 0 },
    "data_shape": { "fields": [{ "name": "business.rating", "type": "number", "optional": false, "max_length": null, "doc_uri": "https://docs.developer.yelp.com/docs/fusion" }], "lossy_fields": ["reviews: max 3 excerpts per business"], "raw_payload_policy": { "store_verbatim": true, "size_caps": { "single_record_kb": 256, "single_response_mb": 5 } } },
    "freshness": { "poll_cadence": "P1D", "realtime": false, "staleness_tolerance": { "default": "P1D", "per_stream": { "yelp.business": "P7D" } }, "revalidation_triggers": ["conflicting-evidence", "manual-request"], "conditional_revalidation": { "enabled": false }, "stale_serving": { "stale_while_revalidate": true, "stale_if_error": true, "stale_label": "stale-labeled" } }
  },
  "streams": [
    {
      "stream_id": "yelp.business",
      "stream_class": "business-identity",
      "provider": "yelp",
      "sync_modes": ["full_refresh", "poll"],
      "json_schema": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" }, "rating": { "type": "number" }, "review_count": { "type": "integer" } } },
      "confidence_defaults": { "name": "DIRECT", "rating": "DIRECT", "review_count": "DIRECT" },
      "identity_policy": { "link_record_only": true, "max_link_confidence": "INFERRED", "link_method": "name-address-phone-match", "merge_rule": "Never merge PING business objects on Yelp biz id alone." },
      "degradation": { "degradable_to_unknown": false, "degrade_triggers": [], "stale_tolerance": "P7D" }
    },
    {
      "stream_id": "yelp.reviews",
      "stream_class": "reviews",
      "provider": "yelp",
      "sync_modes": ["full_refresh", "poll"],
      "json_schema": { "type": "object", "properties": { "id": { "type": "string" }, "text": { "type": "string" }, "rating": { "type": "integer" } } },
      "confidence_defaults": { "rating": "DIRECT", "text": "INFERRED" },
      "identity_policy": { "link_record_only": true, "max_link_confidence": "INFERRED", "link_method": "review-id within linked business", "merge_rule": "Review ids are provider-scoped; never canonical identity." },
      "degradation": { "degradable_to_unknown": true, "degrade_triggers": ["daily quota exhausted"], "stale_tolerance": "P1D" }
    }
  ],
  "event_envelope": {
    "envelope_schema": { "$ref": "#/$defs/cloudEventEnvelope" },
    "event_types": [
      { "type": "com.ping.connector.yelp.review.received.v1", "dataschema_uri": "https://ping.fyd/schema/events/yelp-review/v1", "subject_kind": "graded-link" }
    ]
  },
  "governor_binding": { "token_bucket_key": "(yelp, api-key)", "priority_tiers_supported": ["owner-requested", "freshness-triggered", "reconciliation", "routine-poll", "backfill"], "per_business_daily_ceiling": 10, "kill_switch_ack": true }
}
```

### Example 4: Web-presence crawler (business website fetch; hostile input by definition)

```json
{
  "manifest_version": "1.0",
  "connector": { "connector_id": "web-presence-fetch", "display_name": "Web Presence Fetch", "version": "1.0.0", "provider": "web", "provider_terms_uri": "https://www.rfc-editor.org/rfc/rfc9110.html", "status": "DISABLED", "protocol_version": "1.0" },
  "declaration": {
    "capabilities": [
      { "capability": "read.web-presence", "provider_objects": ["webpage"], "realtime": false }
    ],
    "auth": { "credential_type": "none", "granted_by": "public-no-auth", "scopes": [], "consent_record": { "stored_at": "n/a (public fetch)", "reverification_path": "n/a" }, "elevated_grant": { "write": false } },
    "rate_budget": { "calls_per_window": "internal budget: 100/day per domain", "burst": 2, "backoff_policy": { "base_delay": "PT5S", "max_delay": "PT10M", "max_attempts": 3, "jitter": "full", "honor_retry_after": true }, "retryable_statuses": [408, 429, 500, 502, 503, 504] },
    "failure_modes": [
      { "mode": "provider-down", "detection_signal": "site unreachable / DNS fail", "connector_action": "serve labeled-stale copy; mark UNKNOWN if none", "emitted_state": "DEGRADED", "evidence_affected": false },
      { "mode": "rate-limited", "detection_signal": "429 from origin", "connector_action": "backoff per policy; deprioritize domain", "emitted_state": "DEGRADED", "evidence_affected": false },
      { "mode": "malformed-response", "detection_signal": "unparseable document", "connector_action": "record sanitization-rejected observation with raw ref", "emitted_state": "fetch FAILED", "evidence_affected": false },
      { "mode": "auth-expired", "detection_signal": "n/a (public fetch)", "connector_action": "n/a", "emitted_state": "n/a", "evidence_affected": false },
      { "mode": "partial-success", "detection_signal": "redirect-cap or size-cap hit mid-fetch", "connector_action": "typed abort (redirect-cap / size-cap / egress-denied); record what was captured", "emitted_state": "fetch FAILED (typed reason)", "evidence_affected": false },
      { "mode": "tos-change", "detection_signal": "robots.txt / site ToS disallow", "connector_action": "stop fetching that domain; record as evidence", "emitted_state": "SUSPENDED (domain)", "evidence_affected": false }
    ],
    "cost": { "cost_per_call_usd": 0, "quota_cost": "internal crawl budget", "monthly_budget_cap_usd": 0 },
    "data_shape": {
      "fields": [
        { "name": "url", "type": "string", "optional": false, "max_length": 2048, "doc_uri": "https://www.rfc-editor.org/rfc/rfc9110.html" },
        { "name": "title", "type": "string", "optional": true, "max_length": 10240, "doc_uri": "https://www.rfc-editor.org/rfc/rfc9110.html" }
      ],
      "lossy_fields": ["body-text (truncated at text cap with truncated:true)"],
      "raw_payload_policy": {
        "store_verbatim": true,
        "size_caps": { "single_record_kb": 256, "single_response_mb": 5 },
        "sanitization": {
          "html_policy": "strip all HTML/JS at ingestion boundary; plain text only",
          "unicode_policy": "unicode-normalize; flag mixed-script spoofing",
          "url_policy": "M16 hostile-crawl boundaries: 5-hop redirect cap with per-hop destination policy, peer-IP validation (DNS rebinding close), byte and page caps enforced on running totals, untrusted inputs cannot raise caps, egress deny-list for non-globally-routable addresses, 300s wall-clock bound"
        }
      }
    },
    "freshness": { "poll_cadence": "P7D", "realtime": false, "staleness_tolerance": { "default": "P30D" }, "revalidation_triggers": ["manual-request", "conflicting-evidence"], "conditional_revalidation": { "enabled": true }, "stale_serving": { "stale_while_revalidate": true, "stale_if_error": true, "stale_label": "stale-labeled" } }
  },
  "streams": [
    {
      "stream_id": "web.site",
      "stream_class": "web-presence",
      "provider": "web",
      "sync_modes": ["full_refresh", "poll"],
      "json_schema": { "type": "object", "properties": { "url": { "type": "string" }, "title": { "type": "string" }, "text_excerpt": { "type": "string" }, "truncated": { "type": "boolean" } } },
      "confidence_defaults": { "url": "DIRECT", "title": "INFERRED", "text_excerpt": "INFERRED" },
      "identity_policy": { "link_record_only": true, "max_link_confidence": "INFERRED", "link_method": "url match against owner-provided website", "merge_rule": "A website URL never merges PING business objects without owner confirmation." },
      "degradation": { "degradable_to_unknown": true, "degrade_triggers": ["egress-denied", "redirect-cap", "site-down"], "stale_tolerance": "P30D" }
    }
  ],
  "event_envelope": {
    "envelope_schema": { "$ref": "#/$defs/cloudEventEnvelope" },
    "event_types": [
      { "type": "com.ping.connector.web.site.fetched.v1", "dataschema_uri": "https://ping.fyd/schema/events/web-site/v1", "subject_kind": "graded-link" }
    ]
  },
  "governor_binding": { "token_bucket_key": "(web, none)", "priority_tiers_supported": ["owner-requested", "freshness-triggered", "reconciliation", "routine-poll", "backfill"], "per_business_daily_ceiling": 4, "kill_switch_ack": true }
}
```

## Part B — Field guide (human-readable)

### What a manifest is, and is not

A manifest is a connector's **declaration**, not its permission slip. The connector
declares capabilities; the host/governor grants them. A connector without a complete,
valid manifest is DISABLED and may not fetch. The manifest is versioned; the connector
must implement the `protocol_version` it declares, and client/host disagreement means
the connector does not run (M2 failure semantics: disconnect on version mismatch).

The manifest covers the connector side only. It produces **observations**; the adapter
records **evidence**; the object model derives downstream. Provider auth is never
canonical identity, and a credential granted by `business-owner` authorizes reads about
that owner's business only.

### Section map

| Section | Contract / harvest source | What it declares |
|---|---|---|
| `connector` | §1, M2 | Identity, provider, ToS URI, lifecycle status, protocol version. Capability-set changes are timestamped (MCP `list_changed` analog). |
| `lifecycle.spec` | §1, M1 | JSON Schema of required config (vault refs, never raw secrets), OAuth flow model, emitted event types. Declaring a type obliges the connector to its dataschema. |
| `lifecycle.check` | M1 | Connection test proving reach of everything declared. `user_error` (bad config/credential, approval-pending) vs `connector_error` (internals) are classified differently. |
| `lifecycle.discover` | M1 | Catalog of streams in deterministic order, each with sync modes and JSON schema. |
| `lifecycle.read` | M1, M9, §5, §6 | Fetch against declared streams only (undeclared reads are a protocol violation). Opaque per-stream state (delta watermarks, ETag validators, cursors). Governor `priority_tier`. Emits record events interleaved with state checkpoints and exactly one terminal fetch state. |
| `declaration.capabilities` | §1.1 | `verb.object` from the closed set `read/search/subscribe/webhook-receive/write`. Write needs the elevated grant. |
| `declaration.auth` | §1.2, M11 | credential type, named granting party, exact scopes with purposes, consent record (vault pointer + re-verification path), M11 token lifecycle when oauth2, elevated-grant flags. |
| `declaration.rate_budget` | §1.3, M5, M12 | Hard calls-per-window, burst, bounded backoff with jitter, explicit retryable statuses (4xx except 408/429 are non-retryable), in-band quota headers, honor Retry-After. |
| `declaration.data_shape` | §1.4, §3, M14, M15 | Typed field list with doc links, lossy-field marking, verbatim raw-payload storage with size caps (256 KB record / 5 MB response), ingestion-boundary sanitization, coerce-then-quarantine policy. |
| `declaration.freshness` | §1.5, M10 | Poll cadence, per-data-type staleness tolerances (reviews 24h, hours 7d, menus 30d), revalidation triggers (requests to the governor, not self-authorized), conditional revalidation (ETag/If-None-Match; 304 emits no change events), labeled stale-while-revalidate / stale-if-error. |
| `declaration.failure_modes` | §1.6, §5 | All six mandatory modes plus harvested ones (sanitization-rejected, oversized, webhook-disabled, delta-token-invalid). Detection signal, connector action, emitted state, `evidence_affected: false` always. |
| `declaration.cost` | §1.7, §6 | Per-call cost (0 stated explicitly when free), quota consumed, monthly hard cap. |
| `streams` | golden path | Per-provider stream descriptors in the four golden-path classes. `identity_policy` enforces graded-link-only: provider ids never populate canonical identity. `degradation` declares per-stream degradable-to-UNKNOWN legs (e.g. GBP reviews). Incremental streams must declare an opaque cursor. |
| `event_envelope` | M13 | CloudEvents 1.0: id, source URI, reverse-DNS type with version, specversion 1.0, time, dataschema URI, subject, plus data carrying normalized-payload ref, fetch attempt id, provenance, confidence (+ method/coercions), and extension attributes correlationid/causationid. Records failing schema validation are quarantined with envelope + raw payload, never coerced silently or dropped. |
| `webhook_ingestion` | M6, M8, M17, M7 | Per transport (hmac-http, pubsub-push): signature header + algorithm, verify-before-parse on raw bytes, constant-time compare, fail-closed, timestamp tolerance, fast-200-then-async, dedup key, redelivery expectations with mandatory polling backfill where the provider offers none (GBP), unknown shapes preserved opaque, disable-after behavior. |
| `governor_binding` | §6 | Token bucket key `(provider, credential)`, supported priority tiers, per-business daily ceiling, kill-switch acknowledgement (3x budget in an hour => auto-SUSPEND). |
| `validation_rules` | §1 | V-001..V-013: the REJECT list. Any violation keeps the connector DISABLED. |

### Design decisions and rationale

1. **Four verbs, not three or five.** M1's spec/check/discover/read is the harvested
   shape; it maps cleanly onto PING's vocabulary (spec = declare, check = health proof,
   discover = stream catalog, read = governed fetch emitting observations). No separate
   "sync" verb: sync policy lives in per-stream `sync_modes` + `incremental_cursor`.
2. **Validation rules are data, not prose.** V-001..V-013 ship as a default rule list
   inside the schema so a host can evaluate them mechanically. The two rules that are
   expressible in pure JSON Schema (write-requires-elevated-grant; webhook-requires-ingestion-descriptor)
   are also encoded in `allOf` so schema validators enforce them without custom code.
3. **Confidence grades are closed, identity linking is graded.** The six grades from
   §2.1 are a shared `$defs` enum reused by provenance, links, and stream defaults.
   Provider ids travel only as `gradedLink` records; `identity_policy.link_record_only`
   is schema-mandatory true, and V-008 rejects canonical-identity leakage.
4. **Degradation is declared, not improvised.** The GBP reviews leg (producer-restricted
   legacy v4, observed 403 SERVICE_DISABLED) is the motivating case: `degradation.degradable_to_unknown`
   lets a single leg fail to UNKNOWN while the connector stays healthy, instead of the
   whole connector flapping between AUTHORIZED and DEGRADED.
5. **Webhook transports are typed separately.** Meta's hmac-http (redelivery offered,
   36h window, auto-unsubscribe after 1h of failures) and Google's pubsub-push (no
   redelivery, permanent gaps) have opposite completeness properties; one descriptor
   with an `offered` flag would invite misreading. `backfill_mandatory: true` is
   required for pubsub-push (V-011).
6. **Token lifecycle is a first-class section.** M11's ReuseTokenSource semantics
   (reuse-while-valid, single-flight refresh, typed revoked-vs-transient errors) are
   encoded as data because every provider leg rides the same shape; refresh failures
   surface as typed errors at the token layer, never as 401s deep in business logic.
7. **Coercion is logged, not silent.** M14 coerce-then-quarantine lands on the event
   (`coercions_applied`) so a coercion-rate spike is visible as the early warning of a
   provider shape change.
8. **State checkpoints are opaque.** M9 delta watermarks are provider-owned formats;
   the connector stores them without interpreting, and token invalidation is a typed
   FULL_RESYNC event, not an error.

### Reading a manifest for review (operator checklist)

1. `connector.status` and `protocol_version` agree with what the host supports.
2. Every `capability` uses a closed-set verb; any `write.*` has `elevated_grant.write: true`.
3. `auth.granted_by` is a named party; scopes each carry a purpose; no scope lacks one.
4. `rate_budget` numbers match the provider's documented limits; `max_attempts` <= 5, jitter not `none`.
5. `failure_modes` covers all six mandatory modes; every `evidence_affected` is false.
6. Streams: every provider-id field flows through `gradedLink`; no canonical-identity writes.
7. `webhook_ingestion` present iff webhook/subscribe capabilities exist; verify-before-parse true, constant-time compare, fast-200 true; pubsub-push has `backfill_mandatory: true`.
8. `governor_binding.kill_switch_ack` is true.
9. Validation rules V-001..V-013 all pass; the connector is DISABLED until they do.

---

## Part C — Appendix: OAuth bootstrap runbook for Google GBP

**Goal:** bring the `google-business-profile` connector from DISABLED to AUTHORIZED.
Sequencing matters: the 60-day verified-GBP seasoning requirement is the longest-lead
item and must start first. Nothing below requests or fabricates credentials.

### Phase 0 — prerequisites (all external)

1. A Google account that owns or manages a Google Business Profile.
2. That profile **verified and active for 60+ days**.
3. A representative business website listed on the profile.
4. A Google Cloud project (Organization account per the GBP prerequisites doc).

### Phase 1 — GBP API access approval

1. Submit Google's **"Application for Basic API Access"** form (linked from
   https://developers.google.com/my-business/content/prereqs).
2. Wait. Until approved, **all Business Profile API quotas are 0 QPM**; calls read as
   403/429 quota errors. The connector must surface the typed
   `GOOGLE_GBP_ACCESS_PENDING` state, not retry into the wall.
3. On approval, quotas move to **300 QPM**. Update `rate_budget.calls_per_window`
   from `0/minute` to `300/minute` and re-run `check`.

### Phase 2 — OAuth client and consent

1. Create an OAuth 2.0 client in the Cloud project (type: web application).
2. Register the **exact** redirect URI the connector declares in
   `lifecycle.spec.oauth2_model.redirect_uri` (exact match is verified per contract §3).
3. Configure the consent screen requesting the single scope
   `https://www.googleapis.com/auth/business.manage` (locations, posts, reviews).
4. Complete the authorization-code flow once to mint a **refresh token**; store the
   refresh token in the Secure Vault under the pointer declared in
   `consent_record.stored_at`. The manifest holds the vault pointer, never the secret.
5. Verify `state` parameter handling and token signature/issuer/audience checks before
   first use (contract §3).

### Phase 3 — reviews leg (separate, producer-restricted)

1. Reviews list lives on the legacy `mybusiness.googleapis.com` **v4** surface, which
   is **producer-restricted** (Google-allowlisted). Approval in Phase 1 may NOT grant it.
2. Attempt `gcloud services enable mybusiness.googleapis.com`; if it returns
   PERMISSION_DENIED, or review calls return **403 SERVICE_DISABLED**, the reviews leg
   is not granted.
3. Expected outcome per field evidence (May 2026): plan for the reviews leg to stay
   **degraded to UNKNOWN** under the manifest's degradation plan
   (`degrade_triggers: ['403 SERVICE_DISABLED on legacy v4 reviews surface']`).
   The locations/hours legs proceed independently. Do not block AUTHORIZED status on
   the reviews leg; do not work around the restriction (no scraping; ToS-bound).

### Phase 4 — Pub/Sub notifications (push as latency optimization, poll as completeness)

1. In the Cloud project, create a Pub/Sub **topic** for GBP notifications.
2. Grant `mybusiness-api-pubsub@system.gserviceaccount.com` the **Pub/Sub Publisher**
   role on the topic.
3. Create a **NotificationSetting** (one per account) pointing at the topic, selecting
   notification types: at minimum `NEW_REVIEW` and `UPDATED_REVIEW`.
4. Create a **push subscription** to the connector's HTTPS endpoint declared in
   `webhook_ingestion` (transport `pubsub-push`).
5. **Google never redelivers a missed notification.** A lapsed subscription means
   permanent gaps. The poller (`freshness.poll_cadence: PT6H` on `gbp.reviews`) is the
   source of completeness; push only lowers latency. Both paths emit the same M18
   taxonomy event types so dedup via `correlationid`/`dedupe_key` (Pub/Sub messageId)
   converges them.

### Phase 5 — admission

1. Populate the manifest: vault pointers in `spec.config_schema` instance, verified
   `check` response listing reachable objects, discovered streams.
2. Evaluate validation rules V-001..V-013. All must pass.
3. Governor admits the connector: token bucket `(google-business-profile, oauth-credential)`
   at 300 QPM, priority tiers bound, kill switch acknowledged.
4. Transition DISABLED -> AUTHORIZED. First `read` at `routine-poll` tier; verify the
   first events carry provenance envelopes and the reviews leg degrades cleanly if
   Phase 3 did not grant it.

### EXACT EXTERNAL BLOCKERS (require Nolan's credentials / authorization decisions)

Nothing in this runbook was worked around. Each item below needs Nolan or an authorized
human; the agent must not request, receive, or fabricate any of these values.

1. **Google account + 60+ day verified GBP + representative website + Cloud project with
   Organization account.** Prerequisite ownership Nolan must hold (or designate) before
   the GBP API application can even be filed.
2. **Submission of Google's "Application for Basic API Access" form.** An authorized
   human submits it; the agent cannot apply on Nolan's behalf.
3. **OAuth 2.0 client creation + consent-screen approval for
   `https://www.googleapis.com/auth/business.manage`.** Created in Nolan's Cloud
   project by an authorized human.
4. **The authorization-code flow completion that mints the refresh token.** Nolan (or
   the business owner, as `granted_by` names) must personally complete the consent
   screen; the resulting refresh token goes straight into the Secure Vault. The agent
   never sees the raw token.
5. **Pub/Sub topic creation + IAM grant to
   `mybusiness-api-pubsub@system.gserviceaccount.com` + NotificationSetting + push
   subscription.** Requires the Cloud project from blocker 1 and an authorized human
   with IAM rights.
6. **The producer-restricted reviews decision.** If Google does not grant the legacy v4
   reviews surface, someone must accept the reviews leg staying UNKNOWN (or pursue
   Google's allowlist process). That is a business decision for Nolan, not a technical
   workaround for the agent.
7. **Credential scoping sign-off.** Per-connector credential scoping (which token lives
   where in the vault, rotation cadence, revocation handling) needs Nolan's sign-off
   before the M11 token-lifecycle layer is built against the Secure Vault.
8. **(Meta leg, for the next packet) Meta app + app secret + App Review for Advanced
   Access** (`pages_read_engagement`, `pages_read_user_content`, `pages_show_list`),
   Page access tokens for target Pages, and a public HTTPS webhook endpoint with the
   verify token for the subscription handshake.
9. **(Yelp leg, for the next packet) Yelp developer app + API key,** plus the plan-tier
   decision: trial is evaluation-only per Yelp's terms, not commercial deployment;
   production needs a paid tier decision before the connector is committed to the
   golden path.

### Changed assumptions (recorded here so they are not silently carried)

- **Meta Page Reviews:** a vendor source reports the recommendations/reviews endpoints
  return 501 since Graph v22.0 (2026-01-21); this was NOT confirmed on Meta's official
  changelog. The Meta manifest therefore does NOT declare a reviews stream. A live
  probe (Phase: post-blocker-8) confirms or refutes before any reviews capability is
  declared. No Facebook review scraping: Platform Policy prohibits it.
- **GBP reviews:** field evidence (May 2026) shows approved projects hitting
  403 SERVICE_DISABLED on the producer-restricted legacy v4 surface. The manifest
  treats this as an expected degradation trigger, not an anomaly.
- **Yelp:** trial tier is evaluation-only; the golden-path Yelp leg is budgeted on the
  paid tier decision, not the trial quota.
