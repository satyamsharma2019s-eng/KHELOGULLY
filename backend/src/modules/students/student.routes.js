'use strict';
const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const roleGuard = require('../../middleware/roleGuard');

const router = Router();

// All student routes require authentication + student role
router.use(requireAuth, roleGuard('student'));

/**
 * @swagger
 * /student/profile:
 *   get:
 *     summary: Student — own merged User + Athlete profile
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile data }
 *       404: { description: Athlete profile not found }
 */
router.get('/profile', async (req, res, next) => {
  try {
    const User = require('../users/user.model');
    const Athlete = require('../athletes/athlete.model');

    const user = await User.findById(req.user._id).lean();
    if (!user) {
      const createError = require('../../middleware/createError');
      return next(createError(404, 'NOT_FOUND', 'User not found'));
    }

    let athleteProfile = null;
    if (user.studentProfileId) {
      athleteProfile = await Athlete.findById(user.studentProfileId).lean();
    }

    return res.status(200).json({
      success: true,
      data: { user, athleteProfile },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /student/scores:
 *   get:
 *     summary: Student — own test results across all enrollments
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: testType
 *         schema: { type: string }
 *     responses:
 *       200: { description: Own test results }
 */
router.get('/scores', async (req, res, next) => {
  try {
    const User = require('../users/user.model');
    const TestResult = require('../results/result.model');

    const user = await User.findById(req.user._id).lean();
    if (!user || !user.studentProfileId) {
      return res.status(200).json({
        success: true,
        data: [],
        pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
      });
    }

    const page  = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip  = (page - 1) * limit;

    const filter = { athleteId: user.studentProfileId };
    if (req.query.testType) filter.testType = req.query.testType;

    const [results, total] = await Promise.all([
      TestResult.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      TestResult.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: results,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * @swagger
 * /student/enrollments:
 *   get:
 *     summary: Student — own enrollment list (convenience alias)
 *     tags: [Student]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Enrollment list }
 */
router.get('/enrollments', async (req, res, next) => {
  try {
    const Enrollment = require('../enrollments/enrollment.model');

    const enrollments = await Enrollment.find({
      studentId: req.user._id,
    })
      .populate('teacherId', 'name phone schoolOrRegion')
      .sort({ enrolledAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: enrollments });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
