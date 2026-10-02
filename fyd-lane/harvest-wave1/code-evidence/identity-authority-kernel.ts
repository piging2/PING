/**
 * Identity Authority
 * Public interface for identity subsystem.
 * Only this interface crosses subsystem boundaries.
 */

export interface IIdentityAuthority {
  generateUUIDv5(namespace: string, name: string): string;
  generateContextId(executionId: string, stage: string): string;
  generateWitnessId(transcriptId: string): string;
  generateCertificateId(knowledgeId: string, witnessId: string): string;
  generateAuditId(executionId: string, action: string): string;
  generateLeaseId(workerId: string, capabilityId: string): string;
  generateSpanId(traceId: string, spanName: string): string;
  generateEventId(source: string, canonicalTimestamp: string): string;
  generateReplayId(stage: string, outputHash: string): string;
  generateEnvelopeId(executionId: string, sequence: number): string;
  generateMissionId(programId: string, epicId: string): string;
  generateEpicId(programId: string, epicName: string): string;
  generateTaskId(missionId: string, sequence: number): string;
}

export interface IClockAuthority {
  now(): string;
  advance(milliseconds: number): void;
  set(timestamp: string): void;
  nextSequence(): number;
  resetSequence(): void;
  resetToWallTime(): void;
}
