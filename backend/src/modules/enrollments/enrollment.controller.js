'use strict';
const enrollmentService = require('./enrollment.service');

async function enroll(req, res, next) {
  try {
    const enrollment = await enrollmentService.enroll(req.body, req.user);
    return res.status(201).json({ success: true, data: { enrollment } });
  } catch (err) {
    return next(err);
  }
}

async function listEnrollments(req, res, next) {
  try {
    const { enrollments, pagination } = await enrollmentService.listEnrollments(req.query, req.user);
    return res.status(200).json({ success: true, data: enrollments, pagination });
  } catch (err) {
    return next(err);
  }
}

async function getStudentsForTeacher(req, res, next) {
  try {
    const students = await enrollmentService.getStudentsForTeacher(req.user);
    return res.status(200).json({ success: true, data: students });
  } catch (err) {
    return next(err);
  }
}

async function withdrawEnrollment(req, res, next) {
  try {
    await enrollmentService.withdrawEnrollment(req.params.id, req.user);
    return res.status(200).json({ success: true, data: { message: 'Enrollment withdrawn successfully' } });
  } catch (err) {
    return next(err);
  }
}

module.exports = { enroll, listEnrollments, getStudentsForTeacher, withdrawEnrollment };
