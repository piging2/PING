/**
 * Phase 1 approval door — EXTENDED ACCEPTANCE TEST (T4, verifier).
 *
 * Verifies the integrated owner proposal/approval door end to end:
 *   src/fyd/approval/{types,proposal,queue,gate,journal,apply-owner-event}
 *   src/app/api/fyd/approval/route.ts   (GET both projections / POST decide)
 *   src/app/fyd/approval/page.tsx       (both cards, both buttons, one gate)
 *
 * The suite is the VERIFIER, not a second implementer: it drives the real
 * modules with real bytes and asserts observable behavior. No mock of the
 * door's own logic. The only seams touched are the ones the implementation
 * itself declares injectable:
 *   - FYD_OWNER_DIR / FYD_PROJECTION_DIR / APPROVAL_JOURNAL_PATH env
 *     overrides (fixture isolation; production paths untouched),
 *   - AnswerAskFydDeps.loadBundle (the ask module's own injectable; the
 *     injected loader resolves through the same authorized read the Ask
 *     route uses: getVerifiedPublicProjection + generateSiteSpec),
 *   - DecideApprovalContext.sourceBytesNow (the gate's live-source seam;
 *     the phase-1 route wires the queued bound bytes and documents the
 *     live re-reader as a phase-2 plug-in).
 *
 * Clock is fixed (NOW_MS). No Date.now(), no randomness in canonical
 * bytes. The canonical scenario (seed -> bind -> enqueue -> approve) is
 * replayed from scratch in fresh dirs and must produce byte-identical
 * journal and owner-log bytes; the same suite then runs in a pristine
 * clean checkout and must yield identical digests.
 *
 * Fake data discipline: phone numbers are 555-01xx (never real customer
 * data). The fixture tenant, projection, and evidence records are created
 * by this suite in temp dirs.
 *
 * Run with:
 *   npx jest --config src/fyd/approval/acceptance.jest.config.cjs
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  bindProposal,
  canonicalizeBytes,
  proposedDigestOf,
  verifyProposalBinding,
} from "@/fyd/approval/proposal";
import {
  enqueueProposal,
  getQueuedEntry,
  listPendingEntries,
  renderAskFydCard,
  renderMcWaitingCard,
  resetQueueForTests,
} from "@/fyd/approval/queue";
import { decideApproval, GateError } from "@/fyd/approval/gate";
import { readApprovalEvents } from "@/fyd/approval/journal";
import {
  FYD_OWNER_GENERATOR,
  appendOwnerEvent,
  projectOwnerState,
  readOwnerEvents,
} from "@/fyd/object/owner-events";
import {
  getPingObjectGraphSync,
  getVerifiedPublicProjectionSync,
} from "@/fyd/data/ping-object-source";
import { generateSiteSpec } from "@/fyd/proceduralize/generator";
import { isRenderable, validateSiteSpec } from "@/fyd/sitespec/validator";
import { answerAskFyd } from "@/fyd/ask/visitor-answer";
import { compilePublicSite } from "@/app/sites/_shared/spec-pipeline";
import { canonicalize } from "@/lib/ping/ask-composer";
import { GET, POST } from "@/app/api/fyd/approval/route";
import { NextRequest } from "next/server";
import type {
  DecideApprovalContext,
  OwnerProposal,
} from "@/fyd/approval/types";

// ---------------------------------------------------------------------------
// Fixture environment (isolated temp dirs; production paths untouched).
// ---------------------------------------------------------------------------

const TMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "acceptance-door-"));
const OWNER_DIR = path.join(TMP_ROOT, "owner");
const PROJ_DIR = path.join(TMP_ROOT, "projections");
const JOURNAL_PATH = path.join(TMP_ROOT, "events.jsonl");
fs.mkdirSync(OWNER_DIR, { recursive: true });
fs.mkdirSync(PROJ_DIR, { recursive: true });
process.env.FYD_OWNER_DIR = OWNER_DIR;
process.env.FYD_PROJECTION_DIR = PROJ_DIR;
process.env.APPROVAL_JOURNAL_PATH = JOURNAL_PATH;

// ---------------------------------------------------------------------------
// Fixture constants.
// ---------------------------------------------------------------------------

const SITE_ID = "phase1-acceptance-fixture"; // also the owner-store object id (G4: object id IS the site id)
const TENANT_ID = "tenant-acceptance-fixture";
const BIZ_OBJECT_ID = "biz-acceptance-001";
const SVC_OBJECT_ID = "svc-acceptance-drains";
const PHONE_A = "555-0100";
const PHONE_B = "555-0200";
const PHONE_C = "555-0300";
const OWNER_IDENTITY = "owner:acceptance-console";
const PROPOSER_IDENTITY = "ask-fyd:acceptance-agent";
const REQUIRED_CAP = "owner.correct-fact";
const CREATED_AT = "2026-09-28T21:00:00.000Z";
const EXPIRES_AT = "2026-09-28T23:00:00.000Z";
const NOW_MS = Date.parse("2026-09-28T22:00:00.000Z");
const EVIDENCE_REF = "fixture-evidence:phase1-acceptance/phone-observation-1";

function sha256hexUtf8(s: string): string {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/** The fixture BUSINESS object as the source projection carries it. */
function fixtureBusinessObject(phone: string): Record<string, unknown> {
  return {
    id: BIZ_OBJECT_ID,
    schema: "ping.social.business@1",
    visibility: "public",
    title: "Acceptance Plumbing",
    description: "Fixture plumbing business for the approval-door acceptance test.",
    fields: {
      phone,
      email: "hello@acceptance-plumbing.test",
      address: "123 Fixture St, Grand Junction, CO",
    },
    provenance: { kind: "fixture", ref: EVIDENCE_REF },
  };
}

function fixtureServiceObject(): Record<string, unknown> {
  return {
    id: SVC_OBJECT_ID,
    schema: "ping.social.service@1",
    visibility: "public",
    title: "Drain cleaning",
    description: "Fixture service for the acceptance test.",
    fields: {},
    provenance: { kind: "fixture", ref: EVIDENCE_REF },
  };
}

