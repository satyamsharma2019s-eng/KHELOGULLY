'use strict';
const logger = require('../utils/logger');

/**
 * Central error handler — must be the LAST middleware registered in app.js.
 *
 * Translates all AppErrors (and unexpected errors) into the standard response shape:
 *   { success: false, error: { code, message, fields? } }
 *
 * Error codes match the table in PRD §5.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Log unexpected errors (not 4xx client errors — they're noise)
  if (!err.statusCode || err.statusCode >= 500) {
    logger.error('Unhandled error', {
      code: err.code,
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
      url: req.originalUrl,
      method: req.method,
    });
  }

  // Mongoose duplicate key error (E11000)
  if (err.code === 11000 || err.name === 'MongoServerError') {
    const field = err.keyValue ? Object.keys(err.keyValue)[0] : 'field';
    return res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: `A record with this ${field} already exists`,
      },
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: `Invalid value for field: ${err.path}`,
      },
    });
  }

  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const fields = {};
    Object.keys(err.errors).forEach((key) => {
      fields[key] = [err.errors[key].message];
    });
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields },
    });
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    statusCode === 500
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'An error occurred';

  const body = {
    success: false,
    error: { code, message },
  };

  if (err.fields) body.error.fields = err.fields;

  return res.status(statusCode).json(body);
}

module.exports = errorHandler;
