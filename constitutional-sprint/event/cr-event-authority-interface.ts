/**
 * Event Authority Interface
 * Public interface for event subsystem.
 * Only this interface crosses subsystem boundaries.
 * Constitutional event flow: ExecutionStarted → ValidationCompleted → CapabilityExecuted → ArtifactProduced → ReplayCommitted → WitnessGenerated → ObjectStored → ProjectionBuilt → KnowledgeUpdated → GovernanceEvaluated
 */

export interface IEventAuthority {
  subscribe(eventType: ConstitutionalEventType, handler: EventHandler): void;
  unsubscribe(eventType: ConstitutionalEventType, handler: EventHandler): void;
  publish(event: ConstitutionalEvent): Promise<void>;
  getHistory(): ConstitutionalEvent[];
  getHistoryByExecution(executionId: string): ConstitutionalEvent[];
  getHistoryByType(eventType: ConstitutionalEventType): ConstitutionalEvent[];
  clearHistory(): void;
}

export enum ConstitutionalEventType {
  ExecutionStarted = 'ExecutionStarted',
  ValidationCompleted = 'ValidationCompleted',
  CapabilityExecuted = 'CapabilityExecuted',
  ArtifactProduced = 'ArtifactProduced',
  ReplayCommitted = 'ReplayCommitted',
  WitnessGenerated = 'WitnessGenerated',
  ObjectStored = 'ObjectStored',
  ProjectionBuilt = 'ProjectionBuilt',
  KnowledgeUpdated = 'KnowledgeUpdated',
  GovernanceEvaluated = 'GovernanceEvaluated',
}

export interface ConstitutionalEvent {
  eventId: string;
  eventType: ConstitutionalEventType;
  timestamp: string;
  executionId: string;
  data: Record<string, unknown>;
}

export type EventHandler = (event: ConstitutionalEvent) => void | Promise<void>;
