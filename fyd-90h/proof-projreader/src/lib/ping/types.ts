/** TEST DOUBLE for @/lib/ping/types (not yet landed on the a0f3724 line). */
export interface PingObject {
  id: string;
  schema: string;
  visibility: string;
  title: string;
  provenance: { ref: string; [k: string]: unknown };
  [k: string]: unknown;
}
export interface PingRelationship {
  id: string;
  subject: string;
  object: string;
  predicate: string;
  [k: string]: unknown;
}
