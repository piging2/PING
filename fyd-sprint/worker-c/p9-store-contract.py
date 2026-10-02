p = "src/fyd/object/owner-store.ts"
s = open(p).read()

old = """      const confirmation: FieldConfirmation = {
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
        evidence: sourceSnapshotEvidence(sourceValue),"""
new = """      // The CONFIRM assertion, carrying the explicit owner-assertion
      // contract (see types.ts OwnerAssertion): actor, subject/object,
      // field/path, operation, value, visibility, timestamp, superseded
      // assertion, source/evidence relationship. `eventId` is assigned by
      // the log at append time, so the draft omits it; the reducer fills
      // it from the event envelope when projecting fieldConfirmations.
      const prior = current.fieldConfirmations[cmd.field] ?? null;
      const target = CONTACT_FIELD_TARGETS[cmd.field];
      const evidence = sourceSnapshotEvidence(sourceValue);
      const confirmation: Omit<FieldConfirmation, "eventId"> = {
        subject: objectId,
        path: target,
        operation: "confirm",
        value: confirmedValue,
        visibility: "unchanged",
        actor: { kind: actor.kind, label: actor.label },
        at,
        supersedes: prior?.eventId ?? null,
        evidence: {
          kind: evidence.kind,
          ref: evidence.ref,
          detail: evidence.detail,
        },
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
        target,
        previousBasis: {
          priorConfirmation: prior,
          sourceValue,
          // Explicit supersede link to the superseded assertion event.
          supersedesEventId: prior?.eventId ?? null,
        },
        newValue: { confirmation: true, ...confirmation },
        evidence,"""
assert old in s, "confirm draft"
s = s.replace(old, new)
open(p, "w").write(s)
print("owner-store.ts confirm contract patched")
