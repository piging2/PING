"use client";

/**
 * ObjectCircle: the generic PING object projection for the margin object
 * layer (Nolan, 2026-09-22: "Margins Are the Object Layer").
 *
 * INTERACTION MODEL (Nolan, 2026-09-22: REST -> PEEK -> OBJECT -> ASK.
 * "Page first. Object available. Intelligence one gesture away."):
 * - REST: the small quiet circle (40px). Thin subtle identity ring only;
 *   no gold glow. Dramatically quieter than before.
 * - PEEK: hover / focus / tap opens a vertically expanding oval (200x300):
 *   identity + essential context (name, category, location, one-line
 *   why-it's-here) with three entry actions stacked vertically: Ask FYD,
 *   Follow, Expand. Never the full capability list.
 * - OBJECT (STATE 2): the Expand entry action (or a second tap) pins the
 *   compact identity card: a 300x400 vertical oval carrying ONLY name,
 *   object type, a punchy one-sentence short description, contact/location
 *   where public, and a coherent two-column action grid (Website, Contact,
 *   Follow, Like as capabilities allow) with Ask FYD as one full-width
 *   action. HARD INVARIANT: the default card never scrolls, vertically or
 *   horizontally. If content does not fit, the composition is wrong; the
 *   card never solves it with overflow.
 * - ASK (STATE 3): the Ask FYD action opens the intelligence mode: a
 *   300x460 vertical oval with the object-targeted Ask FYD interface
 *   (input, sample questions, answers). Suggestions live ONLY here, never
 *   in the compact card. Intelligence is explicitly requested; only then
 *   do we spend the space.
 * - ACT: follow / like / website / contact, capability-gated.
 * - RECEIPT: after a successful follow, a minimal "DONE: you're following
 *   {name}" confirmation settles into the persistent Following state.
 *   Refresh keeps it (durable server store). The toggle is never presented
 *   as gateway-journaled: the homepage has no viewer identity.
 *
 * VISUAL CORRECTION (Nolan, 2026-09-22, BINDING; supersedes the ornate
 * frame where they conflict): the Circle is a small intelligent business
 * card, not a sidebar application. The dark heavy panel is gone: the card
 * sits on the generated site in a light warm-paper surface with ink text,
 * a single thin gold oval edge, and a whisper of purple glow. The gem
 * nodes, sparkle accents, and bottom Fyd tab are removed; decoration never
 * outranks information. FYD identity survives as the gold edge plus the
 * royal-purple Ask FYD action. Premium, not game-like.
 *
 * FYD VISUAL IDENTITY: ROYAL MIRROR (Nolan, 2026-09-22, BINDING),
 * quieted by the 2026-09-22 visual correction (which wins on conflict).
 * One frozen shape system: CIRCLES + OVALS. Circle = object/identity;
 * oval/capsule = interaction/expansion. Purple = the royal field, gold =
 * emphasis/edge/highlight (never whole solid-gold surfaces). All values
 * live in ./fyd-tokens (the `fyd` namespace); no scattered purple/gold
 * hex values. ROYAL MIRROR is the FYD product/intelligence layer only;
 * customer sites keep their own brand.
 * - rest: the small quiet circle with a slow, subtle mirror sheen
 *   (elusive at rest; disabled under prefers-reduced-motion). On hover it
 *   is unmistakably FYD: bright gold edge + royal glow.
 * - on pin: a single thin gold oval edge with a whisper of purple glow
 *   fades in around the card (~280ms ease; instant under
 *   prefers-reduced-motion). The frame is a purely decorative wrapper
 *   (aria-hidden); the wrapped card content stays fully interactive.
 *
 * INTERACTION STATE MACHINE (one claim id, shared registry in ./expansion):
 *   CLOSED --mouseenter/focus/tap--> OBJECT (claims the one-expanded slot).
 *   Hover preview and the pinned card are the SAME compact card; only
 *   persistence differs. There is no Expand step and no separate peek
 *   card: hover opens the compact card directly, tap pins it.
 *   OBJECT (hover) --mouseleave, 300ms forgiving delay--> CLOSED
 *   OBJECT --Ask FYD action--> ASK (pins the card; intelligence mode)
 *   OBJECT (pinned) --click on the trigger--> CLOSED (mouseleave never
 *     closes a pin)
 *   OBJECT or ASK --Escape / outside pointerdown / blur outside-->
 *     CLOSED; being superseded by another claimant --> CLOSED.
 *   ASK --back button--> OBJECT (the compact card, still pinned).
 * Hover never downgrades a pin.
 *
 * CLUSTERS: a cluster slot renders its members as a staggered
 * constellation of mini-circles (see ./star-layout), never one big "+N"
 * hero bubble. Tapping a member opens that member's compact object card
 * semantics. The wrapper keeps data-member-ids so relationship navigation
 * can find a member's owning slot.
 *
 * Layout: the layer renders this in DOCUMENT space (position:absolute
 * inside the document-height object plane). Cards are absolutely
 * positioned children of the slot wrapper; they scroll WITH the page.
 * Never viewport-fixed, never viewport-clamped.
 *
 * Generic: takes object data as props. No per-customer logic lives here.
 * One-expanded coordination comes from ./expansion (module-level claim
 * registry shared by circles, cluster member cards, and the mobile sheet).
 */

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  ChevronLeft,
  Heart,
  Mail,
  MessageCircle,
  Phone,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  claimExpanded,
  currentExpandedId,
  subscribeExpanded,
  subscribeOpenRequest,
} from "./expansion";
import { useObjectActions } from "./use-object-actions";
import { openWebsite } from "@/fyd/capabilities/runtime";
import { starLayoutFor, STAR_MINI_D } from "./star-layout";
import { fyd } from "./fyd-tokens";
import { isSafeWebHref } from "@/fyd/preview/types";
import { AskObjectPanel } from "../ask-object-panel";
import type { MarginObjectDescriptor } from "./types";
import type {
  Fact,
  ObjectCapability,
  ObjectProjection,
  RelatedRef,
} from "@/fyd/object/object-projection";

