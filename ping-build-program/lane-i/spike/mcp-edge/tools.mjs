// Tool definitions: one MCP tool per RESOLVED-ONLY lane-S capability record.
// Tool identity:  ping_<kind with dots->underscores>_<channel>   (deterministic)
// Schema identity: sha256 over the canonical shape descriptor (see edge.mjs).
import { z } from "zod";
import { grantedEnvelope, deniedEnvelope, draftProposal } from "./edge.mjs";

export function toolNameFor(record) {
  return `ping_${record.kind.replace(/\./g, "_")}_${record.channel}`;
}

function claimsFrom(record, extra = []) {
  const refs = (record.evidence ?? []).map((e) => e.observationId);
  return [
    { text: `Capability ${record.kind}/${record.channel} is resolved for this object.`, grade: "SUPPORTED", evidence_refs: refs },
    ...extra,
  ];
}

// READ-ONLY tool: contact.request / phone (public). Returns the public claim only.
function contactPhoneTool(record, fixture) {
  return {
    name: toolNameFor(record),
    description: record.description,
    shape: { object_id: z.string().min(1).max(128) },
    capabilityId: record.capabilityId,
    objectId: record.objectId,
    route: "direct",
    handler: async (args, { session, record: live, registry }) => {
      const tool = registry.get(toolNameFor(record));
      return grantedEnvelope(
        tool,
        session,
        args,
        {
          display_value: live.parameters.displayValue,
          action_uri: live.parameters.actionUri,
        },
        {
          claims: claimsFrom(live, [
            { text: `The business phone number is ${live.parameters.displayValue}.`, grade: "SUPPORTED", evidence_refs: (live.evidence ?? []).map((e) => e.observationId) },
          ]),
          redacted: [],
        }
      );
    },
  };
}

// PROPOSAL tool: fact.correct / console (owner-approval). NEVER applies; drafts a
// proposal into the owner loop. Approval binds the exact proposal digest (lane T).
function factCorrectTool(record, fixture) {
  return {
    name: toolNameFor(record),
    description: record.description,
    shape: {
      object_id: z.string().min(1).max(128),
      field: z.enum(["phone", "hours", "website"]),
      corrected_value: z.string().min(1).max(500),
      base_digest: z.string().length(64, "base_digest must be the 64-hex object digest the correction was drafted against"),
      rationale: z.string().max(500).optional(),
      idempotency_key: z.string().min(1).max(64).optional(),
    },
    capabilityId: record.capabilityId,
    objectId: record.objectId,
    route: "propose",
    handler: async (args, { session, record: live, registry }) => {
      const tool = registry.get(toolNameFor(record));
      if (args.base_digest !== fixture.objectDigest) {
        // propose.ts law: a stale draft base is a 409, never an apply.
        return deniedEnvelope(tool, session, args, "base digest is stale; re-read the object and draft again", "proposal.stale-base", { leakDetail: true });
      }
      let draft;
      try {
        draft = draftProposal(tool, session, live, args);
      } catch (e) {
        return deniedEnvelope(tool, session, args, e.message, e.code ?? "proposal.error", { leakDetail: true });
      }
      const { proposal, replayed } = draft;
      return grantedEnvelope(
        tool,
        session,
        args,
        {
          proposal_id: proposal.proposal_id,
          proposal_digest: proposal.proposal_digest,
          status: proposal.status,
          replayed,
          next: "awaiting_owner_approval — approval binds this exact digest; the MCP surface cannot approve",
        },
        { claims: claimsFrom(live, [{ text: "No canonical state was changed by this call.", grade: "DERIVED", evidence_refs: [] }]) }
      );
    },
  };
}

// OWNER-ONLY tool: report.view / console, existenceSensitivity=high.
// Visitors never see it in tools/list; a direct call gets the generic no-leak denial.
function reportViewTool(record) {
  return {
    name: toolNameFor(record),
    description: record.description,
    shape: { object_id: z.string().min(1).max(128) },
    capabilityId: record.capabilityId,
    objectId: record.objectId,
    route: "direct",
    handler: async (args, { session, record: live, registry }) => {
      const tool = registry.get(toolNameFor(record));
      return grantedEnvelope(
        tool,
        session,
        args,
        { report: "synthetic owner report: 12 service calls this week, 0 missed", note: "spike fixture data" },
        { claims: claimsFrom(live), redacted: [] }
      );
    },
  };
}

const BUILDERS = {
  "contact.request|phone": contactPhoneTool,
  "fact.correct|console": factCorrectTool,
  "report.view|console": reportViewTool,
};

// Generic read-only fallback for selected read kinds: returns the public claim
// (displayValue/actionUri) as DATA. Consequential kinds never get a fallback.
const READ_FALLBACK_KINDS = new Set(["contact.request", "visit.in_person"]);
function genericReadTool(record) {
  return {
    name: toolNameFor(record),
    description: record.description,
    shape: { object_id: z.string().min(1).max(128) },
    capabilityId: record.capabilityId,
    objectId: record.objectId,
    route: "direct",
    handler: async (args, { session, record: live, registry }) => {
      const tool = registry.get(toolNameFor(record));
      return grantedEnvelope(
        tool,
        session,
        args,
        { display_value: live.parameters.displayValue ?? null, action_uri: live.parameters.actionUri ?? null },
        { claims: claimsFrom(live) }
      );
    },
  };
}

export function buildToolsForRecords(records, fixture) {
  const defs = [];
  const skipped = [];
  for (const record of records) {
    const key = `${record.kind}|${record.channel}`;
    const builder = BUILDERS[key] ?? (READ_FALLBACK_KINDS.has(record.kind) ? genericReadTool : null);
    if (!builder) {
      skipped.push({ capabilityId: record.capabilityId, kind: record.kind, reason: "no tool builder for this kind/channel (not selected for the edge)" });
      continue;
    }
    defs.push(builder(record, fixture));
  }
  return { defs, skipped };
}
