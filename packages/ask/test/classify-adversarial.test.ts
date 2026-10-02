/**
 * Adversarial claim-epistemics tests (Nolan, 2026-10-02, binding:
 * "UNKNOWN CLAIM KINDS").
 *
 * claimClassFor must FAIL CLOSED: no unrecognized, empty, missing, or
 * malformed claim kind may ever coerce to DIRECT. Known classifications
 * map explicitly; everything else lands on INFERRED ("labeled, not
 * verified"), and basisForClassification must preserve the raw source
 * value for evidence/debugging instead of swallowing it.
 *
 * The last describe block pins the presentation gate end to end:
 * through citeFact (the single primitive behind Ask FYD citations and
 * WHY THIS), a fact whose claimKind is unknown or missing is never
 * eligible for VERIFIED / DIRECT presentation.
 */

import { basisForClassification, claimClassFor } from "../src/classify";
import { citeFact } from "../src/cite";
import type { AskPingObject, ObjectGraph } from "../src/types";

describe("claimClassFor: known classifications stay exact", () => {
  test.each([
    "DIRECT_FACT",
    "website_statement",
    "USER_OVERRIDE",
    "owner_override",
    "owner_authored",
  ])('"%s" is DIRECT', (kind) => {
    expect(claimClassFor(kind)).toBe("DIRECT");
  });

  test.each(["DERIVED_FACT", "derived", "GENERATED_COPY"])(
    '"%s" is DERIVED',
    (kind) => {
      expect(claimClassFor(kind)).toBe("DERIVED");
    },
  );

  test.each(["INFERENCE", "CONFLICT", "conflict"])(
    '"%s" is INFERRED',
    (kind) => {
      expect(claimClassFor(kind)).toBe("INFERRED");
    },
  );
});

describe("claimClassFor: adversarial inputs never become DIRECT", () => {
  // Every one of these is epistemic uncertainty. None may upgrade to
  // DIRECT; all fail closed to INFERRED ("labeled, not verified").
  const adversarial: Array<[string, unknown]> = [
    ["lowercase 'inference' is not the INFERENCE kind", "inference"],
    ["trailing space is not the known kind", "direct "],
    ["capitalized 'Direct' is not the known kind", "Direct"],
    ["empty string", ""],
    ["missing classification", undefined],
    ["null smuggled past the signature", null],
    ["future unknown value", "QUANTUM_VERIFIED"],
    ["trailing space on a known kind", "DIRECT_FACT "],
    ["leading space on a known kind", " DIRECT_FACT"],
    ["non-string garbage (number)", 42],
    ["non-string garbage (object)", { kind: "DIRECT_FACT" }],
    ["non-string garbage (boolean)", true],
  ];

  test.each(adversarial)("%s", (_label, raw) => {
    const result = claimClassFor(raw as string | undefined);
    expect(result).toBe("INFERRED");
    expect(result).not.toBe("DIRECT");
  });

  test("case variants of every known kind fail closed", () => {
    const known = [
      "DIRECT_FACT",
      "website_statement",
      "USER_OVERRIDE",
      "owner_override",
      "owner_authored",
      "DERIVED_FACT",
      "derived",
      "GENERATED_COPY",
      "INFERENCE",
      "CONFLICT",
      "conflict",
    ];
    for (const kind of known) {
      expect(claimClassFor(kind.toLowerCase() + " ")).toBe("INFERRED");
      expect(claimClassFor(" " + kind.toUpperCase())).not.toBe("DIRECT");
    }
    // The genuine uppercase forms are themselves unknown kinds.
    expect(claimClassFor("DIRECT")).toBe("INFERRED");
    expect(claimClassFor("DERIVED")).toBe("INFERRED");
  });
});

