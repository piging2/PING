/**
 * Gateway Runtime
 * 
 * PATCH_001: Introduce gateway-to-kernel adapter interface
 * 
 * The gateway now communicates with the kernel through the GatewayToKernelAdapter,
 * ensuring proper layer separation and constitutional ownership.
 */

const express = require('express');
const { EventReadAuthority } = require('../../ping-runtime/events/event_read_authority');
const { RepositoryStore } = require('../../ping-runtime/events/repository_store');
const { GatewayToKernelAdapter } = require('../../runtime/kernel/gateway_adapter');
const { PostgresAdapter } = require('../postgres_adapter');
const { CanonicalEventEnvelope } = require('../canonical_event_envelope');
const { ProducerEventPort } = require('../../ping-runtime/events/producer_event_port.js');
const { TenantRegistry } = require('../../ping-runtime/runtime/tenant_registry');
const { DeploymentRegistry } = require('../../ping-runtime/runtime/deployment_registry');
const { RuntimeRegistry } = require('../../ping-runtime/runtime/runtime_registry');
const createEventRoutes = require('../routes/events');
const createRepositoryRoutes = require('../routes/repository');
const createContextRoutes = require('../routes/context');
const createHealthRoutes = require('../routes/health');
const createSystemRoutes = require('../routes/system');
const ollamaRoutes = require('../routes/ollama');
const createCanonicalEventRoutes = require('../routes/canonical_events');
const createTenantRoutes = require('../routes/tenants');
const createDeploymentRoutes = require('../routes/deployments');
const createRuntimeRoutes = require('../routes/runtime');
const createConstitutionRoutes = require('../routes/constitution');
const createFingerprintRoutes = require('../routes/fingerprint');
const { GenerationManifestLoader } = require('../generated/generation_manifest_loader');
const { GeneratedArtifactLoader } = require('../generated/generated_artifact_loader');
const { CompilerCompatibility } = require('../generated/compiler_compatibility');
const { computeRuntimeArtifactHash } = require('../generated/runtime_artifact_hash');
const { WorkflowExecutor } = require('../../ping-runtime/runtime/workflow_executor');
const { EventValidator } = require('../../ping-runtime/events/event_validator');
const { CapabilityResolver } = require('../../ping-runtime/runtime/capability_resolver');
const { DeploymentLoader } = require('../../ping-runtime/runtime/deployment_loader');
const { StateMachineExecutor } = require('../../ping-runtime/runtime/state_machine_executor');
const { DriftDetector } = require('../../ping-runtime/runtime/drift_detector');
const { RuntimeFingerprint } = require('../../ping-runtime/runtime/runtime_fingerprint');
const { healthAuthority } = require('../health_authority');
const { SystemAuthority } = require('../../ping-runtime/runtime/system_authority');
const createOpsRoutes = require('../routes/ops');
const { IntegrationManager } = require('../../ping-runtime/runtime/integration_manager');
const { PostHogIntegration } = require('../../ping-runtime/connectors/posthog_integration');
const { EmailIntegration } = require('../../ping-runtime/connectors/email_integration');
const { SmsIntegration } = require('../../ping-runtime/connectors/sms_integration');
const { EventGovernance } = require('../../ping-runtime/events/event_governance');
const createGovernanceRoutes = require('../routes/governance');
const { AnalyticsPolicy } = require('../../ping-runtime/runtime/analytics_policy');
const { HuggingFaceAdapter } = require('../../ping-runtime/ai/huggingface_adapter');
const { AIWorkspaceAuthority } = require('../../ping-runtime/business/ai_workspace_authority');
const createAiWorkspaceRoutes = require('../routes/ai_workspace');
const { GoogleAuth } = require('../google/google_auth');
const { BusinessProfileAdapter } = require('../google/business_profile');
const { ReviewAuthority } = require('../../ping-runtime/business/review_authority');
const { createReviewRoutes } = require('../routes/reviews');
const { GooglePeopleAdapter } = require('../google/people_adapter');
const { GmailAdapter } = require('../google/gmail_adapter');
const { GoogleCalendarAdapter } = require('../google/calendar_adapter');
const { CustomerAuthority } = require('../../ping-runtime/business/customer_authority');
const createCustomerRoutes = require('../routes/customers');
const { ProjectAuthority } = require('../../ping-runtime/business/project_authority');
const createProjectRoutes = require('../routes/projects');
const { ExecutionEngine } = require('../../ping-runtime/orchestration/execution/engine');
const createOrchestrationRoutes = require('../routes/orchestration');

