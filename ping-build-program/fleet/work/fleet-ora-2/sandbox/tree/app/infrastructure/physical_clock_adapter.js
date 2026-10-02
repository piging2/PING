/**
 * Physical Clock Adapter
 * 
 * Infrastructure adapter for physical time access.
 * 
 * This is the ONLY place in the entire system where physical time is accessed.
 * All kernel components must go through ConstitutionalClock, which delegates here.
 * 
 * Constitutional Constraint:
 * No kernel component should access physical time directly.
 * Physical time access is isolated to infrastructure adapters.
 */

class PhysicalClockAdapter {
  constructor() {
    this._adapterVersion = '1.0.0';
  }

  /**
   * Get current physical time as milliseconds
   * @returns {number} Milliseconds since epoch
   */
  getPhysicalTime() {
    return Date.now();
  }

  /**
   * Get current physical time as Date object
   * @returns {Date} Date object
   */
  getPhysicalDate() {
    return new Date();
  }

  /**
   * Get current physical time as ISO string
   * @returns {string} ISO timestamp
   */
  getPhysicalTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Get high-resolution time (for performance measurement only)
   * @returns {number} High-resolution time
   */
  getHighResolutionTime() {
    return process.hrtime.bigint();
  }

  /**
   * Get adapter version
   * @returns {string} Adapter version
   */
  getAdapterVersion() {
    return this._adapterVersion;
  }
}

// Singleton instance
const physicalClockAdapter = new PhysicalClockAdapter();

module.exports = {
  PhysicalClockAdapter,
  physicalClockAdapter
};