/** Write the PING-side projection fixture + a fixture evidence record. */
function writeFixture(projDir: string, tmpRoot: string): void {
  const graph = {
    objects: [fixtureBusinessObject(PHONE_A), fixtureServiceObject()],
    relationships: [],
  };
  const doc = {
    meta: {
      siteId: SITE_ID,
      dumpedAt: "2026-09-28T00:00:00.000Z",
      dumperVersion: "acceptance-fixture@1",
      baseDigest: "0".repeat(64),
      fixtureFileDigest: "0".repeat(64),
      fixtureHeader: "acceptance-door-fixture",
      overlayEventIds: [],
      graphDigest: sha256hexUtf8(canonicalize(graph)),
      generatedAt: "2026-09-28T00:00:00.000Z",
    },
    graph,
  };
  fs.writeFileSync(path.join(projDir, SITE_ID + ".json"), JSON.stringify(doc), "utf8");
  // The recorded fixture evidence record the DIRECT evidence_ref points at.
  const evDir = path.join(tmpRoot, "evidence");
  fs.mkdirSync(evDir, { recursive: true });
  fs.writeFileSync(
    path.join(evDir, "phone-observation-1.json"),
    JSON.stringify(
      {
        kind: "fixture-evidence",
        ref: EVIDENCE_REF,
        observed_at: "2026-09-28T20:00:00.000Z",
        observed_phone: PHONE_A,
        observer: "acceptance-fixture",
        note: "Recorded fixture observation: the source site lists phone 555-0100.",
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

/** Canonical source bytes at draft time: the business object as projected. */
function liveSourceBytes(): string {
  const v = getVerifiedPublicProjectionSync(SITE_ID, "anonymous");
  const biz = v.graph.objects.find((o) => o.id === BIZ_OBJECT_ID);
  if (!biz) throw new Error("fixture business object missing from projection");
  return canonicalizeBytes(biz);
}

/** The effective phone every projection surface must converge on. */
function effectivePhone(): string | null {
  const v = getVerifiedPublicProjectionSync(SITE_ID, "anonymous");
  const biz = v.graph.objects.find((o) => o.id === BIZ_OBJECT_ID) as
    | { fields?: Record<string, unknown> }
    | undefined;
  const p = biz?.fields?.["phone"];
  return typeof p === "string" ? p : null;
}

/** The website's own compile seam: every /sites page renders from this. */
async function websiteCompiledPhone(): Promise<string | null> {
  const compiled = await compilePublicSite(SITE_ID);
  const biz = compiled.graph.objects.find((o) => o.id === BIZ_OBJECT_ID) as
    | { fields?: Record<string, unknown> }
    | undefined;
  const p = biz?.fields?.["phone"];
  return typeof p === "string" ? p : null;
}

/** Ask FYD through the real visitor pipeline; the bundle loader resolves
 *  through the same authorized read the Ask route uses. */
function loadAcceptanceBundle(siteId: string): unknown {
  const v = getVerifiedPublicProjectionSync(siteId, "anonymous");
  const spec = generateSiteSpec(v.graph, { generatedAt: "2026-09-28T00:00:00.000Z" });
  const findings = validateSiteSpec(
    spec,
    new Set(v.graph.objects.map((o) => o.schema)),
  );
  return {
    siteId,
    businessName: "Acceptance Plumbing",
    graph: v.graph,
    spec,
    findings,
    renderable: isRenderable(findings),
    mediaManifest: null,
  };
}

function askPhone(): string {
  const out = answerAskFyd(
    {
      siteId: SITE_ID,
      question: "What is the phone number of this business?",
      mode: "visitor",
    },
    { loadBundle: loadAcceptanceBundle },
  );
  if (!out.ok) throw new Error("ask failed: " + JSON.stringify(out.error));
  return out.answer;
}

function phonePatch(from: string, to: string): Record<string, unknown> {
  return {
    kind: "fact_correction",
    objectId: SITE_ID,
    field: "phone",
    op: "CORRECT",
    value: to,
    sourceValueSeen: from,
  };
}

function bindPhoneProposal(
  proposalId: string,
  from: string,
  to: string,
  opts: {
    createdAt?: string;
    expiresAt?: string | null;
    evidenceRefs?: { ref: string; classification: "DIRECT" | "GENERATED_PRESENTATION" }[];
    patchOverride?: Record<string, unknown>;
  } = {},
): OwnerProposal {
  return bindProposal({
    proposal_id: proposalId,
    tenant_id: TENANT_ID,
    actor_id: PROPOSER_IDENTITY,
    target_object_id: SITE_ID,
    operation: "object-field-set",
    sourceBytes: liveSourceBytes(),
    patch: opts.patchOverride ?? phonePatch(from, to),
    evidence_refs: opts.evidenceRefs ?? [
      { ref: EVIDENCE_REF, classification: "DIRECT" },
    ],
    required_capability: REQUIRED_CAP,
    decision_sentence:
      "Change the business phone from " + from + " to " + to + ".",
    evidence_link: EVIDENCE_REF,
    created_at: opts.createdAt ?? CREATED_AT,
    expires_at: opts.expiresAt === undefined ? EXPIRES_AT : opts.expiresAt,
  });
}

function gateCtx(
  overrides: Partial<DecideApprovalContext> = {},
): DecideApprovalContext {
  return {
    sourceBytesNow: liveSourceBytes(),
    deciderIdentity: OWNER_IDENTITY,
    deciderCapabilities: [REQUIRED_CAP],
    journalPath: JOURNAL_PATH,
    ...overrides,
  };
}

function journalEvents(): ReturnType<typeof readApprovalEvents> {
  return readApprovalEvents(JOURNAL_PATH);
}

/** acceptance-prop-1, bound in test 4; re-enqueued after the route seam test's
 *  queue reset so the canonical scenario continues. */
let prop1: OwnerProposal | null = null;

// ---------------------------------------------------------------------------
// Canonical scenario snapshot (for the replay test).
// ---------------------------------------------------------------------------

interface CanonicalSnapshot {
  journalLine: string;
  ownerLogBytes: string;
  journalEventId: string;
  preHash: string;
  postHash: string;
  proposedDigest: string;
  baseDigest: string;
  proposalId: string;
}
let canonicalSnapshot: CanonicalSnapshot | null = null;

function captureCanonicalSnapshot(proposal: OwnerProposal): CanonicalSnapshot {
  const lines = fs
    .readFileSync(JOURNAL_PATH, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  const ownerLogPath = path.join(OWNER_DIR, SITE_ID + ".json");
  const ev = journalEvents().find((e) => e.proposal_id === proposal.proposal_id);
  if (!ev) throw new Error("canonical journal event missing");
  if (lines.length !== 1) throw new Error("expected exactly one journal line, got " + lines.length);
  return {
    journalLine: lines[0],
    ownerLogBytes: fs.readFileSync(ownerLogPath, "utf8"),
    journalEventId: ev.event_id,
    preHash: ev.pre_hash ?? "",
    postHash: ev.post_hash ?? "",
    proposedDigest: proposal.proposed_digest,
    baseDigest: proposal.base_digest,
    proposalId: proposal.proposal_id,
  };
}

function digestArtifact(s: CanonicalSnapshot): Record<string, string> {
  return {
    journal_bytes_sha256: sha256hexUtf8(s.journalLine + "\n"),
    owner_log_bytes_sha256: sha256hexUtf8(s.ownerLogBytes),
    journal_event_id: s.journalEventId,
    pre_hash: s.preHash,
    post_hash: s.postHash,
    proposed_digest: s.proposedDigest,
    base_digest: s.baseDigest,
    proposal_id: s.proposalId,
  };
}

/** Re-run the canonical scenario from scratch in fresh dirs; return digests. */
function replayCanonicalFromScratch(): Record<string, string> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "acceptance-replay-"));
  const ownerDir = path.join(root, "owner");
  const projDir = path.join(root, "projections");
  fs.mkdirSync(ownerDir, { recursive: true });
  fs.mkdirSync(projDir, { recursive: true });
  const journalPath = path.join(root, "events.jsonl");
  const prevOwner = process.env.FYD_OWNER_DIR;
  const prevProj = process.env.FYD_PROJECTION_DIR;
  resetQueueForTests();
  process.env.FYD_OWNER_DIR = ownerDir;
  process.env.FYD_PROJECTION_DIR = projDir;
  try {
    writeFixture(projDir, root);
    const p = bindPhoneProposal("acceptance-prop-1", PHONE_A, PHONE_B);
    enqueueProposal(p, liveSourceBytes());
    const res = decideApproval("acceptance-prop-1", "APPROVE", {
      sourceBytesNow: liveSourceBytes(),
      deciderIdentity: OWNER_IDENTITY,
      deciderCapabilities: [REQUIRED_CAP],
      journalPath,
    }, NOW_MS);
    if (res.outcome !== "APPLIED") throw new Error("replay did not apply: " + res.outcome);
    const snap = captureCanonicalSnapshotReplay(journalPath, ownerDir, p);
    return digestArtifact(snap);
  } finally {
    process.env.FYD_OWNER_DIR = prevOwner;
    process.env.FYD_PROJECTION_DIR = prevProj;
    resetQueueForTests();
  }
}

function captureCanonicalSnapshotReplay(
  journalPath: string,
  ownerDir: string,
  proposal: OwnerProposal,
): CanonicalSnapshot {
  const lines = fs
    .readFileSync(journalPath, "utf8")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  const ownerLogPath = path.join(ownerDir, SITE_ID + ".json");
  const prevJournal = process.env.APPROVAL_JOURNAL_PATH;
  process.env.APPROVAL_JOURNAL_PATH = journalPath;
  let ev;
  try {
    ev = readApprovalEvents(journalPath).find((e) => e.proposal_id === proposal.proposal_id);
  } finally {
    process.env.APPROVAL_JOURNAL_PATH = prevJournal;
  }
  if (!ev) throw new Error("replay journal event missing");
  return {
    journalLine: lines[0],
    ownerLogBytes: fs.readFileSync(ownerLogPath, "utf8"),
    journalEventId: ev.event_id,
    preHash: ev.pre_hash ?? "",
    postHash: ev.post_hash ?? "",
    proposedDigest: proposal.proposed_digest,
    baseDigest: proposal.base_digest,
    proposalId: proposal.proposal_id,
  };
}

// ---------------------------------------------------------------------------
// The acceptance script.
// ---------------------------------------------------------------------------

beforeAll(() => {
  resetQueueForTests();
});

test("1. seed fixture tenant: BUSINESS object with recorded DIRECT evidence", () => {
  writeFixture(PROJ_DIR, TMP_ROOT);
  // The evidence record the DIRECT ref points at exists on disk.
  expect(
    fs.existsSync(path.join(TMP_ROOT, "evidence", "phone-observation-1.json")),
  ).toBe(true);
  // The projection verifies (digest-bound) and the business object reads A.
  const raw = getPingObjectGraphSync(SITE_ID);
  const biz = raw.graph.objects.find((o) => o.id === BIZ_OBJECT_ID) as {
    fields: Record<string, unknown>;
  };
  expect(biz.fields["phone"]).toBe(PHONE_A);
  // No owner events yet: the object is pure source state.
  expect(readOwnerEvents(SITE_ID)).toEqual([]);
  expect(journalEvents()).toEqual([]);
});

test("2. proposal binding carries the full artifact", () => {
  const p = bindPhoneProposal("acceptance-prop-1", PHONE_A, PHONE_B);
  // Exact patch bytes.
  expect(canonicalizeBytes(p.patch)).toBe(canonicalizeBytes(phonePatch(PHONE_A, PHONE_B)));
  // Digests recompute independently.
  expect(p.proposed_digest).toBe(proposedDigestOf(phonePatch(PHONE_A, PHONE_B)));
  expect(p.base_digest).toMatch(/^[0-9a-f]{64}$/);
  expect(p.proposed_digest).toMatch(/^[0-9a-f]{64}$/);
  expect(verifyProposalBinding(p, liveSourceBytes())).toBe(true);
  // Identity + routing fields.
  expect(p.target_object_id).toBe(SITE_ID);
  expect(p.tenant_id).toBe(TENANT_ID);
  expect(p.actor_id).toBe(PROPOSER_IDENTITY);
  expect(p.required_capability).toBe(REQUIRED_CAP);
  expect(p.expires_at).toBe(EXPIRES_AT);
  expect(p.status).toBe("PROPOSED");
  // Evidence: one DIRECT ref pointing at the recorded fixture evidence.
  expect(p.evidence_refs).toEqual([
    { ref: EVIDENCE_REF, classification: "DIRECT" },
  ]);
  expect(p.evidence_link).toBe(EVIDENCE_REF);
  // One decision sentence.
  expect(p.decision_sentence).toBe(
    "Change the business phone from " + PHONE_A + " to " + PHONE_B + ".",
  );
});

test("3. digest law: one flipped byte changes the digest; old approval cannot authorize the mutant", () => {
  const p = bindPhoneProposal("acceptance-prop-tamper-src", PHONE_A, PHONE_B);
  const mutated = JSON.parse(JSON.stringify(p.patch)) as Record<string, unknown>;
  mutated["value"] = PHONE_B.slice(0, 6) + "9"; // flip one byte: 555-0200 -> 555-0209
  expect(proposedDigestOf(mutated)).not.toBe(p.proposed_digest);
  const mutatedProposal: OwnerProposal = { ...p, patch: mutated };
  expect(verifyProposalBinding(mutatedProposal, liveSourceBytes())).toBe(false);
});

test("4. pending projections: same proposal_id, same digest, one sentence, one link, before/after, approve/deny", async () => {
  const p = bindPhoneProposal("acceptance-prop-1", PHONE_A, PHONE_B);
  prop1 = p;
  enqueueProposal(p, liveSourceBytes());
  const ask = renderAskFydCard(p);
  const entry = getQueuedEntry("acceptance-prop-1");
  if (!entry) throw new Error("queued entry missing");
  const mc = renderMcWaitingCard(entry);
  // Identity equivalence across both projections.
  expect(ask.proposal_id).toBe("acceptance-prop-1");
  expect(mc.id).toBe("acceptance-prop-1");
  expect(ask.digest).toBe(p.proposed_digest);
  expect(mc.proposal_digest).toBe(p.proposed_digest);
  expect(ask.base_digest).toBe(p.base_digest);
  // One decision sentence, one evidence link.
  expect(ask.decision_sentence).toBe(p.decision_sentence);
  expect(mc.what).toBe(p.decision_sentence);
  expect(ask.evidence_link).toBe(EVIDENCE_REF);
  // Before/after on the MC card. The fixture's fact_correction patch carries
  // no from/to fields, so the card renders its documented byte-level
  // fallback: before = bound source bytes, after = canonical patch bytes.
  // (The human-readable A->B lives in decision_sentence; field-level
  // before/after is defined only for from/to patch shapes.)
  expect(mc.what_changes).toEqual({
    before: liveSourceBytes(),
    after: canonicalizeBytes(p.patch),
  });
  // A from/to patch shape renders field-level before/after.
  const pFromTo = bindPhoneProposal("acceptance-card-fromto", PHONE_A, PHONE_B, {
    patchOverride: { from: PHONE_A, to: PHONE_B },
  });
  enqueueProposal(pFromTo, liveSourceBytes());
  const entryFromTo = getQueuedEntry("acceptance-card-fromto");
  if (!entryFromTo) throw new Error("from/to queued entry missing");
  expect(renderMcWaitingCard(entryFromTo).what_changes).toEqual({
    before: PHONE_A,
    after: PHONE_B,
  });
  expect(mc.actions).toEqual(["APPROVE", "DENY"]);
  expect(ask.actions).toEqual(["APPROVE", "DENY"]);
  // Exact patch bytes inspectable on the Ask card.
  expect(ask.patch_bytes).toBe(canonicalizeBytes(p.patch));
  // The route GET serves the same two projections.
  const res = await GET();
  const body = (await res.json()) as {
    ok: boolean;
    items: { proposal_id: string; ask_fyd: { digest: string }; mission_control: { proposal_digest: string } }[];
  };
  expect(body.ok).toBe(true);
  const item = body.items.find((i) => i.proposal_id === "acceptance-prop-1");
  expect(item).toBeDefined();
  expect(item?.ask_fyd.digest).toBe(p.proposed_digest);
  expect(item?.mission_control.proposal_digest).toBe(p.proposed_digest);
});

test("5. BEFORE approval: object, website, Ask FYD read A; MC shows pending", async () => {
  // The object: no owner corrections yet.
  const state = projectOwnerState(SITE_ID);
  expect(state.fieldCorrections?.["phone"]).toBeUndefined();
  // The website: the real compile seam reads A.
  expect(await websiteCompiledPhone()).toBe(PHONE_A);
  expect(effectivePhone()).toBe(PHONE_A);
  // Ask FYD's answer reads A, not B.
  const answer = askPhone();
  expect(answer).toContain(PHONE_A);
  expect(answer).not.toContain(PHONE_B);
  // MC shows the proposal pending.
  expect(listPendingEntries().map((e) => e.proposal.proposal_id)).toContain("acceptance-prop-1");
});

test("6a. route POST seam: validation, 404, 409, and the decision-buttons capability observation", async () => {
  // Isolated dirs: this seam test must not pollute the canonical journal/owner log.
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "acceptance-route-"));
  const ownerDir = path.join(root, "owner");
  const journalPath = path.join(root, "events.jsonl");
  fs.mkdirSync(ownerDir, { recursive: true });
  const prevOwner = process.env.FYD_OWNER_DIR;
  const prevJournal = process.env.APPROVAL_JOURNAL_PATH;
  process.env.FYD_OWNER_DIR = ownerDir;
  process.env.APPROVAL_JOURNAL_PATH = journalPath;
  const post = async (body: unknown): Promise<{ status: number; json: unknown }> => {
    const res = await POST(
      new NextRequest("http://localhost/api/fyd/approval", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
    return { status: res.status, json: await res.json() };
  };
  try {
    // NOTE: route POST runs on the wall clock (Date.now()), while the suite's
    // other tests run on the fixed NOW_MS. Bind route proposals with a
    // far-future expiry so the wall clock cannot expire them mid-run; the
    // EXPIRED path itself is covered by test 10.
    const p = bindPhoneProposal("acceptance-route-1", PHONE_A, PHONE_B, {
      expiresAt: "2027-01-01T00:00:00.000Z",
    });
    enqueueProposal(p, liveSourceBytes());
    // Bad body -> 400.
    expect((await post({})).status).toBe(400);
    // Unknown proposal -> 404.
    expect(
      (
        await post({
          proposal_id: "nope",
          verdict: "APPROVE",
          decider_identity: OWNER_IDENTITY,
          decider_capabilities: [REQUIRED_CAP],
        })
      ).status,
    ).toBe(404);
    // OBSERVATION (not a fix): the console DecisionButtons POST
    // decider_capabilities: ["owner"], but this proposal requires
    // "owner.correct-fact". The gate fails closed -> DENIED capability-missing.
    const r1 = await post({
      proposal_id: "acceptance-route-1",
      verdict: "APPROVE",
      decider_identity: OWNER_IDENTITY,
      decider_capabilities: ["owner"],
    });
    expect(r1.status).toBe(200);
    expect(
      (r1.json as { result: { outcome: string; reason: string } }).result.outcome,
    ).toBe("DENIED");
    expect(
      (r1.json as { result: { outcome: string; reason: string } }).result.reason,
    ).toBe("capability-missing");
    // Proper capability -> APPLIED.
    const p2 = bindPhoneProposal("acceptance-route-2", PHONE_A, PHONE_B, {
      expiresAt: "2027-01-01T00:00:00.000Z",
    });
    enqueueProposal(p2, liveSourceBytes());
    const r2 = await post({
      proposal_id: "acceptance-route-2",
      verdict: "APPROVE",
      decider_identity: OWNER_IDENTITY,
      decider_capabilities: [REQUIRED_CAP],
    });
    expect(r2.status).toBe(200);
    expect((r2.json as { result: { outcome: string } }).result.outcome).toBe("APPLIED");
    // Second decision on the same proposal -> 409 already_decided (route guard).
    const r3 = await post({
      proposal_id: "acceptance-route-2",
      verdict: "APPROVE",
      decider_identity: OWNER_IDENTITY,
      decider_capabilities: [REQUIRED_CAP],
    });
    expect(r3.status).toBe(409);
    expect((r3.json as { code: string }).code).toBe("already_decided");
  } finally {
    process.env.FYD_OWNER_DIR = prevOwner;
    process.env.APPROVAL_JOURNAL_PATH = prevJournal;
    resetQueueForTests();
    // Restore the canonical pending proposal for the tests that follow.
    if (!prop1) throw new Error("prop1 missing");
    enqueueProposal(prop1, liveSourceBytes());
  }
});

test("6b. APPROVE via the gate: one canonical APPROVAL_APPROVED, pre_hash != post_hash", () => {
  const p = getQueuedEntry("acceptance-prop-1")?.proposal;
  if (!p) throw new Error("acceptance-prop-1 not queued");
  const res = decideApproval("acceptance-prop-1", "APPROVE", gateCtx(), NOW_MS);
  expect(res.outcome).toBe("APPLIED");
  expect(res.preHash).toMatch(/^[0-9a-f]{64}$/);
  expect(res.postHash).toMatch(/^[0-9a-f]{64}$/);
  expect(res.preHash).not.toBe(res.postHash);
  // Exactly ONE canonical journal event with identity, evidence, digests, pre/post.
  const events = journalEvents();
  expect(events).toHaveLength(1);
  const ev = events[0];
  expect(ev.event_type).toBe("APPROVAL_APPROVED");
  expect(ev.decider_identity).toBe(OWNER_IDENTITY);
  expect(ev.evidence_refs).toEqual([{ ref: EVIDENCE_REF, classification: "DIRECT" }]);
  expect(ev.proposal_digest).toBe(p.proposed_digest);
  expect(ev.proposal_id).toBe("acceptance-prop-1");
  expect(ev.pre_hash).toBe(res.preHash);
  expect(ev.post_hash).toBe(res.postHash);
  expect(ev.event_id).toMatch(/^[0-9a-f]{64}$/);
  expect(res.journalEventId).toBe(ev.event_id);
  // Lifecycle is terminal.
  expect(getQueuedEntry("acceptance-prop-1")?.proposal.status).toBe("APPROVED");
  canonicalSnapshot = captureCanonicalSnapshot(p);
  // Report fields.
  console.log("PROPOSAL_DIGEST=" + p.proposed_digest);
  console.log("BASE_DIGEST=" + p.base_digest);
  console.log("PRE_HASH=" + res.preHash);
  console.log("POST_HASH=" + res.postHash);
  console.log("CANONICAL_EVENT_ID=" + ev.event_id);
});

test("7. AFTER approval: object, website, Ask FYD read B; MC shows approved/applied", async () => {
  // The object: the correction is in the fold.
  const corr = projectOwnerState(SITE_ID).fieldCorrections?.["phone"] as
    | { ownerValue?: unknown }
    | undefined;
  expect(corr?.ownerValue).toBe(PHONE_B);
  // The website: the real compile seam now reads B.
  expect(await websiteCompiledPhone()).toBe(PHONE_B);
  expect(effectivePhone()).toBe(PHONE_B);
  // Ask FYD's answer states B as the number on record. The old number may
  // still appear inside the evidence-cited correction disclosure ("the
  // owner corrected this number"), which is transparency, not staleness:
  // the direct answer is B.
  const answer = askPhone();
  expect(answer).toMatch(/Phone on record: 555-0200/);
});

test("7b. MC shows the decided proposal as approved/applied (KNOWN GAP)", async () => {
  // The owner's proof requires MC to show approved/applied after the
  // decision. The route GET serves listPendingEntries() only, so a decided
  // proposal vanishes from Mission Control instead of projecting its
  // terminal state. This test documents the gap; it is expected to FAIL
  // until a terminal-state projection exists.
  const res = await GET();
  const body = (await res.json()) as {
    ok: boolean;
    items: { proposal_id: string; status?: string }[];
  };
  const decided = body.items.find((i) => i.proposal_id === "acceptance-prop-1");
  expect(decided).toBeDefined();
  expect(["APPROVED", "APPLIED"]).toContain(decided?.status);
});

test("8. all 9 gate verification steps are observable in the owner's binding order before effect", () => {
  // The binding order (owner brief, 2026-09-28): identity, capability, exact
  // digest, base state, non-terminal state, non-expiry, target, evidence
  // requirements, then canonical transition. Each adjacent pair below is a
  // conflict test: two failures are injected and the EARLIER check must win.
  const journalCount = () => journalEvents().length;
  const foldLen = () => readOwnerEvents(SITE_ID).length;

  // Step 1 before step 2: invalid identity + wrong capability -> identity wins (throws).
  {
    const p = bindPhoneProposal("acceptance-ord-12", PHONE_B, PHONE_C);
    enqueueProposal(p, liveSourceBytes());
    const n = journalCount();
    const m = foldLen();
    expect(() =>
      decideApproval(
        "acceptance-ord-12",
        "APPROVE",
        gateCtx({ deciderIdentity: "  ", deciderCapabilities: ["nope"] }),
        NOW_MS,
      ),
    ).toThrow(GateError);
    expect(journalCount()).toBe(n);
    expect(foldLen()).toBe(m);
  }

  // Step 2 before step 3: wrong capability + mutated digest -> capability-missing.
  {
    const p = bindPhoneProposal("acceptance-ord-23", PHONE_B, PHONE_C);
    enqueueProposal(p, liveSourceBytes());
    const entry = getQueuedEntry("acceptance-ord-23");
    if (!entry) throw new Error("missing");
    (entry.proposal.patch as Record<string, unknown>)["value"] = "555-0999";
    const m = foldLen();
    const r = decideApproval(
      "acceptance-ord-23",
      "APPROVE",
      gateCtx({ deciderCapabilities: ["something-else"] }),
      NOW_MS,
    );
    expect(r.outcome).toBe("DENIED");
    expect(r.reason).toBe("capability-missing");
    expect(foldLen()).toBe(m);
  }

  // Step 3 before step 4: mutated digest + stale base -> digest-invalid.
  {
    const p = bindPhoneProposal("acceptance-ord-34", PHONE_B, PHONE_C);
    enqueueProposal(p, liveSourceBytes());
    const entry = getQueuedEntry("acceptance-ord-34");
    if (!entry) throw new Error("missing");
    (entry.proposal.patch as Record<string, unknown>)["value"] = "555-0999";
    const moved = JSON.parse(liveSourceBytes()) as Record<string, unknown>;
    (moved as { fields: Record<string, unknown> }).fields = {
      ...((moved as { fields: Record<string, unknown> }).fields ?? {}),
      phone: "555-0888",
    };
    const m = foldLen();
    const r = decideApproval(
      "acceptance-ord-34",
      "APPROVE",
      gateCtx({ sourceBytesNow: canonicalizeBytes(moved) }),
      NOW_MS,
    );
    expect(r.outcome).toBe("DENIED");
    expect(r.reason).toBe("digest-invalid");
    expect(foldLen()).toBe(m);
  }

  // Step 4 before step 5: stale base on a TERMINAL proposal -> STALE_SUPERSEDED,
  // not ALREADY_DECIDED. The base check (world moved) is evaluated before the
  // lifecycle check.
  {
    const moved = JSON.parse(liveSourceBytes()) as Record<string, unknown>;
    (moved as { fields: Record<string, unknown> }).fields = {
      ...((moved as { fields: Record<string, unknown> }).fields ?? {}),
      phone: "555-0777",
    };
    const m = foldLen();
    const r = decideApproval(
      "acceptance-prop-1", // terminal: APPROVED in step 6b
      "APPROVE",
      gateCtx({ sourceBytesNow: canonicalizeBytes(moved) }),
      NOW_MS,
    );
    expect(r.outcome).toBe("STALE_SUPERSEDED");
    expect(foldLen()).toBe(m);
  }

  // Step 5 before step 6: a terminal proposal decided again AFTER its expiry
  // window must still be ALREADY_DECIDED (lifecycle before expiry).
  {
    const p = bindPhoneProposal("acceptance-ord-56", PHONE_B, PHONE_C);
    enqueueProposal(p, liveSourceBytes());
    const m = foldLen();
    const r1 = decideApproval("acceptance-ord-56", "APPROVE", gateCtx(), NOW_MS);
    expect(r1.outcome).toBe("APPLIED");
    const afterExpiryMs = Date.parse("2026-09-29T00:00:00.000Z");
    const r2 = decideApproval("acceptance-ord-56", "APPROVE", gateCtx(), afterExpiryMs);
    expect(r2.outcome).toBe("ALREADY_DECIDED");
    expect(r2.journalEventId).toBe("");
    expect(readOwnerEvents(SITE_ID).length).toBe(m + 1);
  }

  // Step 6 before step 7: expired + unresolvable target -> EXPIRED.
  {
    const p = bindPhoneProposal("acceptance-ord-67", PHONE_B, PHONE_C, {
      createdAt: "2026-09-28T18:00:00.000Z",
      expiresAt: "2026-09-28T19:00:00.000Z",
    });
    const rebound = bindProposal({
      proposal_id: "acceptance-ord-67",
      tenant_id: TENANT_ID,
      actor_id: PROPOSER_IDENTITY,
      target_object_id: SITE_ID,
      operation: "object-field-set",
      sourceBytes: liveSourceBytes(),
      patch: { ...p.patch, objectId: "some-other-object" },
      evidence_refs: [{ ref: EVIDENCE_REF, classification: "DIRECT" }],
      required_capability: REQUIRED_CAP,
      decision_sentence: "x",
      evidence_link: EVIDENCE_REF,
      created_at: "2026-09-28T18:00:00.000Z",
      expires_at: "2026-09-28T19:00:00.000Z",
    });
    enqueueProposal(rebound, liveSourceBytes());
    const m = foldLen();
    const r = decideApproval("acceptance-ord-67", "APPROVE", gateCtx(), NOW_MS);
    expect(r.outcome).toBe("EXPIRED");
    expect(foldLen()).toBe(m);
  }

  // Step 7 before step 8: unresolvable target + missing evidence -> target-unresolvable.
  {
    const p = bindPhoneProposal("acceptance-ord-78", PHONE_B, PHONE_C);
    const rebound = bindProposal({
      proposal_id: "acceptance-ord-78",
      tenant_id: TENANT_ID,
      actor_id: PROPOSER_IDENTITY,
      target_object_id: SITE_ID,
      operation: "object-field-set",
      sourceBytes: liveSourceBytes(),
      patch: { ...p.patch, objectId: "some-other-object" },
      evidence_refs: [{ ref: EVIDENCE_REF, classification: "DIRECT" }],
      required_capability: REQUIRED_CAP,
      decision_sentence: "x",
      evidence_link: EVIDENCE_REF,
      created_at: CREATED_AT,
      expires_at: EXPIRES_AT,
    });
    enqueueProposal(rebound, liveSourceBytes());
    const entry = getQueuedEntry("acceptance-ord-78");
    if (!entry) throw new Error("missing");
    entry.proposal.evidence_refs = [];
    const m = foldLen();
    const r = decideApproval("acceptance-ord-78", "APPROVE", gateCtx(), NOW_MS);
    expect(r.outcome).toBe("DENIED");
    expect(r.reason).toBe("target-unresolvable");
    expect(foldLen()).toBe(m);
  }

  // Step 8 before step 9: missing evidence -> DENIED evidence-missing, no effect.
  {
    const p = bindPhoneProposal("acceptance-ord-89", PHONE_B, PHONE_C);
    enqueueProposal(p, liveSourceBytes());
    const entry = getQueuedEntry("acceptance-ord-89");
    if (!entry) throw new Error("missing");
    entry.proposal.evidence_refs = [];
    const m = foldLen();
    const r = decideApproval("acceptance-ord-89", "APPROVE", gateCtx(), NOW_MS);
    expect(r.outcome).toBe("DENIED");
    expect(r.reason).toBe("evidence-missing");
    expect(foldLen()).toBe(m);
  }

  // Step 9: the canonical transition itself is the step-6b APPLIED case
  // (referenced): one mutation, pre/post hashes, APPROVAL_APPROVED journaled.
  expect(canonicalSnapshot).not.toBeNull();
});

test("9. DENIAL: lifecycle DENIED, APPROVAL_DENIED journaled, ZERO object mutation", () => {
  const p = bindPhoneProposal("acceptance-prop-2", PHONE_B, PHONE_C);
  enqueueProposal(p, liveSourceBytes());
  const beforeFold = JSON.stringify(readOwnerEvents(SITE_ID));
  const beforePhone = effectivePhone();
  const r = decideApproval("acceptance-prop-2", "DENY", gateCtx(), NOW_MS);
  expect(r.outcome).toBe("DENIED");
  expect(r.reason).toBe("owner-denied");
  const ev = journalEvents().find((e) => e.proposal_id === "acceptance-prop-2");
  expect(ev?.event_type).toBe("APPROVAL_DENIED");
  expect(ev?.decider_identity).toBe(OWNER_IDENTITY);
  expect(ev?.evidence_refs).toEqual([{ ref: EVIDENCE_REF, classification: "DIRECT" }]);
  expect(ev?.pre_hash).toBeNull();
  expect(ev?.post_hash).toBeNull();
  expect(getQueuedEntry("acceptance-prop-2")?.proposal.status).toBe("DENIED");
  // Zero mutation: the fold is byte-identical, the phone still reads B.
  expect(JSON.stringify(readOwnerEvents(SITE_ID))).toBe(beforeFold);
  expect(effectivePhone()).toBe(beforePhone);
  expect(beforePhone).toBe(PHONE_B);
});

test("10. TIMEOUT: EXPIRED (not DENIED), expiry evidence journaled, ZERO mutation", () => {
  const p = bindPhoneProposal("acceptance-prop-3", PHONE_B, PHONE_C, {
    createdAt: "2026-09-28T18:00:00.000Z",
    expiresAt: "2026-09-28T19:00:00.000Z",
  });
  enqueueProposal(p, liveSourceBytes());
  const beforeFold = JSON.stringify(readOwnerEvents(SITE_ID));
  const r = decideApproval("acceptance-prop-3", "APPROVE", gateCtx(), NOW_MS);
  expect(r.outcome).toBe("EXPIRED");
  expect(getQueuedEntry("acceptance-prop-3")?.proposal.status).toBe("EXPIRED");
  const ev = journalEvents().find((e) => e.proposal_id === "acceptance-prop-3");
  expect(ev?.event_type).toBe("APPROVAL_EXPIRED");
  expect(ev?.reason).toContain("expir");
  expect(JSON.stringify(readOwnerEvents(SITE_ID))).toBe(beforeFold);
  expect(effectivePhone()).toBe(PHONE_B);
  // DENY on an expired proposal is EXPIRED, never "denied".
  const p4 = bindPhoneProposal("acceptance-prop-3b", PHONE_B, PHONE_C, {
    createdAt: "2026-09-28T18:00:00.000Z",
    expiresAt: "2026-09-28T19:00:00.000Z",
  });
  enqueueProposal(p4, liveSourceBytes());
  const r2 = decideApproval("acceptance-prop-3b", "DENY", gateCtx(), NOW_MS);
  expect(r2.outcome).toBe("EXPIRED");
});

test("11. truth-boundary spot checks", () => {
  // (a) GENERATED_PRESENTATION evidence never renders as a direct fact.
  const p = bindPhoneProposal("acceptance-prop-gen", PHONE_B, PHONE_C, {
    evidenceRefs: [
      { ref: "fixture-evidence:phase1-acceptance/presentation-mockup-1", classification: "GENERATED_PRESENTATION" },
      { ref: EVIDENCE_REF, classification: "DIRECT" },
    ],
  });
  enqueueProposal(p, liveSourceBytes());
  const entry = getQueuedEntry("acceptance-prop-gen");
  if (!entry) throw new Error("missing");
  const mc = renderMcWaitingCard(entry);
  const pres = mc.evidence.find((e) => e.ref === "fixture-evidence:phase1-acceptance/presentation-mockup-1");
  expect(pres).toBeDefined();
  expect(pres?.rendering).toBe("presentation only: generated rendering, NEVER a direct fact");
  const ask = renderAskFydCard(p);
  expect(JSON.stringify(ask)).not.toContain("GENERATED_PRESENTATION");
  decideApproval("acceptance-prop-gen", "DENY", gateCtx(), NOW_MS);

  // (b) Hiding a field (presentation visibility) does not alter the factual object.
  const foldBefore = readOwnerEvents(SITE_ID);
  const phoneCorrBefore = foldBefore.filter(
    (e) => e.type === "owner.corrected-fact" && e.target === "contact:phone",
  );
  expect(phoneCorrBefore.length).toBeGreaterThan(0);
  const at = new Date(NOW_MS).toISOString();
  appendOwnerEvent(SITE_ID, {
    at,
    objectId: SITE_ID,
    type: "owner.hid-fact",
    actor: { kind: "owner", identityId: OWNER_IDENTITY, label: OWNER_IDENTITY },
    target: "contact:address",
    previousBasis: null,
    newValue: { hidden: true },
    evidence: { kind: "owner-attestation", ref: "acceptance:hide-address", detail: "acceptance spot check" },
    note: "Acceptance: owner hid the street address.",
    generator: FYD_OWNER_GENERATOR,
  });
  // The factual object is append-only: the phone correction is still there,
  // the hid-fact is recorded with provenance, nothing was deleted.
  const foldAfter = readOwnerEvents(SITE_ID);
  expect(foldAfter.length).toBe(foldBefore.length + 1);
  expect(
    foldAfter.some((e) => e.type === "owner.corrected-fact" && e.target === "contact:phone"),
  ).toBe(true);
  // The source bytes are untouched: the projection still digest-verifies.
  expect(() => getPingObjectGraphSync(SITE_ID)).not.toThrow();
  const raw = getPingObjectGraphSync(SITE_ID);
  const rawBiz = raw.graph.objects.find((o) => o.id === BIZ_OBJECT_ID) as {
    fields: Record<string, unknown>;
  };
  expect(rawBiz.fields["address"]).toBe("123 Fixture St, Grand Junction, CO");
  // The public projection hides the address (privacy is projection), while
  // the factual phone correction still reads through.
  const v = getVerifiedPublicProjectionSync(SITE_ID, "anonymous");
  const pubBiz = v.graph.objects.find((o) => o.id === BIZ_OBJECT_ID) as {
    fields: Record<string, unknown>;
  };
  expect(pubBiz.fields["address"]).toBeUndefined();
  expect(pubBiz.fields["phone"]).toBe(PHONE_B);
});

test("12. STALE BASE / TOCTOU: independent move B->C, then APPROVE the B-proposal", () => {
  // Bind the proposal against the current (B) state.
  const p = bindPhoneProposal("acceptance-prop-4", PHONE_B, PHONE_C);
  enqueueProposal(p, liveSourceBytes());
  const foldBefore = readOwnerEvents(SITE_ID).length;
  // Independently move the object B->C through the real object path (not the gate).
  const at = new Date(NOW_MS).toISOString();
  appendOwnerEvent(SITE_ID, {
    at,
    objectId: SITE_ID,
    type: "owner.corrected-fact",
    actor: { kind: "owner", identityId: "owner:manual-move", label: "owner:manual-move" },
    target: "contact:phone",
    previousBasis: null,
    newValue: {
      field: "phone",
      label: "Phone",
      sourceValue: PHONE_B,
      ownerValue: PHONE_C,
      correctedAt: at,
      actorLabel: "owner:manual-move",
      basis: "acceptance: independent owner move B->C outside the gate",
    },
    evidence: { kind: "owner-attestation", ref: "acceptance:independent-move", detail: "TOCTOU setup" },
    note: "Acceptance: independent owner move of phone B->C.",
    generator: FYD_OWNER_GENERATOR,
  });
  expect(effectivePhone()).toBe(PHONE_C);
  // The gate re-reads the LIVE source (the phase-2 live re-reader seam):
  // its base digest no longer matches the proposal's bound base.
  const r = decideApproval("acceptance-prop-4", "APPROVE", gateCtx(), NOW_MS);
  expect(r.outcome).toBe("STALE_SUPERSEDED");
  expect(getQueuedEntry("acceptance-prop-4")?.proposal.status).toBe("SUPERSEDED");
  const ev = journalEvents().find((e) => e.proposal_id === "acceptance-prop-4");
  expect(ev?.event_type).toBe("APPROVAL_SUPERSEDED");
  expect(ev?.reason).toContain("expected_base_digest=");
  expect(ev?.reason).toContain("observed_base_digest=");
  const expected = (ev?.reason ?? "").match(/expected_base_digest=([0-9a-f]{64})/)?.[1];
  const observed = (ev?.reason ?? "").match(/observed_base_digest=([0-9a-f]{64})/)?.[1];
  expect(expected).toBeDefined();
  expect(observed).toBeDefined();
  expect(observed).not.toBe(expected);
  // ZERO mutation of the C state by the gate: exactly the independent move's event.
  expect(readOwnerEvents(SITE_ID).length).toBe(foldBefore + 1);
  expect(effectivePhone()).toBe(PHONE_C);
});

test("13. DOUBLE DECISION: first terminal decision wins; second is ALREADY_DECIDED", () => {
  const p = bindPhoneProposal("acceptance-prop-5", PHONE_C, PHONE_B);
  enqueueProposal(p, liveSourceBytes());
  const journalBefore = journalEvents().length;
  const foldBefore = readOwnerEvents(SITE_ID).length;
  const r1 = decideApproval("acceptance-prop-5", "APPROVE", gateCtx(), NOW_MS);
  expect(r1.outcome).toBe("APPLIED");
  expect(journalEvents().length).toBe(journalBefore + 1);
  expect(readOwnerEvents(SITE_ID).length).toBe(foldBefore + 1);
  // Second client, same proposal: typed ALREADY_DECIDED, no journal, no mutation.
  const r2 = decideApproval("acceptance-prop-5", "APPROVE", gateCtx(), NOW_MS);
  expect(r2.outcome).toBe("ALREADY_DECIDED");
  expect(r2.journalEventId).toBe("");
  expect(journalEvents().length).toBe(journalBefore + 1);
  expect(readOwnerEvents(SITE_ID).length).toBe(foldBefore + 1);
  // A DENY after an APPROVE is also ALREADY_DECIDED.
  const r3 = decideApproval("acceptance-prop-5", "DENY", gateCtx(), NOW_MS);
  expect(r3.outcome).toBe("ALREADY_DECIDED");
  expect(journalEvents().length).toBe(journalBefore + 1);
});

test("14. REPLAY: the canonical scenario re-run from scratch is byte-identical", () => {
  if (!canonicalSnapshot) throw new Error("canonical snapshot missing");
  const expected = digestArtifact(canonicalSnapshot);
  const replayed = replayCanonicalFromScratch();
  expect(replayed).toEqual(expected);
  const outPath = process.env.ACCEPTANCE_DIGEST_OUT;
  if (outPath) {
    fs.writeFileSync(outPath, JSON.stringify(expected, null, 2) + "\n", "utf8");
  }
  console.log("REPLAY_DIGESTS=" + JSON.stringify(expected));
});

test("15. page.tsx is the same door: both cards, both buttons, one gate", () => {
  // Resolve the repo root from this file's location so the same suite runs
  // unmodified in a pristine clean checkout.
  const root = path.resolve(__dirname, "..", "..", "..", "..");
  const pageSrc = fs.readFileSync(path.join(root, "src/app/fyd/approval/page.tsx"), "utf8");
  const buttonsSrc = fs.readFileSync(
    path.join(root, "src/app/fyd/approval/decision-buttons.tsx"),
    "utf8",
  );
  // Both projections render from the same queue renderers the route uses.
  expect(pageSrc).toContain("renderAskFydCard");
  expect(pageSrc).toContain("renderMcWaitingCard");
  expect(pageSrc).toContain("listPendingEntries");
  expect(pageSrc).toContain("DecisionButtons");
  // Both buttons POST to the one gate endpoint.
  expect(buttonsSrc).toContain("/api/fyd/approval");
  expect(buttonsSrc).toContain("APPROVE");
  expect(buttonsSrc).toContain("DENY");
  // The route is the only decider both surfaces call.
  const routeSrc = fs.readFileSync(
    path.join(root, "src/app/api/fyd/approval/route.ts"),
    "utf8",
  );
  expect(routeSrc).toContain("decideApproval");
});