// PING Core v1
const { UnifiedEventRuntime } = require('../../ping-runtime/events/unified_event_runtime');
const { LegacyIngressAdapter } = require('../../ping-runtime/events/legacy_ingress_adapter');
const { KnowledgeGraph } = require('../../ping-runtime/knowledge/knowledge_graph');
const { MissionRuntime } = require('../../ping-runtime/orchestration/mission_runtime');
const { MissionScheduler } = require('../../ping-runtime/orchestration/mission_scheduler');
const { AIRuntime } = require('../../ping-runtime/ai/ai_runtime');
const { OllamaProvider } = require('../../ping-runtime/ai/ollama_provider');
const { GoogleConnector } = require('../../ping-runtime/connectors/google_connector');
const { ConnectorRegistry } = require('../../ping-runtime/connectors/connector_registry');
const { GitHubConnector } = require('../../ping-runtime/connectors/github_connector');
const { PostHogConnector } = require('../../ping-runtime/connectors/posthog_connector');
const { EmailConnector } = require('../../ping-runtime/connectors/email_connector');
const { SMSConnector } = require('../../ping-runtime/connectors/sms_connector');
const { CapabilityRegistry } = require('../../ping-runtime/connectors/capability_registry');
const { OAuthFlowManager } = require('../../ping-runtime/connectors/oauth_provider');
const { WorkerRuntime } = require('../../ping-runtime/workers/worker_runtime');
const { registerCanonicalWorkers } = require('../../ping-runtime/workers/canonical_workers');
const { EventToMissionBridge } = require('../../ping-runtime/orchestration/event_to_mission_bridge');
const { ReviewEmitter, CustomerEmitter, ProjectEmitter, ConnectorEmitter, SystemEmitter } = require('../../ping-runtime/business/business_emitters');
const { Neo4jAdapter } = require('../../ping-runtime/graph/neo4j_adapter');
const { DeadLetterAuthority } = require('../dead_letter_authority');
const { QdrantAdapter } = require('../../ping-runtime/search/qdrant_adapter');
const createKnowledgeRoutes = require('../routes/knowledge');
const createMissionRoutes = require('../routes/missions');
const createAIRoutes = require('../routes/ai');
const createConnectorRoutes = require('../routes/connectors');
const createMissionControlRoutes = require('../routes/mission_control');
const { CanonicalizationService } = require('../../ping-runtime/canonicalization/canonicalization_service');
const { EmbeddingService } = require('../../ping-runtime/embeddings/embedding_service');
const { EvidenceAuthority } = require('../../ping-runtime/evidence/evidence_authority');
const { HybridSearch } = require('../../ping-runtime/search/hybrid_search');
const { verifyCanonicalObject } = require('../../ping-runtime/canonicalization/canonical_object');
const createIngestRoutes = require('../routes/ingest');
const { KernelReplayExecutionProvider } = require('../kernel_replay_execution_provider');

class GatewayRuntime {
  constructor(pool) {
    this._app = express();
    this._pool = pool || null;
    this._storage = null;

    this._setupMiddleware();
  }

