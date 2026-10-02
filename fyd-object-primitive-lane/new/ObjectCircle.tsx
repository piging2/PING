"use client";

/**
 * ObjectCircle: the generic PING object projection for the margin object
 * layer (Nolan, 2026-09-22: "Margins Are the Object Layer").
 *
 * INTERACTION MODEL (Nolan, 2026-09-22: REST -> PEEK -> EXPAND -> ACT -> RECEIPT.
 * "Page first. Object available. Intelligence one gesture away."):
 * - REST: the small quiet circle (40px). Thin subtle identity ring only;
 *   no gold glow. Dramatically quieter than before.
 * - PEEK: hover / focus / tap opens a vertically expanding oval (200x300):
 *   identity + essential context (name, category, location, one-line
 *   why-it's-here) with three entry actions stacked vertically: Ask FYD,
 *   Follow, Expand. Never the full capability list.
 * - EXPAND: the Expand entry action (or a second tap) pins the rich
 *   vertical oval (300x460, internal scroll). All content
 *   comes from the real object graph via GET /api/fyd/objects/[objectId]:
 *   identity header, evidence-backed summary, key facts, services as
 *   related refs, relationship peer-jumps, object-specific capabilities
 *   ONLY from projection.capabilities (an action renders only when the
 *   underlying value exists; never a universal button list), Ask FYD, and
 *   a quiet provenance line. Sections with no data are omitted, never
 *   invented.
 * - ACT: follow / like / call / email / website / ask, capability-gated.
 * - RECEIPT: after a successful follow, a minimal "DONE: you're following
 *   {name}" confirmation settles into the persistent Following state.
 *   Refresh keeps it (durable server store). The toggle is never presented
 *   as gateway-journaled: the homepage has no viewer identity.
 *
 * FYD VISUAL IDENTITY: ROYAL MIRROR (Nolan, 2026-09-22, BINDING).
 * One frozen shape system: CIRCLES + OVALS. Circle = object/identity;
 * oval/capsule = interaction/expansion. Purple = the royal field, gold =
 * emphasis/edge/highlight (never whole solid-gold surfaces), mirror/glass
 * = depth. All values live in ./fyd-tokens (the `fyd` namespace); no
 * scattered purple/gold hex values. ROYAL MIRROR is the FYD
 * product/intelligence layer only; customer sites keep their own brand.
 * - rest: the small quiet circle with a slow, subtle mirror sheen
 *   (elusive at rest; disabled under prefers-reduced-motion). On hover it
 *   is unmistakably FYD: bright gold edge + royal glow.
 * - on EXPAND: the ornate border treatment FADES IN around the rich card
 *   (~280ms ease; instant under prefers-reduced-motion, with no sparkle
 *   animation): concentric shiny-gold gradient bands with a glowing
 *   royal-purple inlay channel between them, diamond-shaped purple gem
 *   nodes set in gold at the four edge midpoints, subtle sparkle accents
 *   at the corners, and a small "Fyd" pill integrated at the bottom of
 *   the frame. The frame is a purely decorative wrapper (pointer-events
 *   none on the decorations, aria-hidden); it sizes to the card's auto
 *   height. The border is the treatment, never the object itself.
 * The PEEK card stays quiet (soft gold edge, no ornate frame): previews
 * whisper, expansion announces.
 *
 * INTERACTION STATE MACHINE (one claim id, shared registry in ./expansion):
 *   CLOSED --mouseenter/focus/tap--> PEEK (claims the one-expanded slot)
 *   PEEK --mouseleave, 300ms forgiving delay--> CLOSED
 *   PEEK --Expand entry action / second tap on the trigger--> PINNED
 *     (the first click never undoes what hover just did)
 *   CLOSED --tap (touch, no hover)--> PEEK
 *   PINNED --click on the trigger--> CLOSED (mouseleave never closes a pin)
 *   PEEK or PINNED --Escape / outside pointerdown / blur outside-->
 *     CLOSED; being superseded by another claimant --> CLOSED.
 * Hover never downgrades a pin.
 *
 * CLUSTERS: a cluster slot renders its members as a staggered
 * constellation of mini-circles (see ./star-layout), never one big "+N"
 * hero bubble. Tapping a member opens that member's rich card with pinned
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
  Maximize2,
  MessageCircle,
  Phone,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  claimExpanded,
  currentExpandedId,
  requestObjectNavigate,
  subscribeExpanded,
  subscribeOpenRequest,
} from "./expansion";
import { useObjectActions } from "./use-object-actions";
import { openWebsite } from "@/fyd/capabilities/runtime";
import { starLayoutFor, STAR_MINI_D } from "./star-layout";
import { fyd, fydMirrorCard } from "./fyd-tokens";
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
/** Expanded rich card: a vertical oval. Fixed size; taller content scrolls inside. */
export const RICH_W = 300;
/** Rich oval height (px); taller content scrolls inside the oval. */
export const RICH_H = 460;
/** Peek card width (px): a vertical oval, taller than wide. */
export const PEEK_W = 200;
/** Peek card fixed height (px); doubles as the document-space clamp height. */
export const PEEK_H_EST = 300;
/** Forgiving collapse delay so the pointer can reach the controls. */
const COLLAPSE_DELAY_MS = 300;
/** Follow receipt visibility window before settling into Following. */
const RECEIPT_MS = 2600;

