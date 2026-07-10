'use strict';
const createError = require('./createError');

/**
 * roleGuard(...allowedRoles)
 *
 * Middleware factory that restricts a route to specific roles.
 * Must be used AFTER requireAuth (req.user must be set).
 *
 * Returns 403 FORBIDDEN if the user's role is not in allowedRoles.
 *
 * Usage:
 *   router.post('/admin-only', requireAuth, roleGuard('admin'), controller)
 *   router.get('/scout-or-admin', requireAuth, roleGuard('scout', 'admin'), controller)
 *
 * @param {...string} allowedRoles - e.g. 'admin', 'scout', 'pet'
 */
function roleGuard(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        createError(
          403,
          'FORBIDDEN',
          `This action requires one of the following roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    return next();
  };
}

module.exports = roleGuard;
