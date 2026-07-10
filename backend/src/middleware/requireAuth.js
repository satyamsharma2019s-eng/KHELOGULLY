'use strict';
const jwt = require('jsonwebtoken');
const createError = require('./createError');

/**
 * requireAuth middleware
 *
 * Verifies the Bearer access token in the Authorization header.
 * Attaches the decoded payload to req.user for downstream handlers.
 *
 * Distinguishes three error cases per PRD §5 error table:
 *  - No token         → 401 UNAUTHORIZED
 *  - Expired token    → 401 TOKEN_EXPIRED  (client should call /auth/refresh)
 *  - Invalid/tampered → 401 TOKEN_INVALID
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError(401, 'UNAUTHORIZED', 'Access token is missing'));
  }

  const token = authHeader.slice(7); // strip "Bearer "

  const env = require('../config/env');

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = decoded; // { _id, role, schoolOrRegion, ... }
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(createError(401, 'TOKEN_EXPIRED', 'Access token has expired'));
    }
    return next(createError(401, 'TOKEN_INVALID', 'Access token is invalid'));
  }
}

module.exports = requireAuth;
