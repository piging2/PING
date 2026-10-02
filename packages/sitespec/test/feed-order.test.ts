/**
 * Feed ("all" query) ordering is deterministic, locale-independent, and
 * input-order-independent.
 *
 * Regression for the falsifier finding (16:48 assault): the comparator used
 * b.updatedAt.localeCompare(a.updatedAt). Collation is environment-
 * dependent and calls byte-distinct timestamps "equal" (NFC vs NFD), so
 * the id tie-break never engaged and V8's stable sort preserved input
 * order. Worse, collation disagrees with code-unit order ("z" vs "Z"),
 * so Pig-built and Vercel-deployed renders could disagree on
 * byte-identical inputs. The fix: newest-first in UTF-16 code-unit
 * order with a total id tie-break. No localeCompare anywhere on this path.
 */
import { resolveQuery } from "../src/query";
import type { ObjectGraph, FYDQuery } from "../src/types";
import type { PingObject } from "../src/ping-types";

const OWNER = "website-business-test-feed-order";

function obj(id: string, updatedAt: string): PingObject {
  return {
    id,
    schema: "ping.social.service@1",
    controllerId: "identity_fyd_compiler_test",
    visibility: "public",
    title: id,
    description: id,
    fields: { name: id },
    createdAt: updatedAt,
    updatedAt,
    provenance: {
      kind: "website-derived",
      ref: "test:feed-order",
      derivedAt: updatedAt,
    },
  };
}

function graphOf(objects: PingObject[]): ObjectGraph {
  return { objects, relationships: [] };
}

const ALL: FYDQuery = { kind: "all" };

const ids = (objs: PingObject[]): string[] => objs.map((o) => o.id);

// NFC "caf\u00e9" vs NFD "cafe\u0301": collation-equal, byte-distinct.
// Code-unit order: NFD ("e", U+0065) < NFC (U+00E9), so the NFC row is
// "newest" and must sort first regardless of input order.
const A = () => obj("obj:a", "2026-10-01T12:00:00caf\u00e9");
const B = () => obj("obj:b", "2026-10-01T12:00:00cafe\u0301");
const C = () => obj("obj:c", "2026-09-01T00:00:00Z");

// Collation disagrees with code-unit order: "…00z".localeCompare("…00Z")
// is -1 (z < Z in collation) while code-unit "Z" (0x5A) < "z" (0x7A).
// The pinned semantics are code-unit, so the "z" row is newest.
const D = () => obj("obj:d", "2026-10-01T00:00:00z");
const E = () => obj("obj:e", "2026-10-01T00:00:00Z");

describe("feed ordering is input-order-independent", () => {
  test("collation-equal timestamps do not leak input order", () => {
    const forward = resolveQuery(ALL, graphOf([A(), B(), C()]), OWNER);
    const reversed = resolveQuery(ALL, graphOf([C(), B(), A()]), OWNER);
    expect(ids(forward)).toEqual(["obj:a", "obj:b", "obj:c"]);
    expect(ids(reversed)).toEqual(ids(forward));
  });

  test("limit selects the same object regardless of input order", () => {
    const limited: FYDQuery = { kind: "all", limit: 1 };
    const forward = resolveQuery(limited, graphOf([A(), B(), C()]), OWNER);
    const reversed = resolveQuery(limited, graphOf([C(), B(), A()]), OWNER);
    expect(ids(forward)).toEqual(["obj:a"]);
    expect(ids(reversed)).toEqual(["obj:a"]);
  });

  test("ordering follows code-unit order, not locale collation", () => {
    const out = resolveQuery(ALL, graphOf([E(), D()]), OWNER);
    expect(ids(out)).toEqual(["obj:d", "obj:e"]);
  });

  test("byte-identical timestamps tie-break on id, input-order-independent", () => {
    const x = obj("obj:x", "2026-10-01T00:00:00Z");
    const y = obj("obj:y", "2026-10-01T00:00:00Z");
    const forward = resolveQuery(ALL, graphOf([y, x]), OWNER);
    const reversed = resolveQuery(ALL, graphOf([x, y]), OWNER);
    expect(ids(forward)).toEqual(["obj:x", "obj:y"]);
    expect(ids(reversed)).toEqual(["obj:x", "obj:y"]);
  });
});
