/**
 * Constitutional Runtime - Event Contracts
 * 
 * Shared event schemas and interfaces for all applications.
 * Published by Constitutional Runtime, consumed by PING and HPP.
 * 
 * Schema Version: 1 (immutable)
 */

export const EVENT_SCHEMA_VERSION = 1;

/**
 * Base Event Interface
 * All constitutional events must implement this interface.
 */
export interface ConstitutionalEvent {
  schemaVersion: number;
  id: string;
  type: string;
  timestamp: string; // When the event occurred (business time)
  receivedAt?: string; // When the system received the event
  persistedAt?: string; // When the event was stored
  data: Record<string, unknown>;
  metadata?: EventMetadata;
  causality?: EventCausality;
}

/**
 * Event Metadata
 * Common metadata for all events.
 */
export interface EventMetadata {
  source?: string;
  correlationId?: string;
  sessionId?: string;
  anonymousVisitorId?: string;
  acquisitionSource?: string;
  [key: string]: unknown;
}

/**
 * Event Causality
 * Tracks event relationships for replay and causality analysis.
 */
export interface EventCausality {
  causedBy?: string[];
  parentEvent?: string;
  rootEvent?: string;
  correlationId?: string;
}

/**
 * Event Provenance
 * Tracks external event sources for idempotency.
 */
export interface EventProvenance {
  provider: string;
  eventType: string;
  providerObjectId?: string;
}

/**
 * Event Repository Interface
 * For replay systems and event storage.
 */
export interface EventRepository {
  append(event: ConstitutionalEvent, provenance?: EventProvenance): Promise<boolean>;
  appendMany(events: ConstitutionalEvent[], provenances?: EventProvenance[]): Promise<number>;
  findById(id: string): Promise<ConstitutionalEvent | null>;
  findAfter(cursor: string): Promise<ConstitutionalEvent[]>;
  exists(id: string): Promise<boolean>;
  existsByProvenance(provenance: EventProvenance): Promise<boolean>;
}
