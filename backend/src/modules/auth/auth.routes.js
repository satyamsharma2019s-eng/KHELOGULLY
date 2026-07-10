'use strict';
const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  createStaffSchema,
} = require('./auth.schema');
const controller = require('./auth.controller');

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new PET account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, phone, password]
 *             properties:
 *               name: { type: string }
 *               phone: { type: string }
 *               password: { type: string, minLength: 8 }
 *               schoolOrRegion: { type: string }
 *     responses:
 *       201: { description: User created }
 *       409: { description: Phone already exists }
 */
router.post('/register', validate(registerSchema), controller.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login — returns access token + refresh token (client-type aware)
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: client_type
 *         schema: { type: string, enum: [mobile, web] }
 *         description: mobile = refresh in body; web = refresh in HttpOnly cookie
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phone, password]
 *             properties:
 *               phone: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Login successful }
 *       401: { description: Invalid credentials / account locked }
 */
router.post('/login', validate(loginSchema), controller.login);

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Rotate refresh token — returns new access + refresh token
 *     tags: [Auth]
 *     responses:
 *       200: { description: Tokens refreshed }
 *       401: { description: Refresh token invalid or expired }
 */
router.post('/refresh', validate(refreshSchema), controller.refresh);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout — revokes the current refresh token
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/logout', requireAuth, validate(refreshSchema), controller.logout);

/**
 * @swagger
 * /auth/profile:
 *   get:
 *     summary: Get authenticated user's profile
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Profile data }
 *       401: { description: Unauthorized }
 */
router.get('/profile', requireAuth, controller.profile);

/**
 * @swagger
 * /auth/create-staff:
 *   post:
 *     summary: Create a scout or admin account (admin only)
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       201: { description: Staff account created }
 *       403: { description: Admin role required }
 */
router.post(
  '/create-staff',
  requireAuth,
  roleGuard('admin'),
  validate(createStaffSchema),
  controller.createStaff
);

module.exports = router;
