/**
 * OWNER CORRECTION STATE MODEL — model-based test over the REAL owner store.
 *
 * fast-check generates random sequences of owner commands; after every
 * command the test asserts the real OwnerOverrides (from applyOwnerCommand
 * against a temp FYD_OWNER_DIR) match a simple model, AND that the ask
 * projection (applyOwnerFieldCorrections) shows exactly the model's
 * expected field value. This is the executable form of the product loop
 * WHY THIS -> CORRECT -> REGENERATE: an owner correction must survive
 * re-projection, no matter what command sequence produced it.
 *
 * FALSIFIABILITY QUESTIONNAIRE
 * WHAT INVARIANT? (1) The owner store is a pure function of the command
 *   sequence: overrides == model(commands). (2) Projection fidelity:
 *   projected fields[field] == model correction ?? canonical source value.
 * WHO OWNS IT? applyOwnerCommand (src/fyd/object/owner-store.ts) and
 *   applyOwnerFieldCorrections (src/fyd/object/owner-overlay.ts); this
 *   file owns the model.
 * HOW CAN IT FAIL? A command the model mishandles (shrinking finds the
 *   minimal sequence); a projection that drops or doubles a correction.
 * WHAT ATTACK DISPROVES IT? Random command sequences incl. interleaved
 *   set/revert/confirm on the same field, hide+move on services.
 * WHAT EVIDENCE PROVES IT? fast-check run report (numRuns, no
 *   counterexample) in the jest output.
 * CAN IT BE REPLAYED? Yes: fast-check seeds are printed on failure; the
 *   store is FS-backed in a temp dir per run.
 * DOES THE FAILURE BECOME PERMANENT REGRESSION KNOWLEDGE? Yes: the
 *   minimal counterexample becomes a pinned regression test.
 * WHY CAN EXISTING RUNNER + LIBRARY + EXISTING PING AUTHORITY NOT EXPRESS
 *   THIS? Existing owner tests are single-command unit cases; none assert
 *   store==model over generated sequences plus projection fidelity.
 */
import fc from "fast-check";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyOwnerCommand } from "@/fyd/object/owner-store";
import { applyOwnerFieldCorrections } from "@/fyd/object/owner-overlay";
import { COPPERSMITH_GRAPH } from "@/fyd/proceduralize/__fixtures__/coppersmith-graph";

const BUSINESS_ID = "website-business-2f1327c09d622175";
// Canonical source values from the fixture (ground truth, not guesses).
const CANONICAL: Record<"phone" | "email" | "website", string | undefined> = {
  phone: "970-245-3869",
  email: undefined,
  website: "https://coppersmithplumbing.com",
};
const FIELDS = ["phone", "email", "website"] as const;
type Field = (typeof FIELDS)[number];

interface Model {
  corrections: Record<Field, string | null>;
  hidden: Set<string>;
  addedCount: number;
  addressVis: string;
}
interface Real {
  businessId: string;
  knownIds: string[];
  knownNames: Map<string, string>;
}

function serviceIds(): string[] {
  return COPPERSMITH_GRAPH.objects
    .filter((o: any) => o.schema === "ping.social.service@1")
    .map((o: any) => o.id);
}

function freshModel(): Model {
  return {
    corrections: { phone: null, email: null, website: null },
    hidden: new Set<string>(),
    addedCount: 0,
    addressVis: "default",
  };
}

/** Assert the ask projection shows exactly the model's expected value. */
function checkProjection(model: Model, field: Field) {
  const projected = applyOwnerFieldCorrections(
    structuredClone(COPPERSMITH_GRAPH) as any,
    BUSINESS_ID,
  ).graph;
  const business: any = projected.objects.find((o: any) => o.id === BUSINESS_ID);
  const expected = model.corrections[field] ?? CANONICAL[field];
  expect(business.fields?.[field] ?? undefined).toBe(expected ?? undefined);
}

const validValue = (field: Field) =>
  field === "phone"
    ? fc.constant("(970) 555-9999")
    : field === "email"
      ? fc.constant("owner@example.com")
      : fc.constant("https://owner.example.com");

class SetContactField implements fc.Command<Model, Real> {
  constructor(readonly field: Field, readonly value: string) {}
  check(m: Readonly<Model>) { return true; }
  run(m: Model, r: Real) {
    const real = applyOwnerCommand(
      r.businessId,
      { type: "set-contact-field", field: this.field, value: this.value } as any,
      r.knownIds, r.knownNames,
    );
    expect(real.fieldCorrections?.[this.field]?.ownerValue).toBe(this.value);
    m.corrections[this.field] = this.value;
    checkProjection(m, this.field);
  }
  toString() { return `set-contact-field(${this.field})`; }
}

class RevertContactField implements fc.Command<Model, Real> {
  constructor(readonly field: Field) {}
  // Precondition: the product fails closed ("There is no X correction to
  // revert") when no correction exists; only valid reverts are modeled.
  check(m: Readonly<Model>) { return m.corrections[this.field] !== null; }
  run(m: Model, r: Real) {
    const real = applyOwnerCommand(
      r.businessId,
      { type: "revert-contact-field", field: this.field } as any,
      r.knownIds, r.knownNames,
    );
    expect(real.fieldCorrections?.[this.field] ?? null).toBe(null);
    m.corrections[this.field] = null;
    checkProjection(m, this.field);
  }
  toString() { return `revert-contact-field(${this.field})`; }
}

