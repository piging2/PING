/**
 * Shape C falsification tests (2026-09-27).
 *
 * All three falsification bars from the brief:
 *  1. The page's projection renders the known Lane D acceptance mission
 *     mc-m-63d04f4517f9 (tenant happy-place) correctly.
 *  2. Scratch-journal projection is deterministic across runs
 *     (byte-identical output).
 *  3. Journal mtime + size + bytes are UNCHANGED across renders
 *     (proves zero writes — the observer mints no events).
 *
 * The fixture journal is a scratch COPY of the checked-in JSONL, pointed at
 * via MC_JOURNAL_PATH, so the checked-in file is never mutated by the test.
 */
import { copyFileSync, mkdtempSync, readFileSync, statSync } from "fs";
import { createHash } from "crypto";
import { tmpdir } from "os";
import { join } from "path";

const sha256 = (s: string | Buffer) =>
  createHash("sha256").update(s).digest("hex");

const FIXTURE = join(__dirname, "shapec-fixture-events.jsonl");
const ACCEPTANCE_MISSION = "mc-m-63d04f4517f9";
const OTHER_MISSION = "mc-m-a1b2c3d4e5f6";

function loadLib(): any {
  let lib: any;
  jest.isolateModules(() => {
    lib = require("@/app/api/mc/_lib/mc-dispatch");
  });
  return lib;
}

describe("Shape C read-only mission observer", () => {
  let journalPath: string;

  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), "shapec-journal-"));
    journalPath = join(dir, "events.jsonl");
    copyFileSync(FIXTURE, journalPath);
    process.env.MC_JOURNAL_PATH = journalPath;
  });

  afterEach(() => {
    delete process.env.MC_JOURNAL_PATH;
  });

  test("renders the Lane D acceptance mission mc-m-63d04f4517f9 correctly", () => {
    const lib = loadLib();
    const missions = lib.projectMissions(lib.loadJournalEvents());
    const m = missions.find((x: any) => x.mission_id === ACCEPTANCE_MISSION);
    expect(m).toBeDefined();
    expect(m.status).toBe("SUCCEEDED");
    expect(m.tenant).toBe("happy-place");
    expect(m.agent).toBe("ollama");
    expect(m.capability).toBe("text.transform");
    expect(m.run_id).toBe(ACCEPTANCE_MISSION + "-r1");
    expect(m.execution_id).toBe(ACCEPTANCE_MISSION + "-x1");
    expect(m.work_order_id).toBe("4c2f9a1b7d3e5f06");
    expect(m.context_pack_id).toBe("mc-ctx-" + ACCEPTANCE_MISSION);
    expect(m.artifacts).toHaveLength(4);
    expect(m.events).toHaveLength(9);
    expect(m.result.outcome).toBe("completed");
    expect(m.reconciliation_state).toBeNull();
  });

  test("tenant filter is exact: slugs never leak into each other", () => {
    const lib = loadLib();
    const missions = lib.projectMissions(lib.loadJournalEvents());
    const hp = missions.filter((x: any) => x.tenant === "happy-place");
    const cp = missions.filter(
      (x: any) => x.tenant === "coppersmith-plumbing",
    );
    expect(hp.map((x: any) => x.mission_id)).toEqual([ACCEPTANCE_MISSION]);
    expect(cp.map((x: any) => x.mission_id)).toEqual([OTHER_MISSION]);
    expect(cp[0].status).toBe("DENIED");
  });

  test("scratch-journal projection is deterministic across runs (byte-identical)", () => {
    const lib = loadLib();
    const p1 = JSON.stringify(lib.projectMissions(lib.loadJournalEvents()));
    const p2 = JSON.stringify(lib.projectMissions(lib.loadJournalEvents()));
    expect(p1).toBe(p2);
    expect(sha256(p1)).toBe(sha256(p2));
    expect(sha256(p1)).toHaveLength(64);
  });

  test("journal file is untouched by renders: bytes, size, and mtime unchanged", () => {
    const lib = loadLib();
    const before = statSync(journalPath);
    const hashBefore = sha256(readFileSync(journalPath));
    lib.projectMissions(lib.loadJournalEvents());
    lib.projectMissions(lib.loadJournalEvents());
    const after = statSync(journalPath);
    const hashAfter = sha256(readFileSync(journalPath));
    expect(hashAfter).toBe(hashBefore); // zero writes: bytes identical
    expect(after.size).toBe(before.size);
    expect(after.mtimeMs).toBe(before.mtimeMs); // mtime unchanged
  });

  test("the observer page never imports the emit path", () => {
    const src = readFileSync(join(__dirname, "..", "page.tsx"), "utf8");
    // Collect full import statements (multi-line blocks included).
    const importSrc = (src.match(/^import[\s\S]*?;$/gm) || []).join("\n");
    expect(importSrc).not.toMatch(
      /appendDispatchEvent|writeArtifact|publishArtifact/,
    );
    expect(importSrc).toMatch(/loadJournalEvents/);
    expect(importSrc).toMatch(/projectMissions/);
  });
});
