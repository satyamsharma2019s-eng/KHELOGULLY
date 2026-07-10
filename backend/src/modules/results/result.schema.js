'use strict';
const { z } = require('zod');

const TEST_TYPES = ['speed_run', 'standing_jump', 'sit_ups', 'push_ups', 'shuttle_run', 'flexibility'];

/**
 * Schema for POST /api/v1/results
 *
 * IMPORTANT (PRD §6.3, v2.2): This endpoint only accepts the final computed result object.
 * No video, frames, or base64 media of any kind is accepted.
 * Z-score and percentile are computed server-side; do NOT accept them from clients.
 */
const createResultSchema = z.object({
  athleteId: z
    .string({ required_error: 'athleteId is required' })
    .regex(/^[0-9a-fA-F]{24}$/, 'athleteId must be a valid MongoDB ObjectId'),

  testType: z.enum(TEST_TYPES, {
    required_error: 'testType is required',
    invalid_type_error: `testType must be one of: ${TEST_TYPES.join(', ')}`,
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
    .min(1, 'deviceId cannot be empty'),

  faceMatchVerified: z.boolean().default(false),
  stabilityVerified: z.boolean().default(false),

  // Optional Phase 3 fields — no validation failure if absent
  gpsCoords: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .nullable()
    .optional(),

  liveGuidance: z.array(z.string()).nullable().optional(),

  // Reject any video/media fields explicitly
}).refine(
  (data) => !('video' in data) && !('frames' in data) && !('base64' in data),
  { message: 'Video, frames, or base64 media are not accepted on this endpoint' }
);

const listResultQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v > 0, { message: 'page must be positive' }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => v > 0 && v <= 100, { message: 'limit must be 1–100' }),
  athleteId: z.string().optional(),
  testType: z.enum(TEST_TYPES).optional(),
});

module.exports = { createResultSchema, listResultQuerySchema };
