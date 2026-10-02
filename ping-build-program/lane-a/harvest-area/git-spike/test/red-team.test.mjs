/**
 * LANE A acceptance gauntlet (subset): crafted fixture repos through the
 * REAL ingestion pipeline. Maps to GIT-INGESTION-THREATS.md tests.
 *
 * G-01 malformed tree | G-02 submodule bomb (opaque) | G-04 pack bomb lite
 * G-07 author spoofing | G-08 signature semantics (unsigned) | G-09 STALE race
 * G-10 symlink escape | G-11 config smuggling | G-13 metadata injection
 * G-14 ref confusion | G-15 no-execution lint (see test/lint.test.mjs)
 * G-16 cap centralization | idempotency | incremental cursor
 *
 * Run: node --test test/
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildPacket, refSnapshot, detectStale } from "../src/packet.mjs";
import { ingest } from "../src/cursor.mjs";
import { git } from "../src/git-runner.mjs";
import { CAPS } from "../src/config.mjs";
import { sanitizeMeta, validateTreePath, neutralizeBidi } from "../src/model.mjs";

const EMPTY_BLOB = "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391";

/* ---------- fixture plumbing (trusted local construction, not ingestion) --- */

function sh(cwd, args, input) {
  return new Promise((resolve, reject) => {
    const child = execFile("git", args, { cwd, timeout: 60000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`fixture git ${args.join(" ")} failed: ${String(stderr).slice(0, 300)}`));
      else resolve(stdout.toString());
    });
    if (input !== undefined) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

async function bareRepo() {
  const d = mkdtempSync(join(tmpdir(), "gt-"));
  const repo = join(d, "repo.git");
  await sh(d, ["init", "--bare", "-q", "repo.git"]);
  await sh(repo, ["config", "user.name", "fixture"]);
  await sh(repo, ["config", "user.email", "fixture@example.com"]);
  const g = (args, input) => sh(repo, args, input);
  return { dir: d, repo, g };
}

async function hashBlob(fx, content) {
  return (await fx.g(["hash-object", "-w", "--stdin"], content)).trim();
}

async function hashTree(fx, entries) {
  // entries: [{mode, name, shaHex}]. Git fsck-enforces tree sort order on
  // write, so sort byte-wise by name (flat entries; no subtree "/" quirk).
  const sorted = [...entries].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const parts = [];
  for (const e of sorted) {
    parts.push(Buffer.from(`${e.mode} ${e.name}\0`, "utf8"));
    parts.push(Buffer.from(e.shaHex, "hex"));
  }
  return (await fx.g(["hash-object", "-t", "tree", "-w", "--stdin"], Buffer.concat(parts))).trim();
}

async function hashCommit(fx, { tree, parents = [], author, message }) {
  const a = author ?? "Fixture <fixture@example.com> 1720000000 +0000";
  let raw = `tree ${tree}\n`;
  for (const p of parents) raw += `parent ${p}\n`;
  raw += `author ${a}\ncommitter ${a}\n\n${message}\n`;
  return (await fx.g(["hash-object", "-t", "commit", "-w", "--stdin"], raw)).trim();
}

/**
 * Raw object writer: the attacker's path. Modern git fsck-validates objects
 * written via `git hash-object -w`, so a hostile tree (unsorted, dotdot
 * entries, empty names) must be written below the plumbing, exactly as a
 * real attacker would with a raw object writer or a crafted pack.
 */
function writeRawObject(repo, type, body) {
  const header = Buffer.from(`${type} ${body.length}\0`, "utf8");
  const store = Buffer.concat([header, Buffer.from(body)]);
  const sha = createHash("sha1").update(store).digest("hex");
  const dir = join(repo, "objects", sha.slice(0, 2));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, sha.slice(2)), deflateSync(store));
  return sha;
}

function rawTree(entries) {
  // entries: [{mode, name, shaHex}] in ATTACKER order (unsorted on purpose)
  const parts = [];
  for (const e of entries) {
    parts.push(Buffer.from(`${e.mode} ${e.name}\0`, "utf8"));
    parts.push(Buffer.from(e.shaHex, "hex"));
  }
  return Buffer.concat(parts);
}

