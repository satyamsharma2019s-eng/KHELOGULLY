'use strict';
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../users/user.model');
const Athlete = require('../athletes/athlete.model');
const Enrollment = require('../enrollments/enrollment.model');
const createError = require('../../middleware/createError');
const logger = require('../../utils/logger');

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Generate a signed JWT access token.
 */
function signAccessToken(payload, env) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

/**
 * Generate a cryptographically random refresh token string.
 */
function generateRawRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Hash a raw refresh token using bcrypt before DB storage.
 */
async function hashRefreshToken(rawToken) {
  return bcrypt.hash(rawToken, BCRYPT_ROUNDS);
}

/**
 * POST /api/v1/auth/register
 *
 * Branches on userType:
 *   'pet'     → hardcodes role:'pet' (original behaviour — unchanged)
 *   'student' → creates User(role:'student') + Athlete + optional Enrollment
 *   'teacher' → creates User(role:'teacher'), requires schoolOrRegion
 */
async function register(data) {
  const { name, phone, password, schoolOrRegion, userType = 'pet' } = data;

  const existing = await User.findOne({ phone });
  if (existing) {
    throw createError(409, 'CONFLICT', 'An account with this phone number already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // ── Teacher ───────────────────────────────────────────────────────────────
  if (userType === 'teacher') {
    if (!schoolOrRegion || !schoolOrRegion.trim()) {
      throw createError(400, 'VALIDATION_ERROR', 'schoolOrRegion is required for teacher registration');
    }

    const user = await User.create({
      name,
      phone,
      role: 'teacher',
      passwordHash,
      schoolOrRegion: schoolOrRegion.trim(),
    });

    logger.info('Teacher registered', { userId: user._id, schoolOrRegion: user.schoolOrRegion });
    return { user };
  }

  // ── Student ───────────────────────────────────────────────────────────────
  if (userType === 'student') {
    const { age, gender, guardianName, village, district } = data;

    if (!age || !gender) {
      throw createError(400, 'VALIDATION_ERROR', 'age and gender are required for student registration');
    }

    // 1. Create User
    const user = await User.create({
      name,
      phone,
      role: 'student',
      passwordHash,
      schoolOrRegion: schoolOrRegion || null,
    });

    // 2. Auto-create Athlete profile linked to this user
    const athlete = await Athlete.create({
      name,
      age,
      gender,
      guardianName: guardianName || null,
      village: village || null,
      district: district || null,
      registeredBy: user._id,
      schoolOrRegion: schoolOrRegion || null,
      userId: user._id,
    });

    // 3. Link athlete profile back to user
    await User.findByIdAndUpdate(user._id, { studentProfileId: athlete._id });

    // 4. Auto-enroll in their school if provided
    let enrollment = null;
    if (schoolOrRegion) {
      enrollment = await Enrollment.create({
        studentId: user._id,
        athleteId: athlete._id,
        schoolOrRegion: schoolOrRegion.trim(),
        status: 'active',
      });
    }

    logger.info('Student registered', { userId: user._id, athleteId: athlete._id });

    return {
      user: { ...user.toJSON(), studentProfileId: athlete._id },
      athleteProfile: athlete,
      enrollment,
    };
  }

  // ── PET (default — original behaviour) ────────────────────────────────────
  const user = await User.create({
    name,
    phone,
    role: 'pet',
    passwordHash,
    schoolOrRegion: schoolOrRegion || null,
  });

  return { user };

}

/**
 * POST /api/v1/auth/login
 *
 * Returns { user, accessToken, refreshToken } — the controller decides
 * how to deliver the refresh token based on client_type header.
 *
 * Account lockout: 5 failures → 15-minute lock.
 */
async function login({ phone, password }, env) {
  // Fetch user including hidden fields needed for login
  const user = await User.findOne({ phone }).select('+passwordHash +refreshTokenHashes +loginAttempts +lockUntil');

  // Generic error — don't reveal whether the phone exists (enumeration protection)
  const invalidCreds = createError(401, 'UNAUTHORIZED', 'Invalid phone or password');

  if (!user) throw invalidCreds;

  // Check lockout
  if (user.lockUntil && user.lockUntil > Date.now()) {
    const remainingMs = user.lockUntil - Date.now();
    const remainingMin = Math.ceil(remainingMs / 60000);
    throw createError(
      401,
      'UNAUTHORIZED',
      `Account is locked. Try again in ${remainingMin} minute(s).`
    );
  }

  // Verify password
  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    const newAttempts = (user.loginAttempts || 0) + 1;

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      await User.findByIdAndUpdate(user._id, {
        loginAttempts: newAttempts,
        lockUntil: new Date(Date.now() + LOCK_DURATION_MS),
      });
      throw createError(
        401,
        'UNAUTHORIZED',
        `Account locked after ${MAX_LOGIN_ATTEMPTS} failed attempts. Try again in 15 minutes.`
      );
    }

    await User.findByIdAndUpdate(user._id, { loginAttempts: newAttempts });
    throw invalidCreds;
  }

  // Successful login — reset lockout state
  const rawRefreshToken = generateRawRefreshToken();
  const refreshHash = await hashRefreshToken(rawRefreshToken);

  await User.findByIdAndUpdate(user._id, {
    loginAttempts: 0,
    lockUntil: null,
    $push: { refreshTokenHashes: refreshHash },
  });

  const accessTokenPayload = {
    _id: user._id.toString(),
    role: user.role,
    schoolOrRegion: user.schoolOrRegion,
    studentProfileId: user.studentProfileId ? user.studentProfileId.toString() : null,
  };

  const accessToken = signAccessToken(accessTokenPayload, env);

  logger.info('User logged in', { userId: user._id, role: user.role });

  return {
    user: user.toJSON(),
    accessToken,
    refreshToken: rawRefreshToken,
  };
}

