"""Phase 2 edits for src/lib/ping/ask-composer.ts.

1. where branch: answer from the target's locality field OR from a
   located_at edge incident to the target (direction-aware: subject is the
   located thing, object is the location). The related location object's
   evidence is cited as its own, never merged.
2. people branch: fire on association words too; add relationship-based
   associations citing the RELATED object's evidence.
3. new provenance branch ("how do you know?") placed after the attribute
   branches so attribute evidence rules govern first.
4. provenanceBasisLabel helper.
"""
import sys

PATH = "/home/nolan/projects/ping/src/lib/ping/ask-composer.ts"

with open(PATH, "r", encoding="utf-8") as f:
    src = f.read()

edits = []

# --- 1. provenanceBasisLabel helper, inserted after the cite() function ---
old_cite_tail = """function cite(text: string, cites: number[]): string {
  if (cites.length === 0) return text;
  const tags = [...new Set(cites)].map((i) => `[${i + 1}]`).join("");
  return `${text} ${tags}`;
}
"""
new_cite_tail = old_cite_tail + """
/**
 * Plain-language epistemic basis for a provenance kind, used by the
 * provenance ("how do you know?") branch. The citation layer carries the
 * formal classification; this is the sentence-level wording.
 */
function provenanceBasisLabel(kind: string): string {
  if (kind === "canonical-journal") return "a recorded fact in the site data";
  if (kind === "website-derived" || kind === "website-ingestion")
    return "the site's own words (website statement, not independently verified)";
  if (kind === "owner") return "owner-authored content";
  return "the site record";
}
"""
edits.append(("cite-helper", old_cite_tail, new_cite_tail))

# --- 2. people / association branch ---
old_people = """    if (
      hasWord(
        q,
        "person",
        "people",
        "owner",
        "owners",
        "founder",
        "founders",
        "staff",
        "team",
        "employee",
        "employees",
        "member",
        "members",
      )
    ) {
      const persons = [target, ...ctx.relatedObjects].filter((o) =>
        o.schema.toLowerCase().includes("person"),
      );
      if (persons.length === 0) {
        return {
          ...base,
          unknowns: ["people associated with this business"],
          answer: [
            `The site data contains no person records for ${title}, so I cannot answer that: there is no owner or staff information on record.`,
            "I will not guess at names, roles, or personal details that are not on record.",
          ].join("\\n\\n"),
          proposal: null,
          partial: true,
        };
      }
      for (const p of persons) {
        const i = ctx.evidenceRefs.findIndex((e) => e.id === p.id);
        pushClaim(
          `Person on record: ${p.title || p.id}.`,
          i >= 0 ? [i] : [],
          `${p.title || p.id} is associated with ${title}`,
          p,
          "name",
        );
      }
    }
"""
new_people = """    // People and association questions are answered from person records
    // and from the active relationships incident to the target. A related
    // object's evidence informs the answer but is cited as THAT object's
    // evidence, never merged into the target's record.
    if (
      hasWord(
        q,
        "person",
        "people",
        "owner",
        "owners",
        "founder",
        "founders",
        "staff",
        "team",
        "employee",
        "employees",
        "member",
        "members",
        "associated",
        "associate",
        "associates",
        "association",
        "affiliated",
        "affiliate",
        "affiliation",
        "connected",
        "linked",
      )
    ) {
      const seenIds = new Set<string>();
      const persons = [target, ...ctx.relatedObjects].filter((o) =>
        o.schema.toLowerCase().includes("person"),
      );
      for (const p of persons) {
        seenIds.add(p.id);
        const i = ctx.evidenceRefs.findIndex((e) => e.id === p.id);
        pushClaim(
          `Person on record: ${p.title || p.id}.`,
          i >= 0 ? [i] : [],
          `${p.title || p.id} is associated with ${title}`,
          p,
          "name",
        );
      }
      const incident = ctx.relationships
        .filter(
          (r) =>
            r.status === "active" &&
            (r.subject === target.id || r.object === target.id),
        )
        .map((r) => ({
          predicate: r.predicate,
          otherId: r.subject === target.id ? r.object : r.subject,
        }))
        .filter((x) => x.otherId !== target.id)
        .sort((a, b) =>
          a.predicate < b.predicate
            ? -1
            : a.predicate > b.predicate
              ? 1
              : a.otherId < b.otherId
                ? -1
                : 1,
        );
      let associations = 0;
      for (const { predicate, otherId } of incident) {
        if (seenIds.has(otherId)) continue;
        const other = ctx.relatedObjects.find((o) => o.id === otherId);
        if (!other) continue;
        const i = ctx.evidenceRefs.findIndex((e) => e.id === other.id);
        if (i < 0) continue; // every factual sentence stays cited
        seenIds.add(otherId);
        associations += 1;
        pushClaim(
          `Associated with ${title} (${predicate.replace(/_/g, " ")}): ${other.title || other.id}.`,
          [i],
          `${other.title || other.id} is associated with ${title} via ${predicate}`,
          other,
          "name",
          "relationship_fact",
        );
      }
      if (persons.length === 0 && associations === 0) {
        return {
          ...base,
          unknowns: ["people associated with this business"],
          answer: [
            `The site data contains no person records for ${title}, so I cannot answer that: there is no owner or staff information on record.`,
            "I will not guess at names, roles, or personal details that are not on record.",
          ].join("\\n\\n"),
          proposal: null,
          partial: true,
        };
      }
    }
"""
edits.append(("people-branch", old_people, new_people))

