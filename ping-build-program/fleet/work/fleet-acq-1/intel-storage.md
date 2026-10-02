# Connector intel - storage domain (reference platform: AWS S3)

Mapped from public docs; implementation stays data-driven. Do not build the connector.

## OBJECTS
Buckets (globally unique names) containing Objects (key up to 1024 bytes, value up to 5TB, metadata, versionId, storage class, ETag). Operations: PutObject, GetObject, DeleteObject(s), ListObjectsV2, HeadObject, multipart (Create/UploadPart/Complete/Abort), versioning, lifecycle, policies.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

## EVENTS
S3 Event Notifications to SNS/SQS/Lambda on s3:ObjectCreated:*, s3:ObjectRemoved:*, etc. EventBridge integration for advanced routing. Delivered at-least-once.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

## CAPABILITIES
Object CRUD, multipart upload, versioning, lifecycle transitions, cross-region replication, selective retrieval (SelectObjectContent, Range GET), presigned URLs, batch operations.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

## AUTHORIZATION
AWS Signature Version 4 (IAM credentials) or presigned URLs for delegated access. Bucket policies, IAM policies, and ACLs (legacy) layer permissions.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

## WEBHOOKS
No direct webhooks; the pattern is S3 Event Notifications to SNS/SQS/Lambda, or EventBridge rules. Notification delivery is at-least-once with possible duplicates.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

## POLLING
ListObjectsV2 with ContinuationToken for inventory-style polling; S3 Inventory reports for large-scale reconciliation. Version-aware polling via versionId markers.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

## RATE-LIMITS
3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second per prefix. Throttling returns 503 SlowDown; backoff and prefix partitioning are the documented mitigations.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

## IDEMPOTENCY
PutObject to the same key is naturally idempotent (same bytes = same state, new version if versioning on). Multipart uploads need client-side completion guards; no idempotency-key header.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

## EFFECTS
Object writes/deletes, bucket configuration changes, lifecycle transitions (async), replication. GET/HEAD/LIST are side-effect-free.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

## REVERSIBILITY
Without versioning, overwrites and deletes are irreversible. With versioning, prior versions are restorable; delete markers can be removed. MFA Delete adds protection.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

## PROVENANCE
ETag (content hash for simple uploads), versionId per version, LastModified, server-side encryption status, and S3 access logging / CloudTrail for the audit trail.
Sources: https://docs.aws.amazon.com/AmazonS3/latest/userguide/

