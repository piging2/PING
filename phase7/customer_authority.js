/**
 * Customer Authority
 *
 * HPP business authority for Customer management.
 * Consumes data from Google adapters (People, Gmail, Calendar),
 * merges into a single Customer aggregate, persists to Postgres,
 * and emits CUSTOMER_* events through the ProducerEventPort
 * (Phase 7 migration seam: producer call shape preserved; authority behind
 * the call is the converged event path, not the envelope receipt surface).
 *
 * Constitutional Constraint:
 * - Authority operations, not CRUD
 * - All DB access via this._storage (PostgresAdapter)
 * - Events emitted via ProducerEventPort
 * - No direct pool.query()
 * - Tenant isolation enforced
 * - Canonical identity: customer://{tenantId}/{customerId}
 */

const crypto = require('crypto');

class CustomerAuthority {
  /**
   * @param {Object} storage - PostgresAdapter
   * @param {Object} eventPort - ProducerEventPort (Phase 7 migration seam)
   * @param {Object} [options]
   * @param {Object} [options.peopleAdapter] - GooglePeopleAdapter
   * @param {Object} [options.gmailAdapter] - GmailAdapter
   * @param {Object} [options.calendarAdapter] - GoogleCalendarAdapter
   */
  constructor(storage, eventPort, options = {}) {
    this._storage = storage;
    this._eventPort = eventPort;
    this._peopleAdapter = options.peopleAdapter || null;
    this._gmailAdapter = options.gmailAdapter || null;
    this._calendarAdapter = options.calendarAdapter || null;
    this._dependencies = ['storage', 'producerEventPort'];
    this._authorityVersion = '1.0.0';
  }

  get dependencies() {
    return this._dependencies;
  }

