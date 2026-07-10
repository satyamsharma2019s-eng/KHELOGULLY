'use strict';

/**
 * Factory for creating structured AppError objects used across the codebase.
 * All thrown errors are caught by the central errorHandler middleware.
 *
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Machine-readable error code (see PRD §5 error table)
 * @param {string} message - Human-readable message shown to the client
 * @param {object} [fields] - Optional field-level validation errors
 * @returns {Error} an Error with statusCode, code, and optional fields
 */
function createError(statusCode, code, message, fields = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  if (fields) err.fields = fields;
  return err;
}

module.exports = createError;
