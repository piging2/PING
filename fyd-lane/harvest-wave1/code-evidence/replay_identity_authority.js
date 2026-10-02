/**
 * Replay Identity Authority
 * 
 * Priority 3: Runtime Identity Separation
 * 
 * Constitutional Constraint:
 * Only ReplayIdentity may influence:
 * - ReplayHash
 * - CanonicalHash
 * - WitnessHash
 * - CanonicalEventHash
 * 
 * ReplayIdentity contains:
 * - Canonical bytes
 * - Canonical reducer graph
 * - Canonical authority graph
 * - Canonical replay transcript
 * 
 * This is separate from RuntimeIdentity which is provenance only.
 */

const { CanonicalAuthority, CanonicalBytes } = require('./canonical_authority');
const { reducerAuthority } = require('./reducer_authority');

class ReplayIdentityAuthority {
  constructor() {
    this._replayId = null;
    this._canonicalGraph = null;
    this._reducerGraph = null;
    this._authorityGraph = null;
    this._replayTranscript = null;
    this._identityVersion = '1.0.0';
    this._initialized = false;
  }

  /**
   * Initialize replay identity
   * @param {Object} config - Replay configuration
   * @returns {string} Replay ID
   */
  initialize(config = {}) {
    if (this._initialized) {
      return this._replayId;
    }

    this._canonicalGraph = this._buildCanonicalGraph();
    this._reducerGraph = this._buildReducerGraph();
    this._authorityGraph = this._buildAuthorityGraph();
    this._replayTranscript = this._buildReplayTranscript();
    
    this._replayId = this._generateReplayId();
    this._initialized = true;

    return this._replayId;
  }

  /**
   * Get replay ID
   * @returns {string} Replay ID
   */
  getReplayId() {
    if (!this._initialized) {
      throw new Error('ReplayIdentityAuthority not initialized. Call initialize() first.');
    }
    return this._replayId;
  }

  /**
   * Get canonical graph
   * @returns {Object} Canonical graph
   */
  getCanonicalGraph() {
    if (!this._initialized) {
      throw new Error('ReplayIdentityAuthority not initialized.');
    }
    return this._canonicalGraph;
  }

  /**
   * Get reducer graph
   * @returns {Object} Reducer graph
   */
  getReducerGraph() {
    if (!this._initialized) {
      throw new Error('ReplayIdentityAuthority not initialized.');
    }
    return this._reducerGraph;
  }

  /**
   * Get authority graph
   * @returns {Object} Authority graph
   */
  getAuthorityGraph() {
    if (!this._initialized) {
      throw new Error('ReplayIdentityAuthority not initialized.');
    }
    return this._authorityGraph;
  }

  /**
   * Get replay transcript
   * @returns {Object} Replay transcript
   */
  getReplayTranscript() {
    if (!this._initialized) {
      throw new Error('ReplayIdentityAuthority not initialized.');
    }
    return this._replayTranscript;
  }

  /**
   * Build canonical graph
   * @returns {Object} Canonical graph
   * @private
   */
  _buildCanonicalGraph() {
    const reducers = reducerAuthority.getAllReducers();
    const graph = {
      nodes: [],
      edges: [],
      version: this._identityVersion
    };

    for (const reducer of reducers) {
      graph.nodes.push({
        id: reducer.reducer_id,
        hash: reducer.reducer_hash,
        type: 'reducer'
      });
    }

    return graph;
  }

  /**
   * Build reducer graph
   * @returns {Object} Reducer graph
   * @private
   */
  _buildReducerGraph() {
    const reducers = reducerAuthority.getAllReducers();
    const graph = {
      reducers: reducers.map(r => ({
        id: r.reducer_id,
        hash: r.reducer_hash,
        code: r.reducer_code
      })),
      version: this._identityVersion
    };

    return graph;
  }

  /**
   * Build authority graph
   * @returns {Object} Authority graph
   * @private
   */
  _buildAuthorityGraph() {
    const graph = {
      authorities: [
        'canonical',
        'identity',
        'witness',
        'verification',
        'lineage',
        'constitutionalTime',
        'reducer',
        'eventSchema'
      ],
      version: this._identityVersion
    };

    return graph;
  }

  /**
   * Build replay transcript
   * @returns {Object} Replay transcript
   * @private
   */
  _buildReplayTranscript() {
    const transcript = {
      canonical_graph_hash: CanonicalAuthority.hash(this._canonicalGraph),
      reducer_graph_hash: CanonicalAuthority.hash(this._reducerGraph),
      authority_graph_hash: CanonicalAuthority.hash(this._authorityGraph),
      version: this._identityVersion
    };

    return transcript;
  }

  /**
   * Generate replay ID
   * @returns {string} Replay ID
   * @private
   */
  _generateReplayId() {
    const canonicalData = {
      canonical_graph_hash: this._replayTranscript.canonical_graph_hash,
      reducer_graph_hash: this._replayTranscript.reducer_graph_hash,
      authority_graph_hash: this._replayTranscript.authority_graph_hash,
      identity_version: this._identityVersion
    };
    const hash = CanonicalAuthority.hash(canonicalData);
    return `replay_${hash.substring(0, 16)}`;
  }

  /**
   * Get identity version
   * @returns {string} Identity version
   */
  getIdentityVersion() {
    return this._identityVersion;
  }

  /**
   * Check if initialized
   * @returns {boolean} Initialization status
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Reset replay identity (for testing only)
   */
  _reset() {
    this._replayId = null;
    this._canonicalGraph = null;
    this._reducerGraph = null;
    this._authorityGraph = null;
    this._replayTranscript = null;
    this._initialized = false;
  }
}

// Singleton instance
const replayIdentityAuthority = new ReplayIdentityAuthority();

module.exports = {
  ReplayIdentityAuthority,
  replayIdentityAuthority
};
