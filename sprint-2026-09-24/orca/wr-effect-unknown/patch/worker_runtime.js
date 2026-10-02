/**
 * Worker Runtime v1 — PING Core v1
 * 
 * Extracted from 38 worker implementations across 7 generations.
 * Best patterns combined:
 * - Gen 1: HTTP-based event communication (simple, works)
 * - Gen 2: WorkerBase with pooled connections and backoff (robust)
 * - Gen 3: Lease management, heartbeat, health checks (production-grade)
 * 
 * Workers register as WorkerPorts in the Orca scheduler.
 * Desktop agents coordinate; worker fleets execute.
 */

class WorkerRuntime {
  constructor(options = {}) {
    this._workers = new Map();
    this._pool = options.pool || null;
    this._gatewayUrl = options.gatewayUrl || 'http://localhost:8080';
    this._pollInterval = options.pollInterval || 5000;
    this._running = false;
    this._stats = { dispatched: 0, completed: 0, failed: 0 };
  }

  /**
   * Register a worker.
   * @param {string} name — worker name (e.g., 'observation', 'claim', 'projection')
   * @param {object} worker — must implement handle(event)
   * @param {object} options — { eventTypes, maxConcurrent, capabilities }
   */
  register(name, worker, options = {}) {
    if (typeof worker.handle !== 'function') {
      throw new Error(`Worker '${name}' must implement handle(event)`);
    }

    this._workers.set(name, {
      worker,
      eventTypes: options.eventTypes || [],
      capabilities: options.capabilities || [],
      maxConcurrent: options.maxConcurrent || 1,
      running: 0,
      totalProcessed: 0,
      totalFailed: 0,
      lastHeartbeat: Date.now(),
      status: 'idle',
    });
  }

  /**
   * Start the worker runtime.
   * NOTE: Workers receive events via dispatch() only (MissionScheduler is the single dispatch path).
   * The _poll() loop is disabled to prevent dual input paths and race conditions.
   */
  start() {
    this._running = true;
    console.log(`[WorkerRuntime] Started with ${this._workers.size} workers (dispatch-only mode)`);
  }

  /**
   * Stop the worker runtime.
   */
  stop() {
    this._running = false;
    console.log('[WorkerRuntime] Stopped');
  }

  /**
   * Process a single event through the appropriate worker.
   *
   * Fail-closed dispatch receipt (WR fail-closed repair, 2026-09-26).
   *
   * The return is a structured receipt carrying OBSERVED routing evidence,
   * so the coordinator never has to infer a routing fact from a falsy value:
   *
   *   { matched: true, worker, routeExists: true, result }
   *     A registered worker's eventTypes included the event type and its
   *     handle() settled. `result` is the handler's RAW return value, which
   *     may be undefined. A falsy `result` is NOT evidence the worker did
   *     nothing: the handler may have performed an external effect and
   *     returned nothing. Absence of return value is not evidence of absence
   *     of effect.
   *
   *   { matched: false, worker: null, routeExists: false, result: null }
   *     EXPLICIT NO-MATCH, observed: no registered worker's eventTypes
   *     included the event type, so no handler ran.
   *
   *   { matched: false, worker: null, routeExists: true, result: null }
   *     A worker IS registered for the event type but was at maxConcurrent,
   *     so no handler ran for this dispatch. No effect could have occurred.
   *
   * A handler that throws still propagates to the caller (P0-2), unchanged:
   * an error before proven effect is FAILED per the existing contract.
   */
  async dispatch(event) {
    const eventType = event.event_type;
    let matched = false;
    let matchedWorker = null;
    let routeExists = false;
    let lastResult = null;

    // Find workers that handle this event type
    for (const [name, entry] of this._workers) {
      // Workers with empty eventTypes are dormant — they do not match any events.
      // Previously, empty eventTypes was treated as a catch-all (match everything),
      // which meant a dormant worker would silently process all dispatched events.
      if (entry.eventTypes.length > 0 && entry.eventTypes.includes(eventType)) {
        routeExists = true;
        if (entry.running < entry.maxConcurrent) {
          this._stats.dispatched++;
          entry.running++;
          entry.status = 'processing';
          try {
            // Track the current event on the worker so downstream emissions can
            // preserve its namespace (privacy boundary) via BaseWorker._emit.
            entry.worker._event = event;
            lastResult = await entry.worker.handle(event);
            entry.worker._event = null;
            entry.totalProcessed++;
            this._stats.completed++;
            matched = true;
            matchedWorker = name;
          } catch (err) {
            entry.worker._event = null;
            entry.totalFailed++;
            this._stats.failed++;
            console.error(`[WorkerRuntime] Worker '${name}' failed:`, err.message);
            throw err;  // P0-2: propagate to caller (MissionScheduler) for retry/fail path
          } finally {
            entry.running--;
            entry.status = entry.running > 0 ? 'processing' : 'idle';
            entry.lastHeartbeat = Date.now();
          }
        }
      }
    }
    return { matched, worker: matchedWorker, routeExists, result: lastResult };
  }

  /**
   * Get worker stats.
   */
  getStats() {
    const workers = {};
    for (const [name, entry] of this._workers) {
      workers[name] = {
        status: entry.status,
        running: entry.running,
        maxConcurrent: entry.maxConcurrent,
        totalProcessed: entry.totalProcessed,
        totalFailed: entry.totalFailed,
        lastHeartbeat: entry.lastHeartbeat,
        eventTypes: entry.eventTypes,
        capabilities: entry.capabilities,
      };
    }
    return { workers, stats: { ...this._stats, scope: 'session' }, running: this._running };
  }

  /**
   * Health check all workers.
   */
  async health() {
    const results = {};
    const staleThreshold = 60000; // 1 minute
    for (const [name, entry] of this._workers) {
      const stale = Date.now() - entry.lastHeartbeat > staleThreshold;
      results[name] = {
        status: stale ? 'stale' : entry.status,
        lastHeartbeat: entry.lastHeartbeat,
        totalProcessed: entry.totalProcessed,
      };
    }
    return results;
  }

  // --- Private ---

  async _poll() {
    try {
      // Lane L: /events/unprocessed requires explicit tenant context. The worker
      // plane is unattributed system work, so it polls under UNKNOWN.
      const response = await fetch(`${this._gatewayUrl}/events/unprocessed?tenant=UNKNOWN`);
      if (!response.ok) return;
      
      const data = await response.json();
      const events = data.events || [];
      
      for (const event of events) {
        this._stats.dispatched++;
        await this.dispatch(event);
      }
    } catch (err) {
      // Gateway not available — retry on next poll
    }
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { WorkerRuntime };
