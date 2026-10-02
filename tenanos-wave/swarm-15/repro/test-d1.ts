/**
 * D1 regression test: Kit webhook signature verification + replay protection.
 *
 * Run against the OLD route  -> must FAIL (proves the vulnerability)
 * Run against the NEW route  -> must PASS  (proves the fix)
 *
 *   ROUTE_VARIANT=old npx tsx test-d1.ts
 *   ROUTE_VARIANT=new npx tsx test-d1.ts
 */
import { createHmac } from "crypto";
import assert from "node:assert/strict";

const SECRET = "test-webhook-secret-abc123";

function sign(body: string): string {
  return (
    "sha256=" + createHmac("sha256", SECRET).update(body, "utf8").digest("hex")
  );
}

function kitPayload(email: string) {
  return {
    event: { name: "subscriber.form_subscribe" },
    subscriber: {
      id: 987654,
      email_address: email,
      first_name: "Test",
      state: "active",
    },
  };
}

async function main() {
  const variant = process.env.ROUTE_VARIANT === "old" ? "old" : "new";
  const route = await import(`./${variant}/src/app/api/kit/webhook/route.js`);
  const { getEventRepository } = await import(`./${variant}/src/lib/events.js`);
  const { NextRequest } = await import("next/server");

  function post(body: unknown, headers: Record<string, string> = {}) {
    const raw = typeof body === "string" ? body : JSON.stringify(body);
    return new NextRequest("http://localhost/api/kit/webhook", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: raw,
    });
  }

  let passed = 0;
  async function check(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      passed++;
      console.log(`  ok - ${name}`);
    } catch (e) {
      console.error(`  FAIL - ${name}: ${(e as Error).message}`);
      process.exitCode = 1;
    }
  }

  console.log(`D1 regression tests (route variant: ${variant})`);
  process.env.KIT_WEBHOOK_SECRET = SECRET;

  // 1. Forged webhook with no signature must be rejected
  await check("unsigned forged webhook -> 401", async () => {
    const res = await route.POST(post(kitPayload("forge1@example.com")));
    assert.equal(res.status, 401, `got ${res.status}`);
  });

  // 2. Wrong signature must be rejected
  await check("wrong signature -> 401", async () => {
    const res = await route.POST(
      post(kitPayload("forge2@example.com"), {
        "x-kit-signature": "sha256=" + "0".repeat(64),
      })
    );
    assert.equal(res.status, 401, `got ${res.status}`);
  });

  // 3. Valid signature accepted; replay of the same delivery is dropped
  await check("valid signature -> 200, replay deduped to 1 event", async () => {
    const email = `replay-V@example.com`;
    const raw = JSON.stringify(kitPayload(email));
    const headers = { "x-kit-signature": sign(raw) };
    const r1 = await route.POST(post(raw, headers));
    const r2 = await route.POST(post(raw, headers)); // Kit retry of same delivery
    assert.equal(r1.status, 200, `first got ${r1.status}`);
    assert.equal(r2.status, 200, `retry got ${r2.status}`);
    const events = await getEventRepository().findByEmail(email);
    assert.equal(events.length, 1, `expected 1 event, got ${events.length}`);
  });

  // 4. Missing secret disables the route (fail closed)
  await check("no KIT_WEBHOOK_SECRET -> 503", async () => {
    delete process.env.KIT_WEBHOOK_SECRET;
    try {
      const res = await route.POST(post(kitPayload("forge3@example.com")));
      assert.equal(res.status, 503, `got ${res.status}`);
    } finally {
      process.env.KIT_WEBHOOK_SECRET = SECRET;
    }
  });

  console.log(`\n${passed}/4 D1 checks passed`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
