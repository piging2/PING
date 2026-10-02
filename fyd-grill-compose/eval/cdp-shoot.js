/**
 * CDP-over-pipe screenshot driver: launches Windows Chrome headless from
 * WSL with --remote-debugging-pipe and captures true viewport-emulated
 * screenshots at mobile widths (headless --window-size floors at 500px,
 * so pipe-driven Emulation.setDeviceMetricsOverride is required).
 * Disposable eval tooling.
 */
const { spawn } = require("node:child_process");
const { writeFileSync, mkdirSync } = require("node:fs");

const CHROME =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = "C:\\Temp\\fyd-eval-profile";
const URL = "file:///C:/Temp/fyd-eval-surface.html";
const OUT = "C:\\Temp\\fyd-eval";

const WIDTHS = [
  [320, 568],
  [375, 812],
  [390, 844],
  [393, 873],
  [430, 932],
  [768, 1024],
  [1440, 900],
];

let nextId = 1;
const pending = new Map();

function send(proc, method, params = {}, sessionId) {
  const id = nextId++;
  const msg = { id, method, params };
  if (sessionId) msg.sessionId = sessionId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    proc.stdio[3].write(JSON.stringify(msg) + "\0");
  });
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const proc = spawn(
    CHROME,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--mute-audio",
      `--user-data-dir=${PROFILE}`,
      "--remote-debugging-pipe",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] },
  );

  let buf = Buffer.alloc(0);
  let sessionId = null;
  let loadResolve = null;

  proc.stdio[4].on("data", (chunk) => {
    buf = Buffer.concat([buf, chunk]);
    let idx;
    while ((idx = buf.indexOf(0)) >= 0) {
      const raw = buf.slice(0, idx).toString("utf8");
      buf = buf.slice(idx + 1);
      if (!raw) continue;
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        continue;
      }
      if (msg.id && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === "Page.loadEventFired" && loadResolve) {
        loadResolve();
      } else if (
        msg.method === "Target.attachedToTarget" &&
        msg.params?.targetInfo?.type === "page"
      ) {
        sessionId = msg.params.sessionId;
      }
    }
  });

  proc.on("error", (e) => {
    console.error("spawn failed", e.message);
    process.exit(1);
  });

  // Attach to the browser target first to learn page targets.
  await send(proc, "Target.setDiscoverTargets", { discover: true });
  await new Promise((r) => setTimeout(r, 1500));
  if (!sessionId) {
    // Fallback: attach explicitly to the first page target.
    const { targetInfos } = await send(proc, "Target.getTargets", {});
    const page = targetInfos.find((t) => t.type === "page");
    if (!page) throw new Error("no page target");
    const res = await send(proc, "Target.attachToTarget", {
      targetId: page.targetId,
      flatten: true,
    });
    sessionId = res.sessionId;
  }

  for (const [w, h] of WIDTHS) {
    await send(
      proc,
      "Emulation.setDeviceMetricsOverride",
      { width: w, height: h, deviceScaleFactor: 2, mobile: true },
      sessionId,
    );
    const loaded = new Promise((r) => (loadResolve = r));
    await send(proc, "Page.navigate", { url: URL }, sessionId);
    await Promise.race([
      loaded,
      new Promise((r) => setTimeout(r, 12000)),
    ]);
    await new Promise((r) => setTimeout(r, 1200));
    const { data } = await send(
      proc,
      "Page.captureScreenshot",
      { format: "png" },
      sessionId,
    );
    writeFileSync(`${OUT}\\w${w}.png`, Buffer.from(data, "base64"));
    console.log(`captured ${w}x${h}`);
  }
  proc.kill();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
