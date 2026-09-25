/**
 * ServiceArea (family registry #8). Job: INFORM.
 *
 * area-list: the full service area as a plain list.
 * hub-address: anchored on the physical hub (address first), with the
 * surrounding areas after. No map chrome, no directions embed.
 *
 * The address copy comes from owner intent (service_areas / address
 * fields); never invented.
 */

import { InspectAffordance, SectionShell, type FamilySectionProps } from "../shared";

function areasOf(ctx: FamilySectionProps["ctx"]): string[] {
  if (!ctx.owner) return [];
  const raw = ctx.owner.fields["service_areas"];
  if (!Array.isArray(raw)) return [];
  return raw.filter((a): a is string => typeof a === "string" && a.trim() !== "");
}

function hubAddress(ctx: FamilySectionProps["ctx"]): string | null {
  if (!ctx.owner) return null;
  const v = ctx.owner.fields["address"];
  const s = typeof v === "string" ? v.trim() : "";
  return s !== "" ? s : null;
}

export function ServiceArea({ section, ctx }: FamilySectionProps): JSX.Element {
  const areas = areasOf(ctx);
  const hub = hubAddress(ctx);
  const hubAddressVariant = section.variant === "hub-address";
  const owner = ctx.owner;

  return (
    <SectionShell
      id="service-area"
      component="ServiceArea"
      variant={section.variant}
      title="Where we work"
      kicker="Service area"
    >
      {hubAddressVariant && hub && (
        <p className="mb-6 font-body text-lead text-text-heading">{hub}</p>
      )}
      {areas.length > 0 ? (
        <ul className="columns-2 gap-8 md:columns-3">
          {areas.map((a) => (
            <li
              key={a}
              className="mb-3 break-inside-avoid font-body text-body text-text-primary"
            >
              {a}
            </li>
          ))}
        </ul>
      ) : (
        <p className="font-body text-body text-text-muted">Service area details coming soon.</p>
      )}
      {owner && (
        <div className="mt-8">
          <InspectAffordance ctx={ctx} objectId={owner.id} />
        </div>
      )}
    </SectionShell>
  );
}
