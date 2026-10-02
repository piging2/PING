import { NextRequest, NextResponse } from "next/server";
import { answerAskFyd, type AskFydMode } from "@/fyd/ask/visitor-answer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VALID_MODES: AskFydMode[] = ["visitor", "owner"];

/**
 * POST /api/fyd/ask
 *
 * Visitor Ask FYD: evidence-bounded Q&A over a site's PUBLIC objects only.
 *
 * Body: { siteId: string, question: string, mode?: "visitor" | "owner" }
 *
 * - mode "visitor" (default): anonymous, public objects only, no grants.
 * - mode "owner": accepted for a future authenticated lane; until that lane
 *   exists it is treated as visitor-safe and grants nothing.
 *
 * Response: { ok: true, answer: string, refusal: boolean, citations: [...] }
 *   refusal is true when the pipeline had no supporting evidence to cite.
 * Errors: 404 unknown site, 400 bad question or mode, 500 bundle invalid.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const record = (
    typeof body === "object" && body !== null ? body : {}
  ) as Record<string, unknown>;
  const siteId = typeof record.siteId === "string" ? record.siteId.trim() : "";
  const question = typeof record.question === "string" ? record.question : "";
  const mode = record.mode === undefined ? "visitor" : record.mode;

  if (!siteId) {
    return NextResponse.json({ ok: false, error: "Unknown site." }, { status: 404 });
  }
  if (!VALID_MODES.includes(mode as AskFydMode)) {
    return NextResponse.json(
      { ok: false, error: "mode must be 'visitor' or 'owner'." },
      { status: 400 },
    );
  }

  const outcome = answerAskFyd({ siteId, question, mode: mode as AskFydMode });
  if (!outcome.ok) {
    switch (outcome.error.kind) {
      case "unknown_site":
        return NextResponse.json({ ok: false, error: outcome.error.message }, { status: 404 });
      case "bad_question":
        return NextResponse.json({ ok: false, error: outcome.error.message }, { status: 400 });
      case "bad_mode":
        return NextResponse.json({ ok: false, error: outcome.error.message }, { status: 400 });
      default:
        return NextResponse.json(
          { ok: false, error: "This site is not available right now." },
          { status: 500 },
        );
    }
  }
  return NextResponse.json({
    ok: true,
    answer: outcome.answer,
    refusal: outcome.refusal,
    citations: outcome.citations,
  });
}
