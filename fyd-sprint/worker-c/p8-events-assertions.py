p = "src/fyd/object/owner-events.ts"
s = open(p).read()

old = """        ) {
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
new = """        ) {
          const field = contactFieldOf(e.target);
          const prior = o.fieldConfirmations[field] ?? null;
          const confirmedValue =
            typeof nv.confirmedValue === "string" ? nv.confirmedValue : null;
          o.fieldConfirmations[field] = {
            // Full OwnerAssertion contract (see types.ts): actor,
            // subject/object, field/path, operation, value, visibility,
            // timestamp, superseded assertion, source/evidence relationship.
            subject: e.objectId,
            path: e.target as
              | "contact:phone"
              | "contact:email"
              | "contact:website",
            operation: "confirm",
            value: confirmedValue,
            visibility: "unchanged",
            actor: { kind: e.actor.kind, label: e.actor.label },
            at: e.at,
            supersedes: prior?.eventId ?? null,
            evidence: {
              kind: e.evidence.kind,
              ref: e.evidence.ref,
              detail: e.evidence.detail,
            },
            eventId: e.id,
            // Confirmation specifics.
            field,
            confirmedValue,
            sourceValue:
              typeof nv.sourceValue === "string" ? nv.sourceValue : null,
            confirmedAt: e.at,
            actorLabel: e.actor.label,
          };
        }
        break;
      }"""
assert old in s, "confirm projection"
s = s.replace(old, new)

old = """      if (e.target === ADDRESS_TARGET) {
        o.addressVisibility = "hidden";
        continue;
      }"""
new = """      if (e.target === ADDRESS_TARGET) {
        o.addressVisibility = "hidden";
        // Persistent HIDE assertion carrying the full OwnerAssertion
        // contract: the pipeline never owns the presentation decision.
        const prior = o.addressVisibilityAssertion;
        o.addressVisibilityAssertion = {
          subject: e.objectId,
          path: ADDRESS_TARGET,
          operation: "hide",
          value: "hidden",
          visibility: "hidden",
          actor: { kind: e.actor.kind, label: e.actor.label },
          at: e.at,
          supersedes: prior?.eventId ?? null,
          evidence: {
            kind: e.evidence.kind,
            ref: e.evidence.ref,
            detail: e.evidence.detail,
          },
          eventId: e.id,
        };
        continue;
      }"""
assert old in s, "hide projection"
s = s.replace(old, new)

old = """      if (e.target === ADDRESS_TARGET) {
        o.addressVisibility = "public";
        continue;
      }"""
new = """      if (e.target === ADDRESS_TARGET) {
        o.addressVisibility = "public";
        // Persistent SHOW assertion carrying the full OwnerAssertion
        // contract: the pipeline never owns the presentation decision.
        const prior = o.addressVisibilityAssertion;
        o.addressVisibilityAssertion = {
          subject: e.objectId,
          path: ADDRESS_TARGET,
          operation: "show",
          value: "public",
          visibility: "public",
          actor: { kind: e.actor.kind, label: e.actor.label },
          at: e.at,
          supersedes: prior?.eventId ?? null,
          evidence: {
            kind: e.evidence.kind,
            ref: e.evidence.ref,
            detail: e.evidence.detail,
          },
          eventId: e.id,
        };
        continue;
      }"""
assert old in s, "show projection"
s = s.replace(old, new)

open(p, "w").write(s)
print("owner-events.ts assertion projection patched")
