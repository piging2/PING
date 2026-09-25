#!/usr/bin/env node
"use strict";
/**
 * FYD token build orchestrator (token-model 8.2, exact order):
 *   1. Validate: aliases resolve, $value/$type present, no primitive id
 *      outside semantic-tier definitions. Failure stops the build.
 *   2. Contrast gate: WCAG 2.2 AA on the section-7 pairs. A failing pair
 *      fails the build with the pair named (hard disqualification gate).
 *   3. Style Dictionary v4 build, one instance per theme (v4 loads tokens
 *      once per instance; per-platform `source` is not honored): css
 *      variables + tailwind @theme + typed TS per theme.
 *   4. build-manifest.json: input hashes, versions, timestamp,
 *      provisional flags, gate results, output hashes. The determinism
 *      receipt: same inputs -> byte-identical outputs.
 *
 * Determinism: emitted files carry no timestamps and no random ordering;
 * the timestamp lives only in the manifest.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const HERE = __dirname;
const OUT_DIR = path.join(HERE, "out");

const { THEME_SOURCES } = require("./lib/theme-sources.cjs");
const { validateTheme } = require("./lib/validate-tokens.cjs");
const { runContrastGate } = require("./lib/contrast-gate.cjs");

const DTCG_VERSION = "2025.10";

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function laneNodeModules() {
  return path.join(HERE, "..", "..", "node_modules");
}

function styleDictionaryVersion() {
  const pkgPath = path.join(laneNodeModules(), "style-dictionary", "package.json");
  return JSON.parse(fs.readFileSync(pkgPath, "utf8")).version;
}

function fail(message) {
  console.error(`[tokens] BUILD FAILED: ${message}`);
  process.exit(1);
}

async function main() {
  // The SD class and the FYD transforms/formats (ESM) load together here.
  const StyleDictionary = require("style-dictionary");
  const shared = await import("./config/style-dictionary.shared.mjs");
  shared.registerFyd(StyleDictionary.default || StyleDictionary);
  const SD = StyleDictionary.default || StyleDictionary;

  const manifest = {
    dtcg: DTCG_VERSION,
    styleDictionary: styleDictionaryVersion(),
    builtAt: new Date().toISOString(),
    themes: {},
    inputs: {},
    outputs: {},
  };

  // Hash every input file first (shared module + formats + libs + token files).
  const inputFiles = [path.join(HERE, "config", "style-dictionary.shared.mjs")];
  for (const dir of ["formats", "lib"]) {
    for (const f of fs.readdirSync(path.join(HERE, dir))) {
      if (f.endsWith(".mjs") || f.endsWith(".cjs")) inputFiles.push(path.join(HERE, dir, f));
    }
  }
  inputFiles.push(path.join(HERE, "build.cjs"));

  for (const [name, theme] of Object.entries(THEME_SOURCES)) {
    // Step 1: validate.
    const { errors, provisionalFiles } = validateTheme(theme);
    if (errors.length > 0) {
      fail(`token validation failed for theme "${name}":\n  - ${errors.join("\n  - ")}`);
    }
    for (const record of theme.files) inputFiles.push(record.path);

    // Step 2: contrast gate.
    const gate = runContrastGate(theme);
    manifest.themes[name] = {
      themeId: theme.themeId,
      provisionalFiles,
      contrastGate: {
        pass: gate.pass,
        pairs: gate.pairs.map((p) => ({
          fg: p.fg,
          bg: p.bg,
          fgHex: p.fgHex,
          bgHex: p.bgHex,
          ratio: p.ratio,
          required: p.required,
          level: p.level,
          pass: p.pass,
        })),
      },
    };
    if (!gate.pass) {
      const lines = gate.failures.map(
        (p) => `  - ${p.fg} on ${p.bg}: ${p.ratio}:1 < ${p.required}:1 (${p.level})`,
      );
      fail(`contrast gate failed for theme "${name}" (WCAG 2.2 AA hard gate):\n${lines.join("\n")}`);
    }
    console.log(`[tokens] theme "${name}": validation ok, contrast gate passed (${gate.pairs.length} pairs)`);

    // Step 3: Style Dictionary build for this theme.
    const sd = new SD({
      source: theme.files.map((r) => r.path),
      platforms: shared.platformsFor(name, OUT_DIR),
      log: { verbosity: "silent" },
    });
    try {
      await sd.buildAllPlatforms();
    } catch (e) {
      fail(`style-dictionary build failed for theme "${name}": ${e.message}`);
    }
  }

  const expectedOutputs = [];
  for (const name of Object.keys(THEME_SOURCES)) {
    expectedOutputs.push(`${name}.tokens.css`, `${name}.tailwind-theme.css`, `${name}.tokens.ts`);
  }
  for (const f of expectedOutputs) {
    if (!fs.existsSync(path.join(OUT_DIR, f))) fail(`expected output missing: out/${f}`);
  }

  // Step 4: manifest. Note: the manifest's own hash is intentionally not
  // recorded inside it (self-hash is circular); the determinism receipt is
  // the input hashes plus the output hashes of the six compiled files.
  for (const f of inputFiles) {
    manifest.inputs[path.relative(HERE, f)] = sha256(f);
  }
  for (const f of expectedOutputs) {
    manifest.outputs[f] = sha256(path.join(OUT_DIR, f));
  }
  const manifestPath = path.join(OUT_DIR, "build-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`[tokens] build ok: ${expectedOutputs.length} outputs, manifest written`);
}

main().catch((e) => fail(e.message));
