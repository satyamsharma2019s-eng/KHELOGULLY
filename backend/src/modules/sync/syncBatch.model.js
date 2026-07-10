'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * SyncBatch model — PRD §7
 *
 * Tracks each batch upload from a field device. Stores references to
 * accepted athletes and results for audit purposes.
 */
const syncBatchSchema = new Schema(
  {
    batchId: {
      type: String,
      required: [true, 'batchId is required'],
      unique: true,
      index: true,
    },

    deviceId: {
      type: String,
      required: [true, 'deviceId is required'],
      trim: true,
    },

    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    athleteIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },

    resultIds: {
      type: [Schema.Types.ObjectId],
      default: [],
    },

    // Summary of the batch processing outcome
    accepted: { type: Number, default: 0 },
    skipped:  { type: Number, default: 0 },
    rejected: { type: Number, default: 0 },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const SyncBatch = mongoose.model('SyncBatch', syncBatchSchema);
module.exports = SyncBatch;
