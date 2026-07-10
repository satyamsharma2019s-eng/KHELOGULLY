'use strict';
const crypto = require('crypto');

/**
 * Timing-safe string comparison using crypto.timingSafeEqual.
 * Prevents timing attacks on token/hash comparisons.
 * Returns false immediately if lengths differ (also safe — length is not secret here).
 *
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  // Lengths must match before timingSafeEqual (it throws on length mismatch)
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

module.exports = { safeCompare };