const instantTx = { duration: 0.01 } as const;

/* ------------------------------------------------------------------ */
/* FYD ornate expand frame: border treatment only, never the object.   */
/* ------------------------------------------------------------------ */

/** Shiny gold band gradient (frozen in ./fyd-tokens). */
const GOLD_BAND = fyd.gradient.goldBand;
/** Royal-purple inlay channel gradient (frozen in ./fyd-tokens). */
const PURPLE_CHANNEL = fyd.gradient.purpleChannel;
/** Diamond gem gradient (frozen in ./fyd-tokens). */
const GEM_GRADIENT = fyd.gradient.gem;

/**
 * The FYD ornate expand frame: layered shiny gold bands with a glowing
 * royal-purple inlay channel between them, diamond-shaped purple gem
 * nodes set in gold at the four edge midpoints, sparkle accents at the
 * corners, and a small "Fyd" pill integrated at the bottom of the frame.
 *
 * A decorative wrapper around the expanded rich oval card: fixed oval
 * geometry (RICH_W x RICH_H). The concentric gold/purple bands are ovals
 * themselves, never rounded rectangles. The decorations are aria-hidden and
 * pointer-events-none; the wrapped card content stays fully interactive.
 * Opacity/scale fade 0 -> 1 on expand (~280ms ease); under
 * prefers-reduced-motion it appears instantly with no sparkle animation.
 */
