// GENERATED from schemas.canonical.json. Do not hand-edit.
// url is a branded string so generated code can distinguish it.
export type FYDUrl = string & { readonly __fydUrl: unique symbol };

/** ping.social.business@1. A business: name, description, category, website, contact details, hours, and social links. The root object a generated site is built around. */
export interface Business {
  /** The business name. */
  title: string;
  /** What the business does, in its own words. */
  description: string;
  /** Trade or industry category. */
  category?: string;
  /** Public website URL. */
  website?: FYDUrl;
  /** Public business phone. */
  phone?: string;
  /** Public business email. */
  email?: string;
  /** Opening hours as published. */
  hours?: string;
  /** Public social profile URLs. */
  socials?: string[];
}

/** ping.social.service@1. A service the business offers: name, description, and optional price or duration hints. Rendered as cards in Services sections. */
export interface Service {
  /** The service name. */
  title: string;
  /** What the service includes. */
  description: string;
  /** Published price guidance, never a quote. */
  price_hint?: string;
  /** Typical job duration as published. */
  duration?: string;
}

/** ping.social.post@1. A post or article: title, body text, publish date, and tags. Rendered in feeds and recent-objects sections. Replies reference posts. */
export interface Post {
  /** The post title. */
  title: string;
  /** The post body text. */
  text?: string;
  /** Publish date as published. */
  date?: string;
  /** Canonical link to the full post. */
  url?: FYDUrl;
  /** Topic tags. */
  tags?: string[];
}