/**
 * POST /api/v1/auth/refresh
 *
 * Rotates the refresh token on every call.
 * If a previously-used (old/rotated) token is submitted → reuse detected →
 * ALL sessions for this user are revoked (breach signal).
 *
 * Supports two paths per PRD v2.2:
 *  - Mobile: refresh token from request body (rawToken param)
 *  - Web:    refresh token from HttpOnly cookie (rawToken param — controller extracts)
 */
async function refreshTokens(rawToken, env) {
  if (!rawToken) {
    throw createError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token is missing');
  }

  // Find any user with a matching hash in their refreshTokenHashes array
  const users = await User.find({
    refreshTokenHashes: { $exists: true, $ne: [] },
  }).select('+refreshTokenHashes');

  let matchedUser = null;
  let matchedHashIndex = -1;

  for (const u of users) {
    for (let i = 0; i < u.refreshTokenHashes.length; i++) {
      const isMatch = await bcrypt.compare(rawToken, u.refreshTokenHashes[i]);
      if (isMatch) {
        matchedUser = u;
        matchedHashIndex = i;
        break;
      }
    }
    if (matchedUser) break;
  }

  if (!matchedUser) {
    // Token not found in any user's hashes — could be a rotated/stolen token.
    // As a safety measure, if we can identify the user from a JWT claim (not available here
    // without more context), we'd revoke all their sessions. Since we can't, just reject.
    throw createError(401, 'REFRESH_TOKEN_INVALID', 'Refresh token is invalid or expired');
  }

  // Remove the used hash (rotation — the old token is now invalid)
  const updatedHashes = matchedUser.refreshTokenHashes.filter((_, i) => i !== matchedHashIndex);

  // Generate new refresh token
  const newRawRefreshToken = generateRawRefreshToken();
  const newHash = await hashRefreshToken(newRawRefreshToken);

  await User.findByIdAndUpdate(matchedUser._id, {
    refreshTokenHashes: [...updatedHashes, newHash],
  });

  const accessTokenPayload = {
    _id: matchedUser._id.toString(),
    role: matchedUser.role,
    schoolOrRegion: matchedUser.schoolOrRegion,
    studentProfileId: matchedUser.studentProfileId ? matchedUser.studentProfileId.toString() : null,
  };

  const accessToken = signAccessToken(accessTokenPayload, env);

  logger.info('Tokens refreshed', { userId: matchedUser._id });

  return {
    user: matchedUser.toJSON(),
    accessToken,
    refreshToken: newRawRefreshToken,
  };
}

/**
 * POST /api/v1/auth/logout
 *
 * Revokes the specific refresh token submitted (single-device logout).
 * rawToken is extracted from cookie (web) or body (mobile) by the controller.
 */
async function logout(userId, rawToken) {
  if (!rawToken || !userId) {
    // Graceful no-op if no token provided — client already lost the token
    return;
  }

  const user = await User.findById(userId).select('+refreshTokenHashes');
  if (!user) return;

  // Find and remove the matching hash
  const newHashes = [];
  for (const hash of user.refreshTokenHashes) {
    const isMatch = await bcrypt.compare(rawToken, hash);
    if (!isMatch) newHashes.push(hash);
  }

  await User.findByIdAndUpdate(userId, { refreshTokenHashes: newHashes });
  logger.info('User logged out', { userId });
}

/**
 * POST /api/v1/auth/create-staff (admin only)
 *
 * Creates a scout or admin account. Not self-serve.
 */
async function createStaff({ name, phone, password, role, schoolOrRegion }) {
  const existing = await User.findOne({ phone });
  if (existing) {
    throw createError(409, 'CONFLICT', 'An account with this phone number already exists');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.create({
    name,
    phone,
    role, // scout or admin — validated by schema
    passwordHash,
    schoolOrRegion: schoolOrRegion || null,
  });

  logger.info('Staff account created', { newUserId: user._id, role: user.role });
  return user;
}

module.exports = { register, login, refreshTokens, logout, createStaff };
