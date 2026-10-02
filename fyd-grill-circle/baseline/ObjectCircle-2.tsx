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
      {/*
        Oval-safe header: the card is a true ellipse (borderRadius 50%
        with overflow hidden), so the top band is much narrower than the
        300px card width. Centered content stays inside the ellipse;
        left-aligned content here was clipped by the curve (Back button
        text cut off at 1440px).
      */}
      <div className="flex items-center justify-center gap-2">
        <BackButton light onBack={onBack} label="Back" />
        <p className="text-sm font-bold" style={{ color: CARD_INK }}>
          Ask FYD
        </p>
      </div>
      <p className="mb-2 mt-1 truncate text-center text-xs text-neutral-500">about {projection.name}</p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <AskObjectPanel
          siteId={siteId}
          objectId={descriptor.objectId}
          objectName={projection.name}
          sampleQuestions={projection.sampleQuestions}
          compact
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