async function commitFile(fx, filename, content, message, author) {
  const blob = await hashBlob(fx, content);
  const tree = await hashTree(fx, [{ mode: "100644", name: filename, shaHex: blob }]);
  let parent = [];
  try {
    parent = [(await fx.g(["rev-parse", "refs/heads/main"])).trim()];
  } catch { /* first commit */ }
  // Preserve prior tree entries on later commits: merge parent tree listing.
  let entries = [{ mode: "100644", name: filename, shaHex: blob }];
  if (parent.length) {
    const parentTree = (await fx.g(["cat-file", "-p", parent[0]])).split("\n")[0].split(" ")[1];
    const ls = await fx.g(["ls-tree", parentTree]);
    for (const line of ls.split("\n")) {
      if (!line) continue;
      const m = line.match(/^(\d{6}) (\w+) ([0-9a-f]{40})\t(.*)$/);
      if (m && m[4] !== filename) entries.push({ mode: m[1], name: m[4], shaHex: m[3] });
    }
  }
  const fullTree = await hashTree(fx, entries);
  const sha = await hashCommit(fx, { tree: fullTree, parents: parent, message, author });
  await fx.g(["update-ref", "refs/heads/main", sha]);
  return sha;
}

/* ------------------------------- G-01 ------------------------------------ */

test("G-01 malformed tree quarantines; no hostile paths reach observations", async () => {
  const fx = await bareRepo();
  const entries = [
    { mode: "100644", name: "..", shaHex: EMPTY_BLOB },
    { mode: "100644", name: "a/b", shaHex: EMPTY_BLOB },
    { mode: "100644", name: ".git", shaHex: EMPTY_BLOB },
    { mode: "100644", name: "", shaHex: EMPTY_BLOB },
    { mode: "100644", name: ".", shaHex: EMPTY_BLOB },
    { mode: "100644", name: "ok.txt", shaHex: EMPTY_BLOB },
  ];
  // Written raw: git's own hash-object -w would fsck-reject this tree.
  const tree = writeRawObject(fx.repo, "tree", rawTree(entries));
  const commitBody = `tree ${tree}\nauthor Fixture <fixture@example.com> 1720000000 +0000\ncommitter Fixture <fixture@example.com> 1720000000 +0000\n\nmalicious tree\n`;
  const commit = writeRawObject(fx.repo, "commit", commitBody);
  await fx.g(["update-ref", "refs/heads/main", commit]);

  const packet = await buildPacket(fx.repo, "g01", "refs/heads/main", null, new Set());
  assert.match(packet.status, /^QUARANTINED:malformed-tree/);
  assert.equal(packet.observations.length, 0, "zero observations from quarantined packet");
  const dumped = JSON.stringify(packet);
  assert.ok(!dumped.includes('"path":"..'), "no dotdot path in packet");
  assert.ok(!dumped.includes("a/b"), "no slash-bearing name echoed");
});

/* ------------------------------- G-02 ------------------------------------ */

test("G-02 submodule bomb: gitlinks stay opaque, hostile URLs never read", async () => {
  const fx = await bareRepo();
  const entries = [];
  for (let i = 0; i < 200; i++) {
    entries.push({ mode: "160000", name: `dep${i}`, shaHex: EMPTY_BLOB });
  }
  const gmUrl = "ssh://-oProxyCommand=touch${TMPDIR:-/tmp}/PWNED/x [evil]";
  const gmUrl2 = "http://169.254.169.254/latest/meta-data/";
  const gmBlob = await hashBlob(fx, `[submodule "a"]\n\turl = ${gmUrl}\n[submodule "b"]\n\turl = ${gmUrl2}\n`);
  entries.push({ mode: "100644", name: ".gitmodules", shaHex: gmBlob });
  const tree = await hashTree(fx, entries);
  const commit = await hashCommit(fx, { tree, message: "submodule bomb" });
  await fx.g(["update-ref", "refs/heads/main", commit]);

  const packet = await buildPacket(fx.repo, "g02", "refs/heads/main", null, new Set());
  assert.equal(packet.status, "OK");
  const links = packet.observations.filter((o) => o.kind === "file_change" && o.is_gitlink);
  assert.equal(links.length, 200);
  for (const l of links) {
    assert.ok(l.blob_after, "gitlink SHA recorded");
  }
  const dumped = JSON.stringify(packet);
  assert.ok(!dumped.includes("ProxyCommand"), "hostile URL never entered observations");
  assert.ok(!dumped.includes("169.254.169.254"), "SSRF URL never entered observations");
  assert.ok(!existsSync("/tmp/PWNED"), "no hook/command side effect");
});

/* ------------------------------- G-04 ------------------------------------ */

