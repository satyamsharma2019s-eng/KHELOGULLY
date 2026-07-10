'use strict';
const { z } = require('zod');

/**
 * Auth Zod Schemas — used by validate() middleware on auth routes.
 */

// ── Base register ─────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),

  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number format'),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters'),

  schoolOrRegion: z.string().trim().transform(v => v.toLowerCase()).optional(),

  /**
   * userType controls the registration path:
   *   'pet'     → standard PET account (default — unchanged behaviour)
   *   'student' → creates User(role:student) + Athlete profile automatically
   *   'teacher' → creates User(role:teacher), schoolOrRegion becomes required
   *
   * 'admin' and 'scout' are NOT self-servable — use /auth/create-staff (admin-only).
   */
  userType: z.enum(['pet', 'student', 'teacher']).default('pet'),

  // Student-specific profile fields (only validated when userType === 'student')
  age: z
    .number({ invalid_type_error: 'Age must be a number' })
    .int('Age must be an integer')
    .min(5, 'Age must be at least 5')
    .max(25, 'Age must be at most 25')
    .optional(),

  gender: z.enum(['male', 'female', 'other']).optional(),

  guardianName: z.string().trim().max(100).optional(),
  village:      z.string().trim().max(100).optional(),
  district:     z.string().trim().max(100).optional(),
});

// ── Login ─────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .min(1, 'Phone is required'),

  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

// ── Admin-only staff creation ─────────────────────────────────────────────
const createStaffSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),

  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(/^\+?[0-9]{7,15}$/, 'Invalid phone number format'),

  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters'),

  role: z.enum(['scout', 'admin'], {
    required_error: 'Role must be scout or admin',
  }),

  schoolOrRegion: z.string().trim().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  createStaffSchema,
};
