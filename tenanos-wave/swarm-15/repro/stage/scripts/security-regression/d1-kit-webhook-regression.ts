/**
 * D1 regression script: Kit webhook signature verification + replay protection.
 *
 * Security: src/app/api/kit/webhook/route.ts must reject unsigned/forged
 * webhook deliveries and dedupe retried deliveries via event provenance.
 *
 * Run with: npx tsx scripts/security-regression/d1-kit-webhook-regression.ts
 *   - BEFORE the D1 fix: exits non-zero (vulnerability present)
 *   - AFTER  the D1 fix: exits zero (all checks pass)
 */
import { createHmac } from "crypto";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { getEventRepository } from "@/lib/events";
import { POST } from "../../src/app/api/kit/webhook/route.js";

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

function post(body: unknown, headers: Record<string, string> = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  return new NextRequest("http://localhost/api/kit/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: raw,
  });
}

async function main() {
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

  console.log("D1 regression: Kit webhook authentication");
  process.env.KIT_WEBHOOK_SECRET = SECRET;

  // 1. Forged webhook with no signature must be rejected
  await check("unsigned forged webhook -> 401", async () => {
    const res = await POST(post(kitPayload("d1-forge1@example.com")));
    assert.equal(res.status, 401, `got ${res.status}`);
  });

  // 2. Wrong signature must be rejected
  await check("wrong signature -> 401", async () => {
    const res = await POST(
      post(kitPayload("d1-forge2@example.com"), {
        "x-kit-signature": "sha256=" + "0".repeat(64),
      })
    );
    assert.equal(res.status, 401, `got ${res.status}`);
  });

  // 3. Valid signature accepted; replay of the same delivery is dropped
  await check("valid signature -> 200, replay deduped to 1 event", async () => {
    const email = "d1-replay@example.com";
    const raw = JSON.stringify(kitPayload(email));
    const headers = { "x-kit-signature": sign(raw) };
    const r1 = await POST(post(raw, headers));
    const r2 = await POST(post(raw, headers)); // Kit retry of same delivery
    assert.equal(r1.status, 200, `first got ${r1.status}`);
    assert.equal(r2.status, 200, `retry got ${r2.status}`);
    const events = await getEventRepository().findByEmail(email);
    assert.equal(events.length, 1, `expected 1 event, got ${events.length}`);
  });

  // 4. Missing secret disables the route (fail closed)
  await check("no KIT_WEBHOOK_SECRET -> 503", async () => {
    delete process.env.KIT_WEBHOOK_SECRET;
    try {
      const res = await POST(post(kitPayload("d1-forge3@example.com")));
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
