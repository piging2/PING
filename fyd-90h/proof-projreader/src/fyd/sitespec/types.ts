/** TEST DOUBLE for @/fyd/sitespec/types (real module has dangling imports not yet landed). Mirrors the tree's declared shape. */
import type { PingObject, PingRelationship } from "@/lib/ping/types";
export interface ObjectGraph {
  objects: PingObject[];
  relationships: PingRelationship[];
}