/** Resting diameter: the small quiet circle. Dramatically quieter (was 64). */
export const REST_D = 40;
/**
 * STATE 2 (OBJECT): the compact identity card. A vertical oval with a
 * fixed, content-budgeted size: name, type, one-sentence description,
 * contact/location, and the action grid always fit, so the card NEVER
 * scrolls. If content does not fit, the composition is wrong.
 */
export const OBJECT_W = 300;
/** Compact object-card oval height (px). Fixed; no internal scroll. */
export const OBJECT_H = 400;
/**
 * STATE 3 (ASK): the intelligence mode. A vertical oval; the
 * conversational surface may scroll internally because the user
 * explicitly asked for intelligence. Only the default card is
 * scroll-free.
 */
export const RICH_W = 300;
/** Ask-mode oval height (px); the conversation may scroll inside. */
export const RICH_H = 460;
/** Forgiving collapse delay so the pointer can reach the controls. */
const COLLAPSE_DELAY_MS = 300;
/** Follow receipt visibility window before settling into Following. */
const RECEIPT_MS = 2600;
/**
 * Light card surface (Nolan, 2026-09-22 visual correction): the Circle
 * sits on the generated site in warm paper, not a second dark
 * application. Ink text; FYD identity survives as the thin gold edge
 * and the royal Ask FYD action.
 */
const CARD_BG = "#FBFAF7";
const CARD_INK = "#1A1729";
/** Short-description display budget: one sentence, roughly 80-140 chars. */
export const SHORT_DESC_MAX = 140;

const instantTx = { duration: 0.01 } as const;

/* ------------------------------------------------------------------ */
/* FYD oval frame: a quiet gold edge, never the object.               */
/* ------------------------------------------------------------------ */

/**
 * The FYD frame around pinned cards (Nolan, 2026-09-22 visual
 * correction): a single thin gold oval edge with a whisper of purple
 * glow. The gem nodes, sparkle accents, and Fyd tab are gone; decoration
 * never outranks information. The frame is a purely decorative wrapper;
 * the wrapped card content stays fully interactive. Opacity/scale fade
 * 0 -> 1 on expand (~280ms ease); under prefers-reduced-motion it
 * appears instantly.
 */
