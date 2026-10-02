/**
 * Constitutional Clock
 * 
 * Priority 1: Temporal Constitution
 * 
 * The single constitutional authority for all replay-visible timestamps.
 * 
 * Constitutional Constraint:
 * No observable behavior may depend on physical time.
 * Every replay-visible timestamp must originate from this single authority.
 * 
 * Architecture:
 * ConstitutionalClock
 *   ↓
 * PhysicalClockAdapter (infrastructure adapter)
 *   ↓
 * ReplayClock (deterministic)
 *   ↓
 * LogicalClock (Lamport sequencing)
 * 
 * This is the ONLY place in the kernel that should ever access time.
 * All other components must go through this abstraction.
 */

const { physicalClockAdapter } = require('../../../infrastructure/physical_clock_adapter');

class ConstitutionalClock {
  constructor() {
    this._clockVersion = '1.0.0';
    this._mode = 'physical'; // 'physical', 'replay', 'logical'
    this._replayTime = null;
    this._logicalTime = 0;
    this._logicalCounter = 0;
    this._clockOffset = 0; // For testing/virtualization
  }

  /**
   * Get current timestamp as milliseconds
   * @returns {number} Milliseconds since epoch
   */
  nowAsMillis() {
    if (this._mode === 'replay' && this._replayTime !== null) {
      return this._replayTime;
    }
    if (this._mode === 'logical') {
      return this._logicalTime;
    }
    // Physical mode - delegate to infrastructure adapter
    return physicalClockAdapter.getPhysicalTime() + this._clockOffset;
  }

  /**
   * Get current timestamp as ISO string
   * @returns {string} ISO timestamp
   */
  now() {
    return new Date(this.nowAsMillis()).toISOString();
  }

  /**
   * Get current timestamp as Date object
   * @returns {Date} Date object
   */
  nowAsDate() {
    return new Date(this.nowAsMillis());
  }

  /**
   * Set replay mode with deterministic time
   * @param {number} timestamp - Fixed timestamp for replay
   */
  setReplayMode(timestamp) {
    this._mode = 'replay';
    this._replayTime = timestamp;
  }

  /**
   * Exit replay mode
   */
  exitReplayMode() {
    this._mode = 'physical';
    this._replayTime = null;
  }

  /**
   * Set logical mode for Lamport sequencing
   * @param {number} initialTime - Initial logical time
   */
  setLogicalMode(initialTime = 0) {
    this._mode = 'logical';
    this._logicalTime = initialTime;
    this._logicalCounter = 0;
  }

  /**
   * Advance logical time (Lamport clock)
   * @param {number} delta - Time increment
   */
  advanceLogicalTime(delta = 1) {
    if (this._mode !== 'logical') {
      throw new Error('Cannot advance logical time outside logical mode');
    }
    this._logicalTime += delta;
    this._logicalCounter++;
  }

  /**
   * Get logical time
   * @returns {number} Current logical time
   */
  getLogicalTime() {
    return this._logicalTime;
  }

  /**
   * Get logical counter (number of advances)
   * @returns {number} Logical counter
   */
  getLogicalCounter() {
    return this._logicalCounter;
  }

  /**
   * Set clock offset (for testing/virtualization)
   * @param {number} offset - Clock offset in milliseconds
   */
  setClockOffset(offset) {
    this._clockOffset = offset;
  }

  /**
   * Get current mode
   * @returns {string} Current clock mode
   */
  getMode() {
    return this._mode;
  }

  /**
   * Check if in replay mode
   * @returns {boolean} Replay mode status
   */
  isReplayMode() {
    return this._mode === 'replay';
  }

  /**
   * Check if in logical mode
   * @returns {boolean} Logical mode status
   */
  isLogicalMode() {
    return this._mode === 'logical';
  }

  /**
   * Get clock version
   * @returns {string} Clock version
   */
  getClockVersion() {
    return this._clockVersion;
  }

  /**
   * Reset clock (for testing)
   */
  _reset() {
    this._mode = 'physical';
    this._replayTime = null;
    this._logicalTime = 0;
    this._logicalCounter = 0;
    this._clockOffset = 0;
  }
}

// Singleton instance
const constitutionalClock = new ConstitutionalClock();

module.exports = {
  ConstitutionalClock,
  constitutionalClock
};
