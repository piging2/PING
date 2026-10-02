/**
 * Plain-node DOM interaction driver for the staged MC->FYD wiring patch.
 * (jsdom 30 is ESM-hybrid and cannot load inside jest's CJS registry on this
 * box, so the interaction flows run here under plain node instead.)
 *
 * Exit 0 = all assertions passed. Any failure prints the assertion and exits 1.
 */
"use strict";

const NM = "/home/hatch/workspace/ping-build-program/lane-bcq/harvest/nango/node_modules";
const FNM = "/home/hatch/workspace/fyd-build/node_modules";

// jsdom first (plain node require handles its ESM deps natively on node 24)
const { JSDOM } = require(`${NM}/jsdom`);
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
global.window = dom.window;
global.document = dom.window.document;
Object.defineProperty(global, "navigator", { value: dom.window.navigator, configurable: true });
global.IS_REACT_ACT_ENVIRONMENT = true;

const { act } = require(`${FNM}/react-dom/test-utils`);
const { createRoot } = require(`${FNM}/react-dom/client`);
const R = require(`${FNM}/react`);
const BUILD_DIR = process.env.MC_BUILD_DIR || "/tmp/mc-interact-build";
const TenantMissionControl = require(`${BUILD_DIR}/app/sites/_shared/tenant-mission-control`).default;
console.log("testing build:", BUILD_DIR);

// ---------------------------------------------------------------------------
let failures = 0;
function ok(cond, name, extra) {
  if (cond) {
    console.log(`  PASS ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}${extra ? " :: " + extra : ""}`);
  }
}

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------
const CATALOG = {
  ok: true,
  agents: [
    { id: "ollama", family: "local", status: "ok", allowedCapabilities: ["summarize", "draft"], claim: "proven", claim_note: "zero-spend" },
    { id: "identity_1", family: "copilot", status: "ok", allowedCapabilities: ["code"], claim: "bounded", claim_note: "1-4 only" },
  ],
  tenants: ["happy-place", "coppersmith-plumbing"],
  constraints: { no_network: true },
  prompt_max: 2000,
  deadlines_seconds: { ollama: 120, identity_1: 300 },
};

const MISSIONS = {
  ok: true,
  as_of: "2026-09-27T12:00:00Z",
  missions: [
    { mission_id: "m-hp-1", run_id: "r1", execution_id: "e1", status: "SUCCEEDED", agent: "ollama", tenant: "happy-place", capability: "summarize", work_order_id: "w1", started_at: "t", ended_at: "t", reconciliation_state: null, artifact_count: 4, event_count: 9 },
    { mission_id: "m-cs-1", run_id: "r2", execution_id: "e2", status: "RUNNING", agent: "ollama", tenant: "coppersmith-plumbing", capability: "summarize", work_order_id: "w2", started_at: "t", ended_at: null, reconciliation_state: null, artifact_count: 1, event_count: 3 },
  ],
};

function detailFor(id, status) {
  return {
    ok: true,
    mission: {
      mission_id: id, run_id: "r", execution_id: "e", status, status_event_id: null,
      agent: "ollama", tenant: "happy-place", capability: "summarize",
      capabilities_granted: ["summarize"], work_order_id: "w", context_pack_id: null,
      started_at: "t", ended_at: null,
      result: { outcome: null, output_digest: null, output_chars: null, error: null },
      reconciliation_state: status === "UNKNOWN" ? "RECONCILIATION IN PROGRESS" : null,
      artifacts: [], evidence: [], events: [],
    },
  };
}

let postBodies = [];
let dispatchImpl = () => ({ status: 200, json: {} });
let missionsImpl = null; // override for the missions list GET
let detailFetches = 0; // count of GET /api/mc/missions/<id>

function detailStatusFor(id) {
  if (id === "m-run") return "RUNNING";
  if (id === "m-done") return "SUCCEEDED";
  return "UNKNOWN";
}

