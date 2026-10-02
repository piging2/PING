// SUITE 2 — classification boundary (hostile).
// Attacks the epistemic classification mapping itself, using the ACTUAL
// pure functions extracted verbatim from visitor-answer.ts / ask-composer.ts.
// Directive standard: unsupported -> REFUSE/QUALIFY; unknown epistemic basis
// must never be presented as direct support.
import { check, report } from "./harness.mts";
import {
  claimClassFor,
  answerStateFor,
  basisForClassification,
} from "/tmp/fyd-attacker-extract-claimClassFor-answerStateFor-basisForClassification.mts";
import {
  classificationFromProvenance,
  claimClassification,
} from "/tmp/fyd-attacker-extract-classificationFromProvenance-claimClassification.mts";

// B1: unrecognized classification string must NOT become the strongest claim class.
check(
  "B1-unknown-class-not-direct",
  (claimClassFor as any)("DIRECCT_FACT") !== "SUPPORTED DIRECTLY",
  `claimClassFor("DIRECCT_FACT") = ${(claimClassFor as any)("DIRECCT_FACT")} (want: not SUPPORTED DIRECTLY)`,
);

// B2: missing classification must NOT become the strongest claim class.
check(
  "B2-missing-class-not-direct",
  (claimClassFor as any)(undefined) !== "SUPPORTED DIRECTLY" &&
    (claimClassFor as any)("") !== "SUPPORTED DIRECTLY",
  `undefined -> ${(claimClassFor as any)(undefined)}, "" -> ${(claimClassFor as any)("")}`,
);

// B3: garbage claimKind from the graph must not launder into direct support.
{
  const obj: any = { id: "o1", fields: { claimKind: "TYPO_CLASS", name: "X" }, provenance: { kind: "website-ingestion", ref: "x" } };
  const cls = (claimClassification as any)({}, obj, "name");
  const customer = (claimClassFor as any)(cls);
  check(
    "B3-garbage-claimkind-not-direct",
    customer !== "SUPPORTED DIRECTLY",
    `claimKind "TYPO_CLASS" -> claimClassification "${cls}" -> customer class "${customer}"`,
  );
}

// B4: GENERATED_COPY never maps to a direct-support class (FACTUAL CLAIM != GENERATED COPY).
check(
  "B4-generated-copy-never-direct",
  (claimClassFor as any)("GENERATED_COPY") === "DERIVED",
  `GENERATED_COPY -> ${(claimClassFor as any)("GENERATED_COPY")}`,
);

// B5: GENERATED_COPY basis text explicitly says not verified fact.
check(
  "B5-generated-copy-basis-honest",
  /not verified fact/.test((basisForClassification as any)("GENERATED_COPY")),
  `basis = "${(basisForClassification as any)("GENERATED_COPY")}"`,
);

// B6: unknown basis must not render as a confident "Site record" for an unclassifiable claim.
check(
  "B6-unknown-basis-not-confident",
  (basisForClassification as any)("SOME_FUTURE_CLASS") !== "Site record" ||
    (claimClassFor as any)("SOME_FUTURE_CLASS") !== "SUPPORTED DIRECTLY",
  `future class -> basis "${(basisForClassification as any)("SOME_FUTURE_CLASS")}", class "${(claimClassFor as any)("SOME_FUTURE_CLASS")}"`,
);

// B7: provenance chain stays honest (no silent upgrade).
{
  const kinds: Record<string, string> = {
    "overlay-authored": "DEMO_SYNTHETIC",
    "canonical-journal": "DIRECT_FACT",
    "website-ingestion": "website_statement",
    owner: "owner_authorship",
  };
  let ok = true;
  let ev = "";
  for (const [k, want] of Object.entries(kinds)) {
    const got = (classificationFromProvenance as any)({ provenance: { kind: k, ref: "x" } });
    if (got !== want) ok = false;
    ev += `${k}->${got} `;
  }
  const mystery = (classificationFromProvenance as any)({ provenance: { kind: "mystery-kind", ref: "x" } });
  if (mystery !== "unknown") ok = false;
  check("B7-provenance-chain-honest", ok, `${ev}mystery-kind->${mystery}`);
}

// B8: coarse state for DERIVED is KNOWN — generated copy surfaces under a KNOWN
// answer state. Documented tension: the fine citation preserves GENERATED_COPY
// via basis text, but the coarse state says KNOWN.
{
  const st = (answerStateFor as any)("DERIVED");
  check(
    "B8-derived-coarse-known-documented",
    st === "KNOWN",
    `answerStateFor("DERIVED") = "${st}" — tension recorded: fine label preserves GENERATED_COPY, coarse state says KNOWN`,
  );
}

const fails = report("suite-classification-boundary");
process.exit(fails > 0 ? 1 : 0);
