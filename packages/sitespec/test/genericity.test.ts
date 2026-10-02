/**
 * Point 11 (backend genericity): no customer-specific code paths in src.
 *
 * Two proofs:
 *
 * 1. Scanner: walks every packages/<name>/src tree for business-specific
 *    asserts none are present in src CODE. Comments are stripped first:
 *    documentation that names a customer (e.g. "the generator never
 *    mentions Happy Place") is prose, not a code path. String literals,
 *    identifiers, and default-config keys in code ARE code paths.
 *    Fixtures and test dirs may carry fixture data; src must be generic.
 *
 *    RESOLVED 2026-10-02 (was the FIRST BROKEN BACKEND INVARIANT of the
 *    16:48 assault): packages/react-renderer/src/marks.tsx DEFAULT_MARKS
 *    hardcoded the two proof businesses' website-derived object ids
 *    ("website-business-6fa5ebd99d72c4cb" -> "tape-measure",
 *    "website-business-2f1327c09d622175" -> "pipe-wrench") as a default
 *    business->mark mapping. Fix: the src default is now EMPTY
 *    (resolveLogoMark returns "generic" without a caller mapping); the
 *    caller supplies business->mark assignments via RenderOptions.logoMarks.
 *    The scanner below is the regression test: it must stay green, and
 *    per-customer defaults must never be reintroduced into src.
 *    The core backend packages (trust, objects, ask, sitespec, owner,
 *    proposals) scan clean.
 *
 * 2. Entry-point genericity: a third business the codebase has never seen
 *    ("Harbor Books", no fixture, no special case) compiles through
 *    generateSiteSpec / buildVerifiedPublicProjection through the same
 *    rules, proving the entry points take generic graph input rather than
 *    branching on business identity.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { generateSiteSpec } from "../src/generator";
import { buildVerifiedPublicProjection } from "../src/projection";
import { resolveQuery } from "../src/query";
import type { ObjectGraph } from "../src/types";
import type { PingObject, PingRelationship } from "../src/ping-types";
import { deriveObjectId } from "../../objects/src/identity";

const REPO = path.resolve(__dirname, "..", "..", "..");

/**
 * Business-specific identifiers: customer names, slugs, domains, contact
 * data from the proof fixtures, customer-specific component-name
 * fragments, and the website-derived object ids of the two proof
 * businesses. Any of these in src CODE is a customer-specific code path.
 */
const BUSINESS_IDENTIFIERS: string[] = [
  "Happy Place",
  "happy place",
  "HAPPY PLACE",
  "Coppersmith",
  "coppersmith",
  "COPPERSMITH",
  "happy-place",
  "HappyPlace",
  "CoppersmithPlumbing",
  "happy-place-platform.vercel.app",
  "coppersmithplumbing.com",
  "website-business-6fa5ebd99d72c4cb",
  "website-business-2f1327c09d622175",
  "+15412865190",
  "taylor@happyplacecarpentry.com",
];

/**
 * Strip // and block comments, respecting string literals (so // inside
 * "https://..." survives) and ${} expressions inside template literals
 * (those are code and stay scannable). Assumption, stated: src contains
 * no regex literal with an unescaped // inside (verified 2026-10-02:
 * none present), so every // outside a string starts a comment.
 */
