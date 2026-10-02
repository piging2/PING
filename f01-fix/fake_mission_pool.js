'use strict';
/**
 * Shared fake pg.Pool for the mission HOLD / reaper / retry / watchdog suites.
 *
 * Models the SQL the implementation actually sends: WHERE conditions are
 * enforced only when the SQL text carries them (in the WHERE clause — a SET
 * assignment that happens to mention a gated value is NOT a gate), and SET
 * assignments are applied generically from the SET clause. Behavior the
 * implementation does not encode in SQL cannot be faked into existence, so
 * both suites stay honest across RED->GREEN transitions.
 *
 * Clock: pass { now: () => ms } so tests with a controllable clock share it
 * with the pool (fakeNow-based NOW(), lease_until, retry_at comparisons).
 */
class FakePool {
  constructor(opts = {}) {
    this.missions = new Map();
    this._now = typeof opts.now === 'function' ? opts.now : () => Date.now();
  }
  _iso() { return new Date(this._now()).toISOString(); }
  _inList(sql) {
    const m = sql.match(/status IN \(([^)]+)\)/);
    return m ? m[1].split(',').map(s => s.trim().replace(/'/g, '')) : null;
  }
  // Apply the SET clause generically: "col = <literal|$N|expr>".
  _applySet(row, setClause, params) {
    // Split on commas not inside quotes (values here are literals or $N).
    const assignments = setClause.match(/(?:[^,'"]|'[^']*'|"[^"]*")+/g) || [];
    for (const a of assignments) {
      const eq = a.indexOf('=');
      if (eq < 0) continue;
      const col = a.slice(0, eq).trim();
      const expr = a.slice(eq + 1).trim();
      if (col === 'effect_count' && /effect_count \+ 1/.test(expr)) {
        row.effect_count = (row.effect_count || 0) + 1;
      } else if (/^\$(\d+)/.test(expr)) {
        const idx = parseInt(expr.match(/^\$(\d+)/)[1], 10) - 1;
        let v = params[idx];
        if (/::jsonb$/.test(expr) && typeof v === 'string') {
          try { v = JSON.parse(v); } catch (_) {}
        }
        row[col] = v;
      } else if (/^NULL$/i.test(expr)) {
        row[col] = null;
      } else if (/^TRUE$/i.test(expr)) {
        row[col] = true;
      } else if (/^FALSE$/i.test(expr)) {
        row[col] = false;
      } else if (/^NOW\(\)/i.test(expr)) {
        row[col] = this._iso();
      } else if (/^-?\d+$/.test(expr)) {
        row[col] = parseInt(expr, 10);
      } else if (/^'.*'$/.test(expr)) {
        row[col] = expr.slice(1, -1);
      }
    }
  }
  _whereAllows(sql, row) {
    const inList = this._inList(sql);
    if (inList && !inList.includes(row.status)) return false;
    const eqHold = sql.match(/AND status = '(hold|created|running|assigned)'/);
    if (eqHold && row.status !== eqHold[1]) return false;
    if (/started_at IS NULL/.test(sql) && row.started_at !== null) return false;
    if (/started_at IS NOT NULL/.test(sql) && row.started_at === null) return false;
    if (/lease_until IS NOT NULL/.test(sql) && row.lease_until === null) return false;
    if (/lease_until < NOW\(\)/.test(sql) && !(row.lease_until && Date.parse(row.lease_until) < this._now())) return false;
    if (/retry_at IS NOT NULL/.test(sql) && row.retry_at === null) return false;
    if (/retry_at <= NOW\(\)/.test(sql) && !(row.retry_at && Date.parse(row.retry_at) <= this._now())) return false;
    // The retry_eligibility dispatch gate only counts in the WHERE clause —
    // several mutations SET it TRUE without gating on it.
    if (/WHERE[\s\S]*retry_eligibility = TRUE/i.test(sql) && row.retry_eligibility !== true) return false;
    return true;
  }
  _updateWhere(sql, params, idParamIdx, setClause) {
    const row = this.missions.get(params[idParamIdx]);
    if (!row || !this._whereAllows(sql, row)) return { rows: [], rowCount: 0 };
    if (/COALESCE\(hold_record/.test(sql)) {
      // Continued-HOLD note merge: hold_record || $N::jsonb
      const m = sql.match(/COALESCE\(hold_record[^)]*\) \|\| \$(\d+)::jsonb/);
      let note = {};
      if (m) { try { note = JSON.parse(params[parseInt(m[1], 10) - 1]); } catch (_) {} }
      row.hold_record = { ...(row.hold_record || {}), ...note };
    } else {
      this._applySet(row, setClause, params);
    }
    const returning = /RETURNING mission_id/.test(sql);
    const effRet = /RETURNING effect_count/.test(sql);
    const rows = [];
    if (returning) rows.push({ mission_id: row.mission_id });
    if (effRet) rows.push({ effect_count: row.effect_count });
    return { rows, rowCount: 1 };
  }
  async query(sql, params = []) {
    const S = sql.replace(/\s+/g, ' ').trim();
    if (/^(CREATE|ALTER)/.test(S)) return { rows: [], rowCount: 0 };
    const byId = (id) => this.missions.get(id);

    if (S.includes('INSERT INTO ping_missions')) {
      const id = params[0];
      if (this.missions.has(id)) return { rows: [], rowCount: 0 };
      this.missions.set(id, {
        mission_id: id, mission_type: params[1], payload: params[2],
        priority: params[3] || 0, created_by: params[4] || null,
        logical_operation_id: id,
        status: 'created', result: null, assigned_to: null,
        created_at: this._iso(), started_at: null, completed_at: null,
        error: null, retries: 0, retry_at: null, lease_until: null, claimed_at: null,
        hold_record: null, effect_count: 0, outcome: 'UNKNOWN',
        retry_eligibility: true, reconciliation_required: false,
      });
      return { rows: [], rowCount: 1 };
    }
    if (S.includes('SELECT retries FROM ping_missions')) {
      const m = byId(params[0]);
      return m ? { rows: [{ retries: m.retries }], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    if (S.includes('SELECT started_at FROM ping_missions')) {
      const m = byId(params[0]);
      return m ? { rows: [{ started_at: m.started_at }], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    if (S.includes('SELECT * FROM ping_missions') && S.includes('WHERE mission_id')) {
      const m = byId(params[0]);
      return m ? { rows: [m], rowCount: 1 } : { rows: [], rowCount: 0 };
    }
    // getHolds()
    if (S.includes('SELECT * FROM ping_missions') && /WHERE status = 'hold'/.test(S)) {
      const rows = [...this.missions.values()].filter(m => m.status === 'hold');
      return { rows, rowCount: rows.length };
    }
    // findOrphanedRunning(): started, lease expired
    if (S.includes('SELECT * FROM ping_missions') && /started_at IS NOT NULL/.test(S)) {
      const rows = [...this.missions.values()].filter(m =>
        ['running', 'assigned'].includes(m.status) &&
        m.started_at !== null && m.lease_until !== null && Date.parse(m.lease_until) < this._now());
      return { rows, rowCount: rows.length };
    }
    // findStuckRunning()
    if (S.includes('COALESCE(started_at')) {
      const cutoff = Date.parse(params[0]);
      const rows = [...this.missions.values()].filter(m =>
        ['running', 'assigned'].includes(m.status) &&
        Date.parse(m.started_at || m.claimed_at || m.created_at) < cutoff);
      return { rows, rowCount: rows.length };
    }
    // getPending(): created (+ retry_eligibility when the SQL carries it in WHERE)
    if (S.includes('WHERE status =') && S.includes('LIMIT')) {
      const limit = params[0] || 10;
      const needEligible = /WHERE[\s\S]*retry_eligibility = TRUE/i.test(S);
      const rows = [...this.missions.values()]
        .filter(m => m.status === 'created' && (!needEligible || m.retry_eligibility === true))
        .sort((a, b) => (b.priority || 0) - (a.priority || 0))
        .slice(0, limit);
      return { rows, rowCount: rows.length };
    }
    // recordDispatchAttempt()
    if (S.includes('SET effect_count = effect_count + 1')) {
      return this._updateWhere(S, params, 0, 'effect_count = effect_count + 1');
    }
    // parkHold(): running/assigned -> hold
    if (S.includes("SET status = 'hold'")) {
      const setClause = S.match(/SET (.*) WHERE/)[1];
      return this._updateWhere(S, params, 0, setClause);
    }
    // reconcileHold continued-HOLD note merge
    if (S.includes('COALESCE(hold_record')) {
      return this._updateWhere(S, params, 0, '');
    }
    // completed: complete() (from running) vs reconcileHold 'succeeded' (from hold)
    if (S.includes("SET status = 'completed'")) {
      const setClause = S.match(/SET (.*) WHERE/)[1];
      const idIdx = S.includes('$2') && S.indexOf('mission_id = $2') > 0 ? 1 : 0;
      return this._updateWhere(S, params, idIdx, setClause);
    }
    // retry_pending (failWithRetry retry branch)
    if (S.includes("SET status = 'retry_pending'")) {
      const setClause = S.match(/SET (.*) WHERE/)[1];
      return this._updateWhere(S, params, 3, setClause);
    }
    // failed: fail() / failWithRetry-exhausted (IN-list) vs reconcileHold 'failed' (hold)
    if (S.includes("SET status = 'failed'")) {
      const setClause = S.match(/SET (.*) WHERE/)[1];
      const idIdx = /mission_id = \$3/.test(S) ? 2 : (/mission_id = \$1/.test(S) ? 0 : 1);
      return this._updateWhere(S, params, idIdx, setClause);
    }
    // created: reclaimRetryPending / reapExpiredLeases / reconcileHold 'safe_to_retry'
    if (S.includes("SET status = 'created'")) {
      const setClause = S.match(/SET (.*) WHERE/)[1];
      if (/status = 'retry_pending'/.test(S)) {
        // reclaimRetryPending: retry_pending + due -> created
        const out = [];
        for (const m of this.missions.values()) {
          if (m.status === 'retry_pending' && m.retry_at && Date.parse(m.retry_at) <= this._now()) {
            this._applySet(m, setClause, []);
            out.push({ mission_id: m.mission_id });
          }
        }
        return { rows: out, rowCount: out.length };
      }
      if (/started_at IS NULL/.test(S)) {
        // reapExpiredLeases: abandoned never-started -> created
        const out = [];
        for (const m of this.missions.values()) {
          if (this._whereAllows(S, m)) { this._applySet(m, setClause, []); out.push({ mission_id: m.mission_id }); }
        }
        return { rows: out, rowCount: out.length };
      }
      // reconcileHold 'safe_to_retry': hold -> created (single row, $1)
      return this._updateWhere(S, params, 0, setClause);
    }
    if (S.includes('SET status = ') && S.includes('assigned_to = $1')) {
      // assign(): created -> assigned (claim gate)
      const setClause = S.match(/SET (.*) WHERE/)[1];
      const r = this._updateWhere(S, params, 1, setClause);
      if (r.rowCount === 1) {
        const m = byId(params[1]);
        if (!m.claimed_at) m.claimed_at = this._iso();
        if (!m.lease_until) m.lease_until = new Date(this._now() + 60000).toISOString();
      }
      return r;
    }
    if (S.includes("SET status = 'running'")) {
      const setClause = S.match(/SET (.*) WHERE/)[1];
      const r = this._updateWhere(S, params, 0, setClause);
      if (r.rowCount === 1) { const m = byId(params[0]); if (!m.started_at) m.started_at = this._iso(); }
      return r;
    }
    if (S.includes('SET lease_until = NOW()')) {
      const m = byId(params[1]);
      if (!m || !['running', 'assigned'].includes(m.status) || !m.lease_until) return { rows: [], rowCount: 0 };
      m.lease_until = new Date(this._now() + params[0] * 1000).toISOString();
      return { rows: [], rowCount: 1 };
    }
    throw new Error(`FakePool: unhandled SQL: ${S.slice(0, 160)}`);
  }
}

module.exports = { FakePool };
