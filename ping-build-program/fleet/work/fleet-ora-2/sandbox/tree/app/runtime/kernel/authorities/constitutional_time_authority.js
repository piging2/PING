/**
 * Constitutional Time Authority
 * 
 * Priority 1: Temporal Constitution
 * 
 * Provides deterministic time for replay.
 * 
 * Constitutional Constraint:
 * Replay should never even know Date exists.
 * 
 * Architecture:
 * ConstitutionalClock
 *   ↓
 * ConstitutionalTimeAuthority (convenience interface)
 *   ↓
 * All kernel components
 * 
 * ConstitutionalTimeAuthority is now a thin convenience interface
 * that delegates to ConstitutionalClock for all time operations.
 */

const { constitutionalClock } = require('./constitutional_clock');

class ConstitutionalTimeAuthority {
  constructor() {
    // No internal state - delegates to ConstitutionalClock
  }

  /**
   * Get current timestamp
   * @returns {string} ISO timestamp
   */
  now() {
    return constitutionalClock.now();
  }

  /**
   * Get current time as Date object
   * @returns {Date} Date object
   */
  nowAsDate() {
    return constitutionalClock.nowAsDate();
  }

  /**
   * Get current time as milliseconds
   * @returns {number} Milliseconds
   */
  nowAsMillis() {
    return constitutionalClock.nowAsMillis();
  }

  /**
   * Check if in replay mode
   * @returns {boolean} Replay mode
   */
  isReplayMode() {
    return constitutionalClock.isReplayMode();
  }

  /**
   * Set replay mode with deterministic time
   * @param {number} timestamp - Fixed timestamp for replay
   */
  setReplayMode(timestamp) {
    constitutionalClock.setReplayMode(timestamp);
  }

  /**
   * Exit replay mode
   */
  exitReplayMode() {
    constitutionalClock.exitReplayMode();
  }

  /**
   * Set logical mode for Lamport sequencing
   * @param {number} initialTime - Initial logical time
   */
  setLogicalMode(initialTime = 0) {
    constitutionalClock.setLogicalMode(initialTime);
  }

  /**
   * Advance logical time (Lamport clock)
   * @param {number} delta - Time increment
   */
  advanceLogicalTime(delta = 1) {
    constitutionalClock.advanceLogicalTime(delta);
  }

  /**
   * Get logical time
   * @returns {number} Current logical time
   */
  getLogicalTime() {
    return constitutionalClock.getLogicalTime();
  }

  /**
   * Create timestamp from milliseconds
   * @param {number} millis - Milliseconds
   * @returns {string} ISO timestamp
   */
  fromMillis(millis) {
    return new Date(millis).toISOString();
  }

  /**
   * Create timestamp from Date object
   * @param {Date} date - Date object
   * @returns {string} ISO timestamp
   */
  fromDate(date) {
    return date.toISOString();
  }

  /**
   * Get current time as ISO string (alias for now())
   * @returns {string} ISO timestamp
   */
  nowAsISOString() {
    return this.now();
  }
}

// Singleton instance
const constitutionalTimeAuthority = new ConstitutionalTimeAuthority();

module.exports = {
  ConstitutionalTimeAuthority,
  constitutionalTimeAuthority,
};
