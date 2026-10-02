#!/usr/bin/env bash
#
# pr-upstream-denied.test.sh
#
# EXECUTABLE POLICY TEST — closed unmerged PR #1 (trishnikitha-art/happy-place-platform).
#
# Incident (2026-09-27, ~/memory/2026-09-27.md:1912/1974/2421): operator automation
# acting as GitHub identity piging2 cloned the HPP original, patched it, created
# fork piging2/happy-place-platform, branch fix/homepage-defects, commit f7e6891a9caf,
# and opened upstream PR #1 against trishnikitha-art/happy-place-platform. Nolan
# then bound the hard rule: the HPP original repo/site is absolute READ-ONLY —
# no modification clone, no PR, no push, no deploy, no workflow edit, ever.
# The PR was closed unmerged and the fork deleted. This test encodes that policy.
#
# POLICY UNDER TEST:
#   Operator discovers defect in an external source repo. Operator holds a GitHub
#   credential (technical permission). System proposes an upstream PR.
#   EXPECTED: DENY unless an explicit tenant/source capability grants
#   repository.write or repository.pull_request.create FOR THAT REPOSITORY.
#
#   Technical permission != PING capability != human authorization.
#   A GitHub credential is broker-resolved at the process boundary (see the
#   identity_1..4 profile notes in external_agent_adapter.js: "Broker resolves
#   credentials at the process boundary; never in the WorkOrder") — it is NOT
#   a capability grant and must NEVER flip a DENY to a GRANT.
#
# HARNESS: evaluates the REAL capability decision function authorizeWorkOrder
# from ~/workspace/orca-adapter/vendor/external_agent_adapter.js (fail-closed
# allowlist), then applies the PR-specific policy wrapper:
#   1. capability in the agent profile allowlist (real function), AND
#   2. profile.repositoryGrants explicitly names the exact repository
#      (per-repo scope; no blanket grants), AND
#   3. a GitHub credential anywhere in the request changes NOTHING.
#
# The test FAILS LOUDLY if the system would allow the PR on technical
# permission alone (case 4 simulates a profile that does hold the capability
# without a per-repo scope — the wrapper must still DENY).
#
# Run: bash ~/workspace/fyd-autonomy/policy-tests/pr-upstream-denied.test.sh
# Exit 0 = all assertions pass. Exit 1 = POLICY VIOLATION (details on stderr).

set -u

HARNESS_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_HARNESS="$HARNESS_DIR/.pr-upstream-denied.harness.js"

cat > "$NODE_HARNESS" <<'HARNESS_EOF'
// Harness for pr-upstream-denied.test.sh. Not a policy authority itself:
// it exercises the REAL authorizeWorkOrder plus the PR policy wrapper.
const path = require("path");
const adapter = require(path.resolve(
  "/home/hatch/workspace/orca-adapter/vendor/external_agent_adapter.js"
));
const { AGENT_PROFILES, authorizeWorkOrder } = adapter;

const UPSTREAM_REPO = "trishnikitha-art/happy-place-platform";
const TENANT_NS = "tenant::happy-place";

// Constraints any work order must carry (from authorizeWorkOrder's contract).
const BASE_CONSTRAINTS = {
  read_only: true,
  no_writes: true,
  no_network: true,
  no_canonical_events: true,
  no_mission_state_writes: true,
};

/**
 * THE PR POLICY DECISION (wrapper around the real capability check).
 * Returns {granted, reason}.
 */
function prPolicyDecision({ agentId, repo, capability, namespace, extraConstraints, profileOverride }) {
  // Resolve the profile: a hostile simulation may inject one.
  let profiles = AGENT_PROFILES;
  if (profileOverride) {
    profiles = { ...AGENT_PROFILES, ...profileOverride };
  }
  // Patch the profile table the real function reads (module-level object).
  const realProfiles = adapter.AGENT_PROFILES;
  let injectedKey = null;
  if (profileOverride) {
    for (const k of Object.keys(profileOverride)) {
      realProfiles[k] = profileOverride[k];
      injectedKey = k;
    }
  }
  let decision;
  try {
    const auth = authorizeWorkOrder({
      agentId,
      capability,
      namespace,
      constraints: { ...BASE_CONSTRAINTS, source_repository: repo, ...(extraConstraints || {}) },
    });
    if (!auth.granted) {
      decision = { granted: false, reason: "capability-authority: " + auth.reason };
    } else {
      // Capability present in the allowlist is NOT enough for an upstream PR:
      // require an explicit per-repository grant naming THIS exact repo.
      const profile = profiles[agentId];
      const grants = (profile && profile.repositoryGrants) || [];
      if (!grants.includes(repo)) {
        decision = {
          granted: false,
          reason: `pr-policy: capability '${capability}' is allowlisted for agent '${agentId}' ` +
                  `but profile has no explicit per-repository grant for '${repo}' (repositoryGrants: [${grants.join(", ")}])`,
        };
      } else {
        decision = { granted: true, reason: `pr-policy: explicit grant for '${repo}'` };
      }
    }
  } finally {
    if (injectedKey) delete realProfiles[injectedKey];
  }
  return decision;
}

const results = [];
function check(name, decision, expectGranted) {
  const pass = decision.granted === expectGranted;
  results.push({ name, pass, decision });
  return pass;
}

// 1. The incident scenario: identity_1 is the copilot broker dispatch identity
//    documented as "identity_1 (piging2)" — the GitHub operator identity that
//    opened PR #1. It asks for repository.pull_request.create on the upstream.
check(
  "incident-scenario: piging2/identity_1 proposes upstream PR",
  prPolicyDecision({
    agentId: "identity_1",
    repo: UPSTREAM_REPO,
    capability: "repository.pull_request.create",
    namespace: TENANT_NS,
  }),
  false
);

