/**
 * r2-cache.ts: content-addressed artifact cache (LANE-CHAOS R2, probe P3).
 *
 * Models the incremental harness's digest-addressed trust: an entry is only
 * ever served after its bytes verify against the committed digest.
 *   - put(bytes): digest = sha256(bytes); file store/<digest>, tmp+rename.
 *   - get(key, recompute): read store/<digest>; if bytes are missing OR
 *     sha256(bytes) != digest -> the entry is CORRUPT: move it to
 *     quarantine/<digest>.corrupt (+ .reason.txt), recompute fresh bytes from
 *     source, commit, and serve only the verified fresh bytes. Corrupt bytes
 *     are never returned to any caller.
 *
 * Modes: init | corrupt | read-all
 *   node r2-cache.ts --store <dir> --fixture <fixture.json> --mode init
 *   node r2-cache.ts --store <dir> --fixture <fixture.json> --mode corrupt --key <object-id>
 *   node r2-cache.ts --store <dir> --fixture <fixture.json> --mode read-all --report <report.json>
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";
import { canonicalize } from "../compilation/runner/lib.ts";

function arg(name: string, def?: string): string {
  const i = process.argv.indexOf(name);
  if (i >= 0 && i + 1 < process.argv.length) return process.argv[i + 1];
  if (def !== undefined) return def;
  console.error(`missing required arg ${name}`);
  process.exit(2);
}

const STORE = arg("--store");
const FIXTURE = arg("--fixture");
const MODE = arg("--mode");
const ART = path.join(STORE, "artifacts");
const QUAR = path.join(STORE, "quarantine");
const INDEX = path.join(STORE, "index.json");

const sha256Hex = (b: Buffer | string): string =>
  crypto.createHash("sha256").update(b).digest("hex");

/** Canonical entry bytes for an object: the unit the cache trusts. */
function entryBytes(obj: any): Buffer {
  return Buffer.from(canonicalize({ id: obj.id, schema: obj.schema, fields: obj.fields ?? {} }), "utf8");
}

function loadFixture(): any[] {
  const data = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
  return data.graph.objects;
}

function put(bytes: Buffer): string {
  const d = sha256Hex(bytes);
  const p = path.join(ART, d);
  if (!fs.existsSync(p)) {
    const tmp = `${p}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, bytes);
    fs.renameSync(tmp, p);
  }
  return d;
}

function writeIndex(idx: Record<string, string>): void {
  const tmp = `${INDEX}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(idx, null, 1) + "\n");
  fs.renameSync(tmp, INDEX);
}

let recomputeCalls = 0;
function get(key: string, digest: string, recompute: () => Buffer): { bytes: Buffer; status: string } {
  const p = path.join(ART, digest);
  const verify = (b: Buffer): boolean => sha256Hex(b) === digest;
  if (fs.existsSync(p)) {
    const b = fs.readFileSync(p);
    if (verify(b)) return { bytes: b, status: "ok" };
    // CORRUPT: detected on read, never trusted.
    const q = path.join(QUAR, `${digest}.corrupt`);
    fs.renameSync(p, q);
    fs.writeFileSync(`${q}.reason.txt`,
      `digest mismatch on read: committed ${digest}, stored bytes hash ${sha256Hex(b)}\n`);
  }
  recomputeCalls++;
  const fresh = recompute();
  if (!verify(fresh)) throw new Error(`recompute for ${key} does not match committed digest`);
  put(fresh);
  return { bytes: fresh, status: "recomputed" };
}

async function main(): Promise<void> {
  fs.mkdirSync(ART, { recursive: true });
  fs.mkdirSync(QUAR, { recursive: true });
  const objects = loadFixture();

  if (MODE === "init") {
    const idx: Record<string, string> = {};
    for (const o of objects) idx[o.id] = put(entryBytes(o));
    writeIndex(idx);
    console.log(JSON.stringify({ mode: "init", entries: objects.length }));
  } else if (MODE === "corrupt") {
    const key = arg("--key");
    const idx = JSON.parse(fs.readFileSync(INDEX, "utf8"));
    const d: string = idx[key];
    if (!d) { console.error(`unknown key ${key}`); process.exit(2); }
    const p = path.join(ART, d);
    const b = fs.readFileSync(p);
    const mid = Math.floor(b.length / 2); // flip bytes mid-file: worst case, not just tail
    b[mid] = b[mid] ^ 0xff;
    b[mid + 1] = b[mid + 1] ^ 0xff;
    fs.writeFileSync(p, b);
    console.log(JSON.stringify({ mode: "corrupt", key, digest: d.slice(0, 16) }));
  } else if (MODE === "read-all") {
    const reportPath = arg("--report");
    const idx: Record<string, string> = JSON.parse(fs.readFileSync(INDEX, "utf8"));
    const byId = new Map(objects.map((o) => [o.id, o]));
    const rows: any[] = [];
    let servedCorrupt = false;
    for (const [key, d] of Object.entries(idx)) {
      const r = get(key, d, () => entryBytes(byId.get(key)));
      const servedDigest = sha256Hex(r.bytes);
      if (servedDigest !== d) servedCorrupt = true; // must never happen
      rows.push({ key, status: r.status, served_digest_ok: servedDigest === d });
    }
    const quarantined = fs.readdirSync(QUAR).filter((f) => f.endsWith(".corrupt"));
    const report = {
      mode: "read-all",
      entries: rows.length,
      ok: rows.filter((r) => r.status === "ok").length,
      recomputed: rows.filter((r) => r.status === "recomputed").length,
      recompute_calls: recomputeCalls,
      quarantined: quarantined,
      served_corrupt: servedCorrupt,
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 1) + "\n");
    console.log(JSON.stringify(report));
  } else {
    console.error(`unknown mode ${MODE}`);
    process.exit(2);
  }
}

main().catch((e) => { console.error("CACHE_FATAL", e?.message ?? e); process.exit(1); });
