'use strict';
const crypto = require('crypto');

/**
 * Generate a deterministic idempotency key for a test result.
 * Hash of: athleteId + testType + deviceId + timestamp (ISO string, truncated to minute precision
 * to allow minor clock skew within the same minute without creating duplicates).
 *
 * @param {object} params
 * @param {string} params.athleteId  - MongoDB ObjectId string
 * @param {string} params.testType   - e.g. "speed_run", "standing_jump"
 * @param {string} params.deviceId   - device identifier
 * @param {string|Date} params.timestamp - ISO timestamp of the test
 * @returns {string} SHA-256 hex hash
 */
function generateIdempotencyKey({ athleteId, testType, deviceId, timestamp }) {
  // Truncate to minute-level precision to absorb sub-minute clock drift
  const ts =
    typeof timestamp === 'string'
      ? timestamp.substring(0, 16) // "2024-01-01T12:00"
      : new Date(timestamp).toISOString().substring(0, 16);

  const raw = `${athleteId}|${testType}|${deviceId}|${ts}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { generateIdempotencyKey };
