/**
 * Owner state store (server-only).
 *
 * Owner decisions are DURABLE state, not generated cache. They live in
 * data/fyd-owner/<objectId>.json, one file per object, completely separate
 * from source state (fixtures, manifests). Source re-ingestion reads and
 * writes only source state; it can never erase owner intent.
 *
 * All commands fail closed: unknown ids, bad shapes, and empty names are
 * rejected with a typed error and nothing is written.
 *
 * FYD_OWNER_DIR env override exists so tests can use a temp directory.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { OwnerCommand, OwnerOverrides } from "./types";
import { EMPTY_OVERRIDES } from "./types";
import { slugifyService } from "./services";

export class OwnerCommandError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OwnerCommandError";
  }
}

function ownerDir(): string {
  const override = process.env.FYD_OWNER_DIR;
  if (override) return override;
  return join(process.cwd(), "data", "fyd-owner");
}

function ownerPath(objectId: string): string {
  if (!/^[a-z0-9-]+$/.test(objectId)) {
    throw new OwnerCommandError("Invalid object id.");
  }
  return join(ownerDir(), objectId + ".json");
}

function isValidOverrides(v: unknown): v is OwnerOverrides {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    r.version === 1 &&
    typeof r.objectId === "string" &&
    Array.isArray(r.serviceOrder) &&
    Array.isArray(r.hiddenServices) &&
    Array.isArray(r.addedServices) &&
    Array.isArray(r.history)
  );
}

export function readOverrides(objectId: string): OwnerOverrides {
  const base = EMPTY_OVERRIDES(objectId);
  try {
    const raw = readFileSync(ownerPath(objectId), "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isValidOverrides(parsed) || parsed.objectId !== objectId) return base;
    return parsed;
  } catch {
    return base;
  }
}

function writeOverrides(o: OwnerOverrides): void {
  const path = ownerPath(o.objectId);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = path + ".tmp";
  writeFileSync(tmp, JSON.stringify(o, null, 2) + "\n", "utf8");
  // Atomic replace so a crash can never leave a half-written file.
  const { renameSync } = require("node:fs") as typeof import("node:fs");
  renameSync(tmp, path);
}

function stamp(o: OwnerOverrides): void {
  o.updatedAt = new Date().toISOString();
}

function log(o: OwnerOverrides, text: string): void {
  o.history.push({ at: new Date().toISOString(), text });
  if (o.history.length > 200) o.history = o.history.slice(-200);
}

/**
 * Apply one owner command. `knownServiceIds` is the current full derived +
 * added id set; commands referencing unknown ids are rejected.
 * Returns the updated overrides (also persisted).
 */
export function applyOwnerCommand(
  objectId: string,
  cmd: OwnerCommand,
  knownServiceIds: string[],
  knownServiceNames: Map<string, string>,
): OwnerOverrides {
  const o = readOverrides(objectId);
  const known = new Set(knownServiceIds);

  switch (cmd.type) {
    case "move-service": {
      if (!known.has(cmd.id)) throw new OwnerCommandError("Unknown service.");
      // Materialize the current order: owner order first, then any new ids.
      const order = [...o.serviceOrder.filter((id) => known.has(id))];
      for (const id of knownServiceIds) if (!order.includes(id)) order.push(id);
      const idx = order.indexOf(cmd.id);
      order.splice(idx, 1);
      if (cmd.to === "first") order.unshift(cmd.id);
      else if (cmd.to === "last") order.push(cmd.id);
      else if (cmd.to === "up") order.splice(Math.max(0, idx - 1), 0, cmd.id);
      else order.splice(Math.min(order.length, idx + 1), 0, cmd.id);
      o.serviceOrder = order;
      const name = knownServiceNames.get(cmd.id) ?? cmd.id;
      log(o, `Moved ${name} ${cmd.to === "first" ? "to the top" : cmd.to === "last" ? "to the bottom" : cmd.to}.`);
      break;
    }
    case "set-service-visibility": {
      if (!known.has(cmd.id)) throw new OwnerCommandError("Unknown service.");
      const name = knownServiceNames.get(cmd.id) ?? cmd.id;
      if (cmd.visible) {
        o.hiddenServices = o.hiddenServices.filter((id) => id !== cmd.id);
        log(o, `Showed ${name}.`);
      } else {
        if (!o.hiddenServices.includes(cmd.id)) o.hiddenServices.push(cmd.id);
        log(o, `Hid ${name}.`);
      }
      break;
    }
    case "add-service": {
      const name = cmd.name.trim().replace(/\s+/g, " ");
      if (!name || name.length > 60) throw new OwnerCommandError("Service name must be 1-60 characters.");
      const id = slugifyService(name);
      if (known.has(id) || o.addedServices.some((s) => s.id === id)) {
        throw new OwnerCommandError("That service already exists.");
      }
      o.addedServices.push({ id, name });
      log(o, `Added ${name}.`);
      break;
    }
    case "set-address-visibility": {
      if (cmd.visibility !== "public" && cmd.visibility !== "hidden") {
        throw new OwnerCommandError("Visibility must be public or hidden.");
      }
      o.addressVisibility = cmd.visibility;
      log(o, cmd.visibility === "hidden" ? "Hid the street address." : "Made the address public.");
      break;
    }
    default:
      throw new OwnerCommandError("Unknown command.");
  }

  stamp(o);
  writeOverrides(o);
  return o;
}

/** Validate a raw JSON body into an OwnerCommand, or throw. */
export function parseOwnerCommand(body: unknown): OwnerCommand {
  if (typeof body !== "object" || body === null) throw new OwnerCommandError("Command must be an object.");
  const r = body as Record<string, unknown>;
  switch (r.type) {
    case "move-service":
      if (typeof r.id !== "string" || !["up", "down", "first", "last"].includes(r.to as string)) {
        throw new OwnerCommandError("move-service needs { id, to: up|down|first|last }.");
      }
      return { type: "move-service", id: r.id, to: r.to as "up" | "down" | "first" | "last" };
    case "set-service-visibility":
      if (typeof r.id !== "string" || typeof r.visible !== "boolean") {
        throw new OwnerCommandError("set-service-visibility needs { id, visible }.");
      }
      return { type: "set-service-visibility", id: r.id, visible: r.visible };
    case "add-service":
      if (typeof r.name !== "string") throw new OwnerCommandError("add-service needs { name }.");
      return { type: "add-service", name: r.name };
    case "set-address-visibility":
      if (r.visibility !== "public" && r.visibility !== "hidden") {
        throw new OwnerCommandError("set-address-visibility needs { visibility: public|hidden }.");
      }
      return { type: "set-address-visibility", visibility: r.visibility };
    default:
      throw new OwnerCommandError("Unknown command type.");
  }
}
