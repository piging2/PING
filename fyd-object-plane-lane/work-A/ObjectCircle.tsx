"use client";

/**
 * ObjectCircle: the generic PING object projection for the margin object
 * layer (Nolan, 2026-09-22: "Margins Are the Object Layer").
 *
 * FYD VISUAL IDENTITY (Nolan, 2026-09-22, refined same day: the ornate
 * treatment is the BORDER only, never the object itself):
 * - rest: the small quiet circle, unchanged.
 * - on expand (HOVER_PREVIEW / PINNED_OPEN): an ornate ring FADES IN
 *   around the expanded card (~280ms ease; instant under
 *   prefers-reduced-motion, with no sparkle animation): concentric
 *   shiny-gold gradient bands with a glowing royal-purple inlay channel
 *   between them, diamond-shaped purple gem nodes set in gold at the
 *   four cardinal points, subtle sparkle/glow accents, and a small "Fyd"
 *   pill (gold bg, deep-purple #4c1d95 text, aria-hidden) integrated at
 *   the bottom of the ring. The ring is a purely decorative,
 *   absolutely positioned overlay (pointer-events none, aria-hidden),
 *   slightly larger than the card.
 * Applied to every expanded-card equivalent: the object card, the
 * cluster member card, and the mobile sheet card (ObjectCardStatic).
 * The cluster "+N" slot trigger stays quiet like the rest circle.
 * Enforced in this generic file; zero customer-specific code.
 *
 * INTERACTION STATE MACHINE (one claim id):
 *   CLOSED --mouseenter/focus--> HOVER_PREVIEW (claims the one-expanded
 *     slot as a preview)
 *   HOVER_PREVIEW --mouseleave, 300ms forgiving delay--> CLOSED
 *   HOVER_PREVIEW --click--> PINNED_OPEN (the first click never undoes
 *     what hover just did)
 *   CLOSED --click (touch tap, no hover)--> PINNED_OPEN
 *   PINNED_OPEN --click--> CLOSED (mouseleave never closes a pin)
 *   any open state --Escape / outside pointerdown / blur outside-->
 *     CLOSED; being superseded by another claimant --> CLOSED.
 *
 * Layout: the layer renders this in DOCUMENT space (position:absolute
 * inside the document-height object plane). The expanded card is an
 * absolutely positioned child of the slot wrapper; it scrolls WITH the
 * page. Never viewport-fixed, never viewport-clamped.
 *
 * Generic: takes object data as props. No per-customer logic lives here.
 * One-expanded coordination comes from ./expansion (module-level claim
 * registry shared by circles, cluster popovers, and the mobile sheet).
 */

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, ChevronLeft, Heart, UserCheck, UserPlus } from "lucide-react";
import { spring } from "@/motion/motionTokens";
import {
  claimExpanded,
  requestObjectNavigate,
  subscribeExpanded,
  subscribeOpenRequest,
} from "./expansion";
import { useObjectActions } from "./use-object-actions";
import type { MarginObjectDescriptor } from "./types";

/** Resting diameter on desktop rails: compact, quiet, recognizable. */
export const REST_D = 64;
/** Expanded diameter: fits the three actions with 44px touch targets. */
export const EXPANDED_D = 216;
/** Forgiving collapse delay so the pointer can reach the controls. */
const COLLAPSE_DELAY_MS = 300;
/** Ornate ring fade-in on expand. */
const RING_FADE_MS = 280;

const springTx = { type: "spring", ...spring.gentle } as const;
const instantTx = { duration: 0.01 } as const;

/* ------------------------------------------------------------------ */
/* FYD ornate expand ring: border treatment only, never the object.    */
/* ------------------------------------------------------------------ */

/** Shiny gold band gradient. */
const GOLD_BAND =
  "linear-gradient(135deg,#fff3c4,#f3c96b 25%,#b97f1f 50%,#f3c96b 75%,#fff3c4)";
/** Royal-purple inlay channel gradient. */
const PURPLE_CHANNEL =
  "linear-gradient(135deg,#a78bfa 0%,#7c3aed 55%,#4c1d95 100%)";
/** Diamond gem gradient. */
const GEM_GRADIENT =
  "linear-gradient(135deg,#e9d5ff 0%,#8b5cf6 55%,#4c1d95 100%)";

