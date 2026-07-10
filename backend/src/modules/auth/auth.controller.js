'use strict';
const authService = require('./auth.service');
const logger = require('../../utils/logger') ; 

const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
};

/**
 * Determine client type from header — 'mobile' or 'web'.
 * Defaults to 'web' to be safe (cookie path).
 */
function getClientType(req) {
  const ct = (req.headers['client_type'] || req.headers['x-client-type'] || '').toLowerCase();
  return ct === 'mobile' ? 'mobile' : 'web';
}

/**
 * Send tokens to client in the correct way based on client_type:
 *  - web:    refreshToken in HttpOnly cookie, not in body
 *  - mobile: refreshToken in JSON body, Flutter stores in flutter_secure_storage
 */
function sendTokens(req, res, { user, accessToken, refreshToken }, statusCode = 200) {
  const clientType = getClientType(req);

  if (clientType === 'web') {
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
    return res.status(statusCode).json({
      success: true,
      data: { user, accessToken },
    });
  }

  // mobile — refreshToken in body
  return res.status(statusCode).json({
    success: true,
    data: { user, accessToken, refreshToken },
  });
}

/**
 * POST /api/v1/auth/register
 *
 * Response varies by userType:
 *  pet     → { user }
 *  student → { user, athleteProfile, enrollment }
 *  teacher → { user }
 */
async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/login
 */
async function login(req, res, next) {
  try {
    const env = require('../../config/env');
    const result = await authService.login(req.body, env);
    return sendTokens(req, res, result, 200);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 *
 * Extracts refresh token from cookie (web) or body (mobile).
 */
async function refresh(req, res, next) {
  try {
    const env = require('../../config/env');
    const clientType = getClientType(req);

    let rawToken;
    if (clientType === 'mobile') {
      rawToken = req.body.refreshToken;
    } else {
      rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    }

    const result = await authService.refreshTokens(rawToken, env);
    return sendTokens(req, res, result, 200);
  } catch (err) {
    // Clear cookie on any refresh failure (web path)
    res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
    return next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 *
 * Requires auth — req.user set by requireAuth middleware.
 */
async function logout(req, res, next) {
  try {
    const clientType = getClientType(req);
    let rawToken;
    if (clientType === 'mobile') {
      rawToken = req.body.refreshToken;
    } else {
      rawToken = req.cookies?.[REFRESH_COOKIE_NAME];
    }

    await authService.logout(req.user._id, rawToken);
    res.clearCookie(REFRESH_COOKIE_NAME, COOKIE_OPTIONS);
    return res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/v1/auth/profile
 *
 * Returns the logged-in user's profile. Requires auth.
 */
async function profile(req, res, next) {
  try {
    const User = require('../users/user.model');
    const user = await User.findById(req.user._id);
    if (!user) {
      const createError = require('../../middleware/createError');
      return next(createError(404, 'NOT_FOUND', 'User not found'));
    }
    return res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/v1/auth/create-staff
 *
 * Admin only — creates scout or admin accounts.
 */
async function createStaff(req, res, next) {
  try {
    const user = await authService.createStaff(req.body);
    return res.status(201).json({ success: true, data: { user } });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, refresh, logout, profile, createStaff };
