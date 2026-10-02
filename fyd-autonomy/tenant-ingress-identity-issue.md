# Tenant issue (precise, recorded 2026-09-27 ~16:12 MDT)

Source: tenant lane report (pr-upstream-denied.test.sh, 25/25 PASS, needs independent clean replay).
Nolan's scoping: 25/25 DENY proof is enough. DO NOT EXPAND TENANTOS.

## The next precise issue

Gateway ingress asserts tenant identity instead of deriving/verifying it through
existing authority.

- Product/gateway ingress accepts asserted tenant identity: TypeScript trusts a
  body-supplied tenant against an allowlist.
- Python has AuthenticatedContext but no verified-session production constructor.
- Cross-tenant private-context isolation remains PARTIAL.

## Required (when the lane resumes, not now)

- Wire server-authoritative identity into ingress (derive/verify through existing
  authority, never trust body-supplied tenant).
- Add hostile spoofing, unauthenticated CRUD/query, and private-context leakage tests.
- Keep TenantOS a tenant-scoped composition of existing PING authorities, not another platform.

## Standing rule

Do not let tenant work distract the FYD product lane unless it creates an immediate
cross-tenant security exposure. No such exposure is currently evidenced.
