'use strict';
const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const roleGuard = require('../../middleware/roleGuard');
const controller = require('./dashboard.controller');

const router = Router();

// All dashboard routes require at minimum scout or teacher access
router.use(requireAuth, roleGuard('scout', 'admin', 'teacher'));

/**
 * @swagger
 * /dashboard/leaderboard:
 *   get:
 *     summary: Top performers leaderboard (role-scoped)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: testType
 *         schema: { type: string, enum: [speed_run, standing_jump, sit_ups, push_ups, shuttle_run, flexibility] }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200: { description: Leaderboard data }
 *       403: { description: Scout or admin role required }
 */
router.get('/leaderboard', controller.getLeaderboard);

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Aggregate statistics (total athletes, test counts, avg scores per testType)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Stats data }
 */
router.get('/stats', controller.getStats);

/**
 * @swagger
 * /dashboard/athletes:
 *   get:
 *     summary: Athletes with their best scores per testType (role-scoped, paginated)
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: district
 *         schema: { type: string }
 *       - in: query
 *         name: gender
 *         schema: { type: string, enum: [male, female, other] }
 *     responses:
 *       200: { description: Athletes with scores }
 */
router.get('/athletes', controller.getDashboardAthletes);

/**
 * @swagger
 * /dashboard/heatmap:
 *   get:
 *     summary: Geographic performance distribution by district
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: testType
 *         schema: { type: string }
 *     responses:
 *       200: { description: Heatmap data by district }
 */
router.get('/heatmap', controller.getHeatmap);

module.exports = router;
