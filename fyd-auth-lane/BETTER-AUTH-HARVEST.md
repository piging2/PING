# Better Auth 1.7.5 harvest (source: npm tarball inspected 2026-09-21)

## Verdict: REJECT as dependency, HARVEST patterns

Better Auth's account key (`package/dist/oauth2/account-key.mjs`):
- `{ providerId, accountId }`, accountId from the provider's `accountSubject`
  (typically the OIDC `sub`). Converges with this lane's canonical
  `provider::issuer::subject` key (ours adds the issuer, stricter).

Better Auth's state (`package/dist/oauth2/state.mjs`):
- 10-minute server-persisted verification record + signed state param
  carrying codeVerifier and idTokenNonce. Converges with this lane's
  signed state cookie (state, nonce, codeVerifier, mode, redirectUri,
  10-minute expiry).

Reasons to REJECT as a package (evidence, not preference):

1. Own user/account/session schema via its adapter layer (Kysely/Prisma/
   Drizzle/Mongo/memory). Adopting it would create the second user system
   the user explicitly prohibited. No existing customer-user database
   authority was found in archaeology to map it onto.

2. Default email-based account merging: `handleOAuthUserInfo`
   (`package/dist/oauth2/link-account.mjs`) calls
   `findUserByEmail(userInfo.email.toLowerCase())` and implicitly links
   the OAuth account to the matched user when the provider is trusted
   and the email is verified. This is exactly the "email must never
   trigger automatic merging" behavior the user prohibited. Disabling it
   requires fighting the library's defaults
   (`accountLinking.enabled=false`, `disableImplicitLinking=true`) while
   still carrying its user/account/session tables.

3. Token persistence: `setTokenUtil` stores provider access/refresh
   tokens on the account record. The user's requirement is that provider
   tokens never enter binding records, audit logs, journals, pages, or
   prompts. This lane drops them after verification.

## Harvested into this lane (patterns only, no dependency)
- Canonical provider-account key = provider + provider-declared subject.
- Signed OAuth state carrying PKCE verifier + nonce, 10-minute expiry.
- Server-side issuer/audience/expiry/nonce verification before binding.
