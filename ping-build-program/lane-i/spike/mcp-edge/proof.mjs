// PROOF BATTERY — lane I MCP edge.
// PART A: in-process edge tests (registration gate, approval binding, TOCTOU).
// PART B: real MCP protocol tests over stdio (discovery, authorized call,
//         forbidden call, approval-bound proposal draft). The approval step itself
//         is exercised in-process because approval is NOT an MCP tool by design.
import { readFileSync } from "node:fs";
import { z } from "zod";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  ToolRegistry, CapabilityStore, createSession, callTool, approveProposal,
  RegistrationRejected, withTimeout, auditLog, digestOf,
} from "./edge.mjs";
import { buildToolsForRecords, toolNameFor } from "./tools.mjs";

const DIR = new URL(".", import.meta.url).pathname;
const fixture = JSON.parse(readFileSync(new URL("./capabilities.fixture.json", import.meta.url), "utf8"));
const byId = Object.fromEntries(fixture.capabilities.map((c) => [c.capabilityId, c]));
const PHONE_ID = "cap_a34077907a3d4c20";
const FACT_ID = "cap_9449dc9768c2677e";
const REPORT_ID = "cap_e8791e35b14ebf96";
const BOOKING_ID = "cap_9a0eb61db5aa1be6";
const OBJ = "website-business-2f1327c09d622175";

const results = [];
function check(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => { results.push(["PASS", name]); })
    .catch((e) => { results.push(["FAIL", name, String(e?.message ?? e)]); });
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
async function expectCode(promise, code) {
  try {
    await promise;
  } catch (e) {
    if (e?.code === code || String(e?.message).includes(code)) return;
    throw new Error(`expected code '${code}', got '${e?.code ?? e?.message}'`);
  }
  throw new Error(`expected code '${code}', but no error was thrown`);
}

function freshEdge() {
  const store = new CapabilityStore(fixture.capabilities);
  const registry = new ToolRegistry(store);
  const { defs } = buildToolsForRecords(fixture.capabilities, fixture);
  for (const def of defs) registry.register(def);
  return { store, registry };
}

