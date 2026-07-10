'use strict';
const syncService = require('./sync.service');

/**
 * POST /api/v1/sync/batch
 *
 * Accepts a batch of offline-captured test results from a field device.
 * Returns { accepted, skipped, rejected } — never fails the whole batch for one bad record.
 */
async function processBatch(req, res, next) {
  try {
    const result = await syncService.processSyncBatch(req.body, req.user);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { processBatch };
