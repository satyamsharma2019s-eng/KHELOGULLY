'use strict';
const { z } = require('zod');

const createAthleteSchema = z.object({
  name: z
    .string({ required_error: 'Athlete name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100),

  age: z
    .number({ required_error: 'Age is required', invalid_type_error: 'Age must be a number' })
    .int('Age must be an integer')
    .min(5, 'Age must be at least 5')
    .max(25, 'Age must be at most 25'),

  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Gender is required',
    invalid_type_error: 'Gender must be male, female, or other',
  }),

  guardianName: z.string().trim().max(100).optional(),
  village: z.string().trim().max(100).optional(),
  district: z.string().trim().max(100).optional(),
  schoolOrRegion: z.string().trim().max(100).optional(),
});

const updateAthleteSchema = createAthleteSchema.partial();

const listAthleteQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .refine((v) => v > 0, { message: 'page must be a positive integer' }),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .refine((v) => v > 0 && v <= 100, { message: 'limit must be between 1 and 100' }),
  district: z.string().trim().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  schoolOrRegion: z.string().trim().optional(),
});

module.exports = { createAthleteSchema, updateAthleteSchema, listAthleteQuerySchema };
