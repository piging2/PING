#!/usr/bin/env python3
"""Lane D surgical edits for the ping repo. Exact-match replacements only;
every edit asserts its anchor exists exactly once, else aborts loudly.
Idempotent-safe: refuses to run twice (checks for the Lane D markers)."""

import sys

REPO = "/home/nolan/projects/ping"


def edit(path, old, new, count=1, marker=None):
    with open(path) as f:
        src = f.read()
    # Idempotency probe: the FULL new text. A prefix probe (new[:60]) false-
    # skips extension edits where new starts with old. Full-text is exact.
    if new in src:
        print(f"SKIP {path}: already patched")
        return
    n = src.count(old)
    assert n == count, f"{path}: anchor found {n}x, expected {count}x"
    with open(path, "w") as f:
        f.write(src.replace(old, new, count))
    print(f"OK   {path}")


# ---------------------------------------------------------------- 0. owner-mode gate.ts
p = REPO + "/src/fyd/owner-mode/gate.ts"
edit(
    p,
    '''export function isDemoOwnerModeEnabled(): boolean {
  return process.env[DEMO_OWNER_MODE_ENV_VAR] === "1";
}''',
    '''export function isDemoOwnerModeEnabled(): boolean {
  return process.env[DEMO_OWNER_MODE_ENV_VAR] === "1";
}

/**
 * Lane D: the demo-owner network gate. True only for localhost and
 * private-network hosts. The customize approval API refuses anything else:
 * demo-owner mode must never be reachable over a public bind.
 *
 * Ranges: loopback, RFC 1918 (10/8, 172.16/12, 192.168/16), link-local
 * (169.254/16, fe80::/10), IPv6 unique-local (fc00::/7), the Tailscale
 * range 100.64.0.0/10 (carrier-grade NAT space that Tailscale assigns
 * from; the standing demo route is the private Tailscale forward), and
 * .local/.internal/.lan names.
 */
export function isPrivateHost(host: string): boolean {
  const h = host.split(":")[0].trim().toLowerCase().replace(/^\\[|\\]$/g, "");
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  const v4 = h.match(/^(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})\\.(\\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // Tailscale
    if (a === 169 && b === 254) return true; // link-local
    return false;
  }
  if (
    h.startsWith("fc") ||
    h.startsWith("fd") ||
    h.startsWith("fe80:") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".lan")
  )
    return true;
  return false;
}''',
    marker="isPrivateHost",
)

# ---------------------------------------------------------------- 1. demo-owner-mode.tsx
p = REPO + "/src/fyd/owner-mode/demo-owner-mode.tsx"
edit(
    p,
    'import { attest, preconditionsFor } from "./attestation-gate";',
    'import { attest, preconditionsFor } from "./attestation-gate";\n'
    'import { CustomizePanel } from "./customize-panel";',
)
edit(
    p,
    "          ) : null}\n        </div>\n      </div>\n    </section>",
    "          ) : null}\n        </div>\n\n"
    "        <CustomizePanel siteId={siteId} />\n"
    "      </div>\n    </section>",
)

