'use strict';
const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { createResultSchema, listResultQuerySchema } = require('./result.schema');
const controller = require('./result.controller');

const router = Router();

router.use(requireAuth);

/**
 * @swagger
 * /results:
 *   post:
 *     summary: Submit a single test result (final computed scores only — no video)
 *     tags: [Results]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [athleteId, testType, rawScore, timestamp, deviceId]
 *             properties:
 *               athleteId: { type: string }
 *               testType: { type: string, enum: [speed_run, standing_jump, sit_ups, push_ups, shuttle_run, flexibility] }
 *               rawScore: { type: number }
 *               timestamp: { type: string, format: date-time }
 *               deviceId: { type: string }
 *               faceMatchVerified: { type: boolean }
 *               stabilityVerified: { type: boolean }
 *               gpsCoords: { type: object, properties: { lat: { type: number }, lng: { type: number } } }
 *               liveGuidance: { type: array, items: { type: string } }
 *     responses:
 *       201: { description: Result created with z-score and percentile }
 *       409: { description: Duplicate result (idempotency key conflict) }
 */
router.post('/', roleGuard('scout', 'admin', 'teacher'), validate(createResultSchema), controller.createResult);

/**
 * @swagger
 * /results:
 *   get:
 *     summary: List test results (role-scoped, paginated)
 *     tags: [Results]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated results list }
 */
router.get('/', validate(listResultQuerySchema, 'query'), controller.listResults);

/**
 * @swagger
 * /results/{id}:
 *   get:
 *     summary: Get a single test result by ID
 *     tags: [Results]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Result found }
 *       404: { description: Not found }
 */
router.get('/:id', controller.getResult);

/**
 * @swagger
 * /results/{id}/score:
 *   get:
 *     summary: Get only the score fields for a result (rawScore, zScore, percentile)
 *     tags: [Results]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Score data }
 */
router.get('/:id/score', controller.getResultScore);

module.exports = router;