test("G-04 pack bomb lite: 1GiB sparse blob truncated by size cap, never read", async () => {
  const fx = await bareRepo();
  const sparse = join(fx.dir, "huge.bin");
  execFileSync("truncate", ["-s", "1G", sparse]);
  const blob = (await fx.g(["hash-object", "-w", sparse])).trim();
  const tree = await hashTree(fx, [{ mode: "100644", name: "huge.bin", shaHex: blob }]);
  const commit = await hashCommit(fx, { tree, message: "huge blob" });
  await fx.g(["update-ref", "refs/heads/main", commit]);

  const packet = await buildPacket(fx.repo, "g04", "refs/heads/main", null, new Set());
  assert.equal(packet.status, "OK");
  const fc = packet.observations.find((o) => o.kind === "file_change" && o.path === "huge.bin");
  assert.ok(fc, "file change recorded");
  assert.equal(fc.blob_after_truncated, true);
  assert.equal(fc.blob_after_size, 1073741824);
  assert.ok(packet.coverage.blobs_truncated >= 1);
});

/* ------------------------------- G-07 ------------------------------------ */

test("G-07 author spoofing: identity stays a claimed_* field, never linked", async () => {
  const fx = await bareRepo();
  await commitFile(fx, "a.txt", "x", "spoofed", "Nolan Geske <nolan@pingsocial.com> 1720000000 +0000");
  const packet = await buildPacket(fx.repo, "g07", "refs/heads/main", null, new Set());
  assert.equal(packet.status, "OK");
  const c = packet.observations.find((o) => o.kind === "commit");
  assert.equal(c.claimed_author.claimed_name, "Nolan Geske");
  assert.equal(c.claimed_author.claimed_email, "nolan@pingsocial.com");
  const dumped = JSON.stringify(packet);
  assert.ok(!/"author"\s*:/.test(dumped), "no bare author field anywhere");
  assert.ok(!/"committer"\s*:/.test(dumped), "no bare committer field anywhere");
  assert.ok(!dumped.includes("identity"), "no identity-linking signal");
});

/* --------------------------- G-08 (unsigned) ------------------------------ */

test("G-08 signature semantics: unsigned commit records the full triple", async () => {
  const fx = await bareRepo();
  await commitFile(fx, "a.txt", "x", "unsigned commit");
  const packet = await buildPacket(fx.repo, "g08", "refs/heads/main", null, new Set());
  const c = packet.observations.find((o) => o.kind === "commit");
  assert.equal(c.signature.signature_present, false);
  assert.equal(c.signature.signature_valid, null);
  assert.equal(c.signature.signer_trusted, false);
  assert.ok(!JSON.stringify(packet).includes('"verified"'), "no collapsed verified bit");
});

/* ------------------------------- G-09 ------------------------------------ */

test("G-09 STALE protocol: unit detector + race produces only consistent-or-STALE packets", async () => {
  const fx = await bareRepo();
  const c1 = await commitFile(fx, "a.txt", "1", "c1");
  const s1 = await refSnapshot(fx.repo);
  const c2 = await commitFile(fx, "a.txt", "2", "c2");
  const s2 = await refSnapshot(fx.repo);
  assert.equal(detectStale(s1, s1), false);
  assert.equal(detectStale(s1, s2), true);

  // Race: background force-push loop while ingesting repeatedly.
  let stop = false;
  const racer = (async () => {
    let n = 0;
    while (!stop) {
      const blob = await hashBlob(fx, `v${n}`);
      const tree = await hashTree(fx, [{ mode: "100644", name: "a.txt", shaHex: blob }]);
      const c = await hashCommit(fx, { tree, message: `race ${n}` });
      await fx.g(["update-ref", "refs/heads/main", c]);
      n++;
      await new Promise((r) => setTimeout(r, 20));
    }
  })();
  try {
    for (let i = 0; i < 15; i++) {
      const p = await buildPacket(fx.repo, "g09", "refs/heads/main", null, new Set());
      if (p.status === "OK") {
        assert.equal(detectStale(p.ref_snapshot, p.ref_snapshot_end), false,
          "OK packet must be internally consistent");
      } else {
        assert.match(p.status, /^(STALE|QUARANTINED:)/, "non-OK packet is typed");
      }
    }
  } finally {
    stop = true;
    await racer;
  }
});

/* ------------------------------- G-10 ------------------------------------ */