function OrnateExpandRing({
  reduceMotion,
  children,
  style,
  cardRef,
}: {
  /** From useReducedMotion(): null (unknown) behaves like motion allowed. */
  reduceMotion: boolean | null;
  children: React.ReactNode;
  style?: React.CSSProperties;
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  const rm = reduceMotion === true;
  return (
    <motion.div
      ref={cardRef}
      data-testid="object-circle-card"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={rm ? instantTx : fyd.motion.ringFade}
      style={{ position: "absolute", width: RICH_W, height: RICH_H, ...style, zIndex: 60 }}
    >
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: "50%", padding: 5, background: GOLD_BAND }}>
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            padding: 4,
            background: PURPLE_CHANNEL,
            boxShadow:
              "0 0 18px rgba(139,92,246,0.75), inset 0 0 8px rgba(76,29,149,0.8)",
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", padding: 4, background: GOLD_BAND }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: fyd.radius.oval,
                background: fydMirrorCard,
                overflowY: "auto",
                position: "relative",
              }}
            >
              {children}
            </div>
          </div>
        </div>
        {/* Decorations: aria-hidden, pointer-events none. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {/* Diamond gem nodes at the four edge midpoints. */}
          {[
            { top: -1, left: "50%", marginLeft: -8 },
            { bottom: -1, left: "50%", marginLeft: -8 },
            { left: -1, top: "50%", marginTop: -8 },
            { right: -1, top: "50%", marginTop: -8 },
          ].map((pos, i) => (
            <span key={i} className="absolute" style={{ width: 16, height: 16, ...pos }}>
              <span
                className="block h-full w-full"
                style={{
                  transform: "rotate(45deg)",
                  background: GEM_GRADIENT,
                  border: `2px solid ${fyd.color.gold}`,
                  borderRadius: 3,
                  boxShadow:
                    "0 0 10px rgba(139,92,246,0.9), 0 0 3px rgba(243,201,107,0.9)",
                }}
              />
            </span>
          ))}
          {/* Sparkle accents on the oval band diagonals (no corners on an oval). */}
          {[
            { top: "9%", left: "13%" },
            { top: "9%", right: "13%" },
            { bottom: "9%", left: "13%" },
            { bottom: "9%", right: "13%" },
          ].map((pos, i) =>
            rm ? (
              <span
                key={i}
                className="absolute block rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: fyd.color.goldBright,
                  boxShadow: "0 0 8px rgba(255,243,196,0.9)",
                  ...pos,
                }}
              />
            ) : (
              <motion.span
                key={i}
                className="absolute block rounded-full"
                style={{
                  width: 6,
                  height: 6,
                  background: fyd.color.goldBright,
                  boxShadow: "0 0 8px rgba(255,243,196,0.9)",
                  ...pos,
                }}
                animate={{ opacity: [0.35, 1, 0.35], scale: [0.75, 1.2, 0.75] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.65 }}
              />
            ),
          )}
          {/* Fyd mark: tiny pill integrated at the bottom of the frame. */}
          <span
            className="absolute left-1/2 select-none"
            style={{
              bottom: -6,
              transform: "translate(-50%, 50%)",
              background: fyd.color.gold,
              color: fyd.color.royalDeep,
              fontSize: 9,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: "0.04em",
              padding: "3px 7px 4px",
              borderRadius: 999,
              boxShadow: "0 0 0 1px rgba(185,127,31,0.9), 0 1px 6px rgba(0,0,0,0.4)",
              whiteSpace: "nowrap",
            }}
          >
            Fyd
          </span>
        </div>
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

  /** Pin the rich card. Called by the Expand entry action, a second tap,
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
}: {
  objectId: string;
  name: string;
  websiteUrl: string | null;
  /** Entry variant: the compact action row inside the peek card. */
  entry?: boolean;
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

  const cls = entry
    ? `${ACTION_BTN} w-full border border-white/15 bg-white/10`
    : `${ACTION_BTN} border border-white/15 bg-white/10`;

  if (receipt) {
    return (
      <span
        role="status"
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 text-center text-xs font-bold text-white"
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
}: {
  objectId: string;
  name: string;
  websiteUrl: string | null;
  entry?: boolean;
}) {
  const { liked, toggleLike } = useObjectActions(objectId, websiteUrl);
  const cls = entry
    ? `${ACTION_BTN} flex-1 border border-white/15 bg-white/10`
    : `${ACTION_BTN} border border-white/15 bg-white/10`;
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
/* Peek card: identity + essential context + entry actions.            */
/* ------------------------------------------------------------------ */

/** Compact entry action for the peek card: a full-width pill in the
 * vertical stack (44px target). Icon and label sit side by side. */
function PeekEntryButton({
  onClick,
  label,
  children,
  describedBy,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
  describedBy?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      aria-describedby={describedBy}
      className={`${ACTION_BTN} w-full border border-white/15 bg-white/10`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

/**
 * PEEK: the vertically expanding oval. Identity + essential context,
 * never the full capability list. Name, category, location, and the
 * one-line why-it's-here (all nullable and omitted when null, never
 * invented). Three entry actions only, stacked vertically: Ask FYD,
 * Follow, Expand. The oval silhouette morphs out of the rest circle
 * (scaleY from the circle edge); the trigger area stays exposed for the
 * second tap; the card grows into the margin/overlay and never reflows
 * content.
 */
export function ObjectPeekCard({
  descriptor,
  style,
  onExpand,
  onAsk,
}: {
  descriptor: MarginObjectDescriptor;
  style?: React.CSSProperties;
  /** Expand entry action (or second tap): pin the rich card. */
  onExpand: () => void;
  /** Ask FYD entry action: pin the rich card at its Ask section. */
  onAsk: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const tx = reduceMotion ? instantTx : fyd.motion.expand;
  const meta = [descriptor.category, descriptor.location].filter(Boolean).join(" · ");
  // The card extends away from the circle: morph from the circle edge.
  // Document-space offsets carry a negative left on the right rail.
  const origin =
    typeof style?.left === "number" && style.left < 0 ? "right center" : "left center";
  return (
    <motion.div
      data-testid="object-circle-card"
      data-object-card="peek"
      role="group"
      aria-label={`${descriptor.name}: quick preview`}
      initial={{ scaleX: 0.85, scaleY: 0.35, opacity: 0 }}
      animate={{ scaleX: 1, scaleY: 1, opacity: 1 }}
      transition={tx}
      style={{
        position: "absolute",
        width: PEEK_W,
        height: PEEK_H_EST,
        ...style,
        zIndex: 60,
        transformOrigin: origin,
        borderRadius: fyd.radius.oval,
        background: fydMirrorCard,
        border: fyd.border.goldSoft,
        boxShadow: fyd.shadow.mirror,
        overflow: "hidden",
      }}
    >
      <div className="flex h-full flex-col items-center px-6 pb-6 pt-8 text-center">
        <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-full">
          <ObjectFace
            name={descriptor.name}
            imageSrc={descriptor.imageSrc}
            imageSrcSet={descriptor.imageSrcSet}
            sizes="112px"
            initialClassName="text-2xl"
          />
        </span>
        <p className="mt-2 line-clamp-2 text-sm font-bold leading-tight text-white">
          {descriptor.name}
        </p>
        {meta && <p className="mt-0.5 truncate text-xs text-white/60">{meta}</p>}
        {descriptor.whyHere && (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-white/70">
            {descriptor.whyHere}
          </p>
        )}
        <div className="mt-auto flex w-full flex-col gap-1.5 pt-2">
          <PeekEntryButton onClick={onAsk} label="Ask FYD">
            <MessageCircle size={15} aria-hidden="true" />
          </PeekEntryButton>
          <FollowButton objectId={descriptor.objectId} name={descriptor.name} websiteUrl={descriptor.websiteUrl} entry />
          <PeekEntryButton onClick={onExpand} label="Expand">
            <Maximize2 size={15} aria-hidden="true" />
          </PeekEntryButton>
        </div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Projection fetch: the rich card is object-graph backed.            */
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
/* Rich card data contract: projection -> sections, nothing invented. */
/* ------------------------------------------------------------------ */

function factKnown(f: Fact): boolean {
  return f.evidence.state !== "unknown";
}
function refKnown(r: RelatedRef): boolean {
  return r.evidence.state !== "unknown";
}

/**
 * One capability from the projection, rendered ONLY when the underlying
 * value exists (server-adapter behavior: a capability exists only with
 * its value). The label and destination come from the capability; the
 * layer never invents an action.
 */
export interface RichAction {
  kind: ObjectCapability["kind"];
  label: string;
  href: string;
}

/** Pure: capabilities -> renderable actions. No universal button list. */
export function richActionsFor(capabilities: ObjectCapability[]): RichAction[] {
  const out: RichAction[] = [];
  for (const c of capabilities) {
    if (c.kind === "view") continue;
    if (c.kind === "ask") out.push({ kind: "ask", label: "Ask FYD", href: "" });
    // follow/like act through the object-actions hook on the object id
    // (no navigation); their href stays empty by the declared type.
    else if (c.kind === "follow") out.push({ kind: "follow", label: "Follow", href: "" });
    else if (c.kind === "like") out.push({ kind: "like", label: "Like", href: "" });
    else if (c.kind === "call") out.push({ kind: "call", label: "Call", href: c.href });
    else if (c.kind === "email") out.push({ kind: "email", label: "Email", href: c.href });
    else if (c.kind === "website") out.push({ kind: "website", label: "Website", href: c.href });
  }
  return out;
}

export interface RichCardData {
  name: string;
  kindLabel: string;
  location: string | null;
  /** Evidence-backed summary, or null when its evidence is unknown. */
  summary: string | null;
  /** Key facts with known evidence. "Service"-label facts are covered by
   * the services section below and omitted here so they do not duplicate. */
  facts: { label: string; value: string }[];
  /** Services as related refs (known evidence only). */
  services: { id: string; name: string; relation: string }[];
  /** Key people as related refs (known evidence only). */
  people: { id: string; name: string; relation: string; kindLabel: string }[];
  actions: RichAction[];
  hasAsk: boolean;
  sampleQuestions: string[];
  provenanceLabel: string;
}

/**
 * Pure: ObjectProjection -> rich-card sections. Unknown-evidence values
 * are omitted (never guessed); empty sections are the caller's cue to
 * omit the heading. Deterministic: same projection, same sections.
 */
export function richCardDataFor(projection: ObjectProjection): RichCardData {
  return {
    name: projection.name,
    kindLabel: projection.kindLabel,
    location:
      projection.location && factKnown(projection.location)
        ? projection.location.value
        : null,
    summary:
      projection.summary && factKnown(projection.summary)
        ? projection.summary.value
        : null,
    facts: projection.facts
      .filter((f) => factKnown(f) && f.label !== "Service")
      .map((f) => ({ label: f.label, value: f.value })),
    services: projection.serviceRefs
      .filter(refKnown)
      .map((s) => ({ id: s.id, name: s.name, relation: s.relation })),
    people: projection.people
      .filter(refKnown)
      .map((p) => ({ id: p.id, name: p.name, relation: p.relation, kindLabel: p.kindLabel })),
    actions: richActionsFor(projection.capabilities),
    hasAsk: projection.capabilities.some((c) => c.kind === "ask"),
    sampleQuestions: projection.sampleQuestions,
    provenanceLabel: projection.provenance.label,
  };
}

/* ------------------------------------------------------------------ */
/* Rich card: pinned, object-graph backed, rectangular.               */
/* ------------------------------------------------------------------ */

/** One capability-gated action in the rich card's Actions section. */
function CapabilityAction({
  action,
  descriptor,
  scrollToAsk,
}: {
  action: RichAction;
  descriptor: MarginObjectDescriptor;
  scrollToAsk: () => void;
}) {
  const icon = { size: 14 } as const;
  switch (action.kind) {
    case "follow":
      return (
        <FollowButton objectId={descriptor.objectId} name={descriptor.name} websiteUrl={descriptor.websiteUrl} />
      );
    case "like":
      return (
        <LikeButton objectId={descriptor.objectId} name={descriptor.name} websiteUrl={descriptor.websiteUrl} />
      );
    case "ask":
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            scrollToAsk();
          }}
          className={ACTION_BTN}
          style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.1)" }}
        >
          <MessageCircle size={icon.size} aria-hidden="true" />
          <span>Ask FYD</span>
        </button>
      );
    case "call":
    case "email": {
      const Icon = action.kind === "call" ? Phone : Mail;
      return (
        <a
          href={action.href}
          onClick={(e) => e.stopPropagation()}
          className={ACTION_BTN}
          style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.1)" }}
        >
          <Icon size={icon.size} aria-hidden="true" />
          <span>{action.label}</span>
        </a>
      );
    }
    case "website":
      return (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openWebsite(action.href);
          }}
          className={ACTION_BTN}
          style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.1)" }}
        >
          <ArrowUpRight size={icon.size} aria-hidden="true" />
          <span>Website</span>
        </button>
      );
  }
}

