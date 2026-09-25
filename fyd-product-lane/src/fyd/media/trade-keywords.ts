/**
 * Trade keyword sets for media on-trade relevance scoring (Part B.0).
 *
 * Versioned data for media-score@1. These sets match TRADE VOCABULARY
 * only: they decide whether an image depicts a given trade's work.
 * They never classify a business: the business trade always comes from
 * canonical objects, never from pixels.
 *
 * Changing a set is a spec change (same lock process as
 * presentation-observations.md), not a tuning tweak.
 */

export const TRADE_KEYWORDS_VERSION = "media-score@1";

/**
 * Lowercase single-word tokens per trade. Multi-word phrases are split
 * before matching (the scorer tokenizes on non-alphanumerics), so keep
 * entries to single tokens.
 */
export const TRADE_KEYWORDS: Record<string, readonly string[]> = {
  carpentry: [
    "deck", "decks", "framing", "lumber", "wood", "timber", "fence",
    "fencing", "drywall", "cabinet", "cabinets", "trim", "molding",
    "staircase", "stairs", "railing", "siding", "pergola", "shed",
    "framer", "carpenter", "woodwork", "hardwood", "plywood", "joist",
    "beam", "beams", "stud", "studs", "remodel", "renovation", "porch",
  ],
  plumbing: [
    "pipe", "pipes", "piping", "plumbing", "plumber", "fixture",
    "fixtures", "faucet", "drain", "drains", "sewer", "waterheater",
    "water", "heater", "toilet", "sink", "shower", "valve", "valves",
    "conduit", "copper", "pex", "leak", "clog", "sump", "septic",
  ],
  hvac: [
    "hvac", "furnace", "ac", "condenser", "compressor", "thermostat",
    "duct", "ducts", "ductwork", "ventilation", "vent", "air",
    "conditioning", "cooling", "heating", "heatpump", "refrigerant",
    "evaporator", "blower", "filter",
  ],
  electrical: [
    "electrical", "electrician", "wiring", "wire", "panel", "breaker",
    "outlet", "switch", "lighting", "fixture", "circuit", "voltage",
    "conduit", "junction", "generator",
  ],
  roofing: [
    "roof", "roofing", "roofer", "shingle", "shingles", "gutter",
    "gutters", "flashing", "eave", "soffit", "fascia", "skylight",
    "metalroof", "tile", "underlayment",
  ],
  landscaping: [
    "landscape", "landscaping", "lawn", "garden", "mulch", "sod",
    "sprinkler", "irrigation", "patio", "paver", "pavers", "retaining",
    "wall", "planting", "tree", "trees", "shrub", "flowerbed", "turf",
    "xeriscaping",
  ],
  painting: [
    "paint", "painting", "painter", "roller", "brush", "primer",
    "exterior", "interior", "cabinet", "stain", "coating", "sprayer",
  ],
};

/**
 * All known trade names, sorted. The scorer uses this to detect
 * cross-trade tokens: keywords of any trade other than the business's.
 */
export const KNOWN_TRADES: readonly string[] = Object.keys(TRADE_KEYWORDS).sort();

/**
 * Token lookup for a trade, or an empty set when the trade has no
 * keyword set (unknown trade: no signal either way, never an error).
 */
export function keywordsForTrade(trade: string): ReadonlySet<string> {
  const set = TRADE_KEYWORDS[trade.toLowerCase().trim()];
  return new Set(set ?? []);
}
