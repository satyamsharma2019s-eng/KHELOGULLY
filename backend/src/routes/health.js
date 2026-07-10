'use strict';
const { Router } = require('express');
const mongoose = require('mongoose');

const router = Router();

/**
 * GET /health — Liveness check
 *
 * Returns 200 if the process is up. No DB call — cheap and fast.
 * Used by Render/Railway to determine if the container is alive.
 * Excluded from rate limiting (see app.js).
 *
 * @swagger
 * /health:
 *   get:
 *     summary: Liveness check — is the process running?
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Process is up
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 uptime: { type: number }
 *                 timestamp: { type: string }
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /ready — Readiness check
 *
 * Returns 200 only if MongoDB is connected (readyState === 1).
 * Returns 503 if the DB is not ready — Render/Railway will stop routing traffic.
 *
 * @swagger
 * /ready:
 *   get:
 *     summary: Readiness check — is the DB connected?
 *     tags: [Health]
 *     responses:
 *       200: { description: DB ready }
 *       503: { description: DB not connected }
 */
router.get('/ready', (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 1 = connected
  if (dbState === 1) {
    return res.status(200).json({
      status: 'ready',
      db: 'connected',
      timestamp: new Date().toISOString(),
    });
  }

  const stateNames = { 0: 'disconnected', 2: 'connecting', 3: 'disconnecting' };
  return res.status(503).json({
    status: 'not ready',
    db: stateNames[dbState] || 'unknown',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