/**
 * The rich card body: sections render from real object-graph data and
 * only from it. Any section with no data is omitted, never guessed.
 */
function RichCardBody({
  descriptor,
  projection,
  siteId,
  askOpen,
}: {
  descriptor: MarginObjectDescriptor;
  projection: ObjectProjection;
  siteId: string;
  askOpen: boolean;
}) {
  const data = React.useMemo(() => richCardDataFor(projection), [projection]);
  const askSectionRef = React.useRef<HTMLDivElement>(null);
  const scrollToAsk = React.useCallback(() => {
    askSectionRef.current?.scrollIntoView({ block: "nearest", behavior: "auto" });
  }, []);
  React.useEffect(() => {
    if (askOpen && data.hasAsk) scrollToAsk();
  }, [askOpen, data.hasAsk, scrollToAsk]);

  const identityMeta = [data.kindLabel, data.location].filter(Boolean).join(" · ");

  return (
    <div className="flex w-full flex-col items-center gap-4 px-7 pb-12 pt-12" data-object-card="rich">
      {/* Identity header */}
      <div className="flex w-full flex-col items-center gap-2 text-center">
        <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-full">
          <ObjectFace
            name={data.name}
            imageSrc={descriptor.imageSrc}
            imageSrcSet={descriptor.imageSrcSet}
            sizes="112px"
            initialClassName="text-2xl"
          />
        </span>
        <div className="min-w-0">
          <p className="text-base font-bold leading-tight text-white">{data.name}</p>
          {identityMeta && <p className="mt-0.5 text-xs text-white/60">{identityMeta}</p>}
        </div>
      </div>

      {/* Evidence-backed summary (omitted when its evidence is unknown) */}
      {data.summary && (
        <p className="w-full text-center text-sm leading-relaxed text-white/80">{data.summary}</p>
      )}

      {/* Key facts (known evidence only) */}
      {data.facts.length > 0 && (
        <section aria-label="Key facts" className="w-full">
          <dl className="flex flex-col gap-1.5">
            {data.facts.map((f, i) => (
              <div key={`${f.label}-${i}`} className="flex gap-2 text-sm">
                <dt className="shrink-0 font-semibold text-white/50">{f.label}</dt>
                <dd className="text-white/85">{f.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Services as related refs */}
      {data.services.length > 0 && (
        <section aria-label="Services" className="w-full">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-white/45">
            Services
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {data.services.map((s) => (
              <li
                key={s.id}
                title={s.relation}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.14)",
                }}
              >
                {s.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Key people as related refs */}
      {data.people.length > 0 && (
        <section aria-label="Key people" className="w-full">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-white/45">
            Key people
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {data.people.map((p) => (
              <li
                key={p.id}
                title={`${p.relation} · ${p.kindLabel}`}
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-white"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.14)",
                }}
              >
                {p.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Real, evidence-backed relationships -> peer-jump links. */}
      {descriptor.relationships && descriptor.relationships.length > 0 && (
        <section aria-label="Related objects" className="w-full">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-white/45">
            Related
          </p>
          <div className="flex flex-col gap-1.5">
            {descriptor.relationships.map((rel) => (
              <button
                key={rel.objectId}
                type="button"
                data-testid="object-relation"
                data-related-object-id={rel.objectId}
                onClick={(e) => {
                  e.stopPropagation();
                  requestObjectNavigate(rel.objectId);
                }}
                title={rel.basis}
                aria-label={`Open related object ${rel.name}`}
                className="flex min-h-[44px] items-center gap-2 rounded-full px-3 text-left text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  boxShadow: "0 0 0 1px rgba(232,180,90,0.35)",
                }}
              >
                <span aria-hidden="true">{"\u21D4 "}</span>
                <span className="min-w-0 flex-1 truncate">{rel.name}</span>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/45">
                  {rel.kind}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Capability-gated actions: only what the object actually supports */}
      {data.actions.length > 0 && (
        <section aria-label="Actions" className="w-full">
          <div className="flex flex-wrap gap-1.5">
            {data.actions.map((a, i) => (
              <CapabilityAction
                key={`${a.kind}-${i}`}
                action={a}
                descriptor={descriptor}
                scrollToAsk={scrollToAsk}
              />
            ))}
          </div>
        </section>
      )}

      {/* Ask FYD, object-targeted */}
      {data.hasAsk && (
        <section aria-label="Ask FYD" ref={askSectionRef} className="w-full scroll-mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-white/45">
            Ask FYD
          </p>
          <AskObjectPanel
            dark
            siteId={siteId}
            objectId={descriptor.objectId}
            objectName={data.name}
            sampleQuestions={data.sampleQuestions}
          />
        </section>
      )}

      {/* Quiet provenance line */}
      <p className="w-full text-center text-[11px] leading-relaxed text-white/40">{data.provenanceLabel}</p>
    </div>
  );
}

/**
 * EXPAND: the pinned rich card (a 300x460 vertical oval with internal
 * scroll), framed by the fading-in ornate border. Fetches its data from
 * the real object graph; fails closed.
 */
export function ObjectRichCard({
  descriptor,
  style,
  askOpen,
  cardRef,
}: {
  descriptor: MarginObjectDescriptor;
  style?: React.CSSProperties;
  /** When true, scroll the Ask section into view once data arrives. */
  askOpen?: boolean;
  /** Cluster member cards need the outer node for outside-dismissal. */
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  const reduceMotion = useReducedMotion();
  const proj = useObjectProjection(descriptor.objectId);
  return (
    <OrnateExpandRing reduceMotion={reduceMotion} style={style} cardRef={cardRef}>
      {proj.status === "ok" ? (
        <RichCardBody
          descriptor={descriptor}
          projection={proj.projection}
          siteId={proj.siteId}
          askOpen={!!askOpen}
        />
      ) : proj.status === "error" ? (
        <div className="flex h-full items-center justify-center p-8 text-center">
          <p className="text-sm text-white/70">Details are unavailable right now.</p>
        </div>
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center" aria-live="polite">
          <p className="text-sm text-white/50">Loading details…</p>
        </div>
      )}
    </OrnateExpandRing>
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
 * peek/rich cards, positioned in document space.
 *
 * @param slotStyle document-space origin of the rest slot (left/top
 *   computed by the layer) plus the slot's size.
 * @param peekStyle card-space offset from the slot origin for the PEEK
 *   card (document-space clamped by the layer; a 200x300 vertical oval).
 * @param cardStyle card-space offset from the slot origin for the rich
 *   card (document-space clamped by the layer; a 300x460 vertical oval).
 */
export function MarginObject({
  descriptor,
  slotStyle,
  peekStyle,
  cardStyle,
  restD = REST_D,
}: {
  descriptor: MarginObjectDescriptor;
  slotStyle?: React.CSSProperties;
  peekStyle?: React.CSSProperties;
  cardStyle?: React.CSSProperties;
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

      {phase === "peek" && (
        <ObjectPeekCard
          descriptor={descriptor}
          style={peekStyle}
          onExpand={() => pinOpen()}
          onAsk={() => {
            setAskOpen(true);
            pinOpen();
          }}
        />
      )}
      {phase === "pinned" && (
        <ObjectRichCard descriptor={descriptor} style={cardStyle} askOpen={askOpen} />
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
 * bubble. Tapping a member opens that member's pinned rich card. Scales
 * to many members via wrapping rows.
 */
export function ClusterSlot({
  clusterId,
  members,
  slotStyle,
  cardStyleFor,
  align = "right",
}: {
  clusterId: string;
  members: MarginObjectDescriptor[];
  slotStyle?: React.CSSProperties;
  /** Document-space-clamped rich-card offset for a member's card. */
  cardStyleFor: (member: MarginObjectDescriptor) => React.CSSProperties | undefined;
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
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/** A cluster member's pinned rich card, dismissed by close / Escape / outside. */
function ClusterMemberCard({
  descriptor,
  cardStyle,
  onClose,
}: {
  descriptor: MarginObjectDescriptor;
  cardStyle: React.CSSProperties | undefined;
  onClose: () => void;
}) {
  const { pinOpen } = useClaim(descriptor.objectId, onClose);
  const cardRef = React.useRef<HTMLDivElement>(null);

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
      cardRef={cardRef}
    />
  );
}

/* ------------------------------------------------------------------ */
/* MobileSheet: object list -> peek -> pinned rich card.               */
/* ------------------------------------------------------------------ */

/** Back to the object list inside the mobile sheet. */
export function BackButton({
  onBack,
  label,
}: {
  onBack: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1 text-sm font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <ChevronLeft size={16} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
