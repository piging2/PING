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
 * CSS math-function guard (see validateTheme): extract the inner bodies
 * of clamp()/calc()/min()/max() calls, then find unitless non-zero
 * numbers inside them.
 */
const MATH_FN_RE = /\b(?:clamp|calc|min|max)\(/i;

function mathFnBodies(value) {
  const bodies = [];
  const re = /\b(?:clamp|calc|min|max)\(/gi;
  let m;
  while ((m = re.exec(value)) !== null) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < value.length && depth > 0; i++) {
      if (value[i] === "(") depth++;
      else if (value[i] === ")") depth--;
    }
    bodies.push(value.slice(m.index + m[0].length, i - 1));
  }
  return bodies;
}

function unitlessNonZero(body) {
  const bad = [];
  const re = /(\d+(?:\.\d+)?)([a-z%]*)/gi;
  let m;
  while ((m = re.exec(body)) !== null) {
    if (m[2] === "" && Number(m[1]) !== 0) bad.push(m[1]);
  }
  return bad;
}

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

  // CSS math functions (clamp/calc/min/max) reject unitless non-zero
  // numbers: `clamp(44, 6vw + 16, 72)` is invalid CSS and the browser
  // drops the whole declaration (this exact bug shipped the hero
  // headline at body-copy size). Fail the build instead of shipping a
  // silently-dead declaration.
  for (const [key, tok] of flat) {
    if (typeof tok.value !== "string") continue;
    if (!MATH_FN_RE.test(tok.value)) continue;
    for (const body of mathFnBodies(tok.value)) {
      const bad = unitlessNonZero(body);
      if (bad.length > 0) {
        errors.push(
          `${tok.file}: token "${key}" has unitless number(s) ${bad.join(", ")} inside CSS math; ` +
            `unitless non-zero values are invalid CSS and browsers drop the declaration`,
        );
      }
    }
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