  _setupMiddleware() {
    this._app.use(express.json());
    this._app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
      res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });
  }

  async _initializeServices() {
    const services = {};
    let pgAvailable = false;

    // ─── Phase 1: Test Postgres connectivity ────────────────────────
    if (!this._pool) {
      const { Pool } = require('pg');
      this._pool = new Pool({
        host: process.env.POSTGRES_HOST || 'localhost',
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        database: process.env.POSTGRES_DB || 'crx',
        user: process.env.POSTGRES_USER || 'crx',
        password: process.env.POSTGRES_PASSWORD || 'crx',
        max: 10,
        connectionTimeoutMillis: 3000,
      });
      console.log('[GatewayRuntime] Created default PostgreSQL pool');
    }

    try {
      await this._pool.query('SELECT 1');
      pgAvailable = true;
      console.log('[GatewayRuntime] PostgreSQL: CONNECTED');
    } catch (err) {
      console.error('[GatewayRuntime] PostgreSQL: UNAVAILABLE — starting in degraded mode');
      console.error(`[GatewayRuntime]   ${err.message}`);
    }

    // ─── Phase 2: Filesystem-only services (always available) ──────
    const repoRoot = require('path').join(__dirname, '..', '..');

    // Wave 2: Load generated artifacts
    const manifestLoader = new GenerationManifestLoader(repoRoot);
    manifestLoader.load();
    const artifactLoader = new GeneratedArtifactLoader(repoRoot);
    const artifactResult = artifactLoader.loadAll(manifestLoader.getManifest());
    if (!artifactResult.valid) {
      console.error('[GatewayRuntime] WARNING: Some generated artifacts failed validation:', artifactResult.errors);
    }
    const compilerCompat = new CompilerCompatibility();
    const compatResult = compilerCompat.verify(manifestLoader.getManifest(), artifactLoader.getAllArtifacts());
    if (!compatResult.valid) {
      console.error('[GatewayRuntime] WARNING: Compiler compatibility issues:', compatResult.mismatches);
    }
    const runtimeHash = computeRuntimeArtifactHash(manifestLoader.getManifest(), artifactLoader.getAllArtifacts());
    console.log(`[GatewayRuntime] Runtime artifact hash: ${runtimeHash.slice(0, 12)}...`);

    // Wave 2.5: Load runtime consumers from generated artifacts
    const workflowExecutor = new WorkflowExecutor(repoRoot);
    workflowExecutor.load();
    const eventValidator = new EventValidator(repoRoot);
    eventValidator.load();
    const capabilityResolver = new CapabilityResolver(repoRoot);
    capabilityResolver.load();
    const deploymentLoader = new DeploymentLoader(repoRoot);
    deploymentLoader.load();
    const stateMachineExecutor = new StateMachineExecutor(repoRoot);
    stateMachineExecutor.load();

    // Wave 2.5: Drift detection
    const driftDetector = new DriftDetector(repoRoot);
    const platformHash = require('../runtime_hash').computeLivePlatformHash ? null : 'platform_dev';
    const driftResult = driftDetector.detect(
      manifestLoader.getHash(),
      runtimeHash,
      platformHash,
      null
    );
    if (!driftResult.healthy) {
      console.error('[GatewayRuntime] DRIFT DETECTED — starting with warnings:');
      for (const issue of driftResult.issues) {
        console.error(`  ${issue}`);
      }
    } else {
      console.log('[GatewayRuntime] Drift detection: PASS');
    }

    // Wave 2.5: Build runtime fingerprint
    const fingerprint = new RuntimeFingerprint({
      workflowExecutor,
      eventValidator,
      capabilityResolver,
      deploymentLoader,
      stateMachineExecutor,
      manifestHash: manifestLoader.getHash(),
      runtimeArtifactHash: runtimeHash,
      platformHash,
    });

    // P051-P054: Integration Manager — no PG dependency
    const analyticsPolicy = new AnalyticsPolicy();
    const integrationManager = new IntegrationManager({ policy: analyticsPolicy });
    integrationManager.registerIntegration('posthog', new PostHogIntegration());
    integrationManager.registerIntegration('email', new EmailIntegration());
    integrationManager.registerIntegration('sms', new SmsIntegration());

    // P7: Event Governance — filesystem only
    const eventGovernance = new EventGovernance(repoRoot);
    eventGovernance.load();

    // AI Runtime — no PG dependency
    const aiRuntime = new AIRuntime({ defaultProvider: 'ollama' });
    const ollamaProvider = new OllamaProvider();
    aiRuntime.registerProvider('ollama', ollamaProvider, {
      models: ['qwen2.5-coder:7b', 'qwen2.5-coder:14b'],
      defaultModel: 'qwen2.5-coder:7b',
      capabilities: ['chat', 'embed'],
    });
    console.log('[GatewayRuntime] AI Runtime initialized (ollama provider)');

    // Google Connector — no PG dependency (wraps Google adapters)
    const googleAuth = new GoogleAuth();
    const businessProfileAdapter = new BusinessProfileAdapter(null, googleAuth, null);
    const peopleAdapter = new GooglePeopleAdapter(googleAuth);
    const gmailAdapter = new GmailAdapter(googleAuth);
    const calendarAdapter = new GoogleCalendarAdapter(googleAuth);
    const googleConnector = new GoogleConnector({
      googleAuth,
      businessProfileAdapter,
      peopleAdapter,
      gmailAdapter,
      calendarAdapter,
    });
    console.log('[GatewayRuntime] Google Connector initialized');

    // Connector Registry — all connectors register here
    const connectorRegistry = new ConnectorRegistry();
    try {
      connectorRegistry.register('google', googleConnector, {
        provider: 'google',
        capabilities: ['reviews', 'contacts', 'email', 'calendar', 'drive'],
        description: 'Google Business Profile, People, Gmail, Calendar',
      });
      connectorRegistry.register('github', new GitHubConnector(), {
        provider: 'github',
        capabilities: ['repository', 'commits', 'pull-requests', 'branches', 'contributors'],
        description: 'GitHub repository metadata',
      });
      connectorRegistry.register('posthog', new PostHogConnector(), {
        provider: 'posthog',
        capabilities: ['analytics', 'events', 'metrics'],
        description: 'PostHog analytics events',
      });
      connectorRegistry.register('email', new EmailConnector(), {
        provider: 'email',
        capabilities: ['email', 'notifications'],
        description: 'Email delivery via SMTP',
      });
      connectorRegistry.register('sms', new SMSConnector(), {
        provider: 'sms',
        capabilities: ['sms', 'alerts'],
        description: 'SMS delivery via Twilio',
      });
      console.log(`[GatewayRuntime] Connector Registry: ${connectorRegistry.getStats().totalConnectors} connectors registered`);
    } catch (err) {
      console.error('[GatewayRuntime] WARNING: Connector registration failed:', err.message);
    }

    // OAuth Provider Framework — token store + OAuth flow manager
    const tokenStore = new (require('../../ping-runtime/connectors/oauth_provider').TokenStore)();
    const oauthManager = new OAuthFlowManager({
      tokenStore,
      redirectBase: process.env.OAUTH_REDIRECT_BASE || 'http://localhost:8080/connectors',
    });
    console.log('[GatewayRuntime] OAuth manager initialized');

    // Capability Registry — full metadata, provider interchangeability
    const capabilityRegistry = new CapabilityRegistry({ oauthManager, connectorRegistry });
    // Register providers for each connector
    const capProviderMap = {
      'google': { capabilities: ['reviews', 'contacts', 'email', 'calendar'], auth: 'oauth2', perms: ['email', 'contacts', 'reviews', 'calendar'] },
      'github': { capabilities: ['repository'], auth: 'oauth2', perms: ['repo'] },
      'posthog': { capabilities: ['analytics'], auth: 'api_key', perms: ['events', 'metrics'] },
      'email': { capabilities: ['communication'], auth: 'smtp', perms: ['send'] },
      'sms': { capabilities: ['communication'], auth: 'api_key', perms: ['send'] },
    };
    const capToCategory = {
      'reviews': 'reviews', 'contacts': 'crm', 'email': 'communication',
      'calendar': 'calendar', 'drive': 'documents', 'repository': 'crm',
      'analytics': 'analytics', 'communication': 'communication',
    };
    for (const [provider, info] of Object.entries(capProviderMap)) {
      for (const cap of info.capabilities) {
        const category = capToCategory[cap];
        if (category) {
          try {
            capabilityRegistry.registerProvider(category, provider, {
              authenticationMethod: info.auth,
              requiredPermissions: info.perms,
            });
          } catch (e) {
            // Provider may already be registered for this capability
          }
        }
      }
    }
    console.log(`[GatewayRuntime] Capability Registry: ${capabilityRegistry.getStats().total} capability categories`);

    // Orca — Constitutional Execution Engine (no PG dependency)
    // [DOC-CONTRACT / KEEP-DISABLED] discoverOllama stays false INTENTIONALLY.
    // discoverWorkers() is PROVEN functional against the live ollama container
    // (4 workers, qwen2.5-coder:14b/7b + llama3 + nomic-embed-text; Step 5 proof,
    // docs/EXECUTION_EVIDENCE_LEDGER.md §15). But Orca is a parallel execution
    // authority, NOT the production spine: the live spine's single inference owner is
    // AIRuntime + ping-runtime/ai/ollama_provider.js (default localhost:11434), and
    // the single worker-identity decider is WorkerRuntime.dispatch (P3 audit A).
    // Enabling this here would register a second, unconsumed Ollama worker pool —
    // contradicting single-owner convergence. Keep DISABLED until an explicit
    // Orca-vs-live-spine convergence decision is made.
    let executionEngine = null;
    try {
      executionEngine = new ExecutionEngine();
      await executionEngine.initialize({ discoverOllama: false });
      console.log('[GatewayRuntime] Orca engine initialized');
    } catch (err) {
      console.error('[GatewayRuntime] WARNING: Orca engine failed to initialize:', err.message);
    }

    // ─── Phase 3: Postgres-dependent services (graceful degradation) ──
    let eventReadAuthority = null;
    let repoStore = null;
    let kernelAdapter = null;
    let canonicalEventEnvelope = null;
    let producerEventPort = null;
    let tenantRegistry = null;
    let deploymentRegistry = null;
    let runtimeRegistry = null;
    let systemAuthority = null;
    let huggingfaceAdapter = null;
    let aiWorkspaceAuthority = null;
    let reviewAuthority = null;
    let customerAuthority = null;
    let projectAuthority = null;
    let unifiedEventRuntime = null;
    let knowledgeGraph = null;
    let missionRuntime = null;
    let workerRuntime = null;
    let legacyIngressAdapter = null;
    let missionScheduler = null;
    let reviewEmitter = null;
    let customerEmitter = null;
    let projectEmitter = null;
    let connectorEmitter = null;
    let systemEmitter = null;
    let neo4jAdapter = null;
    let qdrantAdapter = null;
    let eventToMissionBridge = null;
    let canonicalizationService = null;
    let embeddingService = null;
    let evidenceAuthority = null;
    let hybridSearch = null;
    let deadLetterAuthority = null;

    if (pgAvailable) {
      try {
        eventReadAuthority = new EventReadAuthority(this._pool);
        await eventReadAuthority.initialize();
        repoStore = new RepositoryStore(this._pool);
        await repoStore.initialize();

        kernelAdapter = new GatewayToKernelAdapter(this._pool);
        await kernelAdapter.initialize();

        // P001-P005: Initialize runtime contracts via StorageAdapter
        this._storage = new PostgresAdapter({
          host: process.env.POSTGRES_HOST || 'localhost',
          port: parseInt(process.env.POSTGRES_PORT || '5432'),
          database: process.env.POSTGRES_DB || 'crx_runtime',
          user: process.env.POSTGRES_USER || 'postgres',
          password: String(process.env.POSTGRES_PASSWORD || 'postgres'),
        });
        await this._storage.initialize();

        canonicalEventEnvelope = new CanonicalEventEnvelope(this._storage, { repoRoot });
        await canonicalEventEnvelope.initialize();

        // Phase 7: producer event handle. Business authorities emit through
        // this port rather than the envelope receipt surface. The port
        // classifies each producer event type and routes it along the
        // converged seam (direct UER acceptance for registered/mapped types,
        // explicit receipt for domain envelope types). Lazy runtime
        // resolution: authorities are constructed before unifiedEventRuntime
        // exists, so the port resolves it at call time.
        producerEventPort = new ProducerEventPort({
          envelope: canonicalEventEnvelope,
          governance: eventGovernance,
          getEventRuntime: () => unifiedEventRuntime,
        });

        tenantRegistry = new TenantRegistry(this._storage);
        deploymentRegistry = new DeploymentRegistry(this._storage);
        runtimeRegistry = new RuntimeRegistry(this._storage);

        systemAuthority = new SystemAuthority(eventReadAuthority, { repoRoot });

        // HPP AI Workspace
        huggingfaceAdapter = new HuggingFaceAdapter(this._storage);
        aiWorkspaceAuthority = new AIWorkspaceAuthority(this._storage, huggingfaceAdapter, producerEventPort);
        await aiWorkspaceAuthority.initialize();

        // HPP Reviews
        businessProfileAdapter._storage = this._storage;
        businessProfileAdapter._eventEnvelope = canonicalEventEnvelope;
        reviewAuthority = new ReviewAuthority(this._storage, producerEventPort, businessProfileAdapter);
        await reviewAuthority.initialize();

        // HPP Customers
        customerAuthority = new CustomerAuthority(this._storage, producerEventPort, {
          peopleAdapter,
          gmailAdapter,
          calendarAdapter,
        });
        await customerAuthority.initialize();

        // HPP Projects — Aggregate root
        projectAuthority = new ProjectAuthority(this._storage, producerEventPort);
        await projectAuthority.initialize();

        // ─── PING Core v1 (PG-dependent) ──────────────────────────
        // MC-1: capability object for the legacy-ingress compatibility
        // exception. Minted ONCE here and handed ONLY to UnifiedEventRuntime
        // and the allowlisted LegacyIngressAdapter. The runtime grants the
        // narrow registry-membership exception solely on object-identity
        // match with this object; no other caller can forge it.
        const legacyIngressCapability = Object.freeze({ surface: 'canonical_events', version: '1.0.0' });
        unifiedEventRuntime = new UnifiedEventRuntime({
          pool: this._pool,
          eventValidator,
          eventGovernance,
          integrationManager,
          legacyIngressCapability,
        });
        await unifiedEventRuntime.initialize();
        console.log('[GatewayRuntime] Unified Event Runtime initialized');

        // ─── Canonicalization Boundary (thin façade) ──────────────
        // The single public boundary: every observation/command/artifact/event
        // must canonicalize here before it exists. Namespace is resolved BEFORE
        // persistence. Business sources default to tenant::hpp; system sources
        // to core::system.
        canonicalizationService = new CanonicalizationService({
          eventRuntime: unifiedEventRuntime,
          namespaces: {
            'review-authority': 'tenant::hpp',
            'customer-authority': 'tenant::hpp',
            'project-authority': 'tenant::hpp',
            'email-connector': 'tenant::hpp',
            'sms-connector': 'tenant::hpp',
            'google-connector': 'tenant::hpp',
            'github-connector': 'tenant::hpp',
          },
        });
        console.log('[GatewayRuntime] Canonicalization Service initialized');

        // Legacy Ingress Adapter (MC-1) — canonical_events is the upstream
        // legacy ingress surface (NON-CANONICAL UNTIL CONVERGED). Converges
        // rows through UnifiedEventRuntime.emit() into ping_events with
        // per-row durable states. Supersedes EventBridge (PRESERVED_INACTIVE).
        legacyIngressAdapter = new LegacyIngressAdapter({
          pool: this._pool,
          eventRuntime: unifiedEventRuntime,
          pollIntervalMs: 5000,
          batchSize: 50,
          legacyIngressCapability,
        });
        await legacyIngressAdapter.initialize();
        legacyIngressAdapter.start();
        console.log('[GatewayRuntime] Legacy Ingress Adapter started');

        knowledgeGraph = new KnowledgeGraph({ pool: this._pool });
        await knowledgeGraph.initialize();
        console.log('[GatewayRuntime] Knowledge Graph initialized');

        missionRuntime = new MissionRuntime({ pool: this._pool, eventRuntime: unifiedEventRuntime });
        await missionRuntime.initialize();
        console.log('[GatewayRuntime] Mission Runtime initialized');

        workerRuntime = new WorkerRuntime({ pool: this._pool });
        console.log('[GatewayRuntime] Worker Runtime initialized');

        // Knowledge Adapters — thin REST wrappers
        neo4jAdapter = new Neo4jAdapter();
        qdrantAdapter = new QdrantAdapter();
        console.log('[GatewayRuntime] Knowledge Adapters initialized (Neo4j + Qdrant)');

        // ─── Embedding Service (async projection subscriber) ──────
        // Subscribes to indexable event types; embedding is queued (non-blocking),
        // falls back to deterministic seeded vectors when Ollama is unreachable.
        // Init failure here must NOT disable the PG-backed pipeline (workers,
        // scheduler, bridge, emitters all continue) — it is surfaced and scoped.
        try {
          embeddingService = new EmbeddingService({
            aiRuntime,
            qdrantAdapter,
            collection: 'knowledge',
            vectorSize: 768,
            embeddingModel: 'nomic-embed-text',
          });
          await embeddingService.initialize();
          embeddingService.subscribe(unifiedEventRuntime);
          console.log('[GatewayRuntime] Embedding Service initialized (async projection)');
        } catch (err) {
          embeddingService = null;
          console.error(`[GatewayRuntime] Embedding Service init failed — async Qdrant projection disabled (pipeline continues): ${err.message}`);
        }

        // Register 8 canonical workers with WorkerRuntime (IntelligenceWorker is dormant)
        // ReplayWorker is wired to the deterministic kernel replay engine via
        // replayProvider. This is the LIVE arrow: REPLAY_VERIFY / PROJECTION_CREATED
        // events dispatch to ReplayWorker → kernel provider → verified result.
        const replayProvider = new KernelReplayExecutionProvider();
        registerCanonicalWorkers(workerRuntime, {
          eventRuntime: unifiedEventRuntime,
          pool: this._pool,
          aiRuntime,
          embeddingService, // ProjectionWorker consumes options.embeddingService (C3)
          knowledgeGraph,   // KnowledgePromoter consumes options.knowledgeGraph (Phase F)
          replayProvider,   // ReplayWorker consumes options.replayProvider (kernel replay)
        });

        // ─── Evidence Authority + Hybrid Search (Phase E) ─────────
        // EvidenceAuthority verifies every retrieval result (recomputes the
        // canonical hash via gateway/canonical_object.js + traces Qdrant hits
        // back to ping_events). HybridSearch composes semantic (Qdrant) +
        // verification (evidence) + context (knowledge graph) into one result.
        evidenceAuthority = new EvidenceAuthority({
          pool: this._pool,
          eventRuntime: unifiedEventRuntime,
          canonicalObjectVerifier: verifyCanonicalObject,
        });
        hybridSearch = new HybridSearch({
          embeddingService,
          evidenceAuthority,
          knowledgeGraph,
        });
        console.log('[GatewayRuntime] Evidence Authority + Hybrid Search initialized');

        // Mission Scheduler — polls MissionRuntime, dispatches to WorkerRuntime
        // Arrow 2: DeadLetterAuthority — DLQ path was permanently unreachable
        // (constructor accepted it but gateway never injected it). Now instantiated
        // and injected so exhausted retries route to repository_dead_letters.
        try {
          deadLetterAuthority = new DeadLetterAuthority(this._pool);
          await deadLetterAuthority.initialize();
          console.log('[GatewayRuntime] Dead Letter Authority initialized');
        } catch (dlqErr) {
          console.error('[GatewayRuntime] Dead Letter Authority init failed (non-fatal):', dlqErr.message);
          deadLetterAuthority = null;
        }

        missionScheduler = new MissionScheduler({
          missionRuntime,
          workerRuntime,
          eventRuntime: unifiedEventRuntime,
          deadLetterAuthority,
          pollIntervalMs: 5000,
          maxConcurrent: 3,
        });
        missionScheduler.start();
        console.log('[GatewayRuntime] Mission Scheduler started');

        // ─── Business Event Emitters ──────────────────────────────
        // Producers route through the Canonicalization Service (the boundary),
        // not the event runtime directly. Emitters are unchanged — they call
        // emit(eventType, source, payload) which the service duck-types.
        reviewEmitter = new ReviewEmitter(canonicalizationService);
        customerEmitter = new CustomerEmitter(canonicalizationService);
        projectEmitter = new ProjectEmitter(canonicalizationService);
        connectorEmitter = new ConnectorEmitter(canonicalizationService);
        systemEmitter = new SystemEmitter(canonicalizationService);
        console.log('[GatewayRuntime] Business Event Emitters initialized (via Canonicalization Service)');

        // ─── Event-to-Mission Bridge ──────────────────────────────
        eventToMissionBridge = new EventToMissionBridge({
          eventRuntime: unifiedEventRuntime,
          missionRuntime: missionRuntime,
        });
        eventToMissionBridge.start();
        console.log('[GatewayRuntime] Event-to-Mission Bridge started');

        // ─── Graph Projection (async subscriber) ──────────────────
        // Knowledge candidates: business + observation events project into the
        // knowledge graph as status='candidate', confidence 0.5. Only explicit
        // human approval promotes to knowledge (confidence 1.0). Local PG insert
        // is ms-fast; this is not on the ingestion path.
        const GRAPH_PROJECTION_EVENTS = [
          'REVIEW_RECEIVED', 'REVIEW_RESPONDED',
          'CUSTOMER_CREATED', 'CUSTOMER_UPDATED',
          'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_COMPLETED',
          'LEAD_CREATED', 'LEAD_CONVERTED',
          'ESTIMATE_CREATED', 'ESTIMATE_SENT', 'ESTIMATE_ACCEPTED',
          'INVOICE_CREATED', 'INVOICE_SENT', 'INVOICE_PAID',
          'OBSERVATION_CREATED', 'CLAIM_CREATED', 'RECOMMENDATION_CREATED',
          // Lane G (2026-09-19): verified worker result events are canonical
          // ping_events rows with zero consumers (dead letters). Project them
          // as knowledge candidates through the existing human-approval gate.
          'WORKER_COMPLETED', 'WORKER_FAILED',
        ];
        for (const type of GRAPH_PROJECTION_EVENTS) {
          unifiedEventRuntime.on(type, async (event) => {
            try {
              const payload = event.payload || {};
              const entityRef = payload.customer_id || payload.project_id || payload.review_id || payload.lead_id || payload.estimate_id || payload.invoice_id;
              const label = `${event.event_type} ${entityRef || event.event_id.slice(0, 12)}`;
              await knowledgeGraph.addNode('event', label, {
                event_type: event.event_type,
                source: event.source,
                payload,
              }, {
                // Namespace comes from the spine event (always resolved); the
                // 'core::system' default is owned by UnifiedEventRuntime.emit() only.
                namespace: event.namespace,
                // Read confidence delivered by the spine producer. Null when
                // genuinely absent (legacy events before confidence propagation
                // was wired). Knowledge graph nodes with null confidence are
                // explicitly "not yet assessed" — correct for candidates.
                confidence: event.metadata?.confidence != null ? event.metadata.confidence : null,
                status: 'candidate',
                sourceEventId: event.event_id,
                // Trace fields: correlation_id links all events from the same
                // originating observation. confidence_provenance records whether
                // confidence was inherited from a parent or computed fresh.
                correlationId: event.metadata?.correlation_id || event.correlation_id || null,
                confidenceProvenance: event.metadata?.confidence_source || null,
              });
            } catch (err) {
              console.error(`[GatewayRuntime] Graph projection failed for ${event.event_type}:`, err.message);
            }
          });
        }
        console.log('[GatewayRuntime] Graph Projection subscribed');

        // ─── Seed Initial Business Events ─────────────────────────
        await _seedBusinessEvents(unifiedEventRuntime, {
          reviewEmitter, customerEmitter, projectEmitter, connectorEmitter, systemEmitter,
        });

      } catch (err) {
        console.error('[GatewayRuntime] WARNING: PG service initialization failed:', err.message);
        console.error('[GatewayRuntime] Stack:', err.stack);
        pgAvailable = false;
      }
    }

    if (!pgAvailable) {
      console.log('[GatewayRuntime] Degraded mode: AI, Connectors, Orca, Artifacts available. PG services skipped.');
    }

    Object.assign(services, {
      pool: this._pool,
      eventReadAuthority, repoStore, kernelAdapter, canonicalEventEnvelope, producerEventPort,
      tenantRegistry, deploymentRegistry, runtimeRegistry,
      manifestLoader, artifactLoader, runtimeHash,
      workflowExecutor, eventValidator, capabilityResolver,
      deploymentLoader, stateMachineExecutor, fingerprint,
      systemAuthority, driftDetector, integrationManager, eventGovernance, analyticsPolicy,
      huggingfaceAdapter, aiWorkspaceAuthority,
      reviewAuthority, customerAuthority, projectAuthority,
      executionEngine,
      // PING Core v1
      unifiedEventRuntime, knowledgeGraph, missionRuntime,
      aiRuntime, ollamaProvider, googleConnector, connectorRegistry, workerRuntime,
      legacyIngressAdapter, missionScheduler, eventToMissionBridge,
      reviewEmitter, customerEmitter, projectEmitter, connectorEmitter, systemEmitter,
      neo4jAdapter, qdrantAdapter,
      canonicalizationService, embeddingService,
      evidenceAuthority, hybridSearch,
      deadLetterAuthority,
      // Capability + OAuth framework
      capabilityRegistry, oauthManager, tokenStore,
    });

    return services;
  }

  _mountRoutes(services) {
    const hasPG = !!services.eventReadAuthority;

    this._app.use('/api/v1/ollama', ollamaRoutes(services.aiRuntime, services.ollamaProvider));
    this._app.use('/health', createHealthRoutes(healthAuthority));

    // PG-dependent routes — only mount when Postgres is available
    if (hasPG) {
      this._app.use('/events', createEventRoutes(services.eventReadAuthority, services.unifiedEventRuntime, services.pool));
      this._app.use('/context', createContextRoutes(services.eventReadAuthority));
      this._app.use('/api/v1/repository', createRepositoryRoutes(services.repoStore));
      this._app.use('/system', createSystemRoutes(services.eventReadAuthority));
      this._app.use('/canonical-events', createCanonicalEventRoutes(services.canonicalEventEnvelope, services.producerEventPort));
      this._app.use('/tenants', createTenantRoutes(services.tenantRegistry));
      this._app.use('/deployments', createDeploymentRoutes(services.deploymentRegistry));
      this._app.use('/runtime', createRuntimeRoutes(services.runtimeRegistry));
      this._app.use('/ingest', createIngestRoutes(services.canonicalizationService));
    } else {
      // Degraded mode stubs
      this._app.use('/events', (req, res) => res.status(503).json({ error: 'Postgres unavailable', degraded: true }));
      this._app.use('/context', (req, res) => res.status(503).json({ error: 'Postgres unavailable', degraded: true }));
      this._app.use('/api/v1/repository', (req, res) => res.status(503).json({ error: 'Postgres unavailable', degraded: true }));
      this._app.use('/system', (req, res) => res.status(503).json({ error: 'Postgres unavailable', degraded: true }));
      this._app.use('/canonical-events', (req, res) => res.status(503).json({ error: 'Postgres unavailable', degraded: true }));
      this._app.use('/tenants', (req, res) => res.status(503).json({ error: 'Postgres unavailable', degraded: true }));
      this._app.use('/deployments', (req, res) => res.status(503).json({ error: 'Postgres unavailable', degraded: true }));
      this._app.use('/runtime', (req, res) => res.status(503).json({ error: 'Postgres unavailable', degraded: true }));
      this._app.use('/ingest', (req, res) => res.status(503).json({ error: 'Postgres unavailable', degraded: true }));
    }
    
    // Constitution — filesystem only, always available
    this._app.use('/constitution', createConstitutionRoutes({
      tenantRegistry: services.tenantRegistry,
      deploymentRegistry: services.deploymentRegistry,
      runtimeRegistry: services.runtimeRegistry,
      eventEnvelope: services.canonicalEventEnvelope,
      runtimeHash: services.runtimeHash,
      consumers: {
        eventValidator: services.eventValidator,
        capabilityResolver: services.capabilityResolver,
        workflowExecutor: services.workflowExecutor,
        deploymentLoader: services.deploymentLoader,
        stateMachineExecutor: services.stateMachineExecutor,
      },
      fingerprint: services.fingerprint,
    }));
    
    // Runtime fingerprint — filesystem only
    this._app.use('/runtime/fingerprint', createFingerprintRoutes(services.fingerprint));

    // P046-P050: Operational Intelligence API
    healthAuthority.registerHealthCheck('gateway', async () => ({
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }));
    healthAuthority.registerHealthCheck('generated_artifacts', async () => ({
      status: services.artifactLoader && services.artifactLoader.getArtifactNames().length > 0 ? 'healthy' : 'degraded',
      artifacts: services.artifactLoader ? services.artifactLoader.getArtifactNames().length : 0,
    }));
    healthAuthority.registerHealthCheck('integrations', async () => {
      if (!services.integrationManager) return { status: 'not_initialized' };
      const status = await services.integrationManager.getStatus();
      return { status: status.healthy === status.total ? 'healthy' : 'degraded', integrations: status };
    });
    healthAuthority.registerHealthCheck('event_governance', async () => {
      if (!services.eventGovernance) return { status: 'not_initialized' };
      const stats = services.eventGovernance.getStats();
      return { status: stats.rejected === 0 ? 'healthy' : 'degraded', stats };
    });
    healthAuthority.registerHealthCheck('event_runtime', async () => {
      if (!services.unifiedEventRuntime) return { status: 'not_initialized' };
      const stats = services.unifiedEventRuntime.getStats();
      return { status: 'healthy', stats };
    });
    healthAuthority.registerHealthCheck('canonicalization', async () => {
      if (!services.canonicalizationService) return { status: 'not_initialized' };
      return { status: 'healthy', boundary: 'canonicalization_service' };
    });
    healthAuthority.registerHealthCheck('qdrant', async () => {
      if (!services.qdrantAdapter) return { status: 'not_initialized' };
      const health = await services.qdrantAdapter.health();
      return { status: health.status === 'healthy' ? 'healthy' : 'degraded', ...health };
    });
    healthAuthority.registerHealthCheck('embedding', async () => {
      if (!services.embeddingService) return { status: 'not_initialized' };
      return { status: 'healthy', stats: services.embeddingService.getStats() };
    });
    this._app.use('/ops', createOpsRoutes({
      healthAuthority,
      driftDetector: services.driftDetector || null,
      fingerprint: services.fingerprint,
      systemAuthority: services.systemAuthority,
      eventValidator: services.eventValidator,
      capabilityResolver: services.capabilityResolver,
      workflowExecutor: services.workflowExecutor,
      deploymentLoader: services.deploymentLoader,
      stateMachineExecutor: services.stateMachineExecutor,
      runtimeHash: services.runtimeHash,
    }));

    // Event Governance — filesystem only
    this._app.use('/governance', createGovernanceRoutes(services.eventGovernance));

    // HPP authorities — conditional
    if (services.aiWorkspaceAuthority) {
      this._app.use('/ai-workspace', createAiWorkspaceRoutes(services.aiWorkspaceAuthority));
    }
    if (services.reviewAuthority) {
      this._app.use('/reviews', createReviewRoutes(services.reviewAuthority));
    }
    if (services.customerAuthority) {
      this._app.use('/customers', createCustomerRoutes(services.customerAuthority));
    }
    if (services.projectAuthority) {
      this._app.use('/projects', createProjectRoutes(services.projectAuthority));
    }
    if (services.executionEngine) {
      this._app.use('/orchestration', createOrchestrationRoutes(services.executionEngine));
    }

    // ─── PING Core v1 Routes ───────────────────────────────────────
    if (services.knowledgeGraph) {
      this._app.use('/knowledge', createKnowledgeRoutes(services.knowledgeGraph, {
        hybridSearch: services.hybridSearch,
      }));
    }
    if (services.missionRuntime) {
      this._app.use('/missions', createMissionRoutes(services.missionRuntime));
    }
    // AI Runtime — always available (no PG dependency)
    this._app.use('/ai', createAIRoutes(services.aiRuntime, services.ollamaProvider));
    // Connectors — always available (no PG dependency)
    this._app.use('/connectors', createConnectorRoutes(services.connectorRegistry, services.capabilityRegistry, services.oauthManager));
    // Mission Control — always available (handles null services gracefully)
    this._app.use('/mc', createMissionControlRoutes(services));
  }

  get app() {
    return this._app;
  }

  async start(port) {
    const services = await this._initializeServices();
    this._mountRoutes(services);
    this._app.listen(port, '0.0.0.0', () => {
      console.log(`Gateway running on http://0.0.0.0:${port}`);
    });
  }

  async shutdown() {
    // PATCH_001: Shutdown kernel adapter
    if (this._kernelAdapter) {
      await this._kernelAdapter.shutdown();
    }
  }
}

