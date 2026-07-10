'use strict';
const TestResult = require('./result.model');
const Athlete = require('../athletes/athlete.model');
const Enrollment = require('../enrollments/enrollment.model');
const createError = require('../../middleware/createError');
const { generateIdempotencyKey } = require('../../utils/idempotencyKey');
const { computeZScoreAndPercentile } = require('../../utils/zScore');

/**
 * Build a role-scoped filter for test results.
 */
function buildScopeFilter(reqUser) {
  const base = {};
  if (reqUser.role === 'admin') return base;
  if (reqUser.role === 'scout' || reqUser.role === 'teacher') {
    return { schoolOrRegion: reqUser.schoolOrRegion };
  }
  // student: only their own athlete results
  if (reqUser.role === 'student') {
    return { 'athleteId': reqUser.studentProfileId || null };
  }
  return { scoutId: reqUser._id };
}

/**
 * POST /api/v1/results
 *
 * Creates a single test result. Computes z-score + percentile server-side.
 * Called directly from the app for manual/single result submission.
 */
async function createResult(data, reqUser) {
  // Verify the athlete exists and is accessible
  const athlete = await Athlete.findOne({
    _id: data.athleteId,
    isDeleted: false,
  });
  if (!athlete) {
    throw createError(404, 'NOT_FOUND', 'Athlete not found');
  }

  // Teacher ownership check — can only submit for enrolled students
  if (reqUser.role === 'teacher') {
    const enrolled = await Enrollment.findOne({
      athleteId: data.athleteId,
      schoolOrRegion: reqUser.schoolOrRegion,
      status: 'active',
    });
    if (!enrolled) {
      throw createError(
        403,
        'FORBIDDEN',
        'This student is not enrolled in your program'
      );
    }
  }

  // Generate idempotency key
  const idempotencyKey = generateIdempotencyKey({
    athleteId: data.athleteId,
    testType: data.testType,
    deviceId: data.deviceId,
    timestamp: data.timestamp,
  });

  // Check for duplicate
  const existing = await TestResult.findOne({ idempotencyKey });
  if (existing) {
    throw createError(409, 'CONFLICT', 'A result with this idempotency key already exists');
  }

  // Compute z-score and percentile
  const { zScore, percentile } = computeZScoreAndPercentile(data.rawScore, data.testType);

  const result = await TestResult.create({
    ...data,
    idempotencyKey,
    zScore,
    percentile,
    scoutId: reqUser._id,
    schoolOrRegion: reqUser.schoolOrRegion || athlete.schoolOrRegion || null,
    syncStatus: 'synced',
    evaluatorRole: reqUser.role === 'teacher' ? 'teacher' : 'scout',
  });

  return result;
}

/**
 * GET /api/v1/results — paginated, role-scoped list.
 */
async function listResults(query, reqUser) {
  const { page = 1, limit = 20, athleteId, testType } = query;

  const filter = buildScopeFilter(reqUser);
  if (athleteId) filter.athleteId = athleteId;
  if (testType) filter.testType = testType;

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    TestResult.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .populate('athleteId', 'name age gender')
      .lean(),
    TestResult.countDocuments(filter),
  ]);

  return {
    results,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * GET /api/v1/results/:id — single result.
 */
async function getResultById(resultId, reqUser) {
  const filter = { _id: resultId, ...buildScopeFilter(reqUser) };
  const result = await TestResult.findOne(filter).populate('athleteId', 'name age gender');
  if (!result) throw createError(404, 'NOT_FOUND', 'Result not found');
  return result;
}

/**
 * GET /api/v1/results/:id/score — zScore and percentile only.
 */
async function getResultScore(resultId, reqUser) {
  const filter = { _id: resultId, ...buildScopeFilter(reqUser) };
  const result = await TestResult.findOne(filter).select('rawScore zScore percentile testType');
  if (!result) throw createError(404, 'NOT_FOUND', 'Result not found');
  return result;
}

module.exports = { createResult, listResults, getResultById, getResultScore };