global.fetch = async (url, init) => {
  const method = (init && init.method ? init.method : "GET").toUpperCase();
  if (method === "POST") postBodies.push(JSON.parse(String(init.body)));
  let r;
  if (url.endsWith("/api/mc/dispatch") && method === "GET") r = { status: 200, json: CATALOG };
  else if (url.endsWith("/api/mc/missions") && method === "GET") r = { status: 200, json: missionsImpl || MISSIONS };
  else if (/\/api\/mc\/missions\/.+$/.test(url) && method === "GET") {
    detailFetches++;
    const id = decodeURIComponent(url.split("/").pop());
    r = { status: 200, json: detailFor(id, detailStatusFor(id)) };
  }
  else if (url.endsWith("/api/mc/dispatch") && method === "POST") r = dispatchImpl(postBodies[postBodies.length - 1]);
  else throw new Error("unexpected " + method + " " + url);
  return { status: r.status, json: async () => r.json };
};

// ---------------------------------------------------------------------------
async function flush(times = 8) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
  }
}

function text() {
  return document.body.textContent || "";
}

async function mount(tenant) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  await act(async () => {
    root.render(R.createElement(TenantMissionControl, { tenant }));
  });
  await flush();
  return { el, root };
}

async function unmount(root) {
  await act(async () => {
    root.unmount();
  });
  document.body.innerHTML = "";
  postBodies = [];
  missionsImpl = null;
  detailFetches = 0;
}