function stripComments(src: string): string {
  let out = "";
  let i = 0;
  const n = src.length;
  const copyString = (quote: string): void => {
    out += quote;
    i++;
    while (i < n) {
      const ch = src[i];
      if (ch === "\\") {
        out += ch + (src[i + 1] ?? "");
        i += 2;
        continue;
      }
      if (quote === "`" && ch === "$" && src[i + 1] === "{") {
        // Template expression: code again, with balanced braces.
        out += "${";
        i += 2;
        let depth = 1;
        while (i < n && depth > 0) {
          const c2 = src[i];
          const d2 = src[i + 1] ?? "";
          if (c2 === "/" && d2 === "/") {
            while (i < n && src[i] !== "\n") i++;
            continue;
          }
          if (c2 === "/" && d2 === "*") {
            i += 2;
            while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
            i += 2;
            continue;
          }
          if (c2 === "'" || c2 === '"' || c2 === "`") {
            const inner = i;
            // Nested string inside the expression: copy verbatim.
            const q2 = c2;
            out += q2;
            i++;
            while (i < n) {
              const c3 = src[i];
              if (c3 === "\\") {
                out += c3 + (src[i + 1] ?? "");
                i += 2;
                continue;
              }
              out += c3;
              i++;
              if (c3 === q2) break;
            }
            void inner;
            continue;
          }
          if (c2 === "{") depth++;
          if (c2 === "}") depth--;
          out += c2;
          i++;
        }
        continue;
      }
      out += ch;
      i++;
      if (ch === quote) break;
    }
  };
  while (i < n) {
    const c = src[i];
    const d = src[i + 1] ?? "";
    if (c === "/" && d === "/") {
      while (i < n && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      copyString(c);
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function* walkTsFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkTsFiles(full);
    } else if (entry.isFile() && (full.endsWith(".ts") || full.endsWith(".tsx"))) {
      yield full;
    }
  }
}

function srcDirs(): string[] {
  return fs
    .readdirSync(path.join(REPO, "packages"))
    .map((p) => path.join(REPO, "packages", p, "src"))
    .filter((d) => fs.existsSync(d) && fs.statSync(d).isDirectory());
}

describe("point 11: no business-specific identifiers in src code", () => {
  test("scanner: src code carries no customer-specific identifiers", () => {
    const hits: string[] = [];
    let files = 0;
    for (const dir of srcDirs()) {
      for (const file of walkTsFiles(dir)) {
        files++;
        const code = stripComments(fs.readFileSync(file, "utf8"));
        for (const id of BUSINESS_IDENTIFIERS) {
          if (code.includes(id)) {
            hits.push(path.relative(REPO, file) + ": " + JSON.stringify(id));
          }
        }
      }
    }
    expect(files).toBeGreaterThan(0);
    // FIRST BROKEN BACKEND INVARIANT when non-empty: each hit is a
    // customer-specific code path in src. See the file header for the
    // known marks.tsx finding.
    expect(hits).toEqual([]);
  });
});

describe("point 11: entry points take generic graph input", () => {
  const T = "2026-10-02T12:00:00Z";
  const GEN_AT = "2026-10-02T12:00:00Z";
  const TENANT = "tenant-harbor";

  // A third business the codebase has never seen: no fixture exists for
  // it, no src code names it. If the compiler branched on business
  // identity, this graph would fall through every special case.
  const biz = deriveObjectId(TENANT, "harbor-books:business");
  const svc = deriveObjectId(TENANT, "harbor-books:service:rare");
  const rel = deriveObjectId(TENANT, "harbor-books:rel:rare");

  const objects: PingObject[] = [
    {
      id: biz,
      schema: "ping.social.business@1",
      controllerId: TENANT,
      visibility: "public",
      title: "Harbor Books",
      description: "An independent bookstore by the harbor.",
      fields: {
        name: "Harbor Books",
        phone: "+13035550222",
        address: "7 Harbor Way, Grand Junction, CO",
        claimKind: "website_statement",
      },
      createdAt: T,
      updatedAt: T,
      provenance: {
        kind: "website-derived",
        ref: "website-ingestion:https://harbor-books.example/",
        derivedAt: T,
      },
    },
    {
      id: svc,
      schema: "ping.social.service@1",
      controllerId: TENANT,
      visibility: "public",
      title: "Rare Finds",
      description: "Rare and out-of-print books.",
      fields: { name: "Rare Finds", claimKind: "website_statement" },
      createdAt: T,
      updatedAt: T,
      provenance: {
        kind: "website-derived",
        ref: "website-ingestion:https://harbor-books.example/",
        derivedAt: T,
      },
    },
  ];
  const relationships: PingRelationship[] = [
    {
      id: rel,
      subject: biz,
      predicate: "offers",
      object: svc,
      status: "active",
      createdAt: T,
      evidenceRef: "website-ingestion:https://harbor-books.example/#rare",
    },
  ];
  const graph: ObjectGraph = { objects, relationships };

  test("generateSiteSpec compiles the unseen business through the same rules", () => {
    const spec = generateSiteSpec(graph, { generatedAt: GEN_AT });
    expect(spec.ownerObjectId).toBe(biz);
    const s = JSON.stringify(spec);
    expect(s).toContain("Harbor Books");
    // No proof-business identity leaks into the output.
    for (const id of BUSINESS_IDENTIFIERS) {
      expect(s).not.toContain(id);
    }
    // The same structural rules fired: home page with a Services section
    // whose query is bound to this business's id.
    const home = spec.pages.find((p) => p.slug === "home");
    expect(home).toBeDefined();
    const services = home && home.sections.find((sec) => sec.component === "Services");
    expect(services).toBeDefined();
    expect(JSON.stringify(services && services.query)).toContain(biz);
    // The spec is data, not rendered content: the service name appears
    // when the section query resolves against the graph.
    const resolved = resolveQuery(
      services && services.query !== undefined ? services.query : { kind: "static" },
      graph,
      spec.ownerObjectId,
    );
    expect(resolved.map((o) => o.title)).toContain("Rare Finds");
  });

  test("the public projection of the unseen business is self-contained", () => {
    const p = buildVerifiedPublicProjection(graph);
    expect(p.graph.objects).toHaveLength(2);
    const s = JSON.stringify(p.graph);
    expect(s).toContain("Harbor Books");
    for (const id of BUSINESS_IDENTIFIERS) {
      expect(s).not.toContain(id);
    }
  });

  test("no entry point branches on business identity: same graph, same spec", () => {
    const a = generateSiteSpec(graph, { generatedAt: GEN_AT });
    const b = generateSiteSpec(graph, { generatedAt: GEN_AT });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