// ================= PART A: in-process =================
await check("A1 forbidden registration: raw DB tool name rejected", async () => {
  const { registry } = freshEdge();
  try {
    registry.register({ name: "ping_query_db", description: "run raw SQL", shape: { q: z.string() }, capabilityId: PHONE_ID, objectId: OBJ, handler: async () => ({}) });
    throw new Error("registered a forbidden tool");
  } catch (e) {
    assert(e instanceof RegistrationRejected && e.code === "registry.forbidden-tool", `wrong rejection: ${e.code}`);
  }
});
await check("A2 forbidden registration: secret-bearing argument rejected", async () => {
  const { registry } = freshEdge();
  try {
    registry.register({ name: "ping_lookup_thing", description: "x", shape: { api_token: z.string() }, capabilityId: PHONE_ID, objectId: OBJ, handler: async () => ({}) });
    throw new Error("registered a secret-bearing tool");
  } catch (e) {
    assert(e.code === "registry.secret-bearing-argument", `wrong rejection: ${e.code}`);
  }
});
await check("A3 impersonation: duplicate tool name rejected", async () => {
  const { registry } = freshEdge();
  const { defs } = buildToolsForRecords(fixture.capabilities, fixture);
  try {
    registry.register({ ...defs[0] }); // same name as the real ping_contact_request_phone
    throw new Error("duplicate name registered");
  } catch (e) {
    assert(e.code === "registry.name-conflict", `wrong rejection: ${e.code}`);
  }
});
await check("A4 unresolved capability (candidate) never registers", async () => {
  const { registry } = freshEdge();
  try {
    registry.register({ name: "ping_booking_thing", description: "x", shape: { object_id: z.string() }, capabilityId: BOOKING_ID, objectId: OBJ, handler: async () => ({}) });
    throw new Error("candidate record registered");
  } catch (e) {
    assert(e.code === "registry.unresolved-capability", `wrong rejection: ${e.code}`);
  }
});
await check("A5 secret value in capability parameters rejected", async () => {
  const store = new CapabilityStore(fixture.capabilities);
  const evil = structuredClone(byId[PHONE_ID]);
  evil.capabilityId = "cap_evilsecret000000";
  evil.parameters = { displayValue: "sk-live-abc123XYZ890qrs", actionUri: null };
  store.records.set(evil.capabilityId, evil);
  const registry = new ToolRegistry(store);
  try {
    registry.register({ name: "ping_contact_evil", description: "x", shape: { object_id: z.string() }, capabilityId: evil.capabilityId, objectId: OBJ, handler: async () => ({}) });
    throw new Error("secret-bearing record registered");
  } catch (e) {
    assert(e.code === "registry.secret-in-parameters", `wrong rejection: ${e.code}`);
  }
});
await check("A6 TOCTOU: withdrawn record refused at call time (re-read live)", async () => {
  const { store, registry } = freshEdge();
  const session = createSession("owner", store);
  store.setStatus(REPORT_ID, "withdrawn"); // withdrawn AFTER discovery/registration
  const env = await callTool(session, registry, toolNameFor(byId[REPORT_ID]), { object_id: OBJ });
  assert(env.decision === "denied", "withdrawn capability was callable");
  assert(env.denial.rule === "capability.status", `wrong rule: ${env.denial.rule}`);
});
await check("A7 approval binds exact digest; single-use; replay refused", async () => {
  const { store, registry } = freshEdge();
  const session = createSession("owner", store);
  const args1 = { object_id: OBJ, field: "phone", corrected_value: "(970) 245-0000", base_digest: fixture.objectDigest, idempotency_key: "a7-1" };
  const e1 = await callTool(session, registry, toolNameFor(byId[FACT_ID]), args1);
  assert(e1.decision === "granted" && e1.answer.status === "drafted", "proposal not drafted");
  const { proposal_id, proposal_digest } = e1.answer;
  // exact-digest approval works
  const approved = approveProposal(store, proposal_id, { digest: proposal_digest, approver_principal: "owner" });
  assert(approved.status === "approved", "not approved");
  // single-use: second approval of the same proposal fails
  await expectCode(Promise.resolve().then(() => approveProposal(store, proposal_id, { digest: proposal_digest, approver_principal: "owner" })), "approval.already-consumed");
  // replay: old approval digest against a NEW proposal fails
  const e2 = await callTool(session, registry, toolNameFor(byId[FACT_ID]), { ...args1, corrected_value: "(970) 245-9999", idempotency_key: "a7-2" });
  await expectCode(Promise.resolve().then(() => approveProposal(store, e2.answer.proposal_id, { digest: proposal_digest, approver_principal: "owner" })), "approval.digest-mismatch");
  assert(e2.answer.status === "drafted", "replay must not approve the second proposal");
  // non-owner approval fails
  await expectCode(Promise.resolve().then(() => approveProposal(store, e2.answer.proposal_id, { digest: e2.answer.proposal_digest, approver_principal: "visitor" })), "approval.not-owner");
});
await check("A8 stale base digest refused (propose.ts 409 law)", async () => {
  const { store, registry } = freshEdge();
  const session = createSession("owner", store);
  const env = await callTool(session, registry, toolNameFor(byId[FACT_ID]), {
    object_id: OBJ, field: "phone", corrected_value: "x", base_digest: "0".repeat(64),
  });
  assert(env.decision === "denied" && env.denial.rule === "proposal.stale-base", `wrong: ${JSON.stringify(env.denial)}`);
});
await check("A9 idempotency: same key+args replays, same key+new args conflicts", async () => {
  const { store, registry } = freshEdge();
  const session = createSession("owner", store);
  const base = { object_id: OBJ, field: "hours", corrected_value: "24/7", base_digest: fixture.objectDigest, idempotency_key: "a9-k" };
  const e1 = await callTool(session, registry, toolNameFor(byId[FACT_ID]), base);
  const e2 = await callTool(session, registry, toolNameFor(byId[FACT_ID]), base);
  assert(e2.answer.proposal_id === e1.answer.proposal_id && e2.answer.replayed === true, "idempotent replay failed");
  const e3 = await callTool(session, registry, toolNameFor(byId[FACT_ID]), { ...base, corrected_value: "different" });
  assert(e3.decision === "denied" && e3.denial.rule === "idempotency.conflict", "idempotency conflict not detected");
});
await check("A10 tool timeout enforced", async () => {
  await expectCode(withTimeout(new Promise(() => {}), 50), "tool-timeout");
});
await check("A11 rate-limit freeze drops session to 0 calls", async () => {
  const { store, registry } = freshEdge();
  const session = createSession("visitor", store, { rateLimit: 2 });
  await callTool(session, registry, toolNameFor(byId[PHONE_ID]), { object_id: OBJ });
  await callTool(session, registry, toolNameFor(byId[PHONE_ID]), { object_id: OBJ });
  const env = await callTool(session, registry, toolNameFor(byId[PHONE_ID]), { object_id: OBJ });
  assert(env.decision === "denied" && env.denial.rule === "rate.session-exceeded", "rate limit not enforced");
  const env2 = await callTool(session, registry, toolNameFor(byId[PHONE_ID]), { object_id: OBJ });
  assert(env2.decision === "denied" && env2.denial.rule === "rate.session-frozen", "frozen session still serving");
});

// ================= PART B: wire protocol =================
async function spawnClient(principal) {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["server.mjs"],
    cwd: DIR,
    env: { ...process.env, MCP_EDGE_PRINCIPAL: principal },
    stderr: "ignore",
  });
  const client = new Client({ name: "lane-i-proof", version: "0.1.0" });
  await client.connect(transport);
  return client;
}
const PHONE_TOOL = toolNameFor(byId[PHONE_ID]);
const FACT_TOOL = toolNameFor(byId[FACT_ID]);
const REPORT_TOOL = toolNameFor(byId[REPORT_ID]);

