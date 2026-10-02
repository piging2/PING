/**
 * Canonical Identity Service
 * SINGLE authority for all ID generation.
 * No other module should construct IDs.
 */

import { CanonicalID } from './canonical-id';

export class CanonicalIdentityService {
  private static instance: CanonicalIdentityService;
  
  private constructor() {}
  
  static getInstance(): CanonicalIdentityService {
    if (!CanonicalIdentityService.instance) {
      CanonicalIdentityService.instance = new CanonicalIdentityService();
    }
    return CanonicalIdentityService.instance;
  }
  
  /**
   * Generate CanonicalID from components
   */
  generateCanonicalID(
    authority: string,
    namespace: string,
    kind: string,
    version: string,
    hash: string
  ): CanonicalID {
    return {
      authority,
      namespace,
      kind,
      version,
      hash,
    };
  }
  
  /**
   * Generate UUIDv5 (deterministic)
   */
  generateUUIDv5(namespace: string, name: string): string {
    const hash = this.sha1(`${namespace}${name}`);
    const hashBytes = this.hexToBytes(hash);
    hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50; // Version 5
    hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80; // Variant RFC 4122
    return this.bytesToUUID(hashBytes);
  }
  
  /**
   * Generate context ID from execution ID and stage
   */
  generateContextId(executionId: string, stage: string): string {
    return this.generateUUIDv5('context', `${executionId}:${stage}`);
  }
  
  /**
   * Generate witness ID from transcript ID
   */
  generateWitnessId(transcriptId: string): string {
    return this.generateUUIDv5('witness', transcriptId);
  }
  
  /**
   * Generate certificate ID from knowledge ID and witness ID
   */
  generateCertificateId(knowledgeId: string, witnessId: string): string {
    return this.generateUUIDv5('certificate', `${knowledgeId}:${witnessId}`);
  }
  
  /**
   * Generate audit ID from execution ID and action
   */
  generateAuditId(executionId: string, action: string): string {
    return this.generateUUIDv5('audit', `${executionId}:${action}`);
  }
  
  /**
   * Generate lease ID from worker ID and capability ID
   */
  generateLeaseId(workerId: string, capabilityId: string): string {
    return this.generateUUIDv5('lease', `${workerId}:${capabilityId}`);
  }
  
  /**
   * Generate span ID from trace ID and span name
   */
  generateSpanId(traceId: string, spanName: string): string {
    return this.generateUUIDv5('span', `${traceId}:${spanName}`);
  }
  
  /**
   * Generate event ID from source and canonical timestamp
   */
  generateEventId(source: string, canonicalTimestamp: string): string {
    return this.generateUUIDv5('event', `${source}:${canonicalTimestamp}`);
  }
  
  /**
   * Generate request ID from canonical timestamp
   */
  generateRequestId(canonicalTimestamp: string): string {
    return this.generateUUIDv5('request', canonicalTimestamp);
  }
  
  /**
   * Generate replay ID from stage and output hash
   */
  generateReplayId(stage: string, outputHash: string): string {
    return this.generateUUIDv5('replay', `${stage}:${outputHash}`);
  }
  
  /**
   * Generate envelope ID from execution ID and sequence
   */
  generateEnvelopeId(executionId: string, sequence: number): string {
    return this.generateUUIDv5('envelope', `${executionId}:${sequence}`);
  }
  
  /**
   * Generate mission ID from program ID and epic ID
   */
  generateMissionId(programId: string, epicId: string): string {
    return this.generateUUIDv5('mission', `${programId}:${epicId}`);
  }
  
  /**
   * Generate epic ID from program ID and epic name
   */
  generateEpicId(programId: string, epicName: string): string {
    return this.generateUUIDv5('epic', `${programId}:${epicName}`);
  }
  
  /**
   * Generate task ID from mission ID and sequence
   */
  generateTaskId(missionId: string, sequence: number): string {
    return this.generateUUIDv5('task', `${missionId}:${sequence}`);
  }
  
  /**
   * SHA-1 implementation (placeholder - use crypto library in production)
   */
  private sha1(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(40, '0');
  }
  
  private hexToBytes(hex: string): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
  }
  
  private bytesToUUID(bytes: number[]): string {
    const hex = bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    return [
      hex.substr(0, 8),
      hex.substr(8, 4),
      hex.substr(12, 4),
      hex.substr(16, 4),
      hex.substr(20, 12),
    ].join('-');
  }
}

// Convenience export
export const identityService = CanonicalIdentityService.getInstance();