# ---------------------------------------------------------------- 2. ping-object-source.ts
p = REPO + "/src/fyd/data/ping-object-source.ts"
edit(
    p,
    'import {\n'
    '  applyOwnerFieldCorrections,\n'
    '  type OwnerOverlayResult,\n'
    '} from "@/fyd/object/owner-overlay";',
    'import {\n'
    '  applyOwnerFieldCorrections,\n'
    '  type OwnerOverlayResult,\n'
    '} from "@/fyd/object/owner-overlay";\n'
    'import type { PresentationIntentBlock } from "@/fyd/customize/types";',
)
edit(
    p,
    "  graphDigest: string;\n  generatedAt: string;",
    "  graphDigest: string;\n"
    "  generatedAt: string;\n"
    "  /** Optional digest of the presentationIntent block (digest-verified). */\n"
    "  presentationIntentDigest?: string;",
)
edit(
    p,
    "  ownerOverlay: OwnerOverlayResult | null;\n}",
    "  ownerOverlay: OwnerOverlayResult | null;\n"
    "  /**\n"
    "   * Owner-approved presentation-intent directives (the PRESENTATION\n"
    "   * INTENT layer). Digest-verified against meta.presentationIntentDigest.\n"
    "   * Applied OVER the compiled spec at render time; never merged into\n"
    "   * the graph and never part of source verification. Null when the\n"
    "   * projection carries no intent block (older dumps).\n"
    "   */\n"
    "  presentationIntent: PresentationIntentBlock | null;\n}",
)
# validatePresentationIntent goes right after validateMeta.
edit(
    p,
    'function parseAndVerify(\n',
    'function validatePresentationIntent(\n'
    '  raw: unknown,\n'
    '  meta: ProjectionMeta,\n'
    '  siteId: string,\n'
    '): PresentationIntentBlock | null {\n'
    '  if (raw === undefined || raw === null) {\n'
    '    if (meta.presentationIntentDigest !== undefined) {\n'
    '      fail(siteId, "meta.presentationIntentDigest present but no presentationIntent block");\n'
    '    }\n'
    '    return null;\n'
    '  }\n'
    '  if (!isRecord(raw)) fail(siteId, "presentationIntent is not a record");\n'
    '  const digest = meta.presentationIntentDigest;\n'
    '  if (typeof digest !== "string" || digest.length === 0) {\n'
    '    fail(siteId, "presentationIntent block present without meta.presentationIntentDigest");\n'
    '  }\n'
    '  const recomputed = createHash("sha256")\n'
    '    .update(canonicalize(raw), "utf8")\n'
    '    .digest("hex");\n'
    '  if (recomputed !== digest) {\n'
    '    fail(\n'
    '      siteId,\n'
    '      "presentationIntentDigest mismatch: the intent block was tampered with " +\n'
    '        "or written by an incompatible dumper; refusing to serve it",\n'
    '    );\n'
    '  }\n'
    '  const directives = raw["directives"];\n'
    '  if (!Array.isArray(directives)) fail(siteId, "presentationIntent.directives is not an array");\n'
    '  for (const d of directives) {\n'
    '    if (!isRecord(d)) fail(siteId, "presentationIntent directive is not a record");\n'
    '    if (typeof d["intentId"] !== "string" || d["intentId"] === "")\n'
    '      fail(siteId, "presentationIntent directive has bad intentId");\n'
    '    const si = d["siteIntent"];\n'
    '    if (!isRecord(si) || typeof si["kind"] !== "string" || si["kind"] === "")\n'
    '      fail(siteId, "presentationIntent directive has bad siteIntent");\n'
    '    const prop = d["proposal"];\n'
    '    if (!isRecord(prop) || typeof prop["proposalDigest"] !== "string" || prop["proposalDigest"] === "")\n'
    '      fail(siteId, "presentationIntent directive has bad proposal");\n'
    '    const ap = d["approval"];\n'
    '    if (!isRecord(ap)) fail(siteId, "presentationIntent directive has bad approval");\n'
    '    for (const k of ["proposalDigest", "approvedBy", "approvedAt"] as const) {\n'
    '      if (typeof ap[k] !== "string" || (ap[k] as string).length === 0)\n'
    '        fail(siteId, `presentationIntent directive approval has bad "${k}"`);\n'
    '    }\n'
    '  }\n'
    '  const prov = raw["provenance"];\n'
    '  if (!isRecord(prov) || prov["kind"] !== "owner-presentation-intent")\n'
    '    fail(siteId, "presentationIntent.provenance is missing or mislabeled");\n'
    '  return raw as unknown as PresentationIntentBlock;\n'
    '}\n'
    '\n'
    'function parseAndVerify(\n',
)
edit(
    p,
    "  const meta = doc[\"meta\"] as ProjectionMeta;\n  const graph = doc[\"graph\"] as ObjectGraph;",
    "  const meta = doc[\"meta\"] as ProjectionMeta;\n  const graph = doc[\"graph\"] as ObjectGraph;\n"
    "  const presentationIntent = validatePresentationIntent(doc[\"presentationIntent\"], meta, siteId);",
)
edit(
    p,
    "  if (opts?.ownerOverlay === false) {\n"
    "    return { graph, meta, ownerOverlay: null };\n"
    "  }\n"
    "  const overlay = applyOwnerFieldCorrections(graph, siteId);\n"
    "  return { graph: overlay.graph, meta, ownerOverlay: overlay };",
    "  if (opts?.ownerOverlay === false) {\n"
    "    return { graph, meta, ownerOverlay: null, presentationIntent };\n"
    "  }\n"
    "  const overlay = applyOwnerFieldCorrections(graph, siteId);\n"
    "  return { graph: overlay.graph, meta, ownerOverlay: overlay, presentationIntent };",
)

# ---------------------------------------------------------------- 3. happy-place page.tsx
p = REPO + "/src/app/sites/happy-place/page.tsx"
edit(
    p,
    'import { SiteClient } from "../_shared/site-client";\n'
    'import { getPingObjectGraph } from "@/fyd/data/ping-object-source";\n'
    'import { generateSiteSpec } from "@/fyd/proceduralize/generator";\n'
    'import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";',
    'import { SiteClient } from "../_shared/site-client";\n'
    'import { getPingObjectGraph } from "@/fyd/data/ping-object-source";\n'
    'import { generateSiteSpec } from "@/fyd/proceduralize/generator";\n'
    'import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";\n'
    'import { applyPresentationIntent } from "@/fyd/customize/apply-layer";\n'
    'import { DemoOwnerMode } from "@/fyd/owner-mode/demo-owner-mode";',
)
edit(
    p,
    "export default async function HappyPlaceDemoPage() {\n"
    '  const { graph, meta } = await getPingObjectGraph(SITE_ID);\n'
    "  const spec = generateSiteSpec(graph, {\n"
    "    generatedAt: meta.generatedAt,\n"
    "    eventSequences: meta.eventSequences ?? undefined,\n"
    "  });",
    "export default async function HappyPlaceDemoPage() {\n"
    '  const { graph, meta, presentationIntent } = await getPingObjectGraph(SITE_ID);\n'
    "  const base = generateSiteSpec(graph, {\n"
    "    generatedAt: meta.generatedAt,\n"
    "    eventSequences: meta.eventSequences ?? undefined,\n"
    "  });\n"
    "  // PRESENTATION INTENT layer: approved owner directives applied OVER the\n"
    "  // compiled spec. Facts (graph) and design system (theme) are untouched.\n"
    "  const spec = applyPresentationIntent(base, presentationIntent, graph).spec;",
)
edit(
    p,
    "      />\n    </main>",
    "      />\n"
    "      <DemoOwnerMode siteId={SITE_ID} />\n"
    "    </main>",
)

print("ALL EDITS APPLIED")
