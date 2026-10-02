/**
 * STUB spatial object-space for Worker B (spatial UI + route).
 *
 * Worker A's canonical src/fyd/spatial/object-space.ts will REPLACE this
 * file. Exports match the lane contract exactly; coordinate space is
 * normalized [-1,1] for x/y, radius is a fraction of half the minimum
 * viewport dimension. This stub is deterministic and pure (server-safe).
 */

import type {
  ObjectProjection,
  RelatedRef,
} from "@/fyd/object/object-projection";

export type SpatialRole =
  | "center"
  | "service"
  | "location"
  | "contact"
  | "evidence"
  | "ask"
  | "parent";

export interface SpatialNode {
  objectId: string;
  role: SpatialRole;
  anchor?: { x: number; y: number };
  /** Normalized [-1,1]. */
  x: number;
  /** Normalized [-1,1]. */
  y: number;
  /** Fraction of half the minimum stage dimension. */
  radius: number;
  scale: number;
  priority: number;
  evidenceRef?: string;
}

export interface SpatialSpec {
  focusedObjectId: string;
  focusKind: "business" | "service" | "other";
  nodes: SpatialNode[];
}

const ORBIT_R = 0.62;
const CENTER_R = 0.3;
const SAT_R = 0.085;

function place(
  partial: Omit<SpatialNode, "x" | "y"> & { angle: number },
): SpatialNode {
  const rad = (partial.angle * Math.PI) / 180;
  const { angle: _angle, ...rest } = partial;
  return {
    ...rest,
    x: Math.cos(rad) * ORBIT_R,
    y: Math.sin(rad) * ORBIT_R,
  };
}

function isBusinessFocus(focus: ObjectProjection): boolean {
  return focus.kindLabel === "Business";
}

function hasContactFacts(focus: ObjectProjection): boolean {
  const c = focus.contact;
  return Boolean(c && (c.phone || c.email || c.website));
}

function serviceNode(
  ref: RelatedRef,
  angle: number,
  priority: number,
): SpatialNode {
  return place({
    objectId: ref.id,
    role: "service",
    angle,
    radius: SAT_R,
    scale: 1,
    priority,
    evidenceRef: ref.evidence?.ref,
  });
}

/**
 * Derive the spatial layout for a focused object. Returns null when the
 * focus has no usable identity (fail closed: caller renders nothing).
 */
export function deriveSpatialSpec({
  focus,
  parent,
}: {
  focus: ObjectProjection;
  parent?: ObjectProjection;
}): SpatialSpec | null {
  if (!focus || !focus.id) return null;

  const nodes: SpatialNode[] = [
    {
      objectId: focus.id,
      role: "center",
      x: 0,
      y: 0,
      radius: CENTER_R,
      scale: 1,
      priority: 0,
    },
  ];

  let priority = 1;
  const askNode = (): SpatialNode =>
    place({
      objectId: "__ask__",
      role: "ask",
      angle: -90,
      radius: SAT_R,
      scale: 1,
      priority: priority++,
    });
  const evidenceNode = (angle: number): SpatialNode =>
    place({
      objectId: "__evidence__",
      role: "evidence",
      angle,
      radius: SAT_R,
      scale: 1,
      priority: priority++,
    });
  const contactNode = (angle: number): SpatialNode =>
    place({
      objectId: "__contact__",
      role: "contact",
      angle,
      radius: SAT_R,
      scale: 1,
      priority: priority++,
    });

  if (isBusinessFocus(focus)) {
    nodes.push(askNode());
    const services = focus.serviceRefs.slice(0, 2);
    const angles = services.length === 1 ? [0] : [-28, 28];
    services.forEach((s, i) =>
      nodes.push(serviceNode(s, angles[i] ?? 0, priority++)),
    );
    if (focus.locationRef) {
      nodes.push(
        place({
          objectId: focus.locationRef.id,
          role: "location",
          angle: 180,
          radius: SAT_R,
          scale: 1,
          priority: priority++,
          evidenceRef: focus.locationRef.evidence?.ref,
        }),
      );
    }
    if (hasContactFacts(focus)) nodes.push(contactNode(72));
    nodes.push(evidenceNode(108));
    return {
      focusedObjectId: focus.id,
      focusKind: "business",
      nodes: nodes.slice(0, 7),
    };
  }

  // Non-business focus (service, location, ...): the business recedes to a
  // parent satellite; only real-object and action satellites remain.
  const focusKind =
    focus.kindLabel === "Service" ? "service" : "other";
  if (parent && parent.id) {
    nodes.push(
      place({
        objectId: parent.id,
        role: "parent",
        angle: 180,
        radius: SAT_R,
        scale: 1,
        priority: priority++,
      }),
    );
  }
  nodes.push(askNode());
  nodes.push(evidenceNode(108));
  if (hasContactFacts(focus)) nodes.push(contactNode(28));

  return {
    focusedObjectId: focus.id,
    focusKind,
    nodes: nodes.slice(0, 7),
  };
}

export interface Viewport {
  w: number;
  h: number;
}

/**
 * Project a normalized node into viewport pixels. Pure; the caller owns any
 * touch-target clamping.
 */
export function toViewport(
  node: SpatialNode,
  viewport: Viewport,
): { x: number; y: number; r: number } {
  const { w, h } = viewport;
  const r = (node.radius * Math.min(w, h)) / 2;
  const pad = 12;
  return {
    x: w / 2 + node.x * (w / 2 - r - pad),
    y: h / 2 + node.y * (h / 2 - r - pad),
    r,
  };
}

/** Deterministic keyboard order: center first, then satellites by priority. */
export function keyboardOrder(spec: SpatialSpec): SpatialNode[] {
  return [...spec.nodes].sort((a, b) => a.priority - b.priority);
}