describe("basisForClassification: the raw source value is preserved", () => {
  test("unrecognized value is quoted verbatim with an unverified disclaimer", () => {
    const basis = basisForClassification("direct ");
    expect(basis).toContain(JSON.stringify("direct "));
    expect(basis).toMatch(/not presented as a verified fact/i);
  });

  test("future unknown value is preserved, not swallowed", () => {
    const basis = basisForClassification("QUANTUM_VERIFIED");
    expect(basis).toContain("QUANTUM_VERIFIED");
    expect(basis).toMatch(/not presented as a verified fact/i);
    // Never a neutral cover story: the old default hid behind "Site record".
    expect(basis).not.toBe("Site record");
  });

  test("trailing-space known kind keeps its raw form visible", () => {
    expect(basisForClassification("DIRECT_FACT ")).toContain(
      JSON.stringify("DIRECT_FACT "),
    );
  });

  test("empty string is named as empty, not neutral", () => {
    const basis = basisForClassification("");
    expect(basis).toMatch(/empty/i);
    expect(basis).toMatch(/not presented as a verified fact/i);
  });

  test("missing classification is named as missing, not neutral", () => {
    const basis = basisForClassification(undefined);
    expect(basis).toMatch(/no classification/i);
    expect(basis).toMatch(/not presented as a verified fact/i);
  });

  test("non-string garbage is still surfaced, never crashes", () => {
    const basis = basisForClassification(42 as unknown as string);
    expect(basis).toContain("42");
    expect(basis).toMatch(/not presented as a verified fact/i);
  });

  test("known kinds keep their honest basis sentences", () => {
    expect(basisForClassification("DIRECT_FACT")).toBe(
      "Recorded fact from the site data",
    );
    expect(basisForClassification("website_statement")).toContain(
      "website statement",
    );
    expect(basisForClassification("INFERENCE")).toBe(
      "Inferred from the site data",
    );
    expect(basisForClassification("GENERATED_COPY")).toMatch(/not verified/i);
  });
});

describe("presentation gate: citeFact never emits DIRECT for unknown kinds", () => {
  function makeObject(fields: Record<string, string | string[]>): AskPingObject {
    return {
      id: "obj-adversarial-1",
      schema: "ping.social.service@1",
      controllerId: "ctrl-1",
      visibility: "public",
      title: "Quantum Plumbing",
      description: "A service record",
      fields,
      createdAt: "2026-10-02T00:00:00Z",
      updatedAt: "2026-10-02T00:00:00Z",
      provenance: {
        kind: "website-ingestion",
        ref: "website-ingestion:https://example.com",
        derivedAt: "2026-10-02T00:00:00Z",
      },
    };
  }

  function graphWith(obj: AskPingObject): ObjectGraph {
    return { objects: [obj], relationships: [] };
  }

  test("future unknown claimKind -> INFERRED, raw value in the detail", () => {
    const obj = makeObject({
      name: "Quantum Plumbing",
      claimKind: "QUANTUM_VERIFIED",
    });
    const citation = citeFact(
      { objectId: obj.id, field: "name" },
      graphWith(obj),
    );
    expect(citation).not.toBeNull();
    expect(citation!.classification).toBe("INFERRED");
    expect(citation!.classification).not.toBe("DIRECT");
    expect(citation!.detail).toContain("QUANTUM_VERIFIED");
    expect(citation!.detail).toMatch(/not presented as a verified fact/i);
  });

  test("missing claimKind -> INFERRED (no silent DIRECT default)", () => {
    const obj = makeObject({ name: "Quantum Plumbing" });
    const citation = citeFact(
      { objectId: obj.id, field: "name" },
      graphWith(obj),
    );
    expect(citation).not.toBeNull();
    expect(citation!.classification).toBe("INFERRED");
    expect(citation!.basis).toMatch(/no classification/i);
  });

  test("empty claimKind -> INFERRED", () => {
    const obj = makeObject({ name: "Quantum Plumbing", claimKind: "" });
    const citation = citeFact(
      { objectId: obj.id, field: "name" },
      graphWith(obj),
    );
    expect(citation).not.toBeNull();
    expect(citation!.classification).toBe("INFERRED");
  });

  test("trailing-space 'website_statement ' -> INFERRED, not DIRECT", () => {
    const obj = makeObject({
      name: "Quantum Plumbing",
      claimKind: "website_statement ",
    });
    const citation = citeFact(
      { objectId: obj.id, field: "name" },
      graphWith(obj),
    );
    expect(citation).not.toBeNull();
    expect(citation!.classification).toBe("INFERRED");
    expect(citation!.detail).toContain(JSON.stringify("website_statement "));
  });

  test("control: genuine known kind still classifies DIRECT", () => {
    const obj = makeObject({
      name: "Quantum Plumbing",
      claimKind: "website_statement",
    });
    const citation = citeFact(
      { objectId: obj.id, field: "name" },
      graphWith(obj),
    );
    expect(citation).not.toBeNull();
    expect(citation!.classification).toBe("DIRECT");
  });
});
