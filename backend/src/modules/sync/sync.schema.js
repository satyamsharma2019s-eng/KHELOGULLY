'use strict';
const { z } = require('zod');

const TEST_TYPES = ['speed_run', 'standing_jump', 'sit_ups', 'push_ups', 'shuttle_run', 'flexibility'];

/**
 * Schema for a single result entry within a sync batch.
 * Mirrors result.schema.js but used inside the batch array.
 */
const syncResultItemSchema = z.object({
  athleteId: z
    .string({ required_error: 'athleteId is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'athleteId must be a valid MongoDB ObjectId'),

  testType: z.enum(TEST_TYPES, {
    required_error: 'testType is required',
  }),

  rawScore: z.number({
    required_error: 'rawScore is required',
    invalid_type_error: 'rawScore must be a number',
  }),

  timestamp: z
    .string({ required_error: 'timestamp is required' })
    .datetime({ message: 'timestamp must be a valid ISO 8601 datetime' }),

  deviceId: z
    .string({ required_error: 'deviceId is required' })
    .trim()
    .min(1),

  faceMatchVerified: z.boolean().default(false),
  stabilityVerified: z.boolean().default(false),

  gpsCoords: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .nullable()
    .optional(),

  liveGuidance: z.array(z.string()).nullable().optional(),
});

/**
 * Schema for POST /api/v1/sync/batch
 *
 * Body limit for this route is 1MB (overridden in app.js — PRD §6.4).
 */
const syncBatchSchema = z.object({
  batchId: z
    .string({ required_error: 'batchId is required' })
    .uuid({ message: 'batchId must be a UUID' }),

  deviceId: z
    .string({ required_error: 'deviceId is required' })
    .trim()
    .min(1),

  results: z
    .array(syncResultItemSchema)
    .min(1, 'Batch must contain at least 1 result')
    .max(200, 'Batch cannot exceed 200 results'),
});

module.exports = { syncBatchSchema, syncResultItemSchema };
