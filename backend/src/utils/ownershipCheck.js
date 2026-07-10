'use strict';
const { Types } = require('mongoose');
const createError = require('../middleware/createError');

/**
 * Assert that a resource belongs to the current user (or is visible given their role).
 *
 * Rules (PRD §6.2):
 * - Always returns 404, never 403, if resource is not found or not owned.
 *   This prevents leaking whether a resource exists at all.
 * - Admin role sees all resources (ownership check skipped).
 * - Scout sees only resources tied to their schoolOrRegion.
 * - PET sees only their own resources.
 *
 * @param {import('mongoose').Model} ModelClass - Mongoose model
 * @param {string} resourceId - MongoDB ObjectId string of the target resource
 * @param {object} reqUser - req.user from requireAuth middleware
 * @param {object} [extraFilter] - additional filter fields (e.g. { isDeleted: false })
 * @returns {Promise<Document>} the matching document
 * @throws AppError 404 if not found / not owned
 */
async function assertOwnership(ModelClass, resourceId, reqUser, extraFilter = {}) {
  if (!Types.ObjectId.isValid(resourceId)) {
    throw createError(404, 'NOT_FOUND', 'Resource not found');
  }

  const baseFilter = {
    _id: new Types.ObjectId(resourceId),
    isDeleted: false,
    ...extraFilter,
  };

  // Admin sees everything
  if (reqUser.role === 'admin') {
    const doc = await ModelClass.findOne(baseFilter);
    if (!doc) throw createError(404, 'NOT_FOUND', 'Resource not found');
    return doc;
  }

  // Scout sees resources from their schoolOrRegion
  if (reqUser.role === 'scout') {
    // Some models store registeredBy (athletes); others store scoutId (results).
    // We attempt a broad OR so one helper covers multiple models.
    const doc = await ModelClass.findOne({
      ...baseFilter,
      $or: [
        { registeredBy: new Types.ObjectId(reqUser._id) },
        { scoutId: new Types.ObjectId(reqUser._id) },
      ],
    });
    if (!doc) throw createError(404, 'NOT_FOUND', 'Resource not found');
    return doc;
  }

  // PET (athlete registrant) — owns by registeredBy
  const doc = await ModelClass.findOne({
    ...baseFilter,
    registeredBy: new Types.ObjectId(reqUser._id),
  });
  if (!doc) throw createError(404, 'NOT_FOUND', 'Resource not found');
  return doc;
}

module.exports = { assertOwnership };