// 2. No known agent holds any repository.* capability at all: sweep all profiles.
for (const agentId of Object.keys(AGENT_PROFILES)) {
  for (const cap of ["repository.write", "repository.pull_request.create"]) {
    check(
      `sweep: ${agentId} x ${cap}`,
      prPolicyDecision({ agentId, repo: UPSTREAM_REPO, capability: cap, namespace: TENANT_NS }),
      false
    );
  }
}

// 3. A bare operator/GitHub identity string is not an agent profile: DENY.
check(
  "operator-identity-is-not-agent: 'piging2' proposes upstream PR",
  prPolicyDecision({
    agentId: "piging2",
    repo: UPSTREAM_REPO,
    capability: "repository.pull_request.create",
    namespace: TENANT_NS,
  }),
  false
);

// 4. TECHNICAL PERMISSION != CAPABILITY (the loud-failure case).
//    Simulate an agent that technically holds the GitHub credential AND has
//    repository.pull_request.create in its allowlist (i.e. "technical
//    permission" is present), but has NO per-repo grant for the upstream.
//    A naive authorizeWorkOrder-only check would GRANT here; the PR policy
//    wrapper must DENY. If this check passes-as-granted, the test fails.
check(
  "hostile: capability-allowlisted agent with credential, no per-repo grant",
  prPolicyDecision({
    agentId: "hostile-operator",
    repo: UPSTREAM_REPO,
    capability: "repository.pull_request.create",
    namespace: TENANT_NS,
    extraConstraints: { github_credential_present: true },
    profileOverride: {
      "hostile-operator": {
        transport: "simulated",
        allowedCapabilities: ["repository.pull_request.create", "repository.write"],
        maxConstraints: { read_only: true, no_writes: true, no_network: true },
        status: "LIVE",
        family: "simulated",
        notes: "Simulated operator with a GitHub credential and capability allowlist entry, but no per-repo grant.",
      },
    },
  }),
  false
);

// 5. Credential injection changes nothing: same request with a token-shaped
//    value in constraints must produce the identical DENY.
check(
  "credential-does-not-grant: token in constraints, identity_1",
  prPolicyDecision({
    agentId: "identity_1",
    repo: UPSTREAM_REPO,
    capability: "repository.pull_request.create",
    namespace: TENANT_NS,
    extraConstraints: { github_token: "REDACTED-NOT-A-REAL-TOKEN" },
  }),
  false
);

// 6. Positive control: the harness is not a deny-everything stub. identity_1
//    genuinely holds test.generate; the real function must GRANT it.
const positive = authorizeWorkOrder({
  agentId: "identity_1",
  capability: "test.generate",
  namespace: TENANT_NS,
  constraints: { ...BASE_CONSTRAINTS },
});
check("positive-control: identity_1 x test.generate", positive, true);

// 7. Explicit-grant positive path: a profile with the capability AND an
//    explicit per-repo grant for THIS repo would be allowed (proves the gate
//    is the grant, not a blanket ban). Uses a synthetic tenant-owned repo.
check(
  "explicit-grant-path: per-repo grant for a tenant-owned repo",
  prPolicyDecision({
    agentId: "tenant-authorized-op",
    repo: "happy-place-tenant/happy-place-platform",
    capability: "repository.pull_request.create",
    namespace: TENANT_NS,
    profileOverride: {
      "tenant-authorized-op": {
        transport: "simulated",
        allowedCapabilities: ["repository.pull_request.create"],
        maxConstraints: { read_only: true, no_writes: true, no_network: true },
        status: "LIVE",
        family: "simulated",
        repositoryGrants: ["happy-place-tenant/happy-place-platform"],
        notes: "Simulated: tenant authority explicitly granted repository.write scope for its own repo.",
      },
    },
  }),
  true
);

// 8. ...but that same explicit grant does NOT cover the HPP upstream repo.
check(
  "grant-is-repo-scoped: tenant-authorized-op x trishnikitha-art/happy-place-platform",
  prPolicyDecision({
    agentId: "tenant-authorized-op",
    repo: UPSTREAM_REPO,
    capability: "repository.pull_request.create",
    namespace: TENANT_NS,
    profileOverride: {
      "tenant-authorized-op": {
        transport: "simulated",
        allowedCapabilities: ["repository.pull_request.create"],
        maxConstraints: { read_only: true, no_writes: true, no_network: true },
        status: "LIVE",
        family: "simulated",
        repositoryGrants: ["happy-place-tenant/happy-place-platform"],
        notes: "Simulated: same grant as check 7, wrong repo.",
      },
    },
  }),
  false
);

const failures = results.filter((r) => !r.pass);
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  console.log(`      -> granted=${r.decision.granted}  reason=${r.decision.reason}`);
}
console.log(`\n${results.length - failures.length}/${results.length} assertions passed.`);
if (failures.length > 0) {
  console.error(
    `\nPOLICY VIOLATION: ${failures.length} assertion(s) failed. ` +
    `The system would allow an upstream PR on technical permission alone. ` +
    `Do NOT proceed with any upstream PR against trishnikitha-art/happy-place-platform.`
  );
  process.exit(1);
}
console.log("PR POLICY HOLDS: upstream PR against trishnikitha-art/happy-place-platform is DENIED for every agent profile without an explicit per-repository grant.");
HARNESS_EOF

node "$NODE_HARNESS"
rc=$?
rm -f "$NODE_HARNESS"
exit $rc
