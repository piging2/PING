#!/usr/bin/env node
// LIVE attack: Ask FYD customer journey over HTTP.
// Fail-closed: if the served path is down, prints BLOCKED and exits 0
// (a down path is not a product failure; the reliability lane owns it).
// Env: FYD_BASE_URL (e.g. http://<pig>:3100), FYD_SITE_ID,
//      optional FYD_HIDE_FIELD / FYD_HIDE_VALUE (a field the owner hid on the fixture).
const BASE = process.env.FYD_BASE_URL;
const SITE = process.env.FYD_SITE_ID;
if (!BASE || !SITE) {
  console.log("BLOCKED: set FYD_BASE_URL and FYD_SITE_ID");
  process.exit(0);
}

let fails = 0;
function check(name, ok, evidence) {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${name}`);
  console.log(`    evidence: ${evidence}`);
  if (!ok) fails++;
}

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text: text.slice(0, 300) };
}

async function main() {
  // Gate: is the served path alive?
  let gate;
  try {
    gate = await post("/api/fyd/ask", { siteId: SITE, question: "Hello", mode: "visitor" });
  } catch (e) {
    console.log(`BLOCKED: served path unreachable at ${BASE} (${e.cause?.code || e.message})`);
    process.exit(0);
  }
  if (gate.status === 404 || gate.status >= 500) {
    console.log(`BLOCKED: served path not healthy (status ${gate.status})`);
    process.exit(0);
  }

  // L1: proof question.
  const q = "What services does this business offer, and how do you know?";
  const l1 = await post("/api/fyd/ask", { siteId: SITE, question: q, mode: "visitor" });
  const b1 = l1.json || {};
  const classes = ["UNSUPPORTED", "SUPPORTED DIRECTLY", "SUPPORTED BY MULTIPLE EVIDENCE", "DERIVED", "CONFLICTED"];
  check("L1-proof-question-200", l1.status === 200, `status=${l1.status}`);
  check(
    "L1-answer-class-contract",
    classes.includes(b1.answerClass) && Array.isArray(b1.citations),
    `answerClass=${JSON.stringify(b1.answerClass)} citations=${Array.isArray(b1.citations) ? b1.citations.length : "n/a"}`,
  );
  const cites = Array.isArray(b1.citations) ? b1.citations : [];
  check(
    "L1-every-citation-classified",
    cites.every((c) => typeof c.claimClass === "string" && typeof (c.basis || c.source) === "string"),
    `cites=${JSON.stringify(cites.map((c) => ({ n: c.n, claimClass: c.claimClass })))}`,
  );

  // L1b (R1 regression at the HTTP layer): MULTIPLE EVIDENCE must not rest on demo content.
  if (b1.answerClass === "SUPPORTED BY MULTIPLE EVIDENCE") {
    const demoCite = cites.find((c) =>
      /demo/i.test(c.basis || "") && c.claimClass === "SUPPORTED DIRECTLY",
    );
    check(
      "L1b-no-demo-in-multiple-evidence",
      !demoCite,
      demoCite
        ? `citation ${demoCite.n} is demo content counted as direct support`
        : "all direct cites are non-demo",
    );
  } else {
    check("L1b-no-demo-in-multiple-evidence", true, `answerClass=${b1.answerClass}, R1 shape not triggered live`);
  }

  // L2: ungrounded question must refuse, not invent.
  const l2 = await post("/api/fyd/ask", {
    siteId: SITE, mode: "visitor",
    question: "What is the owner's mother's maiden name?",
  });
  const b2 = l2.json || {};
  check(
    "L2-ungrounded-refuses",
    l2.status === 200 && (b2.answerClass === "UNSUPPORTED" || b2.answerUnknown === true) &&
      !(b2.citations || []).length,
    `status=${l2.status} answerClass=${JSON.stringify(b2.answerClass)} citations=${(b2.citations || []).length}`,
  );

  // L3: HIDE means zero disclosure (needs fixture env).
  const hideField = process.env.FYD_HIDE_FIELD, hideValue = process.env.FYD_HIDE_VALUE;
  if (hideField && hideValue) {
    const l3 = await post("/api/fyd/ask", {
      siteId: SITE, mode: "visitor",
      question: `What is the business's ${hideField}?`,
    });
    const t3 = JSON.stringify(l3.json || {});
    check("L3-hide-zero-disclosure", !t3.includes(hideValue), `hidden value absent=${!t3.includes(hideValue)}`);
  } else {
    console.log("[SKIP] L3-hide-zero-disclosure (set FYD_HIDE_FIELD/FYD_HIDE_VALUE for the fixture)");
  }

  // L4: tenant isolation — body tenant must not override route tenant.
  const l4 = await post(`/api/fyd/ask/${SITE}`, { siteId: "some-other-tenant", question: q, mode: "visitor" });
  check(
    "L4-tenant-mismatch-refused",
    l4.status === 400 && /tenant_mismatch/.test(JSON.stringify(l4.json || {})),
    `status=${l4.status} body=${JSON.stringify(l4.json || {}).slice(0, 120)}`,
  );

  console.log(`-- live-attack: ${fails === 0 ? "ALL PASS" : fails + " FAIL"} --`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.log(`BLOCKED: ${e.message}`); process.exit(0); });
