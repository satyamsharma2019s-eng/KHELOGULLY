'use strict';
const Enrollment = require('./enrollment.model');
const Athlete = require('../athletes/athlete.model');
const TestResult = require('../results/result.model');
const createError = require('../../middleware/createError');

/**
 * Build query filter scoped to the caller's role.
 *
 * student  → own enrollments only
 * teacher  → all enrollments in their schoolOrRegion
 * admin    → all enrollments (optional status filter)
 */
function buildScope(reqUser, extraFilter = {}) {
  if (reqUser.role === 'student') {
    return { studentId: reqUser._id, ...extraFilter };
  }
  if (reqUser.role === 'teacher') {
    return { schoolOrRegion: reqUser.schoolOrRegion, ...extraFilter };
  }
  // admin
  return { ...extraFilter };
}

/**
 * POST /api/v1/enrollments
 *
 * Student enrolls in a school/program.
 * Requires: student must have a studentProfileId (auto-created Athlete).
 * Prevents duplicate enrollments via unique index on (studentId, schoolOrRegion).
 */
async function enroll(data, reqUser) {
  if (reqUser.role !== 'student') {
    throw createError(403, 'FORBIDDEN', 'Only students can enroll');
  }

  const User = require('../users/user.model');
  const user = await User.findById(reqUser._id);
  if (!user || !user.studentProfileId) {
    throw createError(400, 'INVALID_REQUEST', 'Student profile not found. Please re-register.');
  }

  // Validate teacherId belongs to a teacher in that school (if provided)
  if (data.teacherId) {
    const teacher = await User.findOne({
      _id: data.teacherId,
      role: 'teacher',
      schoolOrRegion: data.schoolOrRegion,
      isActive: true,
    });
    if (!teacher) {
      throw createError(404, 'NOT_FOUND', 'Teacher not found in the specified school');
    }
  }

  // Unique index will throw 11000 on duplicate — handled by errorHandler as CONFLICT
  const enrollment = await Enrollment.create({
    studentId: reqUser._id,
    athleteId: user.studentProfileId,
    schoolOrRegion: data.schoolOrRegion,
    teacherId: data.teacherId || null,
    status: 'active',
  });

  return enrollment;
}

/**
 * GET /api/v1/enrollments
 *
 * student → own enrollments
 * teacher → all students in their school
 * admin   → all enrollments
 */
async function listEnrollments(query, reqUser) {
  const { page = 1, limit = 20, status } = query;

  const extraFilter = status ? { status } : {};
  const filter = buildScope(reqUser, extraFilter);

  const skip = (page - 1) * limit;

  const [enrollments, total] = await Promise.all([
    Enrollment.find(filter)
      .sort({ enrolledAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('studentId', 'name phone role')
      .populate('athleteId', 'name age gender district')
      .populate('teacherId', 'name phone schoolOrRegion')
      .lean(),
    Enrollment.countDocuments(filter),
  ]);

  return {
    enrollments,
    pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * GET /api/v1/enrollments/students
 *
 * Teacher-only: returns enrolled students with their latest score per testType.
 */
async function getStudentsForTeacher(reqUser) {
  if (!['teacher', 'admin'].includes(reqUser.role)) {
    throw createError(403, 'FORBIDDEN', 'Only teachers and admins can view student rosters');
  }

  const scope =
    reqUser.role === 'teacher'
      ? { schoolOrRegion: reqUser.schoolOrRegion, status: 'active' }
      : { status: 'active' };

  const enrollments = await Enrollment.find(scope)
    .populate('athleteId', 'name age gender district')
    .populate('studentId', 'name phone')
    .lean();

  if (!enrollments.length) return [];

  const athleteIds = enrollments.map((e) => e.athleteId?._id).filter(Boolean);

  // Fetch best results per athlete per testType
  const bestResults = await TestResult.aggregate([
    {
      $match: {
        athleteId: { $in: athleteIds },
        zScore: { $ne: null },
      },
    },
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

  const scoresMap = {};
  for (const r of bestResults) {
    const id = r._id.athleteId.toString();
    if (!scoresMap[id]) scoresMap[id] = {};
    scoresMap[id][r._id.testType] = {
      zScore: r.bestZScore,
      percentile: r.bestPercentile,
      rawScore: r.bestRawScore,
      testDate: r.testDate,
    };
  }

  return enrollments.map((e) => ({
    enrollment: {
      _id: e._id,
      schoolOrRegion: e.schoolOrRegion,
      status: e.status,
      enrolledAt: e.enrolledAt,
    },
    student: e.studentId,
    athlete: e.athleteId,
    scores: scoresMap[e.athleteId?._id?.toString()] || {},
  }));
}

/**
 * DELETE /api/v1/enrollments/:id
 *
 * Student withdraws (status → 'inactive').
 * Admin can close any enrollment (status → 'completed').
 */
async function withdrawEnrollment(enrollmentId, reqUser) {
  const enrollment = await Enrollment.findById(enrollmentId);
  if (!enrollment) throw createError(404, 'NOT_FOUND', 'Enrollment not found');

  // Ownership: student can only withdraw their own
  if (
    reqUser.role === 'student' &&
    enrollment.studentId.toString() !== reqUser._id.toString()
  ) {
    throw createError(404, 'NOT_FOUND', 'Enrollment not found');
  }

  const newStatus = reqUser.role === 'admin' ? 'completed' : 'inactive';

  await Enrollment.findByIdAndUpdate(enrollmentId, {
    status: newStatus,
    completedAt: new Date(),
  });
}

module.exports = { enroll, listEnrollments, getStudentsForTeacher, withdrawEnrollment };
