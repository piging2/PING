"use strict";
/**
 * Pre-build validation (token-model 8.2 step 1). Fails the build on:
 * - a token missing $value or $type;
 * - a dangling or circular alias;
 * - a primitive id referenced outside semantic-tier definitions
 *   (component-tier files must alias semantic intent, never primitives);
 * - a duplicate token id across a theme's file set.
 *
 * Provisional files (carrying $extensions.fyd.provenance) are reported,
 * not failed: they are flagged in the build manifest instead.
 */
const fs = require("fs");
const { loadTokenFiles, resolveAll, referencedIds } = require("./resolve.cjs");

/** Primitive token ids: color.*, font.serif, font.sans, space.base. */
function isPrimitiveId(id) {
  return (
    id === "color" ||
    id.startsWith("color.") ||
    id === "font.serif" ||
    id === "font.sans" ||
    id.startsWith("font.serif.") ||
    id.startsWith("font.sans.") ||
    id === "space.base" ||
    id.startsWith("space.base.")
  );
}

/**
 * Locked-spec exceptions: component-tier slots that reference a primitive
 * directly because no semantic slot exists. Documented, not silent.
 * hero.scrim: "overlay scrim base; opacity set by variant, never a new
 * color" (token-model 2.1.3 / 2.2.3). The scrim is raw overlay material;
 * inventing a semantic alias for it would fake intent.
 */
const PRIMITIVE_ALLOWLIST = new Set(["hero.scrim"]);

/**
 * Validate one theme's file set.
 * theme: { name, files: [{ path, tier }] }.
 * Returns { errors: string[], provisionalFiles: string[] }.
 */
function validateTheme(theme) {
  const errors = [];
  let flat;
  try {
    flat = loadTokenFiles(theme.files);
  } catch (e) {
    return { errors: [e.message], provisionalFiles: [] };
  }

  for (const [key, tok] of flat) {
    if (tok.value === undefined) {
      errors.push(`${tok.file}: token "${key}" is missing $value`);
    }
    if (tok.type === undefined) {
      errors.push(`${tok.file}: token "${key}" is missing $type`);
    }
  }

  try {
    resolveAll(flat);
  } catch (e) {
    errors.push(e.message);
  }

  for (const [key, tok] of flat) {
    if (tok.tier !== "component") continue;
    if (PRIMITIVE_ALLOWLIST.has(key)) continue;
    for (const ref of referencedIds(tok.value)) {
      if (isPrimitiveId(ref)) {
        errors.push(
          `${tok.file}: component-tier token "${key}" references primitive {${ref}}; ` +
            `component slots must alias semantic intent`,
        );
      }
    }
  }

  const provisionalFiles = [];
  for (const record of theme.files) {
    const data = JSON.parse(fs.readFileSync(record.path, "utf8"));
    const ext = data.$extensions || {};
    if (ext["fyd.provenance"] && ext["fyd.provenance"] !== "observed") {
      provisionalFiles.push({
        file: record.path,
        provenance: ext["fyd.provenance"],
        fillBy: ext["fyd.fill-by"] || "unknown",
      });
    }
  }

  return { errors, provisionalFiles };
}

module.exports = { validateTheme, isPrimitiveId, PRIMITIVE_ALLOWLIST };
