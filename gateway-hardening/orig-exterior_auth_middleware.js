/**
 * Exterior Agent Authentication Middleware
 *
 * Enforces authentication before capability authorization.
 * Agents must provide valid API key via Authorization header.
 * Unknown agents are DENIED (fail-closed).
 *
 * Flow:
 *   HTTP request with Authorization: Bearer <api_key>
 *       ↓
 *   API key lookup in exterior_agent_credentials table
 *       ↓
 *   Valid credential → resolve agent identity
 *       ↓
 *   Agent identity → profile lookup → capability authorization
 */

const crypto = require('crypto');

class ExteriorAuthMiddleware {
  constructor(postgresPool) {
    this._pool = postgresPool;
    this._inMemoryCredentials = new Map();
  }

  async initialize() {
    try {
      await this._createTables();
      await this._seedDefaultCredentials();
      console.log('[ExteriorAuthMiddleware] Initialized with Postgres backing');
    } catch (error) {
      console.log('[ExteriorAuthMiddleware] Postgres unavailable, using in-memory degraded mode');
      // Seed in-memory credentials for degraded mode
      this._seedInMemoryCredentials();
    }
  }

  async _createTables() {
    await this._pool.query(`
      CREATE TABLE IF NOT EXISTS exterior_agent_credentials (
        api_key VARCHAR(128) PRIMARY KEY,
        agent_id VARCHAR(255) NOT NULL UNIQUE,
        agent_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        last_used_at TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);

    await this._pool.query(`
      CREATE INDEX IF NOT EXISTS idx_exterior_credentials_agent ON exterior_agent_credentials(agent_id)
    `);

    await this._pool.query(`
      CREATE INDEX IF NOT EXISTS idx_exterior_credentials_active ON exterior_agent_credentials(is_active, expires_at)
    `);

    // Migration: expand api_key column if table exists with VARCHAR(64)
    try {
      await this._pool.query(`
        ALTER TABLE exterior_agent_credentials ALTER COLUMN api_key TYPE VARCHAR(128)
      `);
    } catch (error) {
      // Column already VARCHAR(128) or table doesn't exist - ignore
    }
  }

  async _seedDefaultCredentials() {
    // Check if credentials already exist
    const existing = await this._pool.query(
      'SELECT COUNT(*) as count FROM exterior_agent_credentials'
    );

    if (existing.rows[0].count > 0) {
      return; // Already seeded
    }

    // Use environment-provided credentials if available, otherwise generate
    const museKey = process.env.MUSE_LEVEL_1_KEY || this._generateApiKey();
    const museLevel2Key = process.env.MUSE_LEVEL_2_KEY || this._generateApiKey();

    await this._pool.query(`
      INSERT INTO exterior_agent_credentials (api_key, agent_id, agent_name)
      VALUES ($1, $2, $3), ($4, $5, $6)
    `, [
      museKey, 'muse', 'Muse Level 1 (Observe)',
      museLevel2Key, 'muse-level-2', 'Muse Level 2 (Workspace Write)'
    ]);

    const source = process.env.MUSE_LEVEL_1_KEY ? 'environment' : 'generated';
    console.log(`[ExteriorAuthMiddleware] Default credentials seeded (Postgres, source: ${source})`);
    if (source === 'generated') {
      console.log('[ExteriorAuthMiddleware] Muse Level 1 API key:', museKey);
      console.log('[ExteriorAuthMiddleware] Muse Level 2 API key:', museLevel2Key);
    } else {
      console.log('[ExteriorAuthMiddleware] Using environment-provided credentials');
    }
  }

  _seedInMemoryCredentials() {
    // Check for environment-provided fixed credentials (MVP persistence)
    const museKey = process.env.MUSE_LEVEL_1_KEY || this._generateApiKey();
    const museLevel2Key = process.env.MUSE_LEVEL_2_KEY || this._generateApiKey();

    this._inMemoryCredentials.set(museKey, {
      agentId: 'muse',
      agentName: 'Muse Level 1 (Observe)',
      isActive: true,
      expiresAt: null
    });

    this._inMemoryCredentials.set(museLevel2Key, {
      agentId: 'muse-level-2',
      agentName: 'Muse Level 2 (Workspace Write)',
      isActive: true,
      expiresAt: null
    });

    const source = process.env.MUSE_LEVEL_1_KEY ? 'environment' : 'generated';
    console.log(`[ExteriorAuthMiddleware] Default credentials seeded (in-memory degraded mode, source: ${source})`);
    if (source === 'generated') {
      console.log('[ExteriorAuthMiddleware] Muse Level 1 API key:', museKey);
      console.log('[ExteriorAuthMiddleware] Muse Level 2 API key:', museLevel2Key);
    } else {
      console.log('[ExteriorAuthMiddleware] Using environment-provided credentials');
    }
  }

  _generateApiKey() {
    return `pk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Extract API key from Authorization header
   */
  extractApiKey(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return null;
    }

    // Support "Bearer <key>" and direct "<key>"
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }

  /**
   * Authenticate request and resolve agent identity
   *
   * @param {string} apiKey - API key from Authorization header
   * @returns {object|null} Agent identity or null if invalid
   */
  async authenticate(apiKey) {
    if (!apiKey) {
      return null;
    }

    // Try Postgres first
    try {
      const result = await this._pool.query(`
        SELECT agent_id, agent_name, is_active, expires_at
        FROM exterior_agent_credentials
        WHERE api_key = $1 AND is_active = true
      `, [apiKey]);

      if (result.rows.length === 0) {
        // Fall back to in-memory credentials
        return this._authenticateInMemory(apiKey);
      }

      const credential = result.rows[0];

      // Check expiration
      if (credential.expires_at && new Date(credential.expires_at) < new Date()) {
        return null; // Expired credential
      }

      // Update last_used_at
      await this._pool.query(`
        UPDATE exterior_agent_credentials
        SET last_used_at = NOW()
        WHERE api_key = $1
      `, [apiKey]);

      return {
        agentId: credential.agent_id,
        agentName: credential.agent_name
      };
    } catch (error) {
      // Postgres unavailable - fall back to in-memory
      return this._authenticateInMemory(apiKey);
    }
  }

  _authenticateInMemory(apiKey) {
    const credential = this._inMemoryCredentials.get(apiKey);
    if (!credential) {
      return null;
    }

    if (!credential.isActive) {
      return null;
    }

    if (credential.expiresAt && new Date(credential.expiresAt) < new Date()) {
      return null;
    }

    return {
      agentId: credential.agentId,
      agentName: credential.agentName
    };
  }

  /**
   * Express middleware for authentication
   */
  middleware() {
    return async (req, res, next) => {
      const apiKey = this.extractApiKey(req);

      if (!apiKey) {
        return res.status(401).json({
          status: 'denied',
          reason: 'Missing authentication',
          code: 'MISSING_AUTH'
        });
      }

      const agentIdentity = await this.authenticate(apiKey);

      if (!agentIdentity) {
        return res.status(401).json({
          status: 'denied',
          reason: 'Invalid or expired credential',
          code: 'INVALID_CREDENTIAL'
        });
      }

      // Attach authenticated identity to request
      req.authenticatedAgent = agentIdentity;
      next();
    };
  }
}

module.exports = ExteriorAuthMiddleware;
