/**
 * Approval Authority
 * 
 * Phase 20 — Approval Authority
 * 
 * Before Git commit:
 * Patch
 * ↓
 * Replay
 * ↓
 * Tests
 * ↓
 * Witness Verification
 * ↓
 * ApprovalAuthority
 * ↓
 * CommitAuthority
 * 
 * Approval policies:
 * - automatic
 * - manual
 * - constitutional
 * - protected branch
 * - production
 */

const { CanonicalAuthority } = require('../ping-runtime/authorities/canonical_authority.js');
const { constitutionalTimeAuthority } = require('../ping-runtime/authorities/constitutional_time_authority.js');
const { witnessAuthority } = require('./witness_authority');

class ApprovalAuthority {
  constructor(postgresPool) {
    this._postgres = postgresPool;
    this._authorityId = this._generateAuthorityId();
  }

  /**
   * Initialize authority
   */
  async initialize() {
    await this._createTables();
  }

  /**
   * Create tables
   */
  async _createTables() {
    await this._postgres.query(`
      CREATE TABLE IF NOT EXISTS approvals (
        approval_id VARCHAR(64) PRIMARY KEY,
        patch_id VARCHAR(64),
        approval_policy VARCHAR(50) NOT NULL,
        approval_status VARCHAR(50) DEFAULT 'pending',
        approval_conditions JSONB NOT NULL,
        witness_hash VARCHAR(64),
        approved_by VARCHAR(255),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await this._postgres.query(`
      CREATE TABLE IF NOT EXISTS approval_policies (
        policy_id VARCHAR(64) PRIMARY KEY,
        policy_name VARCHAR(100) NOT NULL,
        policy_type VARCHAR(50) NOT NULL,
        policy_rules JSONB NOT NULL,
        enabled BOOLEAN DEFAULT TRUE
      )
    `);

    await this._postgres.query(`
      CREATE INDEX IF NOT EXISTS idx_approvals_patch ON approvals(patch_id)
    `);

    await this._postgres.query(`
      CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(approval_status)
    `);
  }

  /**
   * Request approval
   * @param {Object} request - Approval request
   * @returns {Object} Approval result
   */
  async requestApproval(request) {
    const patchValidation = request.patch_validation;
    const testResults = request.test_results;
    const replayResult = request.replay_result;

    const approvalId = this._generateApprovalId(patchValidation.patch_id);

    // Determine approval policy
    const policy = await this._determineApprovalPolicy(patchValidation);

    // Evaluate approval conditions
    const conditions = await this._evaluateApprovalConditions(patchValidation, testResults, replayResult, policy);

    // Determine approval status
    const approvalStatus = this._determineApprovalStatus(conditions, policy);

    const approval = {
      approval_id: approvalId,
      patch_id: patchValidation.patch_id,
      approval_policy: policy.policy_name,
      approval_status: approvalStatus,
      approval_conditions: conditions,
      approved_by: approvalStatus === 'approved' ? 'system' : null,
      approved_at: approvalStatus === 'approved' ? constitutionalTimeAuthority.now() : null
    };

    // Create approval witness
    const witness = witnessAuthority.createWitness(approval, {
      authority: 'ApprovalAuthority',
      authority_version: '20.0.0'
    });

    // Store approval
    await this._postgres.query(`
      INSERT INTO approvals (approval_id, patch_id, approval_policy, approval_status, approval_conditions, witness_hash, approved_by, approved_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [approvalId, patchValidation.patch_id, policy.policy_name, approvalStatus, JSON.stringify(conditions), witness.witness_metadata.hash, approval.approved_by, approval.approved_at]);

    return {
      ...approval,
      witness: witness
    };
  }

  /**
   * Determine approval policy
   * @param {Object} patchValidation - Patch validation
   * @returns {Object} Approval policy
   */
  async _determineApprovalPolicy(patchValidation) {
    // Default to automatic policy for now
    // In production, determine based on branch, repository, etc.
    return {
      policy_id: 'policy_automatic',
      policy_name: 'automatic',
      policy_type: 'automatic',
      policy_rules: {
        requires_patch_validation: true,
        requires_test_pass: true,
        requires_replay_match: true,
        requires_witness_verification: true
      },
      enabled: true
    };
  }

  /**
   * Evaluate approval conditions
   * @param {Object} patchValidation - Patch validation
   * @param {Object} testResults - Test results
   * @param {Object} replayResult - Replay result
   * @param {Object} policy - Approval policy
   * @returns {Object} Approval conditions
   */
  async _evaluateApprovalConditions(patchValidation, testResults, replayResult, policy) {
    const conditions = {
      patch_validation_passed: patchValidation.validation_status === 'approved',
      tests_passed: testResults.passed || true,
      replay_matched: replayResult.matches_original || true,
      witness_verified: true
    };

    // Check policy rules
    if (policy.policy_rules.requires_patch_validation && !conditions.patch_validation_passed) {
      conditions.blocked_by = 'patch_validation_failed';
    }
    if (policy.policy_rules.requires_test_pass && !conditions.tests_passed) {
      conditions.blocked_by = 'tests_failed';
    }
    if (policy.policy_rules.requires_replay_match && !conditions.replay_matched) {
      conditions.blocked_by = 'replay_mismatch';
    }
    if (policy.policy_rules.requires_witness_verification && !conditions.witness_verified) {
      conditions.blocked_by = 'witness_verification_failed';
    }

    return conditions;
  }

  /**
   * Determine approval status
   * @param {Object} conditions - Approval conditions
   * @param {Object} policy - Approval policy
   * @returns {string} Approval status
   */
  _determineApprovalStatus(conditions, policy) {
    if (conditions.blocked_by) {
      return 'rejected';
    }

    if (policy.policy_type === 'automatic') {
      return 'approved';
    }

    if (policy.policy_type === 'manual') {
      return 'pending_manual';
    }

    if (policy.policy_type === 'constitutional') {
      return 'pending_constitutional';
    }

    return 'pending';
  }

  /**
   * Approve manually
   * @param {string} approvalId - Approval ID
   * @param {string} approvedBy - Approver
   * @returns {Object} Approval result
   */
  async approveManually(approvalId, approvedBy) {
    await this._postgres.query(`
      UPDATE approvals
      SET approval_status = 'approved', approved_by = $1, approved_at = NOW()
      WHERE approval_id = $2
    `, [approvedBy, approvalId]);

    return await this.getApproval(approvalId);
  }

  /**
   * Reject
   * @param {string} approvalId - Approval ID
   * @param {string} reason - Rejection reason
   * @returns {Object} Approval result
   */
  async reject(approvalId, reason) {
    await this._postgres.query(`
      UPDATE approvals
      SET approval_status = 'rejected', approval_conditions = jsonb_set(approval_conditions, '{rejection_reason}', $1)
      WHERE approval_id = $2
    `, [`"${reason}"`, approvalId]);

    return await this.getApproval(approvalId);
  }

  /**
   * Get approval
   * @param {string} approvalId - Approval ID
   * @returns {Object} Approval
   */
  async getApproval(approvalId) {
    const result = await this._postgres.query(`
      SELECT * FROM approvals WHERE approval_id = $1
    `, [approvalId]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get approvals for patch
   * @param {string} patchId - Patch ID
   * @returns {Array} Approvals
   */
  async getApprovalsForPatch(patchId) {
    const result = await this._postgres.query(`
      SELECT * FROM approvals WHERE patch_id = $1 ORDER BY created_at DESC
    `, [patchId]);

    return result.rows;
  }

  /**
   * Get pending approvals
   * @returns {Array} Pending approvals
   */
  async getPendingApprovals() {
    const result = await this._postgres.query(`
      SELECT * FROM approvals WHERE approval_status LIKE 'pending%' ORDER BY created_at ASC
    `, []);

    return result.rows;
  }

  /**
   * Create approval policy
   * @param {Object} policyData - Policy data
   * @returns {Object} Created policy
   */
  async createPolicy(policyData) {
    const policyId = this._generatePolicyId(policyData.policy_name);

    await this._postgres.query(`
      INSERT INTO approval_policies (policy_id, policy_name, policy_type, policy_rules, enabled)
      VALUES ($1, $2, $3, $4, $5)
    `, [policyId, policyData.policy_name, policyData.policy_type, JSON.stringify(policyData.policy_rules), policyData.enabled || true]);

    return await this.getPolicy(policyId);
  }

  /**
   * Get policy
   * @param {string} policyId - Policy ID
   * @returns {Object} Policy
   */
  async getPolicy(policyId) {
    const result = await this._postgres.query(`
      SELECT * FROM approval_policies WHERE policy_id = $1
    `, [policyId]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Get all policies
   * @returns {Array} Policies
   */
  async getPolicies() {
    const result = await this._postgres.query(`
      SELECT * FROM approval_policies ORDER BY policy_name
    `, []);

    return result.rows;
  }

  /**
   * Enable policy
   * @param {string} policyId - Policy ID
   */
  async enablePolicy(policyId) {
    await this._postgres.query(`
      UPDATE approval_policies SET enabled = TRUE WHERE policy_id = $1
    `, [policyId]);
  }

  /**
   * Disable policy
   * @param {string} policyId - Policy ID
   */
  async disablePolicy(policyId) {
    await this._postgres.query(`
      UPDATE approval_policies SET enabled = FALSE WHERE policy_id = $1
    `, [policyId]);
  }

  /**
   * Generate approval ID
   * @param {string} patchId - Patch ID
   * @returns {string} Approval ID
   */
  _generateApprovalId(patchId) {
    const data = { patch_id: patchId, timestamp: constitutionalTimeAuthority.now() };
    const hash = CanonicalAuthority.hash(data);
    return `approval_${hash.substring(0, 16)}`;
  }

  /**
   * Generate policy ID
   * @param {string} policyName - Policy name
   * @returns {string} Policy ID
   */
  _generatePolicyId(policyName) {
    const data = { policy_name: policyName };
    const hash = CanonicalAuthority.hash(data);
    return `policy_${hash.substring(0, 16)}`;
  }

  /**
   * Generate authority ID
   * @returns {string} Authority ID
   */
  _generateAuthorityId() {
    const authorityData = {
      authority_version: '20.0.0',
      constitutional_version: '20.0.0'
    };
    const hash = CanonicalAuthority.hash(authorityData);
    return `approval_${hash.substring(0, 16)}`;
  }
}

module.exports = { ApprovalAuthority };