/**
 * The FYD ornate expand ring: layered shiny gold bands with a glowing
 * royal-purple inlay channel between them, diamond-shaped purple gem
 * nodes set in gold at the four cardinal points, sparkle/glow accents,
 * and a small "Fyd" pill integrated at the bottom of the ring.
 *
 * Purely decorative: aria-hidden, pointer-events none, absolutely
 * positioned slightly larger than the card it frames. Opacity fades
 * 0 -> 1 on expand (~280ms ease); under prefers-reduced-motion it
 * appears instantly with no sparkle animation.
 */
function OrnateExpandRing({
  diameter,
  reduceMotion,
}: {
  diameter: number;
  /** From useReducedMotion(): null (unknown) behaves like motion allowed. */
  reduceMotion: boolean | null;
}) {
  const rm = reduceMotion === true;
  const pad = 16;
  const outer = diameter + pad * 2;
  const gemR = outer / 2 - 5 - 2; // mid purple channel
  const sparkR = outer / 2 - 2.5; // mid outer gold band
  return (
    <motion.div
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={rm ? instantTx : { duration: RING_FADE_MS / 1000, ease: "easeOut" }}
      className="pointer-events-none absolute"
      style={{ width: outer, height: outer, left: -pad, top: -pad }}
    >
      {/* Layered bands: outer gold (5px) -> purple inlay channel (4px,
          glowing) -> inner gold (4px) -> transparent center with a soft
          inner purple aura hugging the card. */}
      <div className="absolute inset-0 rounded-full" style={{ background: GOLD_BAND, padding: 5 }}>
        <div
          className="h-full w-full rounded-full"
          style={{
            background: PURPLE_CHANNEL,
            padding: 4,
            boxShadow:
              "0 0 18px rgba(139,92,246,0.75), inset 0 0 8px rgba(76,29,149,0.8)",
          }}
        >
          <div className="h-full w-full rounded-full" style={{ background: GOLD_BAND, padding: 4 }}>
            <div
              className="h-full w-full rounded-full"
              style={{ boxShadow: "inset 0 0 26px rgba(139,92,246,0.45)" }}
            />
          </div>
        </div>
      </div>
      {/* Diamond gem nodes at the four cardinal points. */}
      {[0, 90, 180, 270].map((deg) => (
        <span
          key={deg}
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            width: 16,
            height: 16,
            margin: -8,
            transform: `rotate(${deg}deg) translateY(-${gemR}px)`,
          }}
        >
          <span
            className="block h-full w-full"
            style={{
              transform: "rotate(45deg)",
              background: GEM_GRADIENT,
              border: "2px solid #f3c96b",
              borderRadius: 3,
              boxShadow:
                "0 0 10px rgba(139,92,246,0.9), 0 0 3px rgba(243,201,107,0.9)",
            }}
          />
        </span>
      ))}
      {/* Sparkle accents on the diagonals. */}
      {[45, 135, 225, 315].map((deg, i) => (
        <span
          key={deg}
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            width: 6,
            height: 6,
            margin: -3,
            transform: `rotate(${deg}deg) translateY(-${sparkR}px)`,
          }}
        >
          {rm ? (
            <span
              className="block h-full w-full rounded-full"
              style={{ background: "#fff3c4", boxShadow: "0 0 8px rgba(255,243,196,0.9)" }}
            />
          ) : (
            <motion.span
              className="block h-full w-full rounded-full"
              style={{ background: "#fff3c4", boxShadow: "0 0 8px rgba(255,243,196,0.9)" }}
              animate={{ opacity: [0.35, 1, 0.35], scale: [0.75, 1.2, 0.75] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.65 }}
            />
          )}
        </span>
      ))}
      {/* Fyd mark: tiny pill integrated at the bottom of the ring. */}
      <span
        className="absolute left-1/2 select-none"
        style={{
          bottom: -4,
          transform: "translate(-50%, 50%)",
          background: "#f3c96b",
          color: "#4c1d95",
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
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Quiet circle face (rest state): image or initial, unchanged.         */
/* ------------------------------------------------------------------ */

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
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <>
      {imageSrc ? (
        <img
          src={imageSrc}
          srcSet={imageSrcSet ?? undefined}
          sizes={sizes}
          alt=""
          aria-hidden="true"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-center font-bold text-white ${initialClassName}`}
          style={{ background: "radial-gradient(circle at 35% 30%, #8a6f4d, #3a3226)" }}
        >
          {initial}
        </span>
      )}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.30), transparent 55%)" }}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Interaction state machine: CLOSED / HOVER_PREVIEW / PINNED_OPEN.    */
/* ------------------------------------------------------------------ */

/** Interaction phase for one claim id. */
export type ClaimPhase = "closed" | "hover" | "pinned";

/**
 * Local interaction state for one claim id, wired to the shared
 * one-expanded registry (./expansion).
 *
 * - hoverOpen(): mouseenter / keyboard focus. Claims the global slot as
 *   a preview; phase HOVER_PREVIEW. Never downgrades a pin.
 * - hoverLeave(focusInside?): mouseleave. Only closes from
 *   HOVER_PREVIEW, after the forgiving delay; a pinned card stays open.
 * - triggerClick(): click on the rest trigger. HOVER_PREVIEW ->
 *   PINNED_OPEN (the first click never undoes what hover just did);
 *   PINNED_OPEN -> CLOSED; CLOSED -> PINNED_OPEN (touch tap, no hover).
 * - pinOpen(): open straight to PINNED_OPEN (cluster popover, member
 *   card, programmatic peer-jump opens).
 * - requestClose(): CLOSED now (Escape, outside pointerdown). Local-only:
 *   a close never releases another claimant's slot.
 * - requestCloseSoon(focusInside?): CLOSED after the forgiving delay,
 *   unless focus moved back inside (never strands keyboard focus).
 * - Being superseded by another claimant -> CLOSED (+ onSuperseded).
 */
export function useClaim(claimId: string, onSuperseded?: () => void) {
  const [phase, setPhase] = React.useState<ClaimPhase>("closed");
  const phaseRef = React.useRef<ClaimPhase>(phase);
  phaseRef.current = phase;
  const open = phase !== "closed";
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = React.useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);
  React.useEffect(() => clearTimer, [clearTimer]);

  const supersededRef = React.useRef(onSuperseded);
  supersededRef.current = onSuperseded;
  React.useEffect(
    () =>
      subscribeExpanded((active) => {
        if (active !== claimId) {
          clearTimer();
          setPhase("closed");
          supersededRef.current?.();
        }
      }),
    [claimId, clearTimer],
  );

  const claim = React.useCallback(() => {
    clearTimer();
    claimExpanded(claimId);
  }, [claimId, clearTimer]);

  const hoverOpen = React.useCallback(() => {
    if (phaseRef.current === "pinned") return;
    claim();
    setPhase("hover");
  }, [claim]);

  const pinOpen = React.useCallback(() => {
    claim();
    setPhase("pinned");
  }, [claim]);

  const triggerClick = React.useCallback(() => {
    const p = phaseRef.current;
    if (p === "hover") {
      // KEEP/FORCE OPEN: the first click never undoes what hover did.
      clearTimer();
      setPhase("pinned");
    } else if (p === "pinned") {
      clearTimer();
      setPhase("closed");
    } else {
      claim();
      setPhase("pinned");
    }
  }, [claim, clearTimer]);

  const requestClose = React.useCallback(() => {
    clearTimer();
    setPhase("closed");
  }, [clearTimer]);

  const requestCloseSoon = React.useCallback(
    (focusInside?: () => boolean) => {
      clearTimer();
      timer.current = setTimeout(() => {
        // Never strand keyboard focus: if focus is inside, the blur
        // handler owns the close instead.
        if (!focusInside || !focusInside()) setPhase("closed");
      }, COLLAPSE_DELAY_MS);
    },
    [clearTimer],
  );

  const hoverLeave = React.useCallback(
    (focusInside?: () => boolean) => {
      // A pinned card ignores mouseleave; only a hover preview gets the
      // forgiving delayed close.
      if (phaseRef.current === "hover") requestCloseSoon(focusInside);
    },
    [requestCloseSoon],
  );

  return {
    open,
    phase,
    hoverOpen,
    hoverLeave,
    pinOpen,
    triggerClick,
    requestClose,
    requestCloseSoon,
    clearTimer,
  };
}

/* ------------------------------------------------------------------ */
/* Expanded card interior: name + relationships + exactly three actions */
/* ------------------------------------------------------------------ */

interface CircleActionProps {
  label: string;
  stateLabel: string;
  pressed: boolean;
  disabled: boolean;
  onAction: () => void;
  buttonRef?: { current: HTMLButtonElement | null };
  children: React.ReactNode;
}

/**
 * One in-circle action. Visual footprint is compact (icon over a short
 * label); the hit target is always at least 44px tall.
 */
function CircleAction({
  label,
  stateLabel,
  pressed,
  disabled,
  onAction,
  buttonRef,
  children,
}: CircleActionProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={pressed ? stateLabel : label}
      title={pressed ? stateLabel : label}
      onClick={(e) => {
        e.stopPropagation();
        onAction();
      }}
      className="flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-white transition-colors disabled:opacity-50"
      style={{
        background: "rgba(0,0,0,0.62)",
        boxShadow: pressed
          ? "0 0 0 1px rgba(232,180,90,0.85), 0 2px 10px rgba(0,0,0,0.5)"
          : "0 0 0 1px rgba(255,255,255,0.30), 0 2px 10px rgba(0,0,0,0.5)",
        color: pressed ? "#f3c96b" : "#ffffff",
        backdropFilter: "blur(2px)",
      }}
    >
      {children}
      <span className="text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}

/** Mutable holder for an action button element (structural: no React-version coupling). */
interface ActionRefs {
  follow: { current: HTMLButtonElement | null };
  like: { current: HTMLButtonElement | null };
  web: { current: HTMLButtonElement | null };
}

/** The 216px circle interior: name + relationships + exactly three actions. No positioning. */
function ObjectCardInner({
  descriptor,
  actionRefs,
  onActionsSettled,
}: {
  descriptor: MarginObjectDescriptor;
  actionRefs: ActionRefs;
  /** Fires when follow/like state first resolves (actions become usable). */
  onActionsSettled?: () => void;
}) {
  const { following, liked, toggleFollow, toggleLike, openSite } = useObjectActions(
    descriptor.objectId,
    descriptor.websiteUrl,
  );
  const settled = following !== null || liked !== null;
  const settledCb = React.useRef(onActionsSettled);
  settledCb.current = onActionsSettled;
  React.useEffect(() => {
    if (settled) settledCb.current?.();
  }, [settled]);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-full bg-neutral-900">
      <ObjectFace
        name={descriptor.name}
        imageSrc={descriptor.imageSrc}
        imageSrcSet={descriptor.imageSrcSet}
        sizes={`${EXPANDED_D}px`}
        initialClassName="text-5xl"
      />
      {/* Controlled contrast: dark scrims top (name) and bottom (actions). */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.76) 0%, rgba(0,0,0,0.32) 30%, rgba(0,0,0,0) 46%, rgba(0,0,0,0) 56%, rgba(0,0,0,0.86) 100%)",
        }}
      />
      <div className="absolute inset-0">
        <div className="absolute inset-x-0 top-0 px-8 pt-5 text-center">
          <p className="line-clamp-2 text-[13px] font-bold leading-tight text-white">
            {descriptor.name}
          </p>
        </div>
        {/* Truthful relationships: peer-jump links. Clicking one asks the
            LAYER to navigate to the related object (collapse, scroll into
            view when offscreen, then open through the open-request bus);
            the one-expanded claim collapses this card. */}
        {descriptor.relationships && descriptor.relationships.length > 0 ? (
          <div className="absolute inset-x-0 top-[62px] flex flex-col items-center gap-1 px-6">
            {descriptor.relationships.map((rel) => (
              <button
                key={rel.objectId}
                type="button"
                data-testid="object-relation"
                data-related-object-id={rel.objectId}
                onClick={() => requestObjectNavigate(rel.objectId)}
                title={rel.basis}
                aria-label={`Open related object ${rel.name}`}
                className="max-w-full truncate rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
                style={{
                  background: "rgba(0,0,0,0.62)",
                  boxShadow: "0 0 0 1px rgba(232,180,90,0.45)",
                }}
              >
                <span aria-hidden="true">{"\u21D4 "}</span>
                {rel.name}
              </button>
            ))}
          </div>
        ) : null}
        <div className="absolute inset-x-6 bottom-6 flex gap-1.5">
          <CircleAction
            label="Follow"
            stateLabel="Following"
            pressed={!!following}
            disabled={following === null}
            onAction={toggleFollow}
            buttonRef={actionRefs.follow}
          >
            {following ? (
              <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </CircleAction>
          <CircleAction
            label="Like"
            stateLabel="Liked"
            pressed={!!liked}
            disabled={liked === null}
            onAction={toggleLike}
            buttonRef={actionRefs.like}
          >
            <Heart
              className="h-3.5 w-3.5"
              aria-hidden="true"
              fill={liked ? "currentColor" : "none"}
            />
          </CircleAction>
          {descriptor.websiteUrl ? (
            <CircleAction
              label="Website"
              stateLabel="Website"
              pressed={false}
              disabled={false}
              onAction={openSite}
              buttonRef={actionRefs.web}
            >
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </CircleAction>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MarginObject: quiet rest trigger + expanded card with ornate ring.   */
/* ------------------------------------------------------------------ */

/**
 * One margin object: the small quiet rest button at the document-space
 * slot + an absolutely positioned expanded card anchored to it (scrolls
 * with the page). On expand, the ornate FYD ring fades in around the
 * card. The card is a child of the slot wrapper, never inside a
 * transformed ancestor of the layer.
 */
export function MarginObject({
  descriptor,
  slotStyle,
  cardStyle,
  restD = REST_D,
}: {
  descriptor: MarginObjectDescriptor;
  /** Document-space slot style from the placement layer. */
  slotStyle: React.CSSProperties;
  /** Card style relative to the slot wrapper's origin (layer-computed). */
  cardStyle: React.CSSProperties;
  restD?: number;
}) {
  const { objectId, name } = descriptor;
  const reduceMotion = useReducedMotion();
  const tx = reduceMotion ? instantTx : springTx;
  const {
    open,
    hoverOpen,
    hoverLeave,
    pinOpen,
    triggerClick,
    requestClose,
    requestCloseSoon,
    clearTimer,
  } = useClaim(objectId);

  // Peer jump: a related-object link (via the layer's navigate bus)
  // asks this slot to expand. Pinned: it must survive mouseleave.
  React.useEffect(
    () =>
      subscribeOpenRequest((id) => {
        if (id === objectId) pinOpen();
      }),
    [objectId, pinOpen],
  );

  const wrapRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const actionRefs: ActionRefs = {
    follow: React.useRef<HTMLButtonElement | null>(null),
    like: React.useRef<HTMLButtonElement | null>(null),
    web: React.useRef<HTMLButtonElement | null>(null),
  };
  const openedVia = React.useRef<"pointer" | "focus" | null>(null);
  // Escape returns focus to the trigger; the focus handler must not
  // treat that programmatic focus as a fresh keyboard open.
  const suppressFocusOpen = React.useRef(false);

  const focusInside = React.useCallback(
    () => !!wrapRef.current?.contains(document.activeElement),
    [],
  );

  // Keyboard open: move focus into the first enabled action so the
  // trigger (which hides while open) never strands focus. Re-runs when
  // the actions settle (they start disabled until the server confirms).
  const tryFocusFirstAction = React.useCallback(() => {
    if (openedVia.current !== "focus") return;
    openedVia.current = null;
    const first = [actionRefs.follow.current, actionRefs.like.current, actionRefs.web.current].find(
      (b) => b && !b.disabled,
    );
    first?.focus({ preventScroll: true });
  }, []);

  React.useEffect(() => {
    if (open) tryFocusFirstAction();
  }, [open, tryFocusFirstAction]);

  // While open: Escape collapses (focus returns to the trigger);
  // a pointerdown outside the object collapses. Deferred so the
  // opening tap never instantly dismisses.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        suppressFocusOpen.current = true;
        requestClose();
        triggerRef.current?.focus({ preventScroll: true });
      }
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        requestClose();
      }
    };
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 80);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, requestClose]);

  // Keyboard: focus opens a hover preview (the machine's HOVER_PREVIEW).
  const handleFocus = () => {
    if (suppressFocusOpen.current) {
      suppressFocusOpen.current = false;
      return;
    }
    openedVia.current = "focus";
    hoverOpen();
  };

  // Blur outside the object closes from any phase (after the forgiving
  // delay, so focus can travel into the card).
  const handleBlur = (e: React.FocusEvent) => {
    if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) {
      requestCloseSoon(focusInside);
    }
  };

  const handleCardBackground = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    requestClose();
  };

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
      {/* Rest state: the small quiet circle. Hidden while open. */}
      <motion.button
        ref={triggerRef}
        type="button"
        onClick={() => {
          openedVia.current = "pointer";
          triggerClick();
        }}
        onFocus={handleFocus}
        aria-expanded={open}
        aria-label={`${name}. ${open ? "Collapse." : "Expand to show follow, like, and website actions."}`}
        aria-hidden={open || undefined}
        tabIndex={open ? -1 : 0}
        className="absolute inset-0 cursor-pointer overflow-hidden rounded-full"
        style={{
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.20), 0 0 22px rgba(232,180,90,0.18), 0 8px 24px rgba(0,0,0,0.45)",
        }}
        initial={false}
        animate={{ opacity: open ? 0 : 1, scale: open ? 0.7 : 1 }}
        transition={tx}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      >
        <ObjectFace
          name={name}
          imageSrc={descriptor.imageSrc}
          imageSrcSet={descriptor.imageSrcSet}
          sizes={`${restD}px`}
          initialClassName="text-xl"
        />
      </motion.button>

      {/* Expanded state: absolute card anchored to the slot in document
          space (moves WITH the page on scroll) with the ornate FYD ring
          fading in around it. */}
      {open && (
        <motion.div
          data-testid="object-circle-card"
          role="group"
          aria-label={`${name}: follow, like, website actions`}
          onClick={handleCardBackground}
          className="rounded-full bg-neutral-900"
          style={{
            ...cardStyle,
            position: "absolute",
            width: EXPANDED_D,
            height: EXPANDED_D,
            zIndex: 60,
            boxShadow:
              "0 0 0 1px rgba(255,255,255,0.22), 0 18px 50px rgba(0,0,0,0.55)",
          }}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={tx}
        >
          <OrnateExpandRing diameter={EXPANDED_D} reduceMotion={reduceMotion} />
          <ObjectCardInner
            descriptor={descriptor}
            actionRefs={actionRefs}
            onActionsSettled={tryFocusFirstAction}
          />
        </motion.div>
      )}
    </div>
  );
}

/**
 * Static 216px object card for the mobile sheet: same interior and the
 * same ornate expand ring, no positioning, no claim registry (the sheet
 * owns visibility).
 */
export function ObjectCardStatic({ descriptor }: { descriptor: MarginObjectDescriptor }) {
  const reduceMotion = useReducedMotion();
  const actionRefs: ActionRefs = {
    follow: React.useRef<HTMLButtonElement | null>(null),
    like: React.useRef<HTMLButtonElement | null>(null),
    web: React.useRef<HTMLButtonElement | null>(null),
  };
  return (
    <div
      data-testid="object-card-static"
      role="group"
      aria-label={`${descriptor.name}: follow, like, website actions`}
      className="relative mx-auto"
      style={{
        width: EXPANDED_D,
        height: EXPANDED_D,
      }}
    >
      <OrnateExpandRing diameter={EXPANDED_D} reduceMotion={reduceMotion} />
      <div
        className="relative h-full w-full overflow-hidden rounded-full bg-neutral-900"
        style={{ boxShadow: "0 18px 50px rgba(0,0,0,0.55)" }}
      >
        <ObjectCardInner descriptor={descriptor} actionRefs={actionRefs} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ClusterSlot: quiet "+N" trigger + member popover + member card.      */
/* ------------------------------------------------------------------ */

/**
 * ClusterSlot: a quiet "+N" trigger for a compact cluster of nearby
 * objects. Tap expands a small member list in the object plane; picking
 * a member opens that member's card (with the ornate ring) and pinned
 * semantics. Generic; no per-customer logic. The wrapper carries
 * data-member-ids so the layer's relationship navigation can find a
 * member's owning slot.
 */
export function ClusterSlot({
  clusterId,
  members,
  slotStyle,
  popoverStyle,
  cardStyleFor,
  restD = REST_D,
}: {
  clusterId: string;
  members: MarginObjectDescriptor[];
  slotStyle: React.CSSProperties;
  popoverStyle: React.CSSProperties;
  cardStyleFor: (member: MarginObjectDescriptor) => React.CSSProperties;
  restD?: number;
}) {
  const claimId = `cluster:${clusterId}`;
  const { open, pinOpen, requestClose } = useClaim(claimId);
  const [selected, setSelected] = React.useState<MarginObjectDescriptor | null>(null);
  const wrapRef = React.useRef<HTMLDivElement>(null);

  // Peer jump: open the popover and select the requested member directly.
  React.useEffect(
    () =>
      subscribeOpenRequest((id) => {
        const member = members.find((m) => m.objectId === id);
        if (member) {
          pinOpen();
          setSelected(member);
        }
      }),
    [members, pinOpen],
  );

  // While the popover is open: Escape or outside pointerdown closes.
  React.useEffect(() => {
    if (!open || selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    const onDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) requestClose();
    };
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 80);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, selected, requestClose]);

  const pickMember = (m: MarginObjectDescriptor) => {
    // The member card claims its object id on mount, which collapses
    // this popover through the shared registry.
    setSelected(m);
  };

  return (
    <div
      ref={wrapRef}
      data-testid="margin-cluster"
      data-cluster-id={clusterId}
      data-member-ids={members.map((m) => m.objectId).join(" ")}
      className="pointer-events-auto"
      style={{ ...slotStyle, position: "absolute" }}
    >
      <button
        type="button"
        onClick={() => (open && !selected ? requestClose() : (setSelected(null), pinOpen()))}
        aria-expanded={open}
        aria-label={`${members.length} nearby objects. Expand to choose one.`}
        className="absolute inset-0 cursor-pointer overflow-hidden rounded-full"
        style={{
          background: "rgba(20,16,10,0.92)",
          boxShadow:
            "0 0 0 1px rgba(232,180,90,0.55), 0 8px 24px rgba(0,0,0,0.45)",
          color: "#f3c96b",
        }}
      >
        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
          +{members.length}
        </span>
      </button>

      {open && !selected && (
        <div
          role="menu"
          aria-label="Nearby objects"
          className="rounded-2xl bg-neutral-950 p-2"
          style={{
            ...popoverStyle,
            position: "absolute",
            zIndex: 60,
            boxShadow: "0 18px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.14)",
            minWidth: 220,
            maxWidth: 280,
          }}
        >
          {members.map((m) => (
            <button
              key={m.objectId}
              type="button"
              role="menuitem"
              onClick={() => pickMember(m)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left text-white hover:bg-white/10"
            >
              <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full">
                <ObjectFace
                  name={m.name}
                  imageSrc={m.imageSrc}
                  imageSrcSet={m.imageSrcSet}
                  sizes="80px"
                  initialClassName="text-base"
                />
              </span>
              <span className="line-clamp-2 text-sm font-semibold leading-tight">{m.name}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ClusterMemberCard
          descriptor={selected}
          cardStyle={cardStyleFor(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/**
 * One member's expanded card, opened from a cluster popover. Pinned
 * semantics, with the ornate FYD ring.
 */
function ClusterMemberCard({
  descriptor,
  cardStyle,
  onClose,
}: {
  descriptor: MarginObjectDescriptor;
  cardStyle: React.CSSProperties;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const tx = reduceMotion ? instantTx : springTx;
  const actionRefs: ActionRefs = {
    follow: React.useRef<HTMLButtonElement | null>(null),
    like: React.useRef<HTMLButtonElement | null>(null),
    web: React.useRef<HTMLButtonElement | null>(null),
  };
  const cardRef = React.useRef<HTMLDivElement>(null);

  // Claim on mount (pinned): collapses the popover (and anything else)
  // through the shared registry. Being superseded later closes this card.
  const { pinOpen } = useClaim(descriptor.objectId, onClose);
  React.useEffect(() => {
    pinOpen();
  }, [pinOpen]);

  const handleClose = React.useCallback(() => {
    claimExpanded(null);
    onClose();
  }, [onClose]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    const onDown = (e: PointerEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) handleClose();
    };
    const t = setTimeout(() => document.addEventListener("pointerdown", onDown), 80);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [handleClose]);

  return (
    <motion.div
      data-testid="object-circle-card"
      ref={cardRef}
      role="group"
      aria-label={`${descriptor.name}: follow, like, website actions`}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("button")) handleClose();
      }}
      className="rounded-full bg-neutral-900"
      style={{
        ...cardStyle,
        position: "absolute",
        width: EXPANDED_D,
        height: EXPANDED_D,
        zIndex: 61,
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.22), 0 18px 50px rgba(0,0,0,0.55)",
      }}
      initial={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={tx}
    >
      <OrnateExpandRing diameter={EXPANDED_D} reduceMotion={reduceMotion} />
      <ObjectCardInner descriptor={descriptor} actionRefs={actionRefs} />
    </motion.div>
  );
}

/** Back chevron used by the mobile sheet card view. Exported for reuse. */
export function BackButton({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      aria-label={label}
      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-white"
      style={{ background: "rgba(255,255,255,0.08)" }}
    >
      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
