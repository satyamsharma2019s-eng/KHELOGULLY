'use strict';
const { z } = require('zod');

/**
 * Enrollment Zod schemas.
 */

const enrollSchema = z.object({
  schoolOrRegion: z
    .string({ required_error: 'schoolOrRegion is required' })
    .trim()
    .min(2, 'schoolOrRegion must be at least 2 characters')
    .max(100)
    .transform(v => v.toLowerCase()),

  // Optional: link to a specific teacher by their phone or ID
  teacherId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, 'teacherId must be a valid MongoDB ObjectId')
    .optional(),
});

const listEnrollmentQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v > 0, { message: 'page must be positive' }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => v > 0 && v <= 100, { message: 'limit must be 1-100' }),
  status: z.enum(['active', 'inactive', 'completed']).optional(),
});

module.exports = { enrollSchema, listEnrollmentQuerySchema };
