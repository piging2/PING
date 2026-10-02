p = "src/fyd/object/types.ts"
s = open(p).read()

old_fc = """  fieldCorrections: Record<string, OwnerFieldCorrection>;
  /** Human-language log, newest last. */
  history: { at: string; text: string }[];
}"""
new_fc = """  fieldCorrections: Record<string, OwnerFieldCorrection>;
  /**
   * Owner-attested field confirmations keyed by field ("phone" | "email" |
   * "website"). A CONFIRM assertion: the owner says the current effective
   * value is correct. Like corrections, it never rewrites evidence: the
   * record keeps the source value at confirmation time (sourceValue) so the
   * read model can surface sourceDrifted when the source later moves.
   */
  fieldConfirmations: Record<string, FieldConfirmation>;
  /** Human-language log, newest last. */
  history: { at: string; text: string }[];
}

/**
 * One owner confirmation as projected over the event log. The confirmed
 * value is the effective value at confirmation time (the owner corrected
 * value when a correction exists, else the source value).
 */
export interface FieldConfirmation {
  field: "phone" | "email" | "website";
  confirmedValue: string | null;
  sourceValue: string | null;
  confirmedAt: string;
  actorLabel: string;
}"""
assert old_fc in s, "fc block"
s = s.replace(old_fc, new_fc)

old_empty = """  fieldCorrections: {},
  history: [],
});"""
new_empty = """  fieldCorrections: {},
  fieldConfirmations: {},
  history: [],
});"""
assert old_empty in s, "empty"
s = s.replace(old_empty, new_empty)

old_cmd = """  | { type: "set-contact-field"; field: "phone" | "email" | "website"; value: string }
  | { type: "revert-contact-field"; field: "phone" | "email" | "website" };"""
new_cmd = """  | { type: "set-contact-field"; field: "phone" | "email" | "website"; value: string }
  | { type: "revert-contact-field"; field: "phone" | "email" | "website" }
  | { type: "confirm-contact-field"; field: "phone" | "email" | "website" };"""
assert old_cmd in s, "cmd"
s = s.replace(old_cmd, new_cmd)

open(p, "w").write(s)
print("types.ts patched")
