'use strict';
const { Router } = require('express');
const requireAuth = require('../../middleware/requireAuth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { enrollSchema, listEnrollmentQuerySchema } = require('./enrollment.schema');
const controller = require('./enrollment.controller');

const router = Router();

router.use(requireAuth);

/**
 * @swagger
 * /enrollments:
 *   post:
 *     summary: Student enrolls in a school/program
 *     tags: [Enrollments]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [schoolOrRegion]
 *             properties:
 *               schoolOrRegion: { type: string }
 *               teacherId: { type: string, description: "Optional — link to a specific teacher" }
 *     responses:
 *       201: { description: Enrolled successfully }
 *       409: { description: Already enrolled in this school }
 *       403: { description: Only students can enroll }
 */
router.post('/', roleGuard('student', 'admin'), validate(enrollSchema), controller.enroll);

/**
 * @swagger
 * /enrollments:
 *   get:
 *     summary: List enrollments (role-scoped — student:own, teacher:school, admin:all)
 *     tags: [Enrollments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive, completed] }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200: { description: Enrollment list }
 */
router.get(
  '/',
  roleGuard('student', 'teacher', 'admin'),
  validate(listEnrollmentQuerySchema, 'query'),
  controller.listEnrollments
);

/**
 * @swagger
 * /enrollments/students:
 *   get:
 *     summary: Teacher's student roster with best scores per testType
 *     tags: [Enrollments]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Student roster with scores }
 *       403: { description: Teacher or admin role required }
 */
router.get('/students', roleGuard('teacher', 'admin'), controller.getStudentsForTeacher);

/**
 * @swagger
 * /enrollments/{id}:
 *   delete:
 *     summary: Student withdraws from enrollment (admin can mark as completed)
 *     tags: [Enrollments]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Withdrawn successfully }
 *       404: { description: Enrollment not found or not owned }
 */
router.delete('/:id', roleGuard('student', 'admin'), controller.withdrawEnrollment);

module.exports = router;
