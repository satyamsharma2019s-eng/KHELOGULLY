'use strict';
const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * TestResult model — PRD §7
 *
 * Key design decisions (PRD §6.3, §6.4, v2.2 changelog):
 * - No video, frames, or base64 media are stored — only final computed scores.
 * - idempotencyKey has a unique index — duplicate sync entries are silently skipped.
 * - zScore and percentile are computed at ingestion time (sync/batch), not on read.
 * - gpsCoords and liveGuidance are Phase 3 / optional — absent without validation failure.
 */
const testResultSchema = new Schema(
  {
    athleteId: {
      type: Schema.Types.ObjectId,
      ref: 'Athlete',
      required: [true, 'athleteId is required'],
      index: true,
    },

    testType: {
      type: String,
      required: [true, 'testType is required'],
      trim: true,
      enum: {
        values: ['speed_run', 'standing_jump', 'sit_ups', 'push_ups', 'shuttle_run', 'flexibility'],
        message: 'Invalid testType',
      },
    },

    rawScore: {
      type: Number,
      required: [true, 'rawScore is required'],
    },

    // Computed at ingestion (sync/batch) — never sent by client
    zScore: {
      type: Number,
      default: null,
    },

    percentile: {
      type: Number,
      default: null,
    },

    // ISO timestamp of when the test was performed on-device
    timestamp: {
      type: Date,
      required: [true, 'timestamp is required'],
    },

    deviceId: {
      type: String,
      required: [true, 'deviceId is required'],
      trim: true,
    },

    /**
     * Idempotency key: SHA-256 of (athleteId + testType + deviceId + timestamp).
     * Unique index prevents duplicate entries from repeated sync batch uploads.
     */
    idempotencyKey: {
      type: String,
      required: [true, 'idempotencyKey is required'],
      unique: true,
      index: true,
    },

    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'failed'],
      default: 'synced',
    },

    /**
     * Tracks who submitted this result.
     * 'scout'   — scout using the field device
     * 'teacher' — teacher evaluating an enrolled student
     * 'system'  — batch sync ingestion
     */
    evaluatorRole: {
      type: String,
      enum: ['scout', 'teacher', 'system'],
      default: 'scout',
    },

    /**
     * On-device face match verification result — boolean from Flutter ML.
     * No biometric data is stored — just the verification outcome.
     */
    faceMatchVerified: {
      type: Boolean,
      default: false,
    },

    /**
     * On-device device stability verification (accelerometer check during test).
     */
    stabilityVerified: {
      type: Boolean,
      default: false,
    },

    /**
     * GPS coordinates — Phase 3 / optional (PRD §7).
     * Backend accepts null without validation failure.
     */
    gpsCoords: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    /**
     * Live guidance log — optional array of real-time correction cues shown during test.
     * Additive analytics/trust signal for scouts. Not required for MVP (PRD §7).
     */
    liveGuidance: {
      type: [String],
      default: null,
    },

    /**
     * Reference to the scout who submitted this result.
     */
    scoutId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },

    schoolOrRegion: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for dashboard leaderboard + scout scoping
testResultSchema.index({ schoolOrRegion: 1, testType: 1, zScore: -1 });
testResultSchema.index({ athleteId: 1, testType: 1 });

const TestResult = mongoose.model('TestResult', testResultSchema);
module.exports = TestResult;
