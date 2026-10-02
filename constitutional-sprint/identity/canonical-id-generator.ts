/**
 * Canonical ID Generator
 * DEPRECATED: Use CanonicalIdentityService instead.
 * This file is kept for backward compatibility.
 * All ID generation should go through CanonicalIdentityService.
 */

import { CanonicalID } from './canonical-id';
import { CanonicalIdentityService } from './canonical-identity-service';

export class CanonicalIDGenerator {
  private static service = CanonicalIdentityService.getInstance();
  
  static generateUUIDv5(namespace: string, name: string): string {
    return this.service.generateUUIDv5(namespace, name);
  }
  
  static generateFromHash(hash: string): string {
    return hash;
  }
  
  static generateContextId(executionId: string, stage: string): string {
    return this.service.generateContextId(executionId, stage);
  }
  
  static generateWitnessId(transcriptId: string): string {
    return this.service.generateWitnessId(transcriptId);
  }
  
  static generateCertificateId(knowledgeId: string, witnessId: string): string {
    return this.service.generateCertificateId(knowledgeId, witnessId);
  }
  
  static generateAuditId(executionId: string, action: string): string {
    return this.service.generateAuditId(executionId, action);
  }
  
  static generateLeaseId(workerId: string, capabilityId: string): string {
    return this.service.generateLeaseId(workerId, capabilityId);
  }
  
  static generateSpanId(traceId: string, spanName: string): string {
    return this.service.generateSpanId(traceId, spanName);
  }
  
  static generateEventId(source: string, canonicalTimestamp: string): string {
    return this.service.generateEventId(source, canonicalTimestamp);
  }
}

/**
 * Typed reference types
 */
export type WorkerReference = string & { readonly __brand: unique symbol };
export type LeaseReference = string & { readonly __brand: unique symbol };
export type MissionReference = string & { readonly __brand: unique symbol };
export type ContextReference = string & { readonly __brand: unique symbol };
export type WitnessReference = string & { readonly __brand: unique symbol };
export type CertificateReference = string & { readonly __brand: unique symbol };
export type AuditReference = string & { readonly __brand: unique symbol };
export type SpanReference = string & { readonly __brand: unique symbol };
export type EventReference = string & { readonly __brand: unique symbol };

/**
 * Reference builders
 */
export class ReferenceBuilder {
  static buildWorkerReference(id: string): WorkerReference {
    return id as WorkerReference;
  }
  
  static buildLeaseReference(id: string): LeaseReference {
    return id as LeaseReference;
  }
  
  static buildMissionReference(id: string): MissionReference {
    return id as MissionReference;
  }
  
  static buildContextReference(id: string): ContextReference {
    return id as ContextReference;
  }
  
  static buildWitnessReference(id: string): WitnessReference {
    return id as WitnessReference;
  }
  
  static buildCertificateReference(id: string): CertificateReference {
    return id as CertificateReference;
  }
  
  static buildAuditReference(id: string): AuditReference {
    return id as AuditReference;
  }
  
  static buildSpanReference(id: string): SpanReference {
    return id as SpanReference;
  }
  
  static buildEventReference(id: string): EventReference {
    return id as EventReference;
  }
}