async function dispatchFlow(tenant, promptText) {
  const { el, root } = await mount(tenant);
  const ta = el.querySelector("textarea");
  await act(async () => {
    // Bypass React's value tracker: use the native prototype setter so the
    // subsequent input event is honored by React's onChange.
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value").set;
    setter.call(ta, promptText);
    ta.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  const btn = Array.from(el.querySelectorAll("button")).find((b) => b.textContent === "Dispatch");
  await act(async () => {
    btn.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  await flush();
  return { el, root };
}

// ---------------------------------------------------------------------------
(async () => {
  console.log("flow 1: catalog-driven form + tenant-filtered missions");
  {
    const { el, root } = await mount("happy-place");
    const selects = el.querySelectorAll("select");
    ok(selects.length === 2, "two selects rendered after catalog", `got ${selects.length}`);
    const agentOpts = Array.from(selects[0].querySelectorAll("option")).map((o) => o.textContent).join(" ");
    ok(agentOpts.includes("ollama") && agentOpts.includes("identity_1"), "agent options come from catalog");
    ok(selects[0].value === "ollama", "ollama defaulted when present", `got ${selects[0].value}`);
    const capOpts = Array.from(selects[1].querySelectorAll("option")).map((o) => o.value);
    ok(JSON.stringify(capOpts) === JSON.stringify(["summarize", "draft"]), "capability options follow selected agent");
    ok(text().includes("2000 chars"), "prompt bounded by catalog prompt_max");
    ok(text().includes("m-hp-1"), "own-tenant mission shown");
    ok(!text().includes("m-cs-1"), "other-tenant mission filtered out");
    const html = el.innerHTML.toLowerCase();
    ok(!html.includes('name="tenant"') && !html.includes('id="tenant"'), "no tenant form control in live DOM");
    await unmount(root);
  }

  console.log("flow 2: 403 dispatch -> DENIED (not failed), fixed tenant in POST");
  {
    dispatchImpl = () => ({ status: 403, json: { status: "DENIED", mission_id: "m-denied-1", reason: "identity_5 not allowed" } });
    const { el, root } = await dispatchFlow("happy-place", "Summarize today's jobs");
    ok(text().includes("DENIED (not failed)"), "DENIED rendered as terminal-informative");
    ok(text().includes("identity_5 not allowed"), "deny reason shown");
    ok(!/dispatch failed/i.test(text()), "never rendered as failed");
    ok(postBodies.length === 1, "exactly one POST issued", `got ${postBodies.length}`);
    ok(postBodies[0] && postBodies[0].tenant === "happy-place", "POST tenant is the page fixed tenant");
    ok(postBodies[0] && postBodies[0].prompt === "Summarize today's jobs", "POST prompt passed through");
    await unmount(root);
  }

  console.log("flow 3: UNKNOWN dispatch -> mandated reconciliation string");
  {
    dispatchImpl = () => ({
      status: 200,
      json: { ok: true, status: "UNKNOWN", mission_id: "m-unk-1", run_id: "r", execution_id: "e", work_order_id: "w", reconciliation_state: "RECONCILIATION IN PROGRESS" },
    });
    const { el, root } = await dispatchFlow("coppersmith-plumbing", "Draft a follow-up");
    ok(text().includes("OUTCOME UNKNOWN — RECONCILIATION IN PROGRESS"), "mandated UNKNOWN string rendered");
    ok(postBodies[0] && postBodies[0].tenant === "coppersmith-plumbing", "POST tenant bound to coppersmith page");
    await unmount(root);
  }

  console.log("flow 4: catalog failure -> error string, no dispatch form");
  {
    const realFetch = global.fetch;
    global.fetch = async () => {
      throw new Error("catalog down");
    };
    const { el, root } = await mount("happy-place");
    ok(text().includes("dispatch catalog unavailable"), "catalog error string rendered");
    ok(el.querySelector("textarea") === null, "no prompt textarea without catalog");
    ok(el.querySelector("select") === null, "no selects without catalog");
    global.fetch = realFetch;
    await unmount(root);
  }

  console.log("flow 5: detail polling follows fetched status, not the stale closure");
  {
    // Two same-tenant missions: one terminal, one running.
    missionsImpl = {
      ok: true,
      as_of: "2026-09-27T12:00:00Z",
      missions: [
        { mission_id: "m-done", run_id: "r1", execution_id: "e1", status: "SUCCEEDED", agent: "ollama", tenant: "happy-place", capability: "summarize", work_order_id: "w1", started_at: "t", ended_at: "t", reconciliation_state: null, artifact_count: 2, event_count: 5 },
        { mission_id: "m-run", run_id: "r2", execution_id: "e2", status: "RUNNING", agent: "ollama", tenant: "happy-place", capability: "summarize", work_order_id: "w2", started_at: "t", ended_at: null, reconciliation_state: null, artifact_count: 1, event_count: 3 },
      ],
    };
    const { el, root } = await mount("happy-place");

    const rowFor = (id) =>
      Array.from(el.querySelectorAll("div")).find(
        (d) => d.textContent.includes(id) && d.style && d.style.cursor === "pointer"
      );
    const selectMission = async (id) => {
      const row = rowFor(id);
      if (!row) throw new Error("no row for " + id);
      await act(async () => {
        row.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      });
      await flush(3); // let the detail fetch land
    };
    // Real-time waits OUTSIDE act so the 5s interval can fire.
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

    // (a) select the terminal mission: one fetch, then silence
    await selectMission("m-done");
    const n1 = detailFetches;
    ok(n1 >= 1, "terminal mission: initial detail fetch fired", `got ${n1}`);
    await sleep(6000);
    await flush(2);
    const n2 = detailFetches;
    ok(n2 === n1, "terminal mission: no polling after first fetch", `n1=${n1} n2=${n2}`);

    // (b) select the running mission: polling must start (the stale-closure
    // bug in the original patch leaves it dead here)
    await selectMission("m-run");
    const n3 = detailFetches;
    ok(n3 === n2 + 1, "running mission: detail refetch on select", `n2=${n2} n3=${n3}`);
    await sleep(6000);
    await flush(2);
    const n4 = detailFetches;
    ok(n4 >= n3 + 1, "running mission: polls every 5s", `n3=${n3} n4=${n4}`);

    // (c) back to the terminal mission: polling must stop (the original bug
    // polls it forever)
    await selectMission("m-done");
    const n5 = detailFetches;
    await sleep(6000);
    await flush(2);
    const n6 = detailFetches;
    ok(n6 === n5, "terminal mission re-selected: polling stopped", `n5=${n5} n6=${n6}`);

    await unmount(root);
  }

  console.log(failures === 0 ? "ALL INTERACTION FLOWS PASS" : `${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("DRIVER ERROR", e);
  process.exit(2);
});
