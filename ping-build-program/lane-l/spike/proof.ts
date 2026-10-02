/**
 * LANE L PROOF: an agent performs an authenticated connector fetch end-to-end.
 * The secret NEVER appears in the agent's context, logs, observation, or audit.
 * Run: tsx proof.ts
 */
import { SecretBroker, type CredentialStore } from "./secret-broker.js";

const CANARY = "LIVE_CANARY_ghX9q2mzToken"; // stands in for a real provider token

class MemStore implements CredentialStore {
  private m = new Map<string, string>([["GITHUB_CONN_TOKEN", CANARY]]);
  get = (id: string) => this.m.get(id);
  set = (id: string, v: string) => void this.m.set(id, v);
  has = (id: string) => this.m.has(id);
}

// The broker lives in the trusted control plane. Policy: this principal may
// fetch issues from this one repo, nothing else.
const broker = new SecretBroker({
  authorize: ({ principal, operation, target, tenantId }) =>
    principal === "agent:connector-worker-7" &&
    operation === "fetch:issues" &&
    target === "github.com/acme/roofing-co" &&
    tenantId === "tenant-acme",
  store: new MemStore(),
  audiences: ["connector-runtime-seam"],
});

// ---------- AGENT CODE BEGINS (untrusted; sees only the handle) ----------
const agentContext: string[] = [];
async function agentRun() {
  const handle = broker.request({
    principal: "agent:connector-worker-7",
    operation: "fetch:issues",
    target: "github.com/acme/roofing-co",
    tenantId: "tenant-acme",
    audience: "connector-runtime-seam",
    ttlSeconds: 300,
    purpose: "nightly issues sync",
    credentialId: "GITHUB_CONN_TOKEN",
  });
  agentContext.push(`handle=${handle}`);

  // Provider mock: only the real secret gets data.
  async function providerGetIssues(auth: string) {
    if (auth !== `Bearer ${CANARY}`) throw new Error("401");
    return [{ id: 101, title: "Gutter replacement quote" }];
  }

  // The seam: broker resolves the secret INSIDE execute(); agent never sees it.
  const observation = await broker.execute(
    handle,
    {
      principal: "agent:connector-worker-7",
      operation: "fetch:issues",
      target: "github.com/acme/roofing-co",
      tenantId: "tenant-acme",
      audience: "connector-runtime-seam",
    },
    async (secret) => {
      const issues = await providerGetIssues(`Bearer ${secret}`);
      return {
        kind: "github.issues",
        source: "github.com/acme/roofing-co",
        records: issues,
      };
    },
  );
  agentContext.push(`observation=${JSON.stringify(observation)}`);
  return observation;
}
// ---------- AGENT CODE ENDS ----------

async function main() {
  const observation = await agentRun();
const audit = broker.auditTrail();
agentContext.push(`audit=${JSON.stringify(audit)}`);

const everythingAgentSaw = agentContext.join("\n");
console.log("=== everything the agent saw ===");
console.log(everythingAgentSaw);
console.log("\n=== boundary check ===");
console.log(
  everythingAgentSaw.includes(CANARY)
    ? "FAIL: secret leaked into agent-visible surface"
    : "PASS: secret never appears in agent context, logs, observation, or audit",
);
console.log("\n=== audit record (the evidence) ===");
console.log(JSON.stringify(audit, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
