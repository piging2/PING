/** TEST DOUBLE for @/fyd/customize/types (real module imports not-yet-landed patch types). Declarations copied verbatim from the tree's shapes. */
export interface PresentationIntentDirective {
  intentId: string;
  siteIntent: { kind: string; [k: string]: unknown };
  proposal: { proposalDigest: string; [k: string]: unknown };
  approval: { proposalDigest: string; approvedBy: string; approvedAt: string; note: string; eventId?: string };
}
export interface PresentationIntentBlock {
  directives: PresentationIntentDirective[];
  provenance: { kind: "owner-presentation-intent"; note: string; eventIds: string[] };
}
export type FieldVisibilityPolicy = "hide" | "show" | "coarse" | "members";
export interface FieldVisibilityDirective {
  directiveId: string;
  objectId: string;
  field: string;
  policy: FieldVisibilityPolicy;
  version?: number;
  proposalDigest: string;
  approval: { proposalDigest: string; approvedBy: string; approvedAt: string; note: string; eventId?: string };
}
export interface FieldVisibilityBlock {
  decisions: FieldVisibilityDirective[];
  provenance: { kind: "owner-field-visibility"; note: string; eventIds: string[] };
}
