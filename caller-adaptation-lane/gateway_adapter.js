/**
 * Gateway-to-Kernel Adapter Interface
 * 
 * PATCH_001: Introduce gateway-to-kernel adapter interface
 * 
 * This adapter provides a clean interface between the gateway HTTP layer
 * and the kernel runtime, ensuring proper layer separation.
 * 
 * The gateway should only communicate with the kernel through this adapter,
 * never directly importing kernel components.
 */

const { ConstitutionalExecutionPipeline } = require('./execution/constitutional_execution_pipeline');
const { Dispatcher } = require('./execution/dispatcher');
const { ReducerRegistry } = require('./execution/reducer_registry');
const { ProjectionRegistry } = require('./execution/projection_registry');
const { ReplayDecisionAuthority } = require('./execution/replay_decision_authority');
const { ExecutionArtifact } = require('./execution/execution_artifact');
const { EventRepository } = require('./event_repository');
const { EventReadAuthority } = require('./event_read_authority');

class GatewayToKernelAdapter {
  constructor(pool) {
    this._pool = pool;
    
    // PATCH_002: Use kernel EventRepository
    this._eventRepository = new EventRepository(pool);
    
    // PATCH_003: Use kernel EventReadAuthority
    this._eventReadAuthority = new EventReadAuthority(pool);
    
    // Initialize kernel execution components
    this._reducerRegistry = new ReducerRegistry();
    this._projectionRegistry = new ProjectionRegistry();
    this._dispatcher = new Dispatcher(this._reducerRegistry);
    this._replayDecision = new ReplayDecisionAuthority();
    this._pipeline = new ConstitutionalExecutionPipeline(
      this._eventRepository,
      this._dispatcher,
      this._reducerRegistry,
      this._projectionRegistry,
      this._replayDecision,
      pool
    );
  }

  /**
   * Execute an event through the constitutional pipeline
   *
   * Event-authority convergence (2026-09-19, caller-adaptation lane): the
   * kernel repository is a projection/adapter, not an event authority. The
   * caller must route the happening through the canonical path first and set
   * request.canonical_event_id to the accepted canonical event id; without
   * that proof the repository write fails closed with
   * UnanchoredCanonicalWriteError (code EVENT_REPOSITORY_UNANCHORED_WRITE).
   * This path derives from canonical events; it never mints canonical identity.
   *
   * @param {Object} request - Event request; must carry canonical_event_id
   * @returns {Object} Execution artifact
   */
  async executeEvent(request) {
    return await this._pipeline.execute(request);
  }

  /**
   * Register a reducer for an event type
   * 
   * @param {string} eventType - Event type
   * @param {string} name - Reducer name
   * @param {Function} reducerFn - Reducer function
   * @param {Object} metadata - Optional metadata
   */
  registerReducer(eventType, name, reducerFn, metadata = {}) {
    this._reducerRegistry.register(eventType, name, reducerFn, metadata);
  }

  /**
   * Register a projection
   * 
   * @param {string} name - Projection name
   * @param {Function} projectorFn - Projector function
   */
  registerProjection(name, projectorFn) {
    this._projectionRegistry.register(name, projectorFn);
  }

  /**
   * Get the execution pipeline
   * 
   * @returns {ConstitutionalExecutionPipeline} The pipeline instance
   */
  getPipeline() {
    return this._pipeline;
  }

  /**
   * Get the reducer registry
   * 
   * @returns {ReducerRegistry} The reducer registry instance
   */
  getReducerRegistry() {
    return this._reducerRegistry;
  }

  /**
   * Get the projection registry
   * 
   * @returns {ProjectionRegistry} The projection registry instance
   */
  getProjectionRegistry() {
    return this._projectionRegistry;
  }

  /**
   * Get the dispatcher
   * 
   * @returns {Dispatcher} The dispatcher instance
   */
  getDispatcher() {
    return this._dispatcher;
  }

  /**
   * Get the replay decision authority
   * 
   * @returns {ReplayDecisionAuthority} The replay decision authority instance
   */
  getReplayDecisionAuthority() {
    return this._replayDecision;
  }

  /**
   * Get the event repository
   * 
   * @returns {EventRepository} The event repository instance
   */
  getEventRepository() {
    return this._eventRepository;
  }

  /**
   * Get the event read authority
   * 
   * @returns {EventReadAuthority} The event read authority instance
   */
  getEventReadAuthority() {
    return this._eventReadAuthority;
  }

  /**
   * Initialize the adapter
   */
  async initialize() {
    // PATCH_002: Initialize event repository
    await this._eventRepository.initialize();
    // PATCH_003: Initialize event read authority
    await this._eventReadAuthority.initialize();
    console.log('[GatewayToKernelAdapter] Initialized');
  }

  /**
   * Shutdown the adapter
   */
  async shutdown() {
    // Any cleanup logic if needed
    console.log('[GatewayToKernelAdapter] Shutdown');
  }
}

module.exports = { GatewayToKernelAdapter };