/**
 * Seed initial business events on startup.
 * Each event is deterministic (same content = same ID).
 * Only seeds if ping_events is empty (first run).
 */
async function _seedBusinessEvents(eventRuntime, emitters) {
  if (!eventRuntime || !eventRuntime._pool) return;

  try {
    const check = await eventRuntime._pool.query('SELECT COUNT(*) FROM ping_events');
    if (parseInt(check.rows[0].count) > 0) {
      console.log('[GatewayRuntime] ping_events already has data — skipping seed');
      return;
    }
  } catch (_) {
    return; // table doesn't exist yet
  }

  console.log('[GatewayRuntime] Seeding initial business events...');
  const { reviewEmitter, customerEmitter, projectEmitter, connectorEmitter, systemEmitter } = emitters;

  // Customers
  await customerEmitter.created({ customer_id: 'cust_001', name: 'Sarah Chen', email: 'sarah@example.com', phone: '555-0101' });
  await customerEmitter.created({ customer_id: 'cust_002', name: 'Mike Rodriguez', email: 'mike@example.com', phone: '555-0102' });
  await customerEmitter.created({ customer_id: 'cust_003', name: 'Emily Watson', email: 'emily@example.com', phone: '555-0103' });

  // Leads
  await customerEmitter.leadCreated({ lead_id: 'lead_001', customer_id: 'cust_001', source: 'google_business', description: 'Kitchen remodel estimate request' });
  await customerEmitter.leadCreated({ lead_id: 'lead_002', customer_id: 'cust_002', source: 'website', description: 'Bathroom renovation project' });

  // Projects
  await projectEmitter.created({ project_id: 'proj_001', customer_id: 'cust_001', name: 'Kitchen Remodel - Chen', type: 'remodel' });
  await projectEmitter.created({ project_id: 'proj_002', customer_id: 'cust_003', name: 'Deck Build - Watson', type: 'construction' });

  // Estimates
  await projectEmitter.estimateCreated({ estimate_id: 'est_001', project_id: 'proj_001', amount: 45000, items: ['cabinets', 'countertops', 'flooring', 'plumbing'] });
  await projectEmitter.estimateSent('est_001', 'sarah@example.com');
  await projectEmitter.estimateAccepted('est_001');

  // Reviews
  await reviewEmitter.received({ review_id: 'rev_001', customer_id: 'cust_003', rating: 5, text: 'Excellent work on the deck! Highly recommend.', source: 'google' });
  await reviewEmitter.received({ review_id: 'rev_002', customer_id: 'cust_001', rating: 4, text: 'Great kitchen design, waiting for final touches.', source: 'google' });

  // Invoices
  await projectEmitter.invoiceCreated({ invoice_id: 'inv_001', project_id: 'proj_001', amount: 22500 });
  await projectEmitter.invoiceSent('inv_001', 'sarah@example.com');

  // Connector events
  await connectorEmitter.emailSent('sarah@example.com', 'Estimate for Kitchen Remodel');
  await connectorEmitter.emailReceived('mike@example.com', 'Bathroom renovation question', 'Hi, I would like to schedule a consultation for a bathroom renovation...');
  await connectorEmitter.smsSent('555-0101', 'Your estimate is ready for review');

  // System events
  await systemEmitter.healthCheck('gateway', 'healthy');
  await systemEmitter.workerCompleted('observation', 'seed_mission', { documents: 3 });

  console.log('[GatewayRuntime] Seeded 18 business events');
}

module.exports = { GatewayRuntime };