await check("B1 discovery (visitor): tools/list shows read+proposal tools, hides owner-only", async () => {
  const client = await spawnClient("visitor");
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    assert(names.includes(PHONE_TOOL), "read tool missing");
    assert(names.includes(FACT_TOOL), "proposal tool missing");
    assert(!names.includes(REPORT_TOOL), "owner-only tool leaked to visitor");
    const phone = tools.find((t) => t.name === PHONE_TOOL);
    assert(phone.inputSchema?.type === "object", "inputSchema not published");
  } finally { await client.close(); }
});
await check("B2 authorized read call (visitor): granted with claim bindings + digests", async () => {
  const client = await spawnClient("visitor");
  try {
    const res = await client.callTool({ name: PHONE_TOOL, arguments: { object_id: OBJ } });
    assert(!res.isError, "read call errored");
    const env = JSON.parse(res.content[0].text);
    assert(env.decision === "granted", "not granted");
    assert(env.answer.display_value === "(970) 245-3869", "wrong value");
    assert(env.principal === "viewer:visitor", "wrong principal");
    assert(env.claims.some((c) => c.grade === "SUPPORTED"), "no SUPPORTED claim");
    assert(typeof env.result_digest === "string" && env.result_digest.length === 64, "no result digest");
    assert(typeof env.schema_digest === "string" && env.schema_digest.length === 64, "no schema digest");
  } finally { await client.close(); }
});
await check("B3 forbidden call (visitor -> owner-only tool): rejected, no leak", async () => {
  const client = await spawnClient("visitor");
  try {
    // The SDK surfaces a protocol-level tool error as an isError result, not a throw.
    const res = await client.callTool({ name: REPORT_TOOL, arguments: { object_id: OBJ } });
    assert(res.isError === true, "unlisted owner-only tool should return an error result");
    const text = JSON.stringify(res.content);
    assert(/not found/i.test(text), `expected generic not-found error, got: ${text.slice(0, 200)}`);
    assert(!/owner-only|no-leak|performance report|not available/i.test(text.replace(REPORT_TOOL, "")), `leak in error: ${text.slice(0, 200)}`);
  } finally { await client.close(); }
});
await check("B4 forbidden call (visitor -> consequential tool): denied with exact rule", async () => {
  const client = await spawnClient("visitor");
  try {
    const res = await client.callTool({ name: FACT_TOOL, arguments: { object_id: OBJ, field: "phone", corrected_value: "x", base_digest: fixture.objectDigest } });
    assert(res.isError, "should be an error result");
    const env = JSON.parse(res.content[0].text);
    assert(env.decision === "denied", "not denied");
    assert(env.denial.rule === "visibility.owner", `wrong rule: ${env.denial.rule}`);
    assert(env.principal === "viewer:visitor", "principal wrong");
  } finally { await client.close(); }
});
await check("B5 discovery (owner): tools/list shows all three", async () => {
  const client = await spawnClient("owner");
  try {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    assert(names.includes(PHONE_TOOL) && names.includes(FACT_TOOL) && names.includes(REPORT_TOOL), `owner list incomplete: ${names}`);
  } finally { await client.close(); }
});
await check("B6 authorized owner-only call (owner): granted", async () => {
  const client = await spawnClient("owner");
  try {
    const res = await client.callTool({ name: REPORT_TOOL, arguments: { object_id: OBJ } });
    assert(!res.isError, "owner call errored");
    const env = JSON.parse(res.content[0].text);
    assert(env.decision === "granted" && env.principal === "viewer:owner", "not granted to owner");
  } finally { await client.close(); }
});
await check("B7 approval-bound consequential call (owner): proposal drafted with digest", async () => {
  const client = await spawnClient("owner");
  try {
    const res = await client.callTool({ name: FACT_TOOL, arguments: { object_id: OBJ, field: "phone", corrected_value: "(970) 245-0000", base_digest: fixture.objectDigest, rationale: "owner asked to update the number", idempotency_key: "b7" } });
    assert(!res.isError, "proposal draft errored");
    const env = JSON.parse(res.content[0].text);
    assert(env.decision === "granted", "not granted");
    assert(env.answer.status === "drafted", "not drafted");
    assert(env.answer.proposal_digest?.length === 64, "no proposal digest");
    assert(env.answer.next.includes("awaiting_owner_approval"), "missing approval pointer");
    assert(env.claims.some((c) => c.text.includes("No canonical state was changed")), "missing no-mutation claim");
  } finally { await client.close(); }
});
await check("B8 tool descriptions carry the data-boundary instruction", async () => {
  const client = await spawnClient("visitor");
  try {
    const { tools } = await client.listTools();
    for (const t of tools) {
      assert(t.description.includes("untrusted data"), `tool ${t.name} missing data-boundary instruction`);
    }
  } finally { await client.close(); }
});

// ================= report =================
let failed = 0;
for (const [status, name, detail] of results) {
  console.log(`${status} ${name}${detail ? " -- " + detail : ""}`);
  if (status === "FAIL") failed++;
}
console.log(`\n${results.length - failed}/${results.length} proof checks passed. audit events: ${auditLog.length}`);
process.exit(failed ? 1 : 0);
