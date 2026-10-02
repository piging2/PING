/**
 * Pure SiteSpec patch application. Deep-clones the spec, applies ops in
 * order, returns the new spec. Never mutates its input; never touches the
 * filesystem.
 *
 * This is the single implementation both the draft step (to compute the
 * afterDigest) and the apply step use, so the digest the owner approved
 * is always the digest of what gets applied.
 */

import type { FYDSiteSpec } from "../../sitespec/src/types";
import { deepClone } from "./clone";
import { deepEqual } from "./compiler";
import type { SiteSpecPatchOp } from "./types";

function cloneSpec(spec: FYDSiteSpec): FYDSiteSpec {
  return deepClone(spec) as FYDSiteSpec;
}

/**
 * Apply ops to a spec. Throws on a stale `before` (the caller is expected
 * to have run validatePatch first; the throw is a defensive invariant,
 * not a user-facing path).
 */
export function applyPatchToSpec(spec: FYDSiteSpec, ops: SiteSpecPatchOp[]): FYDSiteSpec {
  const next = cloneSpec(spec);
  for (const op of ops) {
    const page = next.pages.find((p) => p.slug === op.pageSlug);
    if (!page) throw new Error("applyPatchToSpec: page '" + op.pageSlug + "' missing.");
    if (op.op === "reorder_section") {
      const current = page.sections.map((s) => s.id);
      if (!deepEqual(current, op.before)) {
        throw new Error("applyPatchToSpec: stale before at " + op.path + ".");
      }
      const byId = new Map(page.sections.map((s) => [s.id, s] as const));
      page.sections = op.after.map((id) => {
        const s = byId.get(id);
        if (!s) throw new Error("applyPatchToSpec: unknown section id '" + id + "'.");
        return s;
      });
      continue;
    }
    const section = page.sections.find((s) => s.id === op.sectionId);
    if (!section) {
      throw new Error("applyPatchToSpec: section '" + op.sectionId + "' missing.");
    }
    if (op.op === "set_visibility") {
      const current = section.presentation.hidden === true;
      if (current !== op.before) {
        throw new Error("applyPatchToSpec: stale before at " + op.path + ".");
      }
      section.presentation.hidden = op.after;
      continue;
    }
    // set_component_option
    const current = (section.presentation as Record<string, unknown>)[op.option] ?? null;
    if (!deepEqual(current ?? null, op.before ?? null)) {
      throw new Error("applyPatchToSpec: stale before at " + op.path + ".");
    }
    if (op.after === null || op.after === undefined) {
      delete (section.presentation as Record<string, unknown>)[op.option];
    } else {
      (section.presentation as Record<string, unknown>)[op.option] = JSON.parse(
        JSON.stringify(op.after),
      );
    }
  }
  return next;
}