function FydOvalFrame({
  width,
  height,
  reduceMotion,
  children,
  style,
  cardRef,
  mode,
}: {
  width: number;
  height: number;
  /** From useReducedMotion(): null (unknown) behaves like motion allowed. */
  reduceMotion: boolean | null;
  children: React.ReactNode;
  style?: React.CSSProperties;
  cardRef?: React.Ref<HTMLDivElement>;
  /** "object" (STATE 2) or "ask" (STATE 3): exposed for tests/harness. */
  mode: "object" | "ask";
}) {
  const rm = reduceMotion === true;
  return (
    <motion.div
      ref={cardRef}
      data-testid="object-circle-card"
      data-object-card="rich"
      data-card-mode={mode}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={rm ? instantTx : fyd.motion.ringFade}
      style={{ position: "absolute", width, height, ...style, zIndex: 60 }}
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: CARD_BG,
          border: "1px solid rgba(201,162,39,0.55)",
          boxShadow:
            "0 18px 50px rgba(0,0,0,0.35), 0 0 24px rgba(124,92,214,0.18)",
          overflow: "hidden",
          color: CARD_INK,
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Identity face: snapshot with decorative initial fallback.          */
/* ------------------------------------------------------------------ */

/**
 * The object's identity image (website snapshot) with a decorative
 * initial-fallback while loading / when absent. Decorative only: every
 * labeled surface carries the name in text.
 */
function ObjectFace({
  name,
  imageSrc,
  imageSrcSet,
  sizes,
  initialClassName,
}: {
  name: string;
  imageSrc: string | null;
  imageSrcSet: string | null;
  sizes: string;
  initialClassName: string;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <>
      <span
        aria-hidden="true"
        className={`absolute inset-0 flex items-center justify-center font-bold text-white ${initialClassName}`}
        style={{ background: fyd.gradient.identity }}
      >
        {initial}
      </span>
      {imageSrc && (
        <img
          src={imageSrc}
          srcSet={imageSrcSet ?? undefined}
          sizes={sizes}
          alt=""
          aria-hidden="true"
          loading="lazy"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Interaction state: CLOSED / PEEK / PINNED for one claim id.        */
/* ------------------------------------------------------------------ */

/** Interaction phase for one claim id: CLOSED / PEEK / PINNED. */
export type ClaimPhase = "closed" | "peek" | "pinned";

/**
 * useClaim: the REST -> PEEK -> PINNED state machine for one claim id,
 * coordinated through the shared one-expanded registry (./expansion).
 *
 * Contract: hover and focus never downgrade a pin; the first click after
 * hover never undoes the open it just caused; blur/focus moves that leave
 * the control close with the same forgiving delay as hover leave.
 */
export function useClaim(claimId: string, onCollapse?: () => void) {
  const [phase, setPhase] = React.useState<ClaimPhase>("closed");
  const phaseRef = React.useRef<ClaimPhase>("closed");
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = React.useCallback((next: ClaimPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimer = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const collapse = React.useCallback(() => {
    clearTimer();
    set("closed");
    // Release the slot only when we hold it. A collapse triggered by a
    // peer's broadcast must not rebroadcast: claimExpanded notifies
    // synchronously, so rebroadcasting before marking closed recurses
    // without bound (stack overflow on relationship navigation).
    if (currentExpandedId() === claimId) claimExpanded(null);
    onCollapse?.();
  }, [clearTimer, set, claimId, onCollapse]);

  React.useEffect(() => clearTimer, [clearTimer]);

  // One-expanded invariant: a peer claim supersedes us.
  React.useEffect(
    () =>
      subscribeExpanded((expanded) => {
        if (expanded !== claimId && phaseRef.current !== "closed") collapse();
      }),
    [claimId, collapse],
  );

  /** Hover (or keyboard focus) opens the peek preview. Never downgrades a pin. */
  const hoverOpen = React.useCallback(() => {
    clearTimer();
    if (phaseRef.current === "closed") {
      set("peek");
      claimExpanded(claimId);
    }
  }, [claimId, clearTimer, set]);

  /** Hover leave closes the peek after the forgiving delay; pins ignore it. */
  const hoverLeave = React.useCallback(
    (focusInside: () => boolean) => {
      if (phaseRef.current !== "peek") return;
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (phaseRef.current === "peek" && !focusInside()) collapse();
      }, COLLAPSE_DELAY_MS);
    },
    [collapse, clearTimer],
  );

  /** Pin the object card. Called by a second tap,
   * or the peer-jump open-request. Idempotent. */
  const pinOpen = React.useCallback(() => {
    clearTimer();
    set("pinned");
    claimExpanded(claimId);
  }, [claimId, clearTimer, set]);

  /** The trigger button: PEEK -> PINNED on the second click (the first
   * click never undoes what hover just did); PINNED -> CLOSED. Touch
   * devices go CLOSED -> PEEK on the first tap. */
  const triggerClick = React.useCallback(() => {
    const phase = phaseRef.current;
    if (phase === "peek") pinOpen();
    else if (phase === "pinned") collapse();
    else {
      clearTimer();
      set("peek");
      claimExpanded(claimId);
    }
  }, [claimId, clearTimer, collapse, pinOpen, set]);

  /** Blur/focus moves that leave the control close with the forgiving delay. */
  const requestClose = React.useCallback(() => {
    clearTimer();
    timerRef.current = setTimeout(() => collapse(), COLLAPSE_DELAY_MS);
  }, [clearTimer, collapse]);

  const requestCloseSoon = React.useCallback(
    (focusInside: () => boolean) => {
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (!focusInside()) collapse();
      }, COLLAPSE_DELAY_MS);
    },
    [clearTimer, collapse],
  );

  return {
    open: phase !== "closed",
    phase,
    hoverOpen,
    hoverLeave,
    pinOpen,
    triggerClick,
    collapse,
    requestClose,
    requestCloseSoon,
    clearTimer,
  };
}

/* ------------------------------------------------------------------ */
/* Follow receipt: minimal confirmation, then the persistent state.   */
/* ------------------------------------------------------------------ */

/**
 * Pure: a server-confirmed false -> true transition earns the receipt.
 * Initial load (null -> anything) never does; repeated true never does.
 */
export function shouldShowFollowReceipt(
  prev: boolean | null,
  next: boolean | null,
): boolean {
  return prev === false && next === true;
}

const ACTION_BTN =
  "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-white transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70";

/**
 * Capability-gated follow toggle. Disabled (but visible) until server
 * state loads. On a server-confirmed false -> true transition it shows
 * the minimal receipt, then settles into the persistent Following state.
 * The toggle is never presented as gateway-journaled (see
 * ./use-object-actions: the homepage has no viewer identity).
 */
export function FollowButton({
  objectId,
  name,
  websiteUrl,
  entry,
  light,
}: {
  objectId: string;
  name: string;
  websiteUrl: string | null;
  /** Entry variant: the compact action row inside the peek card. */
  entry?: boolean;
  /** Light tone for the light card surfaces. */
  light?: boolean;
}) {
  const { following, toggleFollow } = useObjectActions(objectId, websiteUrl);
  const [receipt, setReceipt] = React.useState(false);
  const prevRef = React.useRef<boolean | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );
  React.useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = following;
    if (shouldShowFollowReceipt(prev, following)) {
      setReceipt(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setReceipt(false), RECEIPT_MS);
    }
  }, [following]);

  const base = light
    ? "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold text-[#1A1729] transition-colors border border-[#E5E0D5] bg-white hover:border-[rgba(201,162,39,0.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C5CD6]"
    : `${ACTION_BTN} border border-white/15 bg-white/10`;
  const cls = light ? `${base} w-full` : entry ? `${base} w-full` : base;

  if (receipt) {
    return (
      <span
        role="status"
        className={
          light
            ? "inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full border border-[#E5E0D5] bg-white px-3 text-center text-xs font-bold text-[#1A1729]"
            : "inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 text-center text-xs font-bold text-white"
        }
      >
        <UserCheck size={14} aria-hidden="true" />
        <span>DONE: you&apos;re following {name}</span>
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={following === null}
      aria-pressed={!!following}
      aria-label={following ? `Following ${name}` : `Follow ${name}`}
      onClick={(e) => {
        e.stopPropagation();
        void toggleFollow();
      }}
      className={cls}
    >
      {following ? <UserCheck size={14} aria-hidden="true" /> : <UserPlus size={14} aria-hidden="true" />}
      <span>{following ? "Following" : "Follow"}</span>
    </button>
  );
}

/** Capability-gated like toggle. Disabled (but visible) until server state loads. */
export function LikeButton({
  objectId,
  name,
  websiteUrl,
  entry,
  light,
}: {
  objectId: string;
  name: string;
  websiteUrl: string | null;
  entry?: boolean;
  /** Light tone for the light card surfaces. */
  light?: boolean;
}) {
  const { liked, toggleLike } = useObjectActions(objectId, websiteUrl);
  const base = light
    ? "inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold text-[#1A1729] transition-colors border border-[#E5E0D5] bg-white hover:border-[rgba(201,162,39,0.7)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C5CD6]"
    : `${ACTION_BTN} border border-white/15 bg-white/10`;
  const cls = light ? `${base} w-full` : entry ? `${base} w-full` : base;
  return (
    <button
      type="button"
      disabled={liked === null}
      aria-pressed={!!liked}
      aria-label={liked ? `Unlike ${name}` : `Like ${name}`}
      onClick={(e) => {
        e.stopPropagation();
        void toggleLike();
      }}
      className={cls}
    >
      <Heart size={14} aria-hidden="true" fill={liked ? "currentColor" : "none"} />
      <span>{liked ? "Liked" : "Like"}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Projection fetch: the object card is object-graph backed.            */
/* ------------------------------------------------------------------ */

type ProjectionState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; projection: ObjectProjection; siteId: string };

/**
 * Loads the real object projection from GET /api/fyd/objects/[objectId]
 * (name, kind, facts, service refs, people, capabilities, sample
 * questions, provenance). Fails closed: error -> unavailable message,
 * never invented content.
 */
function useObjectProjection(objectId: string): ProjectionState {
  const [state, setState] = React.useState<ProjectionState>({ status: "loading" });
  React.useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    fetch(`/api/fyd/objects/${encodeURIComponent(objectId)}`, {
      headers: { accept: "application/json" },
    })
      .then((res) => {
        if (!res.ok) throw new Error(`objects route ${res.status}`);
        return res.json() as Promise<{
          ok?: boolean;
          projection?: ObjectProjection;
          siteId?: string;
        }>;
      })
      .then((body) => {
        if (cancelled) return;
        if (!body.ok || !body.projection) {
          setState({ status: "error", message: "object unavailable" });
          return;
        }
        setState({
          status: "ok",
          projection: body.projection,
          siteId: body.siteId ?? objectId,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error", message: "fetch failed" });
      });
    return () => {
      cancelled = true;
    };
  }, [objectId]);
  return state;
}

/* ------------------------------------------------------------------ */
/* Compact projection: the Circle's information budget.               */
/* ------------------------------------------------------------------ */

function factKnown(f: Fact): boolean {
  return f.evidence.state !== "unknown";
}
function refKnown(r: RelatedRef): boolean {
  return r.evidence.state !== "unknown";
}

/**
 * Compact action kinds the object card renders. Derived from schema +
 * evidence + capabilities, never hardcoded per object.
 */
export type CompactActionKind = "website" | "contact" | "follow" | "like" | "ask";

export interface CompactAction {
  kind: CompactActionKind;
  label: string;
  /** Destination href; empty for follow/like/ask (they act in place). */
  href: string;
}

/**
 * Schema eligibility (Nolan, 2026-09-22): OBJECT -> ELIGIBLE CAPABILITIES
 * -> ACTIONS. An address/location object never exposes social actions:
 * an address has no Like. All other schemas keep what their capabilities
 * grant them.
 */
export function actionAllowedBySchema(schema: string, kind: CompactActionKind): boolean {
  if ((kind === "like" || kind === "follow") && /address|location/i.test(schema)) return false;
  return true;
}

/** Contact hrefs are tel: or mailto: only; anything else fails closed. */
function isSafeContactHref(href: string): boolean {
  return /^(tel:\+?[0-9().\-\s]+|mailto:[^\s@]+@[^\s@]+)$/i.test(href);
}

/**
 * Pure: capabilities + schema + evidence-backed website URL -> the ranked
 * compact action set. Display rank: Website, Contact, Follow, Like, with
 * Ask FYD last (it opens the intelligence mode, so it renders full-width
 * below the grid). Call and email collapse into one Contact action (call
 * preferred): the compact card budgets four grid slots. A capability
 * renders only when its underlying value exists and passes URL safety;
 * "view" never renders.
 */
export function compactActionsFor(
  schema: string,
  capabilities: ObjectCapability[],
  websiteUrl: string | null,
): CompactAction[] {
  const out: CompactAction[] = [];
  const push = (kind: CompactActionKind, label: string, href: string) => {
    if (actionAllowedBySchema(schema, kind)) out.push({ kind, label, href });
  };
  const websiteCap = capabilities.find((c) => c.kind === "website");
  const websiteHref =
    (websiteCap && websiteCap.kind === "website" ? websiteCap.href : null) ?? websiteUrl;
  if (websiteHref && isSafeWebHref(websiteHref)) push("website", "Website", websiteHref);
  const callCap = capabilities.find((c) => c.kind === "call");
  const emailCap = capabilities.find((c) => c.kind === "email");
  const contactCap = callCap ?? emailCap;
  if (
    contactCap &&
    (contactCap.kind === "call" || contactCap.kind === "email") &&
    isSafeContactHref(contactCap.href)
  ) {
    push("contact", "Contact", contactCap.href);
  }
  if (capabilities.some((c) => c.kind === "follow")) push("follow", "Follow", "");
  if (capabilities.some((c) => c.kind === "like")) push("like", "Like", "");
  if (capabilities.some((c) => c.kind === "ask")) push("ask", "Ask FYD", "");
  return out;
}

/** Where the short description came from. */
export type ShortDescriptionSource = "owner" | "derived" | "excerpt";

export interface ShortDescription {
  text: string;
  /** "derived" is GENERATED PRESENTATION, never canonical fact. */
  source: ShortDescriptionSource;
}

/** First sentence of a text, whitespace-collapsed. */
function firstSentence(text: string): string {
  const m = text.match(/^[^.!?]+[.!?]/);
  return (m ? m[0] : text).replace(/\s+/g, " ").trim();
}

/**
 * Enforce the display budget: one sentence, at most SHORT_DESC_MAX chars.
 * Cuts at a word boundary with an ellipsis; never cuts mid-word and never
 * invents words.
 */
export function budgetShortDescription(text: string): string {
  const s = firstSentence(text);
  if (s.length <= SHORT_DESC_MAX) return s;
  const cut = s.lastIndexOf(" ", SHORT_DESC_MAX - 1);
  // Space before the ellipsis: the cut lands on a word boundary and the
  // ellipsis never glues onto a word ("… staircases …", never "…staircases…").
  return (cut > 40 ? s.slice(0, cut) : s.slice(0, SHORT_DESC_MAX - 1)).trimEnd() + " …";
}

/**
 * Pure: the compact short description with provenance.
 * Precedence (Nolan, 2026-09-22): owner-authored > evidence-backed
 * derived presentation > deterministic source-excerpt fallback.
 * Nothing is invented: every tier draws only on owner copy or observed
 * evidence. Null when there is nothing to project.
 */
export function shortDescriptionFor(input: {
  ownerShortDescription?: string | null;
  category?: string | null;
  location?: string | null;
  services?: string[];
  summary?: string | null;
}): ShortDescription | null {
  const owner = input.ownerShortDescription?.trim();
  if (owner) return { text: budgetShortDescription(owner), source: "owner" };
  const services = (input.services ?? []).filter(Boolean).slice(0, 3);
  if (input.category) {
    const place = input.location ? ` in ${input.location}` : "";
    const offers = services.length > 0 ? `: ${services.join(", ")}` : "";
    return {
      text: budgetShortDescription(`${input.category}${place}${offers}.`),
      source: "derived",
    };
  }
  if (input.summary) return { text: budgetShortDescription(input.summary), source: "excerpt" };
  return null;
}

/**
 * The Circle's compact projection contract: display_name, object_type,
 * short_description, location_summary, contact_summary, primary_url,
 * available_actions. The short description is a PROJECTION, not a
 * canonical field: the owner may override it (descriptor.shortDescription)
 * without being forced to author one.
 */
export interface CompactProjection {
  display_name: string;
  object_type: string;
  short_description: ShortDescription | null;
  location_summary: string | null;
  contact_summary: { phone: string | null; email: string | null };
  primary_url: string | null;
  available_actions: CompactAction[];
}

/**
 * Pure: ObjectProjection + descriptor -> the Circle's compact projection.
 * Unknown-evidence values are omitted, never guessed.
 */
export function compactProjectionFor(
  projection: ObjectProjection,
  descriptor: MarginObjectDescriptor,
): CompactProjection {
  const known = (f: Fact | null): string | null => (f && factKnown(f) ? f.value : null);
  const location = known(projection.location) ?? descriptor.location ?? null;
  const actions = compactActionsFor(
    projection.schema,
    projection.capabilities,
    descriptor.websiteUrl,
  );
  return {
    display_name: projection.name,
    object_type: projection.kindLabel,
    short_description: shortDescriptionFor({
      ownerShortDescription: descriptor.shortDescription,
      category: known(projection.category) ?? descriptor.category ?? null,
      location,
      services: projection.serviceRefs.filter(refKnown).map((s) => s.name),
      summary: known(projection.summary),
    }),
    location_summary: location,
    contact_summary: {
      phone: known(projection.contact.phone),
      email: known(projection.contact.email),
    },
    primary_url: actions.find((a) => a.kind === "website")?.href ?? null,
    available_actions: actions,
  };
}

/* ------------------------------------------------------------------ */
/* Compact card: STATE 2 (OBJECT) and STATE 3 (ASK).                   */
/* ------------------------------------------------------------------ */

/** Light action button: white pill, ink text, gold hover edge. */
const LIGHT_BTN =
  "inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C5CD6]";

/** One capability-derived action in the compact card's two-column grid. Ask never renders here. */
function CompactActionButton({
  action,
  descriptor,
}: {
  action: CompactAction;
  descriptor: MarginObjectDescriptor;
}) {
  const cls = `${LIGHT_BTN} border border-[#E5E0D5] bg-white text-[#1A1729] hover:border-[rgba(201,162,39,0.7)]`;
  switch (action.kind) {
    case "follow":
      return (
        <FollowButton
          light
          objectId={descriptor.objectId}
          name={descriptor.name}
          websiteUrl={descriptor.websiteUrl}
        />
      );
    case "like":
      return (
        <LikeButton
          light
          objectId={descriptor.objectId}
          name={descriptor.name}
          websiteUrl={descriptor.websiteUrl}
        />
      );
    case "website":
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openWebsite(action.href);
          }}
          aria-label={`Open the website for ${descriptor.name}`}
          className={cls}
        >
          <ArrowUpRight size={14} aria-hidden="true" />
          <span>Website</span>
        </button>
      );
    case "contact": {
      const Icon = action.href.startsWith("tel:") ? Phone : Mail;
      return (
        <a
          href={action.href}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Contact ${descriptor.name}`}
          className={cls}
        >
          <Icon size={14} aria-hidden="true" />
          <span>Contact</span>
        </a>
      );
    }
    case "ask":
      // Ask FYD opens the intelligence mode: it renders full-width below
      // the grid, never inside it.
      return null;
  }
}

/**
 * STATE 2 (OBJECT): the compact identity card. Identity first, punchy
 * description second, contact/actions third, intelligence last.
 * HARD INVARIANT: no scroll, ever. The budgeted content (name, type
 * line, one-sentence description, one contact line, the action grid, one
 * full-width Ask FYD) always fits the OBJECT_W x OBJECT_H oval.
 */
export function ObjectCardBody({
  data,
  descriptor,
  onAsk,
}: {
  data: CompactProjection;
  descriptor: MarginObjectDescriptor;
  /** Ask FYD action: open the intelligence mode. */
  onAsk: () => void;
}) {
  const gridActions = data.available_actions.filter((a) => a.kind !== "ask");
  const ask = data.available_actions.find((a) => a.kind === "ask");
  const meta = [data.object_type, data.location_summary].filter(Boolean).join(" · ");
  const contactLine = [data.contact_summary.phone, data.contact_summary.email]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="flex h-full w-full flex-col items-center px-8 pb-7 pt-8 text-center">
      <span className="relative block h-12 w-12 shrink-0 overflow-hidden rounded-full">
        <ObjectFace
          name={data.display_name}
          imageSrc={descriptor.imageSrc}
          imageSrcSet={descriptor.imageSrcSet}
          sizes="96px"
          initialClassName="text-xl"
        />
      </span>
      <p
        className="mt-2 line-clamp-2 text-[15px] font-bold leading-tight"
        style={{ color: CARD_INK }}
      >
        {data.display_name}
      </p>
      {meta && <p className="mt-0.5 w-full truncate text-xs text-neutral-500">{meta}</p>}
      {data.short_description && (
        <p className="mt-2 line-clamp-3 text-[13px] leading-snug text-neutral-700">
          {data.short_description.text}
        </p>
      )}
      {contactLine && (
        <p className="mt-1.5 w-full truncate text-xs font-semibold text-neutral-500">
          {contactLine}
        </p>
      )}
      <div className="mt-auto grid w-full grid-cols-2 gap-1.5 pt-3">
        {gridActions.map((a) => (
          <CompactActionButton key={a.kind} action={a} descriptor={descriptor} />
        ))}
      </div>
      {ask && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAsk();
          }}
          aria-label={`Ask FYD about ${data.display_name}`}
          className="mt-1.5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full text-sm font-bold text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C5CD6]"
          style={{ background: fyd.color.royal }}
        >
          <MessageCircle size={16} aria-hidden="true" />
          <span>Ask FYD</span>
        </button>
      )}
    </div>
  );
}

/**
 * STATE 3 (ASK): the intelligence mode. Opens only on the explicit Ask
 * FYD action. Suggestions, input, and answers live here and only here.
 * The user asked for intelligence, so the conversational surface may
 * scroll internally.
 */
function AskModeBody({
  descriptor,
  projection,
  siteId,
  onBack,
}: {
  descriptor: MarginObjectDescriptor;
  projection: ObjectProjection;
  siteId: string;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full w-full flex-col px-7 pb-6 pt-6">
      <div className="flex items-center gap-2">
        <BackButton light onBack={onBack} label="Back" />
        <p className="text-sm font-bold" style={{ color: CARD_INK }}>
          Ask FYD
        </p>
      </div>
      <p className="mb-2 mt-1 truncate text-xs text-neutral-500">about {projection.name}</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AskObjectPanel
          siteId={siteId}
          objectId={descriptor.objectId}
          objectName={projection.name}
          sampleQuestions={projection.sampleQuestions}
        />
      </div>
      <p className="mt-2 text-center text-[11px] leading-snug text-neutral-400">
        {projection.provenance.label}
      </p>
    </div>
  );
}

/**
 * The pinned card: STATE 2 (OBJECT, the compact identity card) by
 * default, STATE 3 (ASK, the intelligence mode) when askOpen. Fetches
 * its data from the real object graph; fails closed. Circles and ovals
 * only; the compact card never scrolls.
 */
export function ObjectRichCard({
  descriptor,
  style,
  askStyle,
  askOpen,
  onAskChange,
  cardRef,
}: {
  descriptor: MarginObjectDescriptor;
  /** Placement for the compact object card (STATE 2). */
  style?: React.CSSProperties;
  /** Placement for Ask mode (STATE 3); falls back to style when absent. */
  askStyle?: React.CSSProperties;
  /** When true, show the Ask FYD intelligence mode instead of the compact card. */
  askOpen?: boolean;
  /** The Ask FYD action and the ask-mode back button report through here. */
  onAskChange?: (open: boolean) => void;
  /** Cluster member cards need the outer node for outside-dismissal. */
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  const reduceMotion = useReducedMotion();
  const proj = useObjectProjection(descriptor.objectId);
  const askMode = !!askOpen;
  const placedStyle = askMode ? (askStyle ?? style) : style;
  const frame = askMode
    ? { width: RICH_W, height: RICH_H, mode: "ask" as const }
    : { width: OBJECT_W, height: OBJECT_H, mode: "object" as const };
  if (proj.status === "error") {
    return (
      <FydOvalFrame
        width={frame.width}
        height={frame.height}
        reduceMotion={reduceMotion}
        style={placedStyle}
        cardRef={cardRef}
        mode={frame.mode}
      >
        <div className="flex h-full items-center justify-center p-10 text-center">
          <p className="text-sm text-neutral-500">Details are unavailable right now.</p>
        </div>
      </FydOvalFrame>
    );
  }
  if (proj.status !== "ok") {
    return (
      <FydOvalFrame
        width={frame.width}
        height={frame.height}
        reduceMotion={reduceMotion}
        style={placedStyle}
        cardRef={cardRef}
        mode={frame.mode}
      >
        <div
          className="flex h-full items-center justify-center p-10 text-center"
          aria-live="polite"
        >
          <p className="text-sm text-neutral-400">Loading details…</p>
        </div>
      </FydOvalFrame>
    );
  }
  const data = compactProjectionFor(proj.projection, descriptor);
  const hasAsk = data.available_actions.some((a) => a.kind === "ask");
  return (
    <FydOvalFrame
      width={frame.width}
      height={frame.height}
      reduceMotion={reduceMotion}
      style={placedStyle}
      cardRef={cardRef}
      mode={frame.mode}
    >
      {askMode && hasAsk ? (
        <AskModeBody
          descriptor={descriptor}
          projection={proj.projection}
          siteId={proj.siteId}
          onBack={() => onAskChange?.(false)}
        />
      ) : (
        <ObjectCardBody data={data} descriptor={descriptor} onAsk={() => onAskChange?.(true)} />
      )}
    </FydOvalFrame>
  );
}
/**
 * The rest circle's elusive mirror sheen: a slow, soft highlight sweep
 * across the quiet circle. Subtle and shifting, never loud. Rendered only
 * when motion is allowed (never under prefers-reduced-motion).
 */
// Exported for the royal-mirror test: the sheen must omit itself
// without a browser and under prefers-reduced-motion.
export function RestSheen({ reduceMotion }: { reduceMotion: boolean | null }) {
  if (reduceMotion === true) return null;
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
      style={{ background: fyd.gradient.sheen }}
      initial={{ x: "-110%" }}
      animate={{ x: "110%" }}
      transition={fyd.motion.sheen}
    />
  );
}

/* ------------------------------------------------------------------ */
/* MarginObject: one slot in the margin rail.                         */
/* ------------------------------------------------------------------ */

/**
 * One object in the margin object layer: the rest trigger plus the
 * compact object card, positioned in document space.
 *
 * Interaction is RESTING -> OBJECT -> ASK. Hover/focus/tap opens the
 * compact object card directly (hover preview closes on pointer leave;
 * tap pins it); there is no separate Expand step. Ask FYD inside the
 * card opens intelligence mode; the back button returns to the card.
 *
 * @param slotStyle document-space origin of the rest slot (left/top
 *   computed by the layer) plus the slot's size.
 * @param cardStyle card-space offset from the slot origin for the compact
 *   object card (document-space clamped by the layer for 300x400).
 * @param askStyle card-space offset for Ask mode (clamped for 300x460);
 *   falls back to cardStyle when absent.
 */
export function MarginObject({
  descriptor,
  slotStyle,
  cardStyle,
  askStyle,
  restD = REST_D,
}: {
  descriptor: MarginObjectDescriptor;
  slotStyle?: React.CSSProperties;
  cardStyle?: React.CSSProperties;
  askStyle?: React.CSSProperties;
  restD?: number;
}) {
  const { objectId, name, imageSrc, imageSrcSet, websiteUrl } = descriptor;
  const reduceMotion = useReducedMotion();
  const tx = reduceMotion ? instantTx : fyd.motion.expand;
  const { open, phase, hoverOpen, hoverLeave, pinOpen, triggerClick, collapse, requestClose, requestCloseSoon, clearTimer } =
    useClaim(objectId);
  const [askOpen, setAskOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const openedVia = React.useRef<"pointer" | "keyboard" | "unknown">("unknown");
  const suppressFocusOpen = React.useRef(false);

  React.useEffect(() => {
    if (phase === "closed") setAskOpen(false);
  }, [phase ]);

  React.useEffect(
    () => subscribeOpenRequest((id) => id === objectId && pinOpen()),
    [objectId, pinOpen],
  );

  const focusInside = React.useCallback(
    () => !!wrapRef.current?.contains(document.activeElement),
    [],
  );

  const tryFocusFirstAction = React.useCallback(() => {
    const card = wrapRef.current?.querySelector('[data-testid="object-circle-card"]');
    const first = card?.querySelector<HTMLElement>(
      "button:not([disabled]), a[href], input, [tabindex]:not([tabindex='-1'])",
    );
    if (first) first.focus({ preventScroll: true });
  }, []);

  React.useEffect(() => {
    if (open && openedVia.current !== "keyboard") tryFocusFirstAction();
  }, [open, tryFocusFirstAction]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        suppressFocusOpen.current = true;
        collapse();
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) collapse();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open, collapse]);

  const handleFocus = React.useCallback(
    (e: React.FocusEvent) => {
      if (suppressFocusOpen.current) {
        suppressFocusOpen.current = false;
        return;
      }
      if (wrapRef.current?.contains(e.target as Node)) {
        if (!wrapRef.current.contains(e.relatedTarget as Node)) {
          openedVia.current = "keyboard";
          hoverOpen();
        }
      }
    },
    [hoverOpen],
  );

  const handleBlur = React.useCallback(
    (e: React.FocusEvent) => {
      if (e.target === triggerRef.current) openedVia.current = "unknown";
      if (!wrapRef.current?.contains(e.relatedTarget as Node)) {
        requestCloseSoon(() => focusInside());
      }
    },
    [requestCloseSoon, focusInside],
  );

  return (
    <div
      ref={wrapRef}
      data-testid="margin-object"
      data-object-id={objectId}
      className="pointer-events-auto"
      style={{ ...slotStyle, position: "absolute" }}
      onMouseEnter={() => {
        openedVia.current = "pointer";
        hoverOpen();
      }}
      onMouseLeave={() => hoverLeave(focusInside)}
      onFocus={clearTimer}
      onBlur={handleBlur}
    >
      <motion.button
        ref={triggerRef}
        type="button"
        aria-label={`${name}. Expand to show details.`}
        aria-expanded={open || undefined}
        aria-haspopup="dialog"
        aria-hidden={open || undefined}
        tabIndex={open ? -1 : 0}
        data-testid="object-circle-trigger"
        onClick={(e) => {
          e.stopPropagation();
          triggerClick();
        }}
        onFocus={(e) => {
          // A suppressed focus (e.g. focus returned to the trigger after
          // Escape) must never reopen: consume the flag and stop, so the
          // shared handleFocus below does not see it cleared and re-open.
          if (suppressFocusOpen.current) {
            suppressFocusOpen.current = false;
            return;
          }
          openedVia.current = "keyboard";
          hoverOpen();
          handleFocus(e);
        }}
        whileHover={{ scale: 1.06, boxShadow: fyd.shadow.goldBright }}
        whileTap={{ scale: 0.94 }}
        animate={{ opacity: open ? 0 : 1, scale: open ? 0.7 : 1 }}
        transition={tx}
        className="relative block cursor-pointer overflow-hidden rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        style={{
          width: restD,
          height: restD,
          /* Quiet rest state: thin subtle identity ring, no gold glow. */
          boxShadow: fyd.shadow.restRing,
        }}
      >
        <RestSheen reduceMotion={reduceMotion} />
        <ObjectFace
          name={name}
          imageSrc={imageSrc}
          imageSrcSet={imageSrcSet}
          sizes={`${restD}px`}
          initialClassName="text-xl"
        />
      </motion.button>

      {(phase === "peek" || phase === "pinned") && (
        <ObjectRichCard
          descriptor={descriptor}
          style={cardStyle}
          askStyle={askStyle}
          askOpen={askOpen}
          onAskChange={(next) => {
            // Ask mode pins the card: intelligence is always explicit.
            if (next) pinOpen();
            setAskOpen(next);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ClusterSlot: constellation of member mini-circles.                 */
/* ------------------------------------------------------------------ */

/**
 * A cluster slot: the packed constellation of member mini-circles
 * (staggered 3-per-row rows from ./star-layout), never one big "+N" hero
 * bubble. Tapping a member opens that member's compact object card. Scales
 * to many members via wrapping rows.
 */
export function ClusterSlot({
  clusterId,
  members,
  slotStyle,
  cardStyleFor,
  askStyleFor,
  align = "right",
}: {
  clusterId: string;
  members: MarginObjectDescriptor[];
  slotStyle?: React.CSSProperties;
  /** Document-space-clamped compact-card offset for a member's card. */
  cardStyleFor: (member: MarginObjectDescriptor) => React.CSSProperties | undefined;
  /** Document-space-clamped Ask-mode offset; falls back to cardStyleFor. */
  askStyleFor?: (member: MarginObjectDescriptor) => React.CSSProperties | undefined;
  /** Rail side the constellation grows from. */
  align?: "left" | "right";
}) {
  const [selected, setSelected] = React.useState<MarginObjectDescriptor | null>(null);
  const layout = React.useMemo(() => starLayoutFor(members.length), [members.length]);

  React.useEffect(
    () =>
      subscribeOpenRequest((id) => {
        const member = members.find((m) => m.objectId === id);
        if (member) setSelected(member);
      }),
    [members],
  );

  const restD = REST_D;
  const top = (restD - layout.height) / 2;

  return (
    <div
      data-testid="margin-cluster"
      data-cluster-id={clusterId}
      data-member-ids={members.map((m) => m.objectId).join(" ")}
      className="pointer-events-auto"
      style={{ ...slotStyle, position: "absolute" }}
    >
      <div
        role="group"
        aria-label={`${members.length} nearby objects`}
        style={{
          position: "absolute",
          top,
          ...(align === "right" ? { right: 0 } : { left: 0 }),
          width: layout.width,
          height: layout.height,
        }}
      >
        {members.map((m, i) => {
          const cell = layout.cells[i] ?? { x: 0, y: 0 };
          return (
            <button
              key={m.objectId}
              type="button"
              data-object-id={m.objectId}
              onClick={() => setSelected(m)}
              aria-label={`Open ${m.name}`}
              className="absolute cursor-pointer overflow-hidden rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{
                left: cell.x,
                top: cell.y,
                width: STAR_MINI_D,
                height: STAR_MINI_D,
                boxShadow: fyd.shadow.restRing,
              }}
            >
              <ObjectFace
                name={m.name}
                imageSrc={m.imageSrc}
                imageSrcSet={m.imageSrcSet}
                sizes="72px"
                initialClassName="text-sm"
              />
            </button>
          );
        })}
      </div>

      {selected && (
        <ClusterMemberCard
          key={selected.objectId}
          descriptor={selected}
          cardStyle={cardStyleFor(selected)}
          askStyle={askStyleFor?.(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/** A cluster member's compact object card, dismissed by close / Escape / outside. */
function ClusterMemberCard({
  descriptor,
  cardStyle,
  askStyle,
  onClose,
}: {
  descriptor: MarginObjectDescriptor;
  cardStyle: React.CSSProperties | undefined;
  askStyle?: React.CSSProperties;
  onClose: () => void;
}) {
  const { pinOpen } = useClaim(descriptor.objectId, onClose);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [askOpen, setAskOpen] = React.useState(false);

  React.useEffect(() => {
    pinOpen();
  }, [pinOpen]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        claimExpanded(null);
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!cardRef.current?.contains(e.target as Node)) {
        claimExpanded(null);
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose]);

  return (
    <ObjectRichCard
      descriptor={descriptor}
      style={{ ...cardStyle, position: "absolute", zIndex: 61 }}
      askStyle={askStyle ? { ...askStyle, position: "absolute", zIndex: 61 } : undefined}
      cardRef={cardRef}
      askOpen={askOpen}
      onAskChange={setAskOpen}
    />
  );
}

/* ------------------------------------------------------------------ */
/* MobileSheet: object list -> compact object card -> Ask mode.               */
/* ------------------------------------------------------------------ */

/** Back to the object list inside the mobile sheet, or back from Ask mode. */
export function BackButton({
  onBack,
  label,
  light,
}: {
  onBack: () => void;
  label: string;
  /** Light tone for the light card surfaces. */
  light?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={
        light
          ? "inline-flex items-center gap-1 text-sm font-semibold text-neutral-500 underline-offset-4 hover:text-[#1A1729] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C5CD6]"
          : "inline-flex items-center gap-1 text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      }
    >
      <ChevronLeft size={16} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
