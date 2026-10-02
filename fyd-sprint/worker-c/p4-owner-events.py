p = "src/fyd/object/owner-events.ts"
s = open(p).read()

old_case = """      case "owner.confirmed-fact":
        // Attestation only: no state change.
        break;"""
new_case = """      case "owner.confirmed-fact": {
        // Attestation only by default: no state change. EXCEPTION: a
        // confirm-contact-field assertion (newValue.confirmation === true
        // on a contact target) IS projected into fieldConfirmations so the
        // assertion survives regeneration and re-observation, and so the
        // read model can surface sourceDrifted against the source value
        // recorded at confirmation time. All other confirmed-fact events
        // (migration log lines, no-op confirmations) stay no-ops.
        const nv =
          e.newValue !== null && typeof e.newValue === "object"
            ? (e.newValue as {
                confirmation?: unknown;
                confirmedValue?: unknown;
                sourceValue?: unknown;
                actorLabel?: unknown;
              })
            : null;
        if (
          nv !== null &&
          nv.confirmation === true &&
          isContactFieldTarget(e.target)
        ) {
          const field = contactFieldOf(e.target);
          o.fieldConfirmations[field] = {
            field,
            confirmedValue:
              typeof nv.confirmedValue === "string" ? nv.confirmedValue : null,
            sourceValue:
              typeof nv.sourceValue === "string" ? nv.sourceValue : null,
            confirmedAt: e.at,
            actorLabel:
              typeof nv.actorLabel === "string" ? nv.actorLabel : "unknown",
          };
        }
        break;
      }"""
assert old_case in s, "reducer case"
s = s.replace(old_case, new_case)

open(p, "w").write(s)
print("owner-events.ts patched")
