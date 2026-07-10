'use strict';
const TestResult = require('../results/result.model');
const Athlete = require('../athletes/athlete.model');

/**
 * Build a MongoDB filter scoped to the calling user's role.
 */
function buildDashboardScope(reqUser) {
  if (reqUser.role === 'admin') return {};
  // scout and teacher both see their school's data only
  if (reqUser.role === 'scout' || reqUser.role === 'teacher') {
    return { schoolOrRegion: reqUser.schoolOrRegion };
  }
  return { schoolOrRegion: reqUser.schoolOrRegion };
}

/**
 * GET /api/v1/dashboard/leaderboard
 *
 * Top performers by testType, ordered by zScore descending.
 * Excludes results where zScore is null (PRD §6.4 — treat as null).
 */
async function getLeaderboard(query, reqUser) {
  const { testType, limit = 20 } = query;
  const scope = buildDashboardScope(reqUser);

  const filter = {
    ...scope,
    zScore: { $ne: null },
  };
  if (testType) filter.testType = testType;

  const leaderboard = await TestResult.aggregate([
    { $match: filter },
    { $sort: { zScore: -1 } },
    { $limit: Math.min(Number(limit) || 20, 100) },
    {
      $lookup: {
        from: 'athletes',
        localField: 'athleteId',
        foreignField: '_id',
        as: 'athlete',
      },
    },
    { $unwind: '$athlete' },
    {
      $project: {
        athleteId: 1,
        testType: 1,
        rawScore: 1,
        zScore: 1,
        percentile: 1,
        timestamp: 1,
        'athlete.name': 1,
        'athlete.age': 1,
        'athlete.gender': 1,
        'athlete.district': 1,
      },
    },
  ]);

  return leaderboard;
}

/**
 * GET /api/v1/dashboard/stats
 *
 * Aggregate stats: total athletes, total tests, avg score per testType, etc.
 */
async function getStats(reqUser) {
  const scope = buildDashboardScope(reqUser);
  const athleteScope = {};
  if (reqUser.role === 'scout') {
    athleteScope.schoolOrRegion = reqUser.schoolOrRegion;
  }

  const [athleteCount, testBreakdown] = await Promise.all([
    Athlete.countDocuments({ ...athleteScope, isDeleted: false }),
    TestResult.aggregate([
      { $match: { ...scope, zScore: { $ne: null } } },
      {
        $group: {
          _id: '$testType',
          totalTests: { $sum: 1 },
          avgRawScore: { $avg: '$rawScore' },
          avgZScore: { $avg: '$zScore' },
          avgPercentile: { $avg: '$percentile' },
          maxRawScore: { $max: '$rawScore' },
          minRawScore: { $min: '$rawScore' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    totalAthletes: athleteCount,
    totalTests: testBreakdown.reduce((sum, t) => sum + t.totalTests, 0),
    breakdown: testBreakdown,
  };
}

/**
 * GET /api/v1/dashboard/athletes
 *
 * Athletes with their best scores per testType.
 * Role-scoped, paginated.
 */
async function getDashboardAthletes(query, reqUser) {
  const { page = 1, limit = 20, district, gender } = query;
  const scope = buildDashboardScope(reqUser);

  const athleteFilter = { isDeleted: false };
  if (reqUser.role === 'scout') athleteFilter.schoolOrRegion = reqUser.schoolOrRegion;
  if (district) athleteFilter.district = district;
  if (gender) athleteFilter.gender = gender;

  const skip = (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit) || 20);
  const limitNum = Math.min(100, Number(limit) || 20);

  const [athletes, total] = await Promise.all([
    Athlete.find(athleteFilter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Athlete.countDocuments(athleteFilter),
  ]);

  if (!athletes.length) {
    return {
      athletes: [],
      pagination: { total: 0, page: Number(page), limit: limitNum, totalPages: 0 },
    };
  }

  // Fetch best result per athlete per testType
  const athleteObjectIds = athletes.map((a) => a._id);
  const bestResults = await TestResult.aggregate([
    { $match: { athleteId: { $in: athleteObjectIds }, ...scope, zScore: { $ne: null } } },
    { $sort: { zScore: -1 } },
    {
      $group: {
        _id: { athleteId: '$athleteId', testType: '$testType' },
        bestZScore: { $first: '$zScore' },
        bestPercentile: { $first: '$percentile' },
        bestRawScore: { $first: '$rawScore' },
        testDate: { $first: '$timestamp' },
      },
    },
  ]);

  // Map results to athletes
  const resultsMap = {};
  for (const r of bestResults) {
    const id = r._id.athleteId.toString();
    if (!resultsMap[id]) resultsMap[id] = {};
    resultsMap[id][r._id.testType] = {
      zScore: r.bestZScore,
      percentile: r.bestPercentile,
      rawScore: r.bestRawScore,
      testDate: r.testDate,
    };
  }

  const enrichedAthletes = athletes.map((a) => ({
    ...a,
    scores: resultsMap[a._id.toString()] || {},
  }));

  return {
    athletes: enrichedAthletes,
    pagination: {
      total,
      page: Number(page),
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

/**
 * GET /api/v1/dashboard/heatmap
 *
 * Geographic distribution of athlete performance by district.
 */
async function getHeatmap(query, reqUser) {
  const scope = buildDashboardScope(reqUser);
  const { testType } = query;

  const filter = { ...scope, zScore: { $ne: null } };
  if (testType) filter.testType = testType;

  const heatmapData = await TestResult.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'athletes',
        localField: 'athleteId',
        foreignField: '_id',
        as: 'athlete',
      },
    },
    { $unwind: '$athlete' },
    {
      $group: {
        _id: {
          district: '$athlete.district',
          testType: '$testType',
        },
        avgZScore: { $avg: '$zScore' },
        avgPercentile: { $avg: '$percentile' },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: '$_id.district',
        tests: {
          $push: {
            testType: '$_id.testType',
            avgZScore: '$avgZScore',
            avgPercentile: '$avgPercentile',
            count: '$count',
          },
        },
        totalAthletes: { $sum: '$count' },
      },
    },
    { $sort: { totalAthletes: -1 } },
  ]);

  return heatmapData;
}

module.exports = { getLeaderboard, getStats, getDashboardAthletes, getHeatmap };
