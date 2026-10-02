p = "src/fyd/object/owner-store.ts"
s = open(p).read()

# 1. Import FieldConfirmation alongside OwnerCommand/OwnerOverrides.
old_imp = 'import type { OwnerCommand, OwnerOverrides } from "./types";'
new_imp = 'import type {\n  FieldConfirmation,\n  OwnerCommand,\n  OwnerOverrides,\n} from "./types";'
assert old_imp in s, "import"
s = s.replace(old_imp, new_imp)

# 2. applyOwnerCommand: new case after revert-contact-field.
old_case = """    case "revert-contact-field": {"""
new_case = """    case "confirm-contact-field": {
      // The owner asserts the current effective value is correct. Nothing
      // is changed: the assertion is recorded as an owner.confirmed-fact
      // event with the actor and timestamp, and the source's value at this
      // moment is preserved so later drift can be detected (sourceDrifted).
      // Fail closed when there is no recorded value to assert about.
      if (!isCorrectableField(cmd.field))
        throw new OwnerCommandError("Unknown contact field.");
      const label = FIELD_LABELS[cmd.field];
      const sourceValue = opts?.sourceValue ?? null;
      const confirmedValue =
        current.fieldCorrections[cmd.field]?.ownerValue ?? sourceValue;
      if (confirmedValue === null) {
        throw new OwnerCommandError(
          "There is no recorded " + label.toLowerCase() + " to confirm.",
        );
      }
      const confirmation: FieldConfirmation = {
        field: cmd.field,
        confirmedValue,
        sourceValue,
        confirmedAt: at,
        actorLabel: actor.label,
      };
      draft = {
        at,
        objectId,
        type: "owner.confirmed-fact",
        actor,
        target: CONTACT_FIELD_TARGETS[cmd.field],
        previousBasis: {
          priorConfirmation: current.fieldConfirmations[cmd.field] ?? null,
          sourceValue,
        },
        newValue: { confirmation: true, ...confirmation },
        evidence: sourceSnapshotEvidence(sourceValue),
        note:
          "Confirmed " +
          label +
          ": the owner asserts '" +
          confirmedValue +
          "' is correct.",
        generator: "fyd-owner@1",
      };
      break;
    }
    case "revert-contact-field": {"""
assert old_case in s, "apply case"
s = s.replace(old_case, new_case, 1)

# 3. parseOwnerCommand: new case.
old_parse = """    case "revert-contact-field":
      if (!isCorrectableField(r.field)) {
        throw new OwnerCommandError(
          "revert-contact-field needs { field: phone|email|website }.",
        );
      }
      return { type: "revert-contact-field", field: r.field };"""
new_parse = """    case "revert-contact-field":
      if (!isCorrectableField(r.field)) {
        throw new OwnerCommandError(
          "revert-contact-field needs { field: phone|email|website }.",
        );
      }
      return { type: "revert-contact-field", field: r.field };
    case "confirm-contact-field":
      if (!isCorrectableField(r.field)) {
        throw new OwnerCommandError(
          "confirm-contact-field needs { field: phone|email|website }.",
        );
      }
      return { type: "confirm-contact-field", field: r.field };"""
assert old_parse in s, "parse case"
s = s.replace(old_parse, new_parse)

open(p, "w").write(s)
print("owner-store.ts patched")