test("G-10 symlink escape: target recorded as data, never resolved", async () => {
  const fx = await bareRepo();
  const secret = join(fx.dir, "secret.txt");
  const secretContent = `SECRET-${Math.random().toString(36).slice(2)}`;
  writeFileSync(secret, secretContent);
  const linkBlob = await hashBlob(fx, secret); // target path as blob content
  const entries = [
    { mode: "120000", name: "evil-link", shaHex: linkBlob },
    { mode: "120000", name: "proc-link", shaHex: await hashBlob(fx, "/proc/self/environ") },
  ];
  const tree = await hashTree(fx, entries);
  const commit = await hashCommit(fx, { tree, message: "symlinks" });
  await fx.g(["update-ref", "refs/heads/main", commit]);

  const packet = await buildPacket(fx.repo, "g10", "refs/heads/main", null, new Set());
  assert.equal(packet.status, "OK");
  const links = packet.observations.filter((o) => o.kind === "file_change" && o.is_symlink);
  assert.equal(links.length, 2);
  assert.equal(links[0].symlink_target, secret);
  const dumped = JSON.stringify(packet);
  assert.ok(!dumped.includes(secretContent), "secret file content never entered the packet");
  // Nothing but the file_change observation may reference the target.
  const refs = packet.observations.filter((o) => o.kind !== "file_change" && JSON.stringify(o).includes(secret));
  assert.equal(refs.length, 0);
});

/* ------------------------------- G-11 ------------------------------------ */

test("G-11 config smuggling: repo config/hooks never execute", async () => {
  const fx = await bareRepo();
  await fx.g(["config", "core.hooksPath", join(fx.repo, "hooks-evil")]);
  mkdirSync(join(fx.repo, "hooks-evil"), { recursive: true });
  const marker = join(fx.dir, "PWNED-BY-HOOK");
  writeFileSync(join(fx.repo, "hooks-evil", "post-checkout"), `#!/bin/sh\ntouch ${marker}\n`);
  await fx.g(["config", "core.fsmonitor", "touch /tmp/PWNED-BY-FSMONITOR"]);
  await commitFile(fx, ".gitattributes", "*.bin filter=evil\n", "attrs");
  await commitFile(fx, "x.bin", "binary", "bin");
  const packet = await buildPacket(fx.repo, "g11", "refs/heads/main", null, new Set());
  assert.equal(packet.status, "OK");
  assert.ok(!existsSync(marker), "hook payload never executed");
  assert.ok(!existsSync("/tmp/PWNED-BY-FSMONITOR"), "fsmonitor never executed");
  const dumped = JSON.stringify(packet);
  // .gitattributes appears only as a path string; its driver declarations are
  // never read as config (blob contents are never ingested).
  assert.ok(!dumped.includes("filter=evil"), "filter driver text never entered observations");
});

/* ------------------------------- G-13 ------------------------------------ */

test("G-13 metadata injection: ANSI stripped, bidi neutralized, message capped", async () => {
  const fx = await bareRepo();
  const evil = "hello\x1b[2J\x1b]0;pwned\x07[INFO] INGEST OK\nsecond line";
  const big = "A".repeat(2 * 1024 * 1024);
  const blob = await hashBlob(fx, "x");
  const evilName = "ab\u202Ecd.txt";
  const tree = await hashTree(fx, [
    { mode: "100644", name: evilName, shaHex: blob },
  ]);
  const commit = await hashCommit(fx, { tree, message: evil + "\n" + big });
  await fx.g(["update-ref", "refs/heads/main", commit]);

  const packet = await buildPacket(fx.repo, "g13", "refs/heads/main", null, new Set());
  assert.equal(packet.status, "OK");
  const dumped = JSON.stringify(packet);
  assert.ok(!dumped.includes("\x1b"), "no raw ESC byte in structured packet");
  // The forged text may survive INSIDE a quoted JSON string field (it is data,
  // not a log line); the spike emits no log stream, so there is no log to forge.
  const c = packet.observations.find((o) => o.kind === "commit");
  assert.ok(c.message.endsWith("[truncated: exceeded metadata cap]"), "message capped with marker");
  const fc = packet.observations.find((o) => o.kind === "file_change");
  assert.ok(!fc.path.includes("\u202E"), "bidi override neutralized in path");
  assert.ok(fc.path.includes("�"), "neutralization is visible");
  assert.equal(fc.name_neutralized, true);
});

/* ------------------------------- G-14 ------------------------------------ */

