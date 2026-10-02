/**
 * Owner intent interpreter: deterministic plain language -> typed
 * OwnerCommand. No AI, no network. Only the documented shapes act; anything
 * else returns null so the surface can answer it as evidence Q&A.
 */

import { knownServices } from "./view";
import type { OwnerCommand } from "./types";

function findServiceId(needle: string, known: Map<string, string>): string | null {
  const n = needle.trim().toLowerCase();
  for (const [id, name] of known) {
    const ln = name.toLowerCase();
    if (ln === n || ln.startsWith(n) || n.startsWith(ln)) return id;
  }
  return null;
}

export interface TextProposal {
  command: OwnerCommand;
  summary: string;
}

/**
 * Interprets one line of owner intent. Returns a typed proposal or null
 * when the text is not an understood command. Never mutates anything.
 */
export function interpretTextCommand(text: string, objectId: string): TextProposal | null {
  const { names } = knownServices(objectId);
  const lower = text.trim().toLowerCase();
  let m: RegExpMatchArray | null;

  if ((m = lower.match(/^put\s+(.+?)\s+first$/))) {
    const id = findServiceId(m[1], names);
    if (!id) return null;
    return {
      command: { type: "move-service", id, to: "first" },
      summary: `Move ${names.get(id)} to the top of the services list.`,
    };
  }
  if ((m = lower.match(/^put\s+(.+?)\s+last$/))) {
    const id = findServiceId(m[1], names);
    if (!id) return null;
    return {
      command: { type: "move-service", id, to: "last" },
      summary: `Move ${names.get(id)} to the end of the services list.`,
    };
  }
  if ((m = lower.match(/^move\s+(.+?)\s+(up|down)$/))) {
    const id = findServiceId(m[1], names);
    if (!id) return null;
    const dir = m[2] as "up" | "down";
    return {
      command: { type: "move-service", id, to: dir },
      summary: `Move ${names.get(id)} one step ${dir} in the services list.`,
    };
  }
  if ((m = lower.match(/^(hide|show)\s+(.+)$/))) {
    const id = findServiceId(m[2], names);
    if (!id) return null;
    const visible = m[1] === "show";
    return {
      command: { type: "set-service-visibility", id, visible },
      summary: visible
        ? `Show ${names.get(id)} on the public page.`
        : `Hide ${names.get(id)} from the public page.`,
    };
  }
  if ((m = lower.match(/^add\s+(.+)$/))) {
    const name = m[1].trim();
    if (!name) return null;
    const pretty = name.charAt(0).toUpperCase() + name.slice(1);
    return {
      command: { type: "add-service", name: pretty },
      summary: `Add "${pretty}" to the services list.`,
    };
  }
  return null;
}
