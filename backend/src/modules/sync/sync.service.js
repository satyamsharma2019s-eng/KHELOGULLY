'use strict';
const TestResult = require('../results/result.model');
const Athlete = require('../athletes/athlete.model');
const SyncBatch = require('./syncBatch.model');
const createError = require('../../middleware/createError');
const { generateIdempotencyKey } = require('../../utils/idempotencyKey');
const { computeZScoreAndPercentile } = require('../../utils/zScore');
const logger = require('../../utils/logger');

const FUTURE_CLOCK_SKEW_HOURS = 24; // reject timestamps more than 24h in the future

/**
 * Process a batch upload.
 *
 * PRD §6.4 rules:
 * 1. Idempotency: duplicate key → skip (not error)
 * 2. Timestamp validation: reject entries >24h in future (clock skew guard)
 * 3. Partial failure: accepted + skipped + rejected arrays in response
 * 4. Z-score/percentile: computed synchronously per accepted result during ingestion
 */
async function processSyncBatch({ batchId, deviceId, results }, reqUser) {
  // Check for duplicate batch submission
  const existingBatch = await SyncBatch.findOne({ batchId });
  if (existingBatch) {
    throw createError(409, 'CONFLICT', 'This batchId has already been processed');
  }

  const accepted = [];
  const skipped = [];
  const rejected = [];
  const resultIds = [];
  const athleteIds = new Set();

  const futureThreshold = new Date(Date.now() + FUTURE_CLOCK_SKEW_HOURS * 60 * 60 * 1000);

  for (const item of results) {
    try {
      // 1. Timestamp validation — reject entries with timestamps >24h in the future
      const itemTimestamp = new Date(item.timestamp);
      if (itemTimestamp > futureThreshold) {
        rejected.push({
          athleteId: item.athleteId,
          testType: item.testType,
          timestamp: item.timestamp,
          reason: `Timestamp is more than ${FUTURE_CLOCK_SKEW_HOURS}h in the future`,
        });
        continue;
      }

      // 2. Verify athlete exists and is not deleted
      const athlete = await Athlete.findOne({ _id: item.athleteId, isDeleted: false }).lean();
      if (!athlete) {
        rejected.push({
          athleteId: item.athleteId,
          testType: item.testType,
          timestamp: item.timestamp,
          reason: 'Athlete not found or has been deleted',
        });
        continue;
      }

      // 3. Generate idempotency key
      const idempotencyKey = generateIdempotencyKey({
        athleteId: item.athleteId,
        testType: item.testType,
        deviceId: item.deviceId || deviceId,
        timestamp: item.timestamp,
      });

      // 4. Check for duplicate (idempotency) — skip, do not error
      const duplicate = await TestResult.findOne({ idempotencyKey }).lean();
      if (duplicate) {
        skipped.push({
          athleteId: item.athleteId,
          testType: item.testType,
          timestamp: item.timestamp,
          idempotencyKey,
          reason: 'Duplicate entry — already processed',
        });
        continue;
      }

      // 5. Compute Z-score + percentile synchronously (PRD §6.4)
      const { zScore, percentile } = computeZScoreAndPercentile(item.rawScore, item.testType);

      // 6. Insert the result
      const result = await TestResult.create({
        athleteId: item.athleteId,
        testType: item.testType,
        rawScore: item.rawScore,
        timestamp: itemTimestamp,
        deviceId: item.deviceId || deviceId,
        idempotencyKey,
        zScore,
        percentile,
        faceMatchVerified: item.faceMatchVerified ?? false,
        stabilityVerified: item.stabilityVerified ?? false,
        gpsCoords: item.gpsCoords || null,
        liveGuidance: item.liveGuidance || null,
        scoutId: reqUser._id,
        schoolOrRegion: reqUser.schoolOrRegion || athlete.schoolOrRegion || null,
        syncStatus: 'synced',
      });

      resultIds.push(result._id);
      athleteIds.add(item.athleteId);
      accepted.push({
        athleteId: item.athleteId,
        testType: item.testType,
        timestamp: item.timestamp,
        resultId: result._id,
        zScore,
        percentile,
      });
    } catch (err) {
      // Never fail the whole batch for one bad record
      logger.warn('Sync batch item rejected due to unexpected error', {
        athleteId: item.athleteId,
        error: err.message,
      });
      rejected.push({
        athleteId: item.athleteId,
        testType: item.testType,
        timestamp: item.timestamp,
        reason: err.message || 'Internal processing error',
      });
    }
  }

  // Record the batch for audit
  await SyncBatch.create({
    batchId,
    deviceId,
    uploadedBy: reqUser._id,
    athleteIds: Array.from(athleteIds),
    resultIds,
    accepted: accepted.length,
    skipped: skipped.length,
    rejected: rejected.length,
  });

  logger.info('Sync batch processed', {
    batchId,
    accepted: accepted.length,
    skipped: skipped.length,
    rejected: rejected.length,
    uploadedBy: reqUser._id,
  });

  return { accepted, skipped, rejected };
}

module.exports = { processSyncBatch };