  /**
   * Initialize customers table.
   */
  async initialize() {
    await this._storage.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        customer_id VARCHAR(255) NOT NULL,
        display_name VARCHAR(512),
        given_name VARCHAR(255),
        family_name VARCHAR(255),
        email VARCHAR(512),
        emails JSONB DEFAULT '[]',
        phone VARCHAR(255),
        phones JSONB DEFAULT '[]',
        company VARCHAR(512),
        title VARCHAR(512),
        address JSONB,
        photo_url TEXT,
        biography TEXT,
        birthday DATE,
        website TEXT,
        source VARCHAR(64) NOT NULL,
        source_id VARCHAR(512),
        source_url TEXT,
        gmail_thread_count INTEGER DEFAULT 0,
        gmail_last_message_at TIMESTAMPTZ,
        calendar_event_count INTEGER DEFAULT 0,
        calendar_last_event_at TIMESTAMPTZ,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, customer_id)
      )
    `);

    await this._storage.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id)
    `);

    await this._storage.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(tenant_id, email)
    `);

    await this._storage.query(`
      CREATE INDEX IF NOT EXISTS idx_customers_source ON customers(tenant_id, source, source_id)
    `);

    console.log('[CustomerAuthority] Tables initialized');
  }

  /**
   * Canonicalize customer ID to URI format.
   *
   * @param {string} tenantId
   * @param {string} customerId
   * @returns {string} Canonical URI
   */
  canonicalizeId(tenantId, customerId) {
    return `customer://${tenantId}/${customerId}`;
  }

  /**
   * Compute deterministic customer ID from source + source_id.
   *
   * @param {string} source - "google_people", "gmail", "google_calendar"
   * @param {string} sourceId - Provider-specific ID
   * @returns {string} Stable customer_id
   */
  _computeCustomerId(source, sourceId) {
    const hash = crypto.createHash('sha256')
      .update(`${source}:${sourceId}`)
      .digest('hex');
    return `cust_${hash.slice(0, 16)}`;
  }

  /**
   * Execute ImportCustomersCommand
   *
   * Pulls contacts from Google People API, normalizes, persists, emits events.
   *
   * @param {Object} command
   * @param {string} command.tenantId
   * @param {Object} [command.options] - Adapter options (pageSize, pageToken, syncToken)
   * @returns {Object} { imported: number, updated: number, errors: string[] }
   */
  async executeImportCustomers({ tenantId, options = {} } = {}) {
    if (!tenantId) throw new Error('tenantId is required');
    if (!this._peopleAdapter) throw new Error('People adapter not configured');

    const { contacts, nextPageToken, syncToken } = await this._peopleAdapter.executeFetchContacts(options);

    let imported = 0;
    let updated = 0;
    const errors = [];

    for (const contact of contacts) {
      try {
        const customerId = this._computeCustomerId(contact.source, contact.source_id);
        const existing = await this._findCustomer(tenantId, customerId);

        if (existing) {
          await this._updateCustomer(tenantId, customerId, contact);
          updated++;
        } else {
          await this._insertCustomer(tenantId, customerId, contact);
          imported++;
        }

        await this._emitEvent(tenantId, 'CUSTOMER_IMPORTED', {
          customer_id: customerId,
          source: contact.source,
          source_id: contact.source_id,
          display_name: contact.display_name,
          email: contact.email,
        });
      } catch (error) {
        errors.push(`${contact.source_id}: ${error.message}`);
      }
    }

    return { imported, updated, errors, nextPageToken, syncToken };
  }

  /**
   * Execute SyncCustomerEmailCommand
   *
   * Fetches Gmail threads for a customer, updates email metadata.
   *
   * @param {Object} command
   * @param {string} command.tenantId
   * @param {string} command.customerId
   * @param {string} command.email
   * @param {Object} [command.options]
   * @returns {Object} { thread_count: number, last_message_at: string|null }
   */
  async executeSyncCustomerEmail({ tenantId, customerId, email, options = {} } = {}) {
    if (!tenantId) throw new Error('tenantId is required');
    if (!customerId) throw new Error('customerId is required');
    if (!email) throw new Error('email is required');
    if (!this._gmailAdapter) throw new Error('Gmail adapter not configured');

    const { threads } = await this._gmailAdapter.executeFetchThreadsByEmail(email, options);

    const lastMessage = threads.length > 0
      ? threads.reduce((latest, t) => {
          const tDate = t.last_message_at ? new Date(t.last_message_at) : null;
          return tDate && (!latest || tDate > latest) ? tDate : latest;
        }, null)
      : null;

    await this._storage.query(
      `UPDATE customers
       SET gmail_thread_count = $1,
           gmail_last_message_at = $2,
           updated_at = NOW()
       WHERE tenant_id = $3 AND customer_id = $4`,
      [threads.length, lastMessage ? lastMessage.toISOString() : null, tenantId, customerId]
    );

    await this._emitEvent(tenantId, 'CUSTOMER_EMAIL_SYNCED', {
      customer_id: customerId,
      email,
      thread_count: threads.length,
      last_message_at: lastMessage ? lastMessage.toISOString() : null,
    });

    return {
      thread_count: threads.length,
      last_message_at: lastMessage ? lastMessage.toISOString() : null,
    };
  }

  /**
   * Execute SyncCustomerCalendarCommand
   *
   * Fetches Calendar events for a customer, updates calendar metadata.
   *
   * @param {Object} command
   * @param {string} command.tenantId
   * @param {string} command.customerId
   * @param {string} command.email
   * @param {Object} [command.options]
   * @returns {Object} { event_count: number, last_event_at: string|null }
   */
  async executeSyncCustomerCalendar({ tenantId, customerId, email, options = {} } = {}) {
    if (!tenantId) throw new Error('tenantId is required');
    if (!customerId) throw new Error('customerId is required');
    if (!email) throw new Error('email is required');
    if (!this._calendarAdapter) throw new Error('Calendar adapter not configured');

    const { events } = await this._calendarAdapter.executeFetchEventsByEmail(email, options);

    const lastEvent = events.length > 0
      ? events.reduce((latest, e) => {
          const eDate = e.end ? new Date(e.end) : null;
          return eDate && (!latest || eDate > latest) ? eDate : latest;
        }, null)
      : null;

    await this._storage.query(
      `UPDATE customers
       SET calendar_event_count = $1,
           calendar_last_event_at = $2,
           updated_at = NOW()
       WHERE tenant_id = $3 AND customer_id = $4`,
      [events.length, lastEvent ? lastEvent.toISOString() : null, tenantId, customerId]
    );

    await this._emitEvent(tenantId, 'CUSTOMER_CALENDAR_SYNCED', {
      customer_id: customerId,
      email,
      event_count: events.length,
      last_event_at: lastEvent ? lastEvent.toISOString() : null,
    });

    return {
      event_count: events.length,
      last_event_at: lastEvent ? lastEvent.toISOString() : null,
    };
  }

  /**
   * Execute ResolveCustomerQuery
   *
   * @param {string} tenantId
   * @param {string} customerId
   * @returns {Object|null}
   */
  async executeResolveCustomer(tenantId, customerId) {
    return this._findCustomer(tenantId, customerId);
  }

  /**
   * Execute SearchCustomersQuery
   *
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {string} [params.query] - Search display_name, email, company
   * @param {string} [params.email] - Exact email match
   * @param {string} [params.source] - Filter by source
   * @param {number} [params.limit]
   * @param {number} [params.offset]
   * @returns {Object[]} Matching customers
   */
  async executeSearchCustomers({ tenantId, query, email, source, limit = 50, offset = 0 } = {}) {
    if (!tenantId) throw new Error('tenantId is required');

    let sql = 'SELECT * FROM customers WHERE tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (email) {
      sql += ` AND LOWER(email) = LOWER($${paramIndex++})`;
      params.push(email);
    }

    if (source) {
      sql += ` AND source = $${paramIndex++}`;
      params.push(source);
    }

    if (query) {
      sql += ` AND (
        LOWER(display_name) LIKE LOWER($${paramIndex})
        OR LOWER(email) LIKE LOWER($${paramIndex})
        OR LOWER(company) LIKE LOWER($${paramIndex})
      )`;
      params.push(`%${query}%`);
      paramIndex++;
    }

    sql += ` ORDER BY updated_at DESC`;
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await this._storage.query(sql, params);
    return result.rows;
  }

  /**
   * Execute ListCustomersQuery
   *
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {number} [params.limit]
   * @param {number} [params.offset]
   * @returns {Object[]} All customers for tenant
   */
  async executeListCustomers({ tenantId, limit = 100, offset = 0 } = {}) {
    if (!tenantId) throw new Error('tenantId is required');

    const result = await this._storage.query(
      `SELECT * FROM customers
       WHERE tenant_id = $1
       ORDER BY updated_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    return result.rows;
  }

  /**
   * Execute GetCustomerStatsQuery
   *
   * @param {string} tenantId
   * @returns {Object} Aggregate stats
   */
  async executeGetCustomerStats(tenantId) {
    if (!tenantId) throw new Error('tenantId is required');

    const result = await this._storage.query(
      `SELECT
         COUNT(*) as total_customers,
         COUNT(DISTINCT source) as sources,
         COUNT(CASE WHEN email IS NOT NULL THEN 1 END) as with_email,
         COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as with_phone,
         COUNT(CASE WHEN company IS NOT NULL THEN 1 END) as with_company,
         SUM(gmail_thread_count) as total_threads,
         SUM(calendar_event_count) as total_events,
         MIN(created_at) as first_imported,
         MAX(updated_at) as last_updated
       FROM customers
       WHERE tenant_id = $1`,
      [tenantId]
    );

    const sourceBreakdown = await this._storage.query(
      `SELECT source, COUNT(*) as count
       FROM customers
       WHERE tenant_id = $1
       GROUP BY source
       ORDER BY count DESC`,
      [tenantId]
    );

    return {
      ...result.rows[0],
      total_customers: parseInt(result.rows[0].total_customers) || 0,
      total_threads: parseInt(result.rows[0].total_threads) || 0,
      total_events: parseInt(result.rows[0].total_events) || 0,
      sources: sourceBreakdown.rows,
    };
  }

  /**
   * Execute UpsertCustomerCommand
   *
   * Manually create or update a customer (not from Google sync).
   *
   * @param {Object} command
   * @param {string} command.tenantId
   * @param {Object} command.customer - Customer data
   * @returns {Object} Persisted customer
   */
  async executeUpsertCustomer({ tenantId, customer } = {}) {
    if (!tenantId) throw new Error('tenantId is required');
    if (!customer) throw new Error('customer is required');

    const customerId = customer.customer_id || this._computeCustomerId('manual', `${tenantId}:${customer.email || customer.display_name}`);

    const existing = await this._findCustomer(tenantId, customerId);

    if (existing) {
      await this._updateCustomer(tenantId, customerId, customer);
    } else {
      await this._insertCustomer(tenantId, customerId, customer);
    }

    // Phase 7: CUSTOMER_CREATED / CUSTOMER_UPDATED are registered canonical
    // types (registry authority_owner: CustomerAuthority). The port accepts
    // them directly through UnifiedEventRuntime. CUSTOMER_IMPORTED /
    // CUSTOMER_EMAIL_SYNCED / CUSTOMER_CALENDAR_SYNCED are domain envelope
    // types and take the receipt path via the same _emitEvent helper.
    await this._emitEvent(tenantId, existing ? 'CUSTOMER_UPDATED' : 'CUSTOMER_CREATED', {
      customer_id: customerId,
      display_name: customer.display_name,
      email: customer.email,
    });

    return this._findCustomer(tenantId, customerId);
  }

  // ── Private Helpers ──────────────────────────────────────

  /**
   * Find a customer by tenant + customer_id.
   *
   * @param {string} tenantId
   * @param {string} customerId
   * @returns {Object|null}
   */
  async _findCustomer(tenantId, customerId) {
    const result = await this._storage.query(
      'SELECT * FROM customers WHERE tenant_id = $1 AND customer_id = $2',
      [tenantId, customerId]
    );
    return result.rows[0] || null;
  }

  /**
   * Insert a new customer.
   *
   * @param {string} tenantId
   * @param {string} customerId
   * @param {Object} data - Normalized contact data
   */
  async _insertCustomer(tenantId, customerId, data) {
    await this._storage.query(
      `INSERT INTO customers
       (tenant_id, customer_id, display_name, given_name, family_name,
        email, emails, phone, phones, company, title,
        address, photo_url, biography, birthday, website,
        source, source_id, source_url, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
      [
        tenantId, customerId,
        data.display_name || null,
        data.given_name || null,
        data.family_name || null,
        data.email || null,
        JSON.stringify(data.emails || []),
        data.phone || null,
        JSON.stringify(data.phones || []),
        data.company || null,
        data.title || null,
        JSON.stringify(data.addresses?.[0] || data.address || null),
        data.photo_url || null,
        data.biography || null,
        data.birthday || null,
        data.website || null,
        data.source || 'manual',
        data.source_id || null,
        data.source_url || null,
        JSON.stringify(data.metadata || {}),
      ]
    );
  }

  /**
   * Update an existing customer.
   *
   * @param {string} tenantId
   * @param {string} customerId
   * @param {Object} data - Normalized contact data
   */
  async _updateCustomer(tenantId, customerId, data) {
    await this._storage.query(
      `UPDATE customers SET
        display_name = COALESCE($3, display_name),
        given_name = COALESCE($4, given_name),
        family_name = COALESCE($5, family_name),
        email = COALESCE($6, email),
        emails = COALESCE($7, emails),
        phone = COALESCE($8, phone),
        phones = COALESCE($9, phones),
        company = COALESCE($10, company),
        title = COALESCE($11, title),
        address = COALESCE($12, address),
        photo_url = COALESCE($13, photo_url),
        biography = COALESCE($14, biography),
        birthday = COALESCE($15, birthday),
        website = COALESCE($16, website),
        source = COALESCE($17, source),
        source_id = COALESCE($18, source_id),
        source_url = COALESCE($19, source_url),
        updated_at = NOW()
       WHERE tenant_id = $1 AND customer_id = $2`,
      [
        tenantId, customerId,
        data.display_name || null,
        data.given_name || null,
        data.family_name || null,
        data.email || null,
        data.emails ? JSON.stringify(data.emails) : null,
        data.phone || null,
        data.phones ? JSON.stringify(data.phones) : null,
        data.company || null,
        data.title || null,
        data.addresses?.[0] ? JSON.stringify(data.addresses[0]) : (data.address ? JSON.stringify(data.address) : null),
        data.photo_url || null,
        data.biography || null,
        data.birthday || null,
        data.website || null,
        data.source || null,
        data.source_id || null,
        data.source_url || null,
      ]
    );
  }

  /**
   * Emit a CUSTOMER_* event through the ProducerEventPort (Phase 7 seam).
   *
   * The port classifies each type: CUSTOMER_CREATED / CUSTOMER_UPDATED are
   * registered canonical types (direct UER acceptance); CUSTOMER_IMPORTED /
   * CUSTOMER_EMAIL_SYNCED / CUSTOMER_CALENDAR_SYNCED are domain envelope
   * types (receipt + adapter convergence).
   *
   * @param {string} tenantId
   * @param {string} eventType
   * @param {Object} payload
   * @param {Object} [options]
   * @param {string} [options.causationId]
   * @param {string} [options.correlationId]
   */
  async _emitEvent(tenantId, eventType, payload, options = {}) {
    await this._eventPort.emitProducerEvent({
      tenantId,
      eventType,
      source: 'customer-authority',
      actor: 'system',
      payload,
      causationId: options.causationId || null,
      correlationId: options.correlationId || null,
      metadata: { authority: 'customer', version: this._authorityVersion },
    });
  }

  /**
   * Health check.
   */
  async health() {
    try {
      await this._storage.query('SELECT 1');
      return {
        healthy: true,
        storage: { healthy: true },
        adapters: {
          people: this._peopleAdapter ? 'configured' : 'missing',
          gmail: this._gmailAdapter ? 'configured' : 'missing',
          calendar: this._calendarAdapter ? 'configured' : 'missing',
        },
      };
    } catch (error) {
      return { healthy: false, storage: { healthy: false, error: error.message } };
    }
  }

  /**
   * Publish contract.
   */
  publishContract() {
    const contract = {
      authority_id: 'customer',
      authority_name: 'CustomerAuthority',
      version: this._authorityVersion,
      owner: 'hpp',
      consumes: ['tenantId', 'customerId', 'email', 'customer', 'options'],
      produces: ['customer', 'CUSTOMER_*_events'],
      guarantees: ['tenant_isolated', 'deterministic_id', 'event_sourced'],
      invariants: [
        'customer_id is deterministic SHA-256 from (source, source_id)',
        'every mutation emits a CUSTOMER_* event',
        'tenant A cannot read tenant B customers',
        'customer_id is canonical URI: customer://{tenantId}/{customerId}',
      ],
      consumers: ['googlePeopleAdapter', 'gmailAdapter', 'googleCalendarAdapter'],
      requires: ['storage', 'producerEventPort'],
      failure_modes: ['adapter_unavailable', 'postgres_unavailable', 'duplicate_source_id'],
      rollback: 'event_driven',
      determinism: 'deterministic',
      dependencies: this._dependencies,
      schema_version: '1.0.0',
      authority_version: this._authorityVersion,
    };

    const { computeCanonicalHash } = require('../authorities/constitutional_validation');
    contract.contract_hash = computeCanonicalHash(contract);

    return contract;
  }
}

module.exports = { CustomerAuthority };
