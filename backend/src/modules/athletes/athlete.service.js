'use strict';
const Athlete = require('./athlete.model');
const createError = require('../../middleware/createError');
const { assertOwnership } = require('../../utils/ownershipCheck');

/**
 * Build a query filter scoped to the calling user's role.
 *
 * - admin: sees all athletes
 * - scout: sees athletes from their schoolOrRegion
 * - pet:   sees only athletes they registered
 */
function buildScopeFilter(reqUser) {
  const base = { isDeleted: false };

  if (reqUser.role === 'admin') return base;

  if (reqUser.role === 'scout') {
    return { ...base, schoolOrRegion: reqUser.schoolOrRegion };
  }

  // pet
  return { ...base, registeredBy: reqUser._id };
}

/**
 * Create a new athlete record.
 * Caller must be scout or admin (enforced by roleGuard in routes).
 */
async function createAthlete(data, reqUser) {
  const athlete = await Athlete.create({
    ...data,
    registeredBy: reqUser._id,
    schoolOrRegion: data.schoolOrRegion || reqUser.schoolOrRegion || null,
  });
  return athlete;
}

/**
 * List athletes with pagination and optional filters, scoped by role.
 */
async function listAthletes(query, reqUser) {
  const { page = 1, limit = 20, district, gender, schoolOrRegion } = query;

  const filter = buildScopeFilter(reqUser);

  if (district) filter.district = district;
  if (gender) filter.gender = gender;
  // Admin can filter by schoolOrRegion; scout's is already scoped
  if (schoolOrRegion && reqUser.role === 'admin') filter.schoolOrRegion = schoolOrRegion;

  const skip = (page - 1) * limit;

  const [athletes, total] = await Promise.all([
    Athlete.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Athlete.countDocuments(filter),
  ]);

  return {
    athletes,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single athlete by ID.
 * Uses assertOwnership to enforce 404-not-403 behaviour.
 */
async function getAthleteById(athleteId, reqUser) {
  return assertOwnership(Athlete, athleteId, reqUser, { isDeleted: false });
}

/**
 * Update an athlete record.
 * Ownership is verified before update.
 */
async function updateAthlete(athleteId, data, reqUser) {
  // First verify ownership
  await assertOwnership(Athlete, athleteId, reqUser, { isDeleted: false });

  const updated = await Athlete.findByIdAndUpdate(
    athleteId,
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!updated) throw createError(404, 'NOT_FOUND', 'Athlete not found');
  return updated;
}

/**
 * Soft-delete an athlete.
 * Sets isDeleted: true and records deletedAt.
 * Ownership verified before deletion.
 */
async function deleteAthlete(athleteId, reqUser) {
  await assertOwnership(Athlete, athleteId, reqUser, { isDeleted: false });

  await Athlete.findByIdAndUpdate(athleteId, {
    isDeleted: true,
    deletedAt: new Date(),
  });
}

module.exports = {
  createAthlete,
  listAthletes,
  getAthleteById,
  updateAthlete,
  deleteAthlete,
};
