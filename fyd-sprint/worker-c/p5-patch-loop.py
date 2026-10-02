p = "src/app/api/fyd/objects/[objectId]/overrides/patch-loop.ts"
s = open(p).read()

anchor = """    default:
      return null;"""
new_case = """    case "confirm-contact-field": {
      const correction = overrides.fieldCorrections[command.field];
      const effective = correction
        ? correction.ownerValue
        : sourceFieldValue(objectId, command.field);
      if (effective === null) return null;
      return {
        before: command.field + ": " + effective,
        after: command.field + ": " + effective + " (owner confirms correct)",
        evidenceImpact:
          "Appends one owner.confirmed-fact event (owner attestation) " +
          "recording that the owner asserts the current " +
          command.field +
          " is correct, with actor and timestamp. Nothing is rewritten: the " +
          "source record is unchanged, and the confirmation keeps the " +
          "source's value at confirmation time so later source drift can be " +
          "detected (sourceDrifted).",
        capabilityImpact,
      };
    }
    default:
      return null;"""
assert anchor in s, "preview anchor"
s = s.replace(anchor, new_case)

open(p, "w").write(s)
print("patch-loop.ts patched")