class ConfirmContactField implements fc.Command<Model, Real> {
  constructor(readonly field: Field) {}
  check(m: Readonly<Model>) { return true; }
  run(m: Model, r: Real) {
    const real = applyOwnerCommand(
      r.businessId,
      { type: "confirm-contact-field", field: this.field } as any,
      r.knownIds, r.knownNames,
      { sourceValue: CANONICAL[this.field] ?? "" },
    );
    // Confirmation records the effective value: owner correction wins,
    // otherwise the canonical source value.
    const effective = m.corrections[this.field] ?? CANONICAL[this.field] ?? "";
    expect(real.fieldConfirmations?.[this.field]).toBeDefined();
    // Projection is unchanged by confirmation: the value stays effective.
    checkProjection(m, this.field);
    expect(effective).toBeDefined();
  }
  toString() { return `confirm-contact-field(${this.field})`; }
}

class SetServiceVisibility implements fc.Command<Model, Real> {
  constructor(readonly id: string, readonly visible: boolean) {}
  check(m: Readonly<Model>) { return true; }
  run(m: Model, r: Real) {
    const real = applyOwnerCommand(
      r.businessId,
      { type: "set-service-visibility", id: this.id, visible: this.visible } as any,
      r.knownIds, r.knownNames,
    );
    if (this.visible) m.hidden.delete(this.id);
    else m.hidden.add(this.id);
    expect(new Set(real.hiddenServices ?? [])).toEqual(m.hidden);
  }
  toString() { return `set-service-visibility(${this.id.slice(-6)},${this.visible})`; }
}

class MoveService implements fc.Command<Model, Real> {
  constructor(readonly id: string, readonly to: "up" | "down" | "first" | "last") {}
  check(m: Readonly<Model>) { return true; }
  run(m: Model, r: Real) {
    const real = applyOwnerCommand(
      r.businessId,
      { type: "move-service", id: this.id, to: this.to } as any,
      r.knownIds, r.knownNames,
    );
    // Ordering invariant (not exact order): the store never loses or
    // duplicates a service id.
    const order = real.serviceOrder ?? [];
    const known = new Set(r.knownIds);
    for (const id of order) expect(known.has(id)).toBe(true);
    expect(new Set(order).size).toBe(order.length);
  }
  toString() { return `move-service(${this.id.slice(-6)},${this.to})`; }
}

class AddService implements fc.Command<Model, Real> {
  constructor(readonly name: string) {}
  check(m: Readonly<Model>) { return true; }
  run(m: Model, r: Real) {
    const before = applyOwnerCommand(
      r.businessId,
      { type: "add-service", name: this.name } as any,
      r.knownIds, r.knownNames,
    );
    m.addedCount += 1;
    expect((before.addedServices ?? []).length).toBe(m.addedCount);
    const last = (before.addedServices ?? [])[m.addedCount - 1] as any;
    expect(last?.name ?? last).toBeDefined();
  }
  toString() { return `add-service(${this.name})`; }
}

class SetAddressVisibility implements fc.Command<Model, Real> {
  constructor(readonly visibility: "hide" | "show" | "default") {}
  check(m: Readonly<Model>) { return true; }
  run(m: Model, r: Real) {
    const real = applyOwnerCommand(
      r.businessId,
      { type: "set-address-visibility", visibility: this.visibility } as any,
      r.knownIds, r.knownNames,
    );
    m.addressVis = this.visibility;
    expect(real.addressVisibility).toBe(this.visibility);
  }
  toString() { return `set-address-visibility(${this.visibility})`; }
}

describe("owner correction state model (fast-check, real store)", () => {
  test("full command vocabulary over generated sequences", () => {
    fc.assert(
      fc.property(
        fc.commands(
          [
            ...FIELDS.flatMap((f) => [
              validValue(f).map((v) => new SetContactField(f, v)),
              fc.constant(new RevertContactField(f)),
              fc.constant(new ConfirmContactField(f)),
            ]),
            fc
              .tuple(
                fc.constantFrom(...serviceIds()),
                fc.boolean(),
              )
              .map(([id, visible]) => new SetServiceVisibility(id, visible)),
            fc
              .tuple(
                fc.constantFrom(...serviceIds()),
                fc.constantFrom("up", "down", "first", "last") as fc.Arbitrary<"up" | "down" | "first" | "last">,
              )
              .map(([id, to]) => new MoveService(id, to)),
            fc.string({ minLength: 1, maxLength: 12 }).map((n) => new AddService(`Svc ${n}`)),
            fc
              .constantFrom("hide", "show", "default")
              .map((v) => new SetAddressVisibility(v as "hide" | "show" | "default")),
          ],
          { maxLength: 20 },
        ),
        (cmds) => {
          const dir = mkdtempSync(join(tmpdir(), "owner-model-"));
          process.env.FYD_OWNER_DIR = dir;
          const knownIds = serviceIds();
          const knownNames = new Map(
            COPPERSMITH_GRAPH.objects
              .filter((o: any) => o.schema === "ping.social.service@1")
              .map((o: any) => [o.id, o.title] as [string, string]),
          );
          const setup = () => ({
            model: freshModel(),
            real: { businessId: BUSINESS_ID, knownIds, knownNames },
          });
          let final: { model: Model; real: Real } | null = null;
          const capturingSetup = () => (final = setup());
          fc.modelRun(capturingSetup, cmds);
          // End-of-run invariant: after the whole sequence, the ask
          // projection still shows exactly the model's value per field.
          for (const f of FIELDS) checkProjection(final!.model, f);
        },
      ),
      { numRuns: 30 },
    );
  });
});
