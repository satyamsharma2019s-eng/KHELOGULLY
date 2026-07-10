'use strict';
const { Router } = require('express');
const express = require('express');
const requireAuth = require('../../middleware/requireAuth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const rateLimit = require('express-rate-limit');
const { syncBatchSchema } = require('./sync.schema');
const controller = require('./sync.controller');

const router = Router();

/**
 * Separate, more permissive rate limit for sync — bulk uploads from field devices
 * need a higher threshold than normal API calls (PRD §6.4).
 */
const syncBatchLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 20,              // 20 batch uploads per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many sync batch requests. Please wait before retrying.',
    },
  },
});

/**
 * IMPORTANT: The 1MB body size limit override is applied HERE on the router,
 * BEFORE the route handler. This overrides the global 10kb limit set in app.js
 * specifically for the sync/batch route (PRD §6.4).
 *
 * @swagger
 * /sync/batch:
 *   post:
 *     summary: Upload a batch of offline test results
 *     tags: [Sync]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [batchId, deviceId, results]
 *             properties:
 *               batchId: { type: string, format: uuid }
 *               deviceId: { type: string }
 *               results:
 *                 type: array
 *                 maxItems: 200
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Batch processed — partial success possible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     accepted: { type: array }
 *                     skipped: { type: array }
 *                     rejected: { type: array }
 */
router.post(
  '/batch',
  syncBatchLimiter,
  express.json({ limit: '1mb' }),  // PRD §6.4 — override global 10kb limit
  requireAuth,
  roleGuard('scout', 'admin'),
  validate(syncBatchSchema),
  controller.processBatch
);

module.exports = router;