test("G-14 ref confusion: symref cycle quarantines, cursor never advances", async () => {
  const fx = await bareRepo();
  const c1 = await commitFile(fx, "a.txt", "x", "c1"); // also points refs/heads/main at c1
  await fx.g(["symbolic-ref", "refs/heads/a", "refs/heads/b"]);
  await fx.g(["symbolic-ref", "refs/heads/b", "refs/heads/a"]);
  // The cycle is VISIBLE to our enumeration (git's own for-each-ref/show-ref
  // silently omit unresolvable symrefs) and becomes a typed quarantine,
  // never a silent skip and never an infinite follow.
  const packet = await buildPacket(fx.repo, "g14", "refs/heads/a", null, new Set());
  assert.equal(packet.status, "QUARANTINED:ref-cycle-detected");
  assert.ok(packet.quarantine_detail.includes("refs/heads/a"));
  // Per-ref fault isolation: the healthy ref in the same repo still ingests.
  const ok = await buildPacket(fx.repo, "g14", "refs/heads/main", null, new Set());
  assert.equal(ok.status, "OK");
  // Via ingest(): a quarantined packet is returned for audit but never
  // persisted and the cursor does not move.
  const state = join(fx.dir, "state");
  const { result } = await ingest(fx.repo, state, "g14", "refs/heads/a");
  assert.equal(result.cursor_advanced, false);
  assert.ok(!existsSync(join(state, "state", "g14", "cursor.json")), "no cursor for quarantined packet");
});

test("G-14 invalid refname is dropped or quarantined, never trusted", async () => {
  const fx = await bareRepo();
  const c1 = await commitFile(fx, "a.txt", "x", "c1");
  // Plant an invalid loose ref by hand (update-ref would refuse it).
  mkdirSync(join(fx.repo, "refs", "heads"), { recursive: true });
  writeFileSync(join(fx.repo, "refs", "heads", "bad..name"), c1 + "\n");
  let threw = null;
  try {
    await refSnapshot(fx.repo);
  } catch (e) {
    threw = e;
  }
  if (threw) {
    assert.equal(threw.reason, "invalid-refname");
  } else {
    // Per-ref fault isolation: the hostile ref is RECORDED as invalid,
    // never silently trusted, and the healthy ref still snapshots.
    const snap = await refSnapshot(fx.repo);
    assert.ok(snap["refs/heads/bad..name"].invalid, "invalid ref flagged, not trusted");
    assert.equal(snap["refs/heads/main"].sha, c1, "healthy ref unaffected");
    // And it is never emitted as a branch observation...
    const p = await buildPacket(fx.repo, "x", "refs/heads/main", null, new Set());
    assert.equal(p.status, "OK");
    assert.ok(!p.observations.some((o) => o.refname === "refs/heads/bad..name"));
    // ...nor ingestible as a requested ref.
    const q = await buildPacket(fx.repo, "x", "refs/heads/bad..name", null, new Set());
    assert.equal(q.status, "QUARANTINED:invalid-refname");
  }
});

/* --------------------------- idempotency --------------------------------- */

test("same-commit-twice is idempotent: no duplicate canonical knowledge", async () => {
  const fx = await bareRepo();
  const state = join(fx.dir, "state");
  await commitFile(fx, "a.txt", "1", "c1");
  await commitFile(fx, "b.txt", "2", "c2");
  await commitFile(fx, "c.txt", "3", "c3");

  const r1 = await ingest(fx.repo, state, "idem", "refs/heads/main");
  assert.equal(r1.result.status, "OK");
  assert.equal(r1.result.commits_new, 3);
  const lines1 = readFileSync(join(state, "state", "idem", "packets.jsonl"), "utf8").trim().split("\n");

  // Second ingest of the same range: zero new knowledge, no new packet.
  const r2 = await ingest(fx.repo, state, "idem", "refs/heads/main");
  assert.equal(r2.result.status, "OK");
  assert.equal(r2.result.commits_new, 0);
  const lines2 = readFileSync(join(state, "state", "idem", "packets.jsonl"), "utf8").trim().split("\n");
  assert.equal(lines2.length, lines1.length, "no new packet persisted");

  // Cursor rewound by hand, re-ingest: the already-seen commit is skipped.
  const cursorPath = join(state, "state", "idem", "cursor.json");
  const cursor = JSON.parse(readFileSync(cursorPath, "utf8"));
  const parentSha = await new Promise((resolve, reject) => {
    execFile("git", ["--git-dir", fx.repo, "rev-parse", "refs/heads/main~1"], (e, so) =>
      e ? reject(e) : resolve(so.trim()));
  });
  cursor.refs["refs/heads/main"] = parentSha;
  writeFileSync(cursorPath, JSON.stringify(cursor));
  const r3 = await ingest(fx.repo, state, "idem", "refs/heads/main");
  assert.equal(r3.result.status, "OK");
  assert.equal(r3.result.commits_new, 0, "re-ingested range contributes zero new commits");
  assert.equal(r3.result.commits_skipped_seen, 1, "already-seen commit skipped");
  assert.equal(r3.result.cursor_advanced, true, "cursor still advances past consumed range");
  const lines3 = readFileSync(join(state, "state", "idem", "packets.jsonl"), "utf8").trim().split("\n");
  assert.equal(lines3.length, lines1.length, "no new packet for zero-knowledge re-ingest");
  const allPackets = lines3.map(JSON.parse);
  const commitObs = allPackets.flatMap((p) => p.observations.filter((o) => o.kind === "commit").map((o) => o.sha));
  assert.equal(commitObs.length, 3, "knowledge holds exactly the 3 commits");
  assert.equal(new Set(commitObs).size, commitObs.length, "no duplicate commit observations");
});

