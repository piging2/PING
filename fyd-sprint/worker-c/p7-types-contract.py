p = "src/fyd/object/types.ts"
s = open(p).read()

# --- 1. OwnerOverrides: document the assertion contract + add the address
# --- visibility assertion projection. ---
old = """  /**
   * Owner-attested field confirmations keyed by field ("phone" | "email" |
   * "website"). A CONFIRM assertion: the owner says the current effective
   * value is correct. Like corrections, it never rewrites evidence: the
   * record keeps the source value at confirmation time (sourceValue) so the
   * read model can surface sourceDrifted when the source later moves.
   */
  fieldConfirmations: Record<string, FieldConfirmation>;"""
new = """  /**
   * Owner-attested field confirmations keyed by field ("phone" | "email" |
   * "website"). A CONFIRM assertion: the owner says the current effective
   * value is correct. Like corrections, it never rewrites evidence: the
   * record keeps the source value at confirmation time (sourceValue) so the
   * read model can surface sourceDrifted when the source later moves.
   * Every record carries the full OwnerAssertion contract below.
   */
  fieldConfirmations: Record<string, FieldConfirmation>;
  /**
   * The owner's address-visibility decision as a persistent assertion
   * (SHOW/HIDE per the presentation-decision directive: the pipeline does
   * not own the presentation decision; the owner does). Null when the
   * owner has never decided. Carries the full OwnerAssertion contract.
   */
  addressVisibilityAssertion: AddressVisibilityAssertion | null;"""
assert old in s, "overrides fields"
s = s.replace(old, new)

old = """  fieldCorrections: {},
  fieldConfirmations: {},
  history: [],
});"""
new = """  fieldCorrections: {},
  fieldConfirmations: {},
  addressVisibilityAssertion: null,
  history: [],
});"""
assert old in s, "empty"
s = s.replace(old, new)

# --- 2. Replace FieldConfirmation with the explicit OwnerAssertion contract. ---
old = """/**
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
new = """/**
 * The explicit owner-assertion semantic contract
 * (FYD-24H-BUILDER-DECISIONS 2026-09-22, OWNER ASSERTIONS). Every owner
 * assertion in the store shape carries all ten dimensions. The event log
 * is the durable audit seam; this projection is the operational read shape
 * over it. The store is NOT constitutional truth.
 */
export interface OwnerAssertion {
  /** Subject/object: the object id this assertion is about. */
  subject: string;
  /** Field/path: the fact address, e.g. "contact:phone". */
  path: string;
  /** Operation: confirm | correct | hide | show | move | add | restore. */
  operation: string;
  /** The asserted value. */
  value: unknown;
  /** Visibility effect ("unchanged" when the assertion changes none). */
  visibility: string;
  /** The actor the assertion is recorded under. */
  actor: { kind: string; label: string };
  /** ISO timestamp of the assertion. */
  at: string;
  /** Event id of the assertion this one supersedes, or null. */
  supersedes: string | null;
  /** Source/evidence relationship: what the source said and where. */
  evidence: { kind: string; ref: string; detail?: string };
  /** The assertion's own event id in the log. */
  eventId: string;
}

/**
 * One owner CONFIRM assertion as projected over the event log. The
 * confirmed value is the effective value at confirmation time (the owner
 * corrected value when a correction exists, else the source value).
 */
export interface FieldConfirmation extends OwnerAssertion {
  path: "contact:phone" | "contact:email" | "contact:website";
  operation: "confirm";
  value: string | null;
  visibility: "unchanged";
  /** Short field name ("phone" | "email" | "website"). */
  field: "phone" | "email" | "website";
  /** The effective value asserted correct. */
  confirmedValue: string | null;
  /** The source's value at confirmation time (drift baseline). */
  sourceValue: string | null;
  /** Alias of `at`, kept for read-model familiarity. */
  confirmedAt: string;
  /** Alias of `actor.label`, kept for read-model familiarity. */
  actorLabel: string;
}

/**
 * The owner's address presentation decision as a persistent assertion.
 * SHOW/HIDE/CORRECT are owner operations; the pipeline never owns the
 * presentation decision (FYD-24H-BUILDER-DECISIONS 2026-09-22, MEDIA).
 */
export interface AddressVisibilityAssertion extends OwnerAssertion {
  path: "contact:address";
  operation: "hide" | "show";
  value: "hidden" | "public";
  visibility: "hidden" | "public";
}"""
assert old in s, "fieldconfirmation"
s = s.replace(old, new)

open(p, "w").write(s)
print("types.ts assertion contract patched")