# --- 3. where branch: direction-aware located_at + locality field ---
old_where = """    if (hasWord(q, "where", "location", "address", "based")) {
      const loc = fieldOf(target, "location", "address", "city");
      if (loc)
        pushClaim(
          `${title} is listed at: ${loc}.`,
          [0],
          `${title} location`,
          target,
          "location",
        );
      else
        pushClaim(
          `No public location is on record for ${title}.`,
          [0],
          `${title} has no public location on record`,
          target,
          "location",
        );
    }
"""
new_where = """    if (hasWord(q, "where", "location", "address", "based")) {
      // located_at direction: the subject is the located thing, the object
      // is the location. From the target's perspective the location object
      // is either a related object (target is the subject) or the target
      // itself (target is the object). The claim cites the location
      // object's own evidence, never the target's.
      let locationObj: PingObject | null = null;
      let locationName: string | null = null;
      let locationSelf = false;
      for (const r of ctx.relationships) {
        if (r.status !== "active" || r.predicate !== "located_at") continue;
        if (r.subject === target.id && r.object !== target.id) {
          const o = ctx.relatedObjects.find((x) => x.id === r.object);
          if (o) {
            locationObj = o;
            locationName = o.title || fieldOf(o, "locality");
            break;
          }
        } else if (r.object === target.id && r.subject !== target.id) {
          locationObj = target;
          locationName = target.title || fieldOf(target, "locality");
          locationSelf = true;
          break;
        }
      }
      const locationRefIdx = locationObj
        ? ctx.evidenceRefs.findIndex((e) => e.id === locationObj!.id)
        : -1;
      if (locationObj && locationName && locationRefIdx >= 0) {
        if (locationSelf)
          pushClaim(
            `${title} is the location on record.`,
            [locationRefIdx],
            `${title} is a recorded location`,
            locationObj,
            "location",
            "relationship_fact",
          );
        else
          pushClaim(
            `${title} is listed at: ${locationName}.`,
            [locationRefIdx],
            `${title} location`,
            locationObj,
            "location",
            "relationship_fact",
          );
      } else {
        const loc = fieldOf(target, "location", "address", "city", "locality");
        if (loc)
          pushClaim(
            `${title} is listed at: ${loc}.`,
            [0],
            `${title} location`,
            target,
            "location",
          );
        else
          pushClaim(
            `No public location is on record for ${title}.`,
            [0],
            `${title} has no public location on record`,
            target,
            "location",
          );
      }
    }
"""
edits.append(("where-branch", old_where, new_where))

# --- 4. provenance branch, before the final sentences check ---
old_tail = """    if (sentences.length > 0) {
      return {
        ...base,
        answer: sentences.map((s) => cite(s.text, s.cites)).join("\\n\\n"),
        claimClassifications,
        proposal: null,
        partial: false,
      };
    }
"""
new_tail = """    // Provenance questions ("how do you know?") are answered from the
    // target's own record: identity, stated source, derived date, and
    // epistemic basis. Every sentence cites the target's evidence. Placed
    // after the attribute branches: a question that names an attribute
    // ("what services ... and how do you know?") is governed by that
    // attribute's evidence rules first.
    const asksProvenance =
      hasWord(q, "source", "sources", "sourcing", "provenance") ||
      (hasWord(q, "how") && hasWord(q, "know")) ||
      (hasWord(q, "where") && hasWord(q, "come") && hasWord(q, "from"));
    if (asksProvenance) {
      const prov = target.provenance;
      const url = ctx.sourceUrls[0] ?? null;
      const when = (prov.derivedAt || target.updatedAt || "").slice(0, 10);
      pushClaim(
        `I answer from the site record for ${title} (${ctx.schemaLabel}).`,
        [0],
        `${title} record identity`,
        target,
        "provenance",
      );
      if (url)
        pushClaim(
          `The record's stated source is ${url}.`,
          [0],
          `${title} record source`,
          target,
          "provenance",
        );
      if (when)
        pushClaim(
          `The record was derived on ${when}.`,
          [0],
          `${title} record date`,
          target,
          "provenance",
        );
      pushClaim(
        `Basis: ${provenanceBasisLabel(prov.kind)}.`,
        [0],
        `${title} record basis`,
        target,
        "provenance",
      );
    }

    if (sentences.length > 0) {
      return {
        ...base,
        answer: sentences.map((s) => cite(s.text, s.cites)).join("\\n\\n"),
        claimClassifications,
        proposal: null,
        partial: false,
      };
    }
"""
edits.append(("provenance-branch", old_tail, new_tail))

for name, old, new in edits:
    count = src.count(old)
    if count != 1:
        print(f"FATAL: edit {name}: found {count} occurrences (expected 1)")
        sys.exit(1)
    src = src.replace(old, new, 1)
    print(f"ok: {name}")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(src)
print("written", PATH)
