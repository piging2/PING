// One-shot: build preview derivatives + manifest from an existing PNG screenshot.
// Mirrors src/fyd/preview/capture.ts manifest shape. Copied to repo root as
// .tmp-capture-from-png.ts and run with: npx tsx .tmp-capture-from-png.ts
// Reason for separate path: playwright's bundled chromium-headless-shell cannot
// launch on this host (missing libnspr4.so); the screenshot was taken with the
// installed Chrome (headless=new) at the identical URL and 1440x900 viewport.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateDerivatives, hashContentBytes } from "./src/fyd/media/derivatives";
import { resolveFocal } from "./src/fyd/preview/focal";

const PNG = "/mnt/c/Users/nolan/fyd-spatial-capture/hpp-full.png";
const URL = "https://happy-place-platform.vercel.app/";
const OBJECT_ID = "happy-place";

async function main() {
  const shot = readFileSync(PNG);
  const digest = hashContentBytes(shot);
  const repoRoot = process.cwd();
  const publicDir = join(repoRoot, "public", "fyd-media");
  const generated = await generateDerivatives(Buffer.from(shot), digest, publicDir);
  const webp = generated.variants.filter((v) => v.format === "webp");
  const sorted = [...webp].sort((a, b) => a.width - b.width);
  const engaged = sorted.find((v) => v.width >= 800) ?? sorted[sorted.length - 1];
  const thumb = sorted[0] ?? engaged;
  const srcSet = sorted.map((v) => `${v.url} ${v.width}w`).join(", ");
  const focal = resolveFocal({});
  const manifest = {
    src: engaged.url,
    srcSet,
    thumbSrc: thumb.url,
    width: engaged.width,
    height: engaged.height,
    focalX: focal.focal.x,
    focalY: focal.focal.y,
    basis: focal.basis,
    provenance: {
      source: "website-snapshot",
      capturedAt: new Date().toISOString(),
      captureMethod: "chrome-headless-screenshot",
      captureNote:
        "playwright bundled chromium-headless-shell missing libnspr4.so on this host; captured with installed Chrome headless=new at identical URL and 1440x900 viewport",
      digest,
      url: URL,
    },
  };
  const manifestDir = join(repoRoot, "src", "fyd", "preview", "manifests");
  mkdirSync(manifestDir, { recursive: true });
  writeFileSync(
    join(manifestDir, OBJECT_ID + ".json"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  console.log(`OK objectId=${OBJECT_ID} digest=${digest.slice(0, 12)} engaged=${engaged.url}`);
}

main().catch((e) => {
  console.error("derivative build failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
