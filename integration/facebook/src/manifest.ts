/**
 * FB-B — Facebook connector: manifest (kit shape) for admission.
 *
 * Scopes are adopted from connector-queue/facebook-page.md (the queue owns
 * the Nolan-click boundary and the least-privilege set); this file does NOT
 * redesign them. `pages_show_list` lets the connect flow enumerate Pages so
 * Nolan picks the right one; `pages_read_engagement` reads Page metadata,
 * posts, engagement counts; `pages_read_user_content` reads posts/visitor
 * content including comments. No write scopes. No speculative scopes.
 *
 * Messenger (`pages_messaging`) is deliberately absent: conversation
 * ingestion is structured as a future extension (see graph-api.ts
 * CONVERSATIONS_EDGE), not a v1 capability.
 */
import { ConnectorManifest } from '../../../ping-build-program/lane-bcq/kit/types';

export const CONNECTOR_ID = 'facebook-page';
export const CONNECTOR_VERSION = '0.1.0';
export const PROVIDER_ID = 'facebook';

export function facebookManifest(): ConnectorManifest {
  return {
    connectorId: CONNECTOR_ID,
    version: CONNECTOR_VERSION,
    provider: PROVIDER_ID,
    capabilities: [
      { verb: 'read', object: 'page', scope: 'owner-business-only' },
      { verb: 'read', object: 'page-posts', scope: 'owner-business-only' },
      { verb: 'read', object: 'post-comments', scope: 'owner-business-only' },
    ],
    auth: {
      credentialType: 'oauth2',
      grantedBy: 'business-owner',
      scopes: ['pages_show_list', 'pages_read_engagement', 'pages_read_user_content'],
    },
    rateBudget: {
      // Conservative against Meta's Business Use Case limits; the governor
      // and the adapter each enforce their own budget (contract §1.3/§6).
      callsPerWindow: 200,
      windowMs: 3_600_000,
      maxAttempts: 3, // contract §5: never more
      baseDelayMs: 2000,
      maxDelayMs: 30_000,
    },
    // Deterministic ordering: alphabetical by stream_id (M2).
    streams: [
      {
        streamId: 'facebook.page',
        streamClass: 'business-identity',
        syncModes: ['full_refresh', 'poll'],
      },
      {
        streamId: 'facebook.page-posts',
        streamClass: 'social-presence',
        syncModes: ['incremental', 'poll'],
        // Opaque watermark: the provider's paging cursor, stored verbatim,
        // never interpreted. PING echoes it back unchanged.
        incrementalCursor: 'paging.cursors.after (opaque)',
      },
      {
        streamId: 'facebook.post-comments',
        streamClass: 'social-presence',
        syncModes: ['incremental', 'poll'],
        incrementalCursor: 'paging.cursors.after (opaque, per post)',
      },
    ],
    stalenessToleranceMs: {
      'business-identity': 24 * 3_600_000,
      'social-presence': 6 * 3_600_000,
    },
  };
}
