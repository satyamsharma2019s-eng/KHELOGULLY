'use strict';
const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const {
  createAthleteSchema,
  updateAthleteSchema,
  listAthleteQuerySchema,
} = require('./athlete.schema');
const controller = require('./athlete.controller');

const router = Router();

// All athlete routes require authentication
router.use(requireAuth);

/**
 * @swagger
 * /athletes:
 *   post:
 *     summary: Create a new athlete record
 *     tags: [Athletes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, age, gender]
 *             properties:
 *               name: { type: string }
 *               age: { type: integer, minimum: 5, maximum: 25 }
 *               gender: { type: string, enum: [male, female, other] }
 *               guardianName: { type: string }
 *               village: { type: string }
 *               district: { type: string }
 *               schoolOrRegion: { type: string }
 *     responses:
 *       201: { description: Athlete created }
 *       400: { description: Validation error }
 *       403: { description: Scout or admin role required }
 */
router.post(
  '/',
  roleGuard('scout', 'admin'),
  validate(createAthleteSchema),
  controller.createAthlete
);

/**
 * @swagger
 * /athletes:
 *   get:
 *     summary: List athletes (role-scoped, paginated)
 *     tags: [Athletes]
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
 *       200: { description: Paginated athlete list }
 */
router.get('/', validate(listAthleteQuerySchema, 'query'), controller.listAthletes);

/**
 * @swagger
 * /athletes/{id}:
 *   get:
 *     summary: Get a single athlete by ID
 *     tags: [Athletes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Athlete found }
 *       404: { description: Not found or not owned }
 */
router.get('/:id', controller.getAthlete);

/**
 * @swagger
 * /athletes/{id}:
 *   put:
 *     summary: Update an athlete record
 *     tags: [Athletes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Athlete updated }
 *       404: { description: Not found or not owned }
 */
router.put(
  '/:id',
  roleGuard('scout', 'admin'),
  validate(updateAthleteSchema),
  controller.updateAthlete
);

/**
 * @swagger
 * /athletes/{id}:
 *   delete:
 *     summary: Soft-delete an athlete (sets isDeleted=true)
 *     tags: [Athletes]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Athlete deleted }
 *       404: { description: Not found or not owned }
 */
router.delete('/:id', roleGuard('scout', 'admin'), controller.deleteAthlete);

module.exports = router;
