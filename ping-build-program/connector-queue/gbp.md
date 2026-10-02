# Connector: Google Business Profile (GBP)

## Why
The winner connector. Reviews leg feeds review-triggered outreach; locations leg is the business-identity backbone. Longest lead item in the wave: the Google approval clock must start first.

## Exact scope set (smallest permission set)
| Scope | Why | PKCE | What breaks without it |
|---|---|---|---|
| `https://www.googleapis.com/auth/business.manage` | Read locations + read reviews (the demonstrated feature) | yes | No GBP access at all; connector stays DISABLED |

No write scopes. No speculative scopes.

## PKCE
Yes. Authorization-code flow with PKCE S256, per current OAuth guidance and lane-conn16/OAUTH-CONNECT-FLOW.md.

## What Nolan must physically do (Google Cloud Console + Google forms)
1. Pick a Google account. Recommendation: a dedicated PING Google account that owns/manages the Google Business Profile. The profile must be verified and active 60+ days, with a representative business website on it.
2. In console.cloud.google.com: create (or select) a project, enable the Google Business Profile APIs (Business Information API + Account Management API).
3. Configure the OAuth consent screen, then create an OAuth 2.0 client (Web application).
4. Submit Google's "Application for Basic API Access" form. Until Google approves, all Business Profile API quotas are 0 QPM: the connector stays DISABLED with GOOGLE_GBP_ACCESS_PENDING and never probes.
5. Expectation setting: the reviews list endpoint is a producer-restricted legacy surface. Approval may NOT grant it (observed 403 SERVICE_DISABLED on approved projects). If the morning probe confirms the 403, that is a designed state, not a bug: the connector degrades the reviews leg to UNKNOWN while locations keep working.
6. Later (only after 1-5 work): a Cloud Pub/Sub topic granting `mybusiness-api-pubsub@system.gserviceaccount.com` the Publisher role, plus a push subscription to an HTTPS endpoint. Poll backfill stays mandatory (Google never redelivers).

## What the agent does after
Run the OAUTH-CONNECT-FLOW 7-step flow: server-side authorization-code + PKCE, callback verifies state, `broker.issue()` places tokens in lane-L custody, capability inventory is built from discover(). Refresh token lives in the Secure Vault behind a `cap_` handle. Agent wires the Nango GBP provider YAML (nango-gbp-provider.yaml in this package) if the Nango verdict is adopted.

## Personal vs dedicated account
A dedicated PING Google account is strongly preferred. The GBP scope grants management-level read on the business listing. A personal account binds Nolan's personal identity (and its Drive/Gmail consent surface if the same client is shared) to customer business data. Personal vs dedicated does not change which API calls work; it changes blast radius and audit clarity if a token is ever compromised. Recommendation: dedicated.

## Handle story
Agents get an opaque `cap_` handle from the lane-L broker (sha256(handle) stored, handle value never stored). Agents never see the refresh token. See lane-l/SECRET-BROKER-DESIGN.md and lane-conn16/OAUTH-CONNECT-FLOW.md step 6.
