/**
 * D2 regression script: resource-download route auth + URL allowlist + email validation.
 *
 * Security: src/app/api/resources/download/route.ts must not let unauthenticated
 * callers tag arbitrary Kit subscribers, must not reflect attacker-supplied URLs,
 * and must validate the email before any Kit call.
 *
 * Run with: npx tsx scripts/security-regression/d2-resource-download-regression.ts
 *   - BEFORE the D2 fix: exits non-zero (vulnerabilities present)
 *   - AFTER  the D2 fix: exits zero (all checks pass)
 */
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../../src/app/api/resources/download/route.js";

const TOKEN = "test-download-token-xyz";

const kitCalls: string[] = [];
// Fake Kit API: lookup returns one subscriber; tag POST succeeds.
(globalThis as any).fetch = async (url: any, init: any) => {
  const u = String(url);
  kitCalls.push(`${init?.method || "GET"} ${u}`);
  const json = async () =>
    u.includes("/subscribers?")
      ? { subscribers: [{ id: 123, email_address: "user@example.com" }] }
      : {};
  return { ok: true, status: 200, statusText: "OK", json };
};

async function main() {
  process.env.KIT_API_KEY = "test-kit-key";
  process.env.KIT_GUIDE_DOWNLOAD_TAG_ID = "999";
  process.env.RESOURCE_DOWNLOAD_TOKEN = TOKEN;
  delete process.env.RESOURCE_DOWNLOAD_ALLOWED_HOSTS; // default: own host only

  function post(body: unknown, headers: Record<string, string> = {}) {
    return new NextRequest("http://localhost/api/resources/download", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
  }
  const auth = { authorization: `Bearer ${TOKEN}` };
  const goodBody = {
    email: "user@example.com",
    resourceTitle: "Free Guide",
    resourceUrl: "https://localhost/files/guide.pdf", // own host -> allowlisted by default
  };

  let passed = 0;
  async function check(name: string, fn: () => Promise<void> | void) {
    kitCalls.length = 0;
    try {
      await fn();
      passed++;
      console.log(`  ok - ${name}`);
    } catch (e) {
      console.error(`  FAIL - ${name}: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }

  console.log("D2 regression: resource-download authentication + allowlist");

  // 1. Unauthenticated tag attempt must be rejected, Kit untouched
  await check("no token -> 401, no Kit calls", async () => {
    const res = await POST(post(goodBody));
    assert.equal(res.status, 401, `got ${res.status}`);
    assert.equal(kitCalls.length, 0, `Kit was called: ${kitCalls}`);
  });

  // 2. Wrong token must be rejected
  await check("wrong token -> 401", async () => {
    const res = await POST(
      post(goodBody, { authorization: "Bearer wrong-token" })
    );
    assert.equal(res.status, 401, `got ${res.status}`);
  });

  // 3. Attacker-supplied off-site resourceUrl must be rejected (open redirect)
  await check("evil resourceUrl -> 400, no Kit calls", async () => {
    const res = await POST(
      post({ ...goodBody, resourceUrl: "https://evil.example/phish" }, auth)
    );
    assert.equal(res.status, 400, `got ${res.status}`);
    assert.equal(kitCalls.length, 0, `Kit was called: ${kitCalls}`);
    const body = await res.json();
    assert.notEqual(
      body.downloadUrl,
      "https://evil.example/phish",
      "evil URL reflected"
    );
  });

  // 4. Malformed email must be rejected before any Kit lookup
  await check("malformed email -> 400, no Kit calls", async () => {
    const res = await POST(
      post({ ...goodBody, email: "not-an-email" }, auth)
    );
    assert.equal(res.status, 400, `got ${res.status}`);
    assert.equal(kitCalls.length, 0, `Kit was called: ${kitCalls}`);
  });

  // 5. Legitimate request still works: tagged + downloadUrl returned
  await check("valid authed request -> 200, tag applied", async () => {
    const res = await POST(post(goodBody, auth));
    assert.equal(res.status, 200, `got ${res.status}`);
    const body = await res.json();
    assert.equal(body.downloadUrl, goodBody.resourceUrl);
    assert.ok(
      kitCalls.some((c) => c.startsWith("POST") && c.includes("/tags/")),
      `tag POST missing: ${kitCalls}`
    );
  });

  // 6. Missing token env disables the route (fail closed)
  await check("no RESOURCE_DOWNLOAD_TOKEN -> 503", async () => {
    delete process.env.RESOURCE_DOWNLOAD_TOKEN;
    try {
      const res = await POST(post(goodBody, auth));
      assert.equal(res.status, 503, `got ${res.status}`);
    } finally {
      process.env.RESOURCE_DOWNLOAD_TOKEN = TOKEN;
    }
  });

  console.log(`\n${passed}/6 D2 checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
