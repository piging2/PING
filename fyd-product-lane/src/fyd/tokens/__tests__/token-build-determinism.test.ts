/**
 * Token build determinism: two consecutive builds from the same inputs
 * produce byte-identical outputs. The manifest carries the timestamp, so
 * it is excluded from the comparison; the six compiled artifacts must be
 * identical byte for byte.
 */
import { execFileSync } from "child_process";
import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import * as path from "path";

const TOKENS_DIR = path.join(__dirname, "..", "..", "..", "..", "builder", "tokens");
const OUT_DIR = path.join(TOKENS_DIR, "out");
const BUILD = path.join(TOKENS_DIR, "build.cjs");

const OUTPUTS = [
  "hpp.tokens.css",
  "hpp.tailwind-theme.css",
  "hpp.tokens.ts",
  "coppersmith.tokens.css",
  "coppersmith.tailwind-theme.css",
  "coppersmith.tokens.ts",
];

function sha256(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function buildOnce(): void {
  execFileSync(process.execPath, [BUILD], { cwd: TOKENS_DIR, stdio: "pipe" });
}

describe("token build determinism", () => {
  test(
    "two consecutive builds emit byte-identical artifacts",
    () => {
      buildOnce();
      const first = new Map(OUTPUTS.map((f) => [f, sha256(path.join(OUT_DIR, f))]));
      buildOnce();
      for (const f of OUTPUTS) {
        expect(sha256(path.join(OUT_DIR, f))).toBe(first.get(f));
      }
    },
    180000,
  );

  test("all six expected outputs plus the manifest exist", () => {
    for (const f of [...OUTPUTS, "build-manifest.json"]) {
      expect(existsSync(path.join(OUT_DIR, f))).toBe(true);
    }
  });
});