/* --------------------------- incremental --------------------------------- */

test("incremental OLD HEAD -> NEW HEAD ingests only the delta", async () => {
  const fx = await bareRepo();
  const state = join(fx.dir, "state");
  const c1 = await commitFile(fx, "a.txt", "1", "c1");
  const r1 = await ingest(fx.repo, state, "incr", "refs/heads/main");
  assert.equal(r1.result.old_head, null);
  assert.equal(r1.result.new_head, c1);

  const c2 = await commitFile(fx, "b.txt", "2", "c2");
  const r2 = await ingest(fx.repo, state, "incr", "refs/heads/main");
  assert.equal(r2.result.old_head, c1);
  assert.equal(r2.result.new_head, c2);
  assert.equal(r2.result.commits_new, 1);
  const commits = r2.packet.observations.filter((o) => o.kind === "commit").map((o) => o.sha);
  assert.deepEqual(commits, [c2]);
});

/* --------------------------- runner gates -------------------------------- */

test("runner refuses non-allowlisted subcommands and banned tokens", async () => {
  const fx = await bareRepo();
  await assert.rejects(() => git(fx.repo, "checkout", ["main"]), /not allowlisted/);
  await assert.rejects(() => git(fx.repo, "rev-list", ["--recurse-submodules", "HEAD"]), /banned token/);
  await assert.rejects(() => git(fx.repo, "clone", ["x"]), /not allowlisted/);
});

/* --------------------------- G-16 caps ----------------------------------- */

test("G-16 caps live in the single config module with expected values", async () => {
  assert.equal(CAPS.maxBlobBytes, 64 * 1024 * 1024);
  assert.equal(CAPS.maxPacketBytes, 1024 * 1024 * 1024);
  assert.equal(CAPS.maxCommitsPerPacket, 10000);
  assert.equal(CAPS.maxSymrefHops, 5);
  assert.equal(CAPS.maxMessageBytes, 10 * 1024);
  // No hardcoded byte-count duplicates elsewhere in src.
  const srcDir = new URL("../src/", import.meta.url).pathname;
  for (const f of readdirSync(srcDir)) {
    if (f === "config.mjs" || !f.endsWith(".mjs")) continue;
    const body = readFileSync(join(srcDir, f), "utf8");
    assert.ok(!body.includes("67108864"), `${f} hardcodes 64MiB`);
    assert.ok(!body.includes("1073741824"), `${f} hardcodes 1GiB`);
  }
});

/* --------------------------- model unit ---------------------------------- */

test("model: sanitize/validate/neutralize units", () => {
  assert.equal(sanitizeMeta("a\x1bb", 100), "ab");
  assert.ok(sanitizeMeta("x".repeat(200), 100).endsWith("[truncated: exceeded metadata cap]"));
  assert.equal(validateTreePath("ok/path.txt"), null);
  assert.equal(validateTreePath("../escape"), "has-dotdot");
  assert.equal(validateTreePath("a/.git"), "has-dotgit");
  assert.equal(validateTreePath("a/b"), null);
  const n = neutralizeBidi("ab\u202Ecd");
  assert.equal(n.neutralized, true);
  assert.ok(!n.text.includes("\u202E"));
});
